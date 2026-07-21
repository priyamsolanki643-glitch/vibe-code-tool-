import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { streamSSE } from 'hono/streaming';
import { LLMService } from '../services/llm.service';
import { DbService } from '../services/db.service';
import { VectorService } from '../services/vector.service';
import { requireAuth } from '../middleware/auth.middleware';
import { updateConsistencyScore } from '../engine/layer10_statelock';
import { runLegalAudit } from '../engine/layer13_legalaudit';
import { processCritiqueMessage, buildFullSystemPrompt, processOnboarding, transitionToExecution } from '../engine/index';
import { runOmniPipeline } from '../engine/OmniPipeline';
import { analyticsWorker } from '../workers/analytics.worker';

function getAIErrorMessage(err: any): string {
  if (!err) return 'Unknown AI error';
  return (err?.message || err?.error?.message || err?.cause?.message || JSON.stringify(err));
}

function isQuotaStyleError(message: string): boolean {
  const m = message.toLowerCase();
  return (m.includes('quota exceeded') || m.includes('resource_exhausted') || m.includes('429') || m.includes('rate limit'));
}

function toUserSafeAIText(err: any): string {
  const rawMessage = getAIErrorMessage(err);
  if (isQuotaStyleError(rawMessage)) return 'Bhai teri consistency check karne mein mera engine thoda overload ho gaya hai. Ek minute ruk.';
  return 'Bhai thoda temporary network issue aa raha hai backend pe. 10 second ruk ke dobara message bhej. DEBUG_INFO: ' + rawMessage;
}

export const streamRoutes = new Hono<{ Variables: { userId: string, userLanguage: string } }>();

streamRoutes.use('*', requireAuth);

const messageSchema = z.object({
  user_id: z.string().optional(),
  message: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() }))
  })).optional().default([]),
  state_context: z.any().optional(),
  action: z.string().optional(),
  thread_id: z.string().nullable().optional(),
  model: z.string().optional()
});

streamRoutes.post('/message/stream', zValidator('json', messageSchema), async (c) => {
  const { message, conversationHistory, state_context, thread_id, model } = c.req.valid('json');
  const actualUserId = c.get('userId');
  const userLanguage = c.get('userLanguage') || 'Hinglish';

  if (!actualUserId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const activeMissionPromise = DbService.getActiveMission(actualUserId);
    const similarMemoriesPromise = VectorService.searchSimilarMemories(message, 2, 0.5).catch(() => [] as any[]);
    
    let currentThreadId = thread_id;
    if (!currentThreadId) {
      const newThread = await DbService.createChatThread(actualUserId, "Conversation");
      currentThreadId = newThread.id;
    }

    let activeMission: any;
    let similarMemories: any[];
    const [retrievedMission, retrievedMemories] = await Promise.all([
      activeMissionPromise,
      similarMemoriesPromise,
      DbService.saveMessage(currentThreadId, actualUserId, 'user', message)
    ]);
    activeMission = retrievedMission;
    similarMemories = retrievedMemories;

    let finalSystemPrompt = '';
    let result: any = null;
    let isTransitioningToExecution = false;

    if (activeMission) {
      const critiqueResult = processCritiqueMessage({
        userId: actualUserId,
        userRuntime: activeMission.userRuntime,
        userMessage: message,
        tasksCompletedToDate: Math.floor(activeMission.consistencyScore / 10),
        tasksAttemptedToDate: Math.floor(activeMission.consistencyScore / 10) + activeMission.consecutiveFailureCount,
        consecutiveFailureCount: activeMission.consecutiveFailureCount,
      }, userLanguage);
      finalSystemPrompt = critiqueResult.systemPrompt;
      result = { type: 'critique_response', data: critiqueResult };
    } else {
      // User has no active mission. Let's see if onboarding is complete!
      const currentHistory = [...conversationHistory, { role: 'user', parts: [{ text: message }] }] as any;
      let extraction;
      try {
        extraction = await LLMService.extractOnboardingData(currentHistory);
      } catch (err: any) {
        console.error('ONBOARDING_EXTRACTION_ERROR:', getAIErrorMessage(err));
        const safeText = toUserSafeAIText(err);
        return streamSSE(c, async (streamWriter) => {
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'metadata', data: { thread_id: currentThreadId } }) });
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'text', text: safeText }) });
        });
      }
      
      if (extraction.isComplete) {
        // Onboarding parameters are complete!
        // Check if user is choosing Alpha or Beta
        const chosenPath = 'alpha';
          console.log(`MESSAGE: Auto-locking trajectory in chat.`);
          
          const geoLower = (extraction.region || '').toLowerCase();
          let geographyTier: 'tier1_metro' | 'tier2_city' | 'tier3_semi_urban' | 'rural' = 'tier2_city';
          if (geoLower.match(/delhi|mumbai|bangalore|bengaluru|kolkata|chennai|hyderabad|pune/)) geographyTier = 'tier1_metro';
          else if (geoLower.match(/kanpur|lucknow|jaipur|patna|indore|bhopal|nagpur|agra/)) geographyTier = 'tier2_city';
          else geographyTier = 'tier3_semi_urban';

          const onboardingInput = {
            userId: actualUserId,
            age: 22,
            geographyTier: geographyTier as any,
            country: geoLower.includes("india") ? "India" : "United States",
            region: extraction.region || 'Unknown',
            liquidCapital: extraction.liquidCapital || 5000,
            monthlyBurnRate: extraction.monthlyBurnRate ?? 5000,
            hasDebt: false,
            debtMonthlyObligation: 0,
            familyDependencyScore: 1.0,
            rawSkillStrings: extraction.rawSkillStrings && extraction.rawSkillStrings.length > 0 ? extraction.rawSkillStrings : ["general"],
            hasVerifiableOutputMap: {} as Record<string, boolean>,
            positiveCommSignals: ["clear"] as string[],
            negativeCommSignals: [] as string[],
            dailyUninterruptedHours: extraction.dailyUninterruptedHours || 4,
            deviceTier: "mid_range" as const,
            internetStability: "4g_stable" as const,
            workEnvironment: "dedicated_quiet" as const,
            canWorkAtNight: true,
            hasDedicatedWorkspace: true,
            procrastinationSignals: {
              tookLongBetweenAnswers: false, setOptimisticDeadlines: false, gavelVagueGoalsNotSpecific: false, mentionedPastFailedAttempts: false, usedPassiveLanguage: false, conflatedPlanningWithExecution: false
            },
            cognitiveEnduranceMinutes: 120,
            emotionalResilience: 0.8,
            baselineDiscipline: 0.7,
            preferredWorkStyle: "deep_work_clusters" as const,
            riskTolerance: 0.6,
            declaredGoal: extraction.declaredGoal,
            targetAmount: (extraction.liquidCapital || 5000) * 2,
            currency: "INR" as const,
            timelineMonths: 3,
            sacrificesToleratedList: ["sleep"] as string[],
            nonNegotiables: [] as string[],
            pathPreference: chosenPath === 'alpha' ? 'high_risk_upside' as const : 'safe_compounding' as const,
            onboardingText: `Goal: ${extraction.declaredGoal}. Capital: ${extraction.liquidCapital}. Hours: ${extraction.dailyUninterruptedHours}. Geo: ${extraction.region}`,
            detectedFrictionSignalIds: [] as string[]
          };

          const simulationData = await processOnboarding(onboardingInput, userLanguage);
          const executionResult = await transitionToExecution(simulationData.userRuntime, chosenPath, userLanguage);
          
          const targetPath = chosenPath === 'alpha' ? simulationData.pathPresentation.pathAlpha : simulationData.pathPresentation.pathBeta;
          const missionPayload = {
            user_id: actualUserId,
            missionName: targetPath?.opportunityUsed || (chosenPath === 'alpha' ? "Asymmetric Upside Strategy" : "Compounding Strategy"),
            lockedPath: chosenPath,
            probabilityLow: targetPath?.probabilityRangeLow || (chosenPath === 'alpha' ? 18.4 : 74.2),
            probabilityHigh: targetPath?.probabilityRangeHigh || (chosenPath === 'alpha' ? 24.0 : 82.5),
            dayNumber: 1,
            totalDays: (targetPath?.timelineMonths || 3) * 30,
            consistencyScore: -1,
            streakDays: 0,
            mindsetBrief: targetPath?.firstStepToday || "Start executing immediate discovery steps.",
            strategyContent: targetPath?.description || "Compounding action vector.",
            chatThreadId: currentThreadId
          };

          await DbService.saveMission(missionPayload);
          await DbService.addConsistencyLog(actualUserId, -1);
          
          activeMission = await DbService.getActiveMission(actualUserId);
          isTransitioningToExecution = true;

          // Asynchronously generate initial market report on locking
          const mandate = `
═══════════════════════════════════════════════════════════════
FP-OS INTELLIGENCE RESEARCH MANDATE
User Profile: ${actualUserId}
Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
CONTEXT:
Active Mission: ${activeMission.missionName}
Locked Path: ${activeMission.lockedPath}
Total Days: ${activeMission.totalDays}

MANDATE:
Analyze real-time market opportunities, local gaps, competitor landscape, and timing signals for the target: "${activeMission.missionName}" using the ${activeMission.lockedPath} path.
Provide hyper-local data for Kanpur, Uttar Pradesh, India if applicable, or general metrics for remote work.
Ensure the returned JSON perfectly adheres to the MarketIntelligenceReport interface.
          `.trim();
          
          LLMService.generateGroundedIntelligenceReport(mandate).then(async (groundedData) => {
            await DbService.saveMarketReport(actualUserId, groundedData);
          }).catch(err => console.error('MARKET_REPORT: Initial generation failed on chat lock:', err));

          finalSystemPrompt = buildFullSystemPrompt('execution', executionResult.updatedRuntime, userLanguage);
          result = { type: 'onboarding_complete', data: simulationData };
        
      } else {
        // Onboarding is incomplete. Normal onboarding chat prompt.
        finalSystemPrompt = buildFullSystemPrompt('onboarding', {}, userLanguage);
        result = { type: 'chat_response', data: {} };
      }
    }

    let streamData: any;
    let taskClassification: 'completed'|'failed'|'none' = 'none';

    try {
      const streamRes = await LLMService.generateSmartResponseStream(
        actualUserId,
        finalSystemPrompt,
        [...conversationHistory, { role: 'user', parts: [{ text: message }] }] as any,
        model || 'gemini-2.5-flash'
      );
      streamData = streamRes.stream;
      taskClassification = streamRes.task_classification;
    } catch (err: any) {
      const safeText = toUserSafeAIText(err);
      await DbService.saveMessage(currentThreadId, actualUserId, 'fp', safeText);
      return streamSSE(c, async (streamWriter) => {
        await streamWriter.writeSSE({ data: JSON.stringify({ type: 'metadata', data: { thread_id: currentThreadId } }) });
        await streamWriter.writeSSE({ data: JSON.stringify({ type: 'text', text: safeText }) });
      });
    }

    if (activeMission) analyticsWorker.enqueueMessageAnalysis(actualUserId, message);

    return streamSSE(c, async (streamWriter) => {
      await streamWriter.writeSSE({ data: JSON.stringify({ type: 'metadata', data: { thread_id: currentThreadId, engine_result: result } }) });
      
      let fullResponseText = "";
      for await (const chunk of streamData) {
        const textChunk = typeof chunk.text === 'function' ? chunk.text() : chunk.text;
        fullResponseText += textChunk;
        await streamWriter.writeSSE({ data: JSON.stringify({ type: 'text', text: textChunk }) });
      }

      if (activeMission && state_context?.contextMatrix) {
        const auditReport = runLegalAudit(
          state_context.contextMatrix,
          state_context.availablePaths || [],
          state_context.ambitionAssessment || { probabilityOfDeclaredGoal: 50 },
          activeMission.streakDays === 0 ? 1 : 0,
          activeMission.consistencyScore,
          fullResponseText
        );
        if (!auditReport.passedLegalGate) {
          const disc = auditReport.requiredDisclaimers.join('\\n\\n');
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'disclaimer', text: disc }) });
        } else if (auditReport.requiredDisclaimers?.length > 0) {
          const disc = "\\n\\n---\\n*Disclaimer: " + auditReport.requiredDisclaimers.join(' | ') + "*";
          fullResponseText += disc;
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'disclaimer', text: disc }) });
        }
      }

      await DbService.saveMessage(currentThreadId, actualUserId, 'fp', fullResponseText);

      if (activeMission && taskClassification !== 'none') {
        const scoreEvent = taskClassification === 'completed' ? 'task_completed' : 'task_failed';
        const { newScore } = updateConsistencyScore(activeMission.consistencyScore, scoreEvent);
        let newStreak = activeMission.streakDays;
        if (taskClassification === 'completed') newStreak += 1; else newStreak = 0;
        await DbService.saveMission({
          ...activeMission,
          consistencyScore: newScore,
          streakDays: newStreak,
          dayNumber: Math.min(activeMission.totalDays, activeMission.dayNumber + 1)
        });
        await DbService.addConsistencyLog(actualUserId, newScore);
      }
    });

  } catch (err: any) {
    const safeText = toUserSafeAIText(err);
    return streamSSE(c, async (streamWriter) => {
      await streamWriter.writeSSE({ data: JSON.stringify({ type: 'text', text: safeText }) });
    });
  }
});
