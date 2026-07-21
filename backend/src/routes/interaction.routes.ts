import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  processOnboarding,
  processCritiqueMessage,
  processTaskUpdate,
  runCircumstantialDiagnosis,
  runTacticalArchitect,
  processOperatorTaskUpdate,
  processOperatorCritique,
  generateDailyTaskSprint,
  buildFullSystemPrompt,
  transitionToExecution
} from '../engine/index';
import { updateConsistencyScore } from '../engine/layer10_statelock';
import { runLegalAudit } from '../engine/layer13_legalaudit';
import { LLMService } from '../services/llm.service';
import { analyticsWorker } from '../workers/analytics.worker';
import { runOmniPipeline, triggerDeepSync } from '../engine/OmniPipeline';
import type { EmotionalSignal } from '../engine/layer14_empathy';
import type { ChaosEventType } from '../engine/layer15_chaos';
import type { OmniContext } from '../services/cache.service';

function getAIErrorMessage(err: any): string {
  if (!err) return 'Unknown AI error';
  return (
    err?.message ||
    err?.error?.message ||
    err?.cause?.message ||
    JSON.stringify(err)
  );
}

function isQuotaStyleError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('quota exceeded') ||
    m.includes('resource_exhausted') ||
    m.includes('429') ||
    m.includes('rate limit') ||
    m.includes('too many requests')
  );
}

function isRetryableAIError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    isQuotaStyleError(m) ||
    m.includes('503') ||
    m.includes('overloaded') ||
    m.includes('unavailable') ||
    m.includes('internal error') ||
    m.includes('deadline exceeded') ||
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('socket hang up') ||
    m.includes('econnreset')
  );
}

function toUserSafeAIText(err: any): string {
  const rawMessage = getAIErrorMessage(err);
  const message = rawMessage.toLowerCase();

  if (isQuotaStyleError(message)) {
    return 'Bhai teri consistency check karne mein mera engine thoda overload ho gaya hai. Tera naya plan calculate karne me mujhe ek minute lag raha hai. Jab tak system reboot hota hai, tu chup chaap apna pichla task revise kar. Time waste mat kar!';
  }

  if (isRetryableAIError(message)) {
    return 'Bhai thoda temporary network issue aa raha hai backend pe. 10 second ruk ke dobara message bhej. DEBUG_INFO: ' + rawMessage;
  }

  // TEMPORARY DEBUG: Return actual error so we can see what's failing
  return `[SYSTEM OVERLOAD]: Bhai backend mein error hai, dhyan se check kar: ${rawMessage}`;
}
import { DbService } from '../services/db.service';
import { VectorService } from '../services/vector.service';
import { requireAuth } from '../middleware/auth.middleware';

export const interactionRoutes = new Hono<{ Variables: { userId: string, userLanguage: string } }>();

// Enforce Zero-Trust auth globally on all interaction endpoints EXCEPT the public viral roast endpoint
interactionRoutes.use('*', async (c, next) => {
  if (c.req.path.endsWith('/roast')) {
    return next();
  }
  return requireAuth(c, next);
});

const messageSchema = z.object({
  user_id: z.string().optional(),
  message: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() }))
  })).optional().default([]),
  state_context: z.any().optional(),
  action: z.enum(['onboarding', 'task_update', 'critique', 'unlock']).default('onboarding'),
  thread_id: z.string().nullable().optional(),
  model: z.string().optional()
});

// Primary chat/onboarding interaction message handler
interactionRoutes.post('/message', zValidator('json', messageSchema), async (c) => {
  const { user_id, message, conversationHistory, state_context, action, thread_id, model } = c.req.valid('json');
  const actualUserId = c.get('userId');
  const userLanguage = c.get('userLanguage') || 'Hinglish';

  if (!actualUserId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const messageTrimmed = message.trim();
    const isGreeting = messageTrimmed.length < 30 && /^\s*(hi|hello|hey|yo|sup|hola|heyy|heyyy|pranam|namaste|ram ram|satsriakal|adab|bhai|bro)\s*$/i.test(messageTrimmed);

    if (isGreeting) {
      const activeMission = await DbService.getActiveMission(actualUserId);
      let currentThreadId = thread_id;
      if (!currentThreadId) {
        const newThread = await DbService.createChatThread(actualUserId, "Conversation");
        currentThreadId = newThread.id;
      }

      await DbService.saveMessage(currentThreadId, actualUserId, 'user', message);

      // Build a tight context-aware system prompt for the greeting
      const greetingSystemPrompt = activeMission
        ? `You are Lumensky — a brutally honest, warm, ${userLanguage}-speaking AI buddy helping students achieve their goals.

The student just said "${message}" to you.

Their current status:
- Streak: ${activeMission.streakDays} days
- Consistency Score: ${activeMission.consistencyScore}/100
- Day ${activeMission.dayNumber} of ${activeMission.totalDays}
- Active Path: ${activeMission.lockedPath || 'In progress'}

Reply naturally in the language the user is speaking (e.g., if they speak German, reply in German). If no clear language is detected, default to ${userLanguage}. Talk like a smart older bro checking in. Reference their actual numbers. Ask ONE sharp question or give ONE sharp nudge. 2-4 lines max. No markdown. No "Hey bhai" as opener every time — vary it.`
        : `You are Lumensky — a brutally honest, warm, ${userLanguage}-speaking AI buddy helping students figure out their path in life.

The student just said "${message}" to greet you. They haven't set their goal yet.

Reply casually in the language the user is speaking (or default to ${userLanguage}) — like a smart older bro who's genuinely curious. Ask what's going on in their life or what they want to achieve. 2-3 lines max. No markdown. Vary your opener — not always "Hey bhai".`;

      let responseText = "";
      try {
        const greetRes = await LLMService.generateSmartResponse(
          actualUserId,
          greetingSystemPrompt,
          [...conversationHistory, { role: 'user', parts: [{ text: message }] }] as any,
          false,
          'gemini-2.5-flash'
        );
        responseText = greetRes.response_text;
      } catch {
        responseText = activeMission
          ? `Bhai! ${activeMission.streakDays} day streak chal rahi hai, consistency ${activeMission.consistencyScore}% hai. Aaj ka plan kya hai?`
          : `Arre! Kya haal hai? Bata kya chal raha hai dimag mein.`;
      }

      await DbService.saveMessage(currentThreadId, actualUserId, 'fp', responseText);

      return c.json({
        status: 'success',
        data: {
          engine_result: { type: 'chat_response', data: {} },
          ai_response: { response_text: responseText },
          thread_id: currentThreadId
        }
      });
    }
    // Parallel DB and Vector Service Loading
    const activeMissionPromise = DbService.getActiveMission(actualUserId);
    const similarMemoriesPromise = VectorService.searchSimilarMemories(message, 2, 0.5).catch((err): any[] => {
      console.error('Vector memory search failed:', err);
      return [];
    });

    let currentThreadId = thread_id;
    if (!currentThreadId) {
      // Use first 40 chars as instant title — update asynchronously in background
      const instantTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '');
      const newThread = await DbService.createChatThread(actualUserId, instantTitle);
      currentThreadId = newThread.id;

      // Background: generate a smart title and update the thread (non-blocking)
      const threadIdForTitle = currentThreadId;
      setImmediate(async () => {
        try {
          const titlePrompt = `Give a concise 2-4 word topic/title for this message (e.g. "UPSC Preparation", "Startup Idea"). Only output the title text, nothing else.\n\nMessage: "${message}"`;
          const titleRes = await LLMService.generateValidatedResponse(actualUserId, titlePrompt, [], [], 1, 1000, true);
          if (titleRes?.response_text) {
            const cleanTitle = titleRes.response_text.trim().replace(/^["']/,'').replace(/["']$/,'');
            if (cleanTitle) await DbService.updateThreadTitle(threadIdForTitle, cleanTitle);
          }
        } catch { /* non-critical — instant title stays */ }
      });

    }

    // Await all parallel background promises
    let activeMission: any;
    let similarMemories: any[];
    const [retrievedMission, retrievedMemories, _] = await Promise.all([
      activeMissionPromise,
      similarMemoriesPromise,
      DbService.saveMessage(currentThreadId, actualUserId, 'user', message)
    ]);
    activeMission = retrievedMission;
    similarMemories = retrievedMemories;

    // Fire and forget: update generic thread title if substantial message received
    if (message.length > 3 && currentThreadId) {
      DbService.getThreadById(currentThreadId).then(thread => {
        if (thread && thread.title === 'Conversation') {
          LLMService.generateThreadTitle(message).then(title => {
            DbService.updateThreadTitle(currentThreadId, title).catch(console.error);
          }).catch(console.error);
        }
      }).catch(console.error);
    }

    let result: any;
    let systemPrompt = '';
    let isTransitioningToExecution = false;

    if (activeMission) {
      console.log(`MESSAGE: Found active locked mission for ${actualUserId}. Running execution/critique mode.`);
      
      const critiqueResult = processCritiqueMessage({
        userId: actualUserId,
        userRuntime: activeMission.userRuntime,
        userMessage: message,
        tasksCompletedToDate: Math.floor(activeMission.consistencyScore / 10),
        tasksAttemptedToDate: Math.floor(activeMission.consistencyScore / 10) + activeMission.consecutiveFailureCount,
        consecutiveFailureCount: activeMission.consecutiveFailureCount,
      }, userLanguage);

      systemPrompt = critiqueResult.systemPrompt;
      result = { type: 'critique_response', data: critiqueResult };
    } else {
      // User has no active mission. Let's see if onboarding is complete!
      const currentHistory = [...conversationHistory, { role: 'user', parts: [{ text: message }] }] as any;
      let extraction;
      try {
        extraction = await LLMService.extractOnboardingData(currentHistory);
      } catch (err: any) {
        console.error('ONBOARDING_EXTRACTION_ERROR:', getAIErrorMessage(err));

        return c.json(
          {
            status: 'success',
            data: {
              engine_result: { type: 'chat_response', data: {} },
              ai_response: {
                response_text: toUserSafeAIText(err)
              }
            }
          },
          200
        );
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

          systemPrompt = buildFullSystemPrompt('execution', executionResult.updatedRuntime, userLanguage);
          result = { type: 'onboarding_complete', data: simulationData };
        
      } else {
        // Onboarding is incomplete. Normal onboarding chat prompt.
        systemPrompt = buildFullSystemPrompt('onboarding', {}, userLanguage);
        result = { type: 'chat_response', data: {} };
      }
    }

    // ── Intercept for Consistency Onboarding ─────────────────────────────────────
    if (activeMission && activeMission.consistencyScore === -1) {
      let extractedScore: number | null = null;
      
      if (!isTransitioningToExecution) {
        const extractPrompt = `
Analyze the user's message and determine if they have provided a numerical self-assessment of their consistency out of 100.
If they provided a number, extract it as an integer between 0 and 100.
If no clear number is provided or if they are dodging the question, return {"score": null}.
Output ONLY valid JSON. Do not include markdown formatting.
User message: "${message}"`;
        
        try {
          const extractRes = await LLMService.generateValidatedResponse(actualUserId, extractPrompt, [], [], 3, 1000, true);
          if (extractRes && extractRes.response_text) {
            const parsed = JSON.parse(extractRes.response_text);
            if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100) {
              extractedScore = parsed.score;
            }
          }
        } catch (e) {
          console.error("Consistency extraction parse error:", e);
        }
      }

      if (extractedScore !== null) {
        activeMission.consistencyScore = extractedScore;
        await DbService.saveMission(activeMission);
        await DbService.addConsistencyLog(actualUserId, extractedScore);
        
        // Inform OmniPipeline of this new context implicitly via conversation history
        conversationHistory.push({ role: 'user', parts: [{ text: `[SYSTEM LOG: User self-assessed initial consistency score as ${extractedScore}/100]` }] });
      } else {
        const blockPrompt = `CRITICAL DIRECTIVE: The user's vault has just been created or they haven't provided their initial consistency score yet. 
You MUST ask them to self-assess their consistency out of 100 before proceeding. Be direct, aggressive, and strict.
Example: 'Vault ready hai. Aage ka execution main track karunga, but pehle mujhe sach bata—aaj ke din, honestly teri consistency 100 mein se kitni hai? Give me a number.'
DO NOT talk about anything else or provide any strategy until they provide this number.`;
        
        let smartResponse;
        try {
          smartResponse = await LLMService.generateSmartResponse(
            actualUserId,
            blockPrompt,
            conversationHistory as any,
            false,
            model
          );
        } catch (err: any) {
          smartResponse = { response_text: "Vault ready hai. Par pehle bata, aaj ke din honestly teri consistency 100 mein se kitni hai? Ek number de (0-100) uske baad main aage badhunga." };
        }
        
        await DbService.saveMessage(currentThreadId, actualUserId, 'fp', smartResponse.response_text);
        
        return c.json({
          status: 'success',
          data: {
            engine_result: { type: 'chat_response', data: {} },
            ai_response: { response_text: smartResponse.response_text },
            thread_id: currentThreadId
          }
        });
      }
    }

    // ── OmniPipeline: Route through Fast-Path or Deep-Path ─────────────────────
    // This is the 100-Crore architecture. OmniPipeline decides:
    //   FAST PATH: Cache hit → sub-second → Gemini gets pre-computed ToneVector
    //   DEEP PATH: Cache miss/structural event → full 16-layer recompute
    // Gemini's ONLY job after this: translate the math into natural Hinglish.
    let finalSystemPrompt = systemPrompt; // Fallback to engine prompt if pipeline errors
    let isCrisisMode = false;

    try {
      const omniInput = {
        userId: actualUserId,
        userLanguage: userLanguage,
        userMessage: message,
        conversationHistory: conversationHistory as any,
        contextMatrix: state_context?.contextMatrix ?? null,
        frictionProfile: state_context?.frictionProfile ?? null,
        strategyState: state_context?.strategyState ?? null,
        detectedEmotionalSignals: [] as EmotionalSignal[],
        detectedChaosEvents: [] as ChaosEventType[],
        daysSinceLastActivity: (() => {
          if (!state_context?.contextMatrix?.onboardingCompletedAt) return 0;
          const onboarded = new Date(state_context.contextMatrix.onboardingCompletedAt);
          const diffTime = Math.abs(Date.now() - onboarded.getTime());
          return Math.floor(diffTime / (1000 * 60 * 60 * 24));
        })(),
        consecutiveCompletionCount: activeMission?.streakDays ?? 0,
        consecutiveFailureCount: activeMission?.streakDays === 0 ? 1 : 0,
        daysSinceLastMilestone: activeMission?.dayNumber ?? 0,
        milestonesHitTotal: activeMission?.dayNumber ?? 0,
        streakDays: activeMission?.streakDays ?? 0,
        currentTasks: [] as OmniContext['currentTasks'],
        recentMemories: (similarMemories || []).map((m: any) => ({
          content: `${m.mission_name} (${m.locked_path}): ${m.outcome_summary}`,
          relevanceScore: (m.success_rate || 50) / 100,
        })),
      };

      // On strategy lock → force deep path to recompute full OmniContext
      const deepTrigger = isTransitioningToExecution ? 'strategy_locked' : undefined;
      const omniResult = await runOmniPipeline(omniInput, deepTrigger as any);

      finalSystemPrompt = omniResult.geminiSystemPrompt;
      isCrisisMode = omniResult.isCrisisMode;

      console.log(`[OmniPipeline] Path: ${omniResult.pathUsed.toUpperCase()} | Crisis: ${isCrisisMode} | User: ${actualUserId}`);
    } catch (omniErr: any) {
      // Non-blocking fallback — if OmniPipeline errors, use the raw systemPrompt
      console.error('[OmniPipeline] Failed, falling back to raw systemPrompt:', omniErr?.message);
    }

    // Call LLM with the OmniPipeline-generated system prompt
    // Gemini receives only the translation directive. All thinking is already done.
    let llmResponse = { response_text: "System prompt generated, awaiting LLM..." };
    if (finalSystemPrompt) {
      // Enrich with cohort memory (if any — already injected via OmniContext.recentMemories)
      const legacyMemText = (!state_context?.contextMatrix && similarMemories && similarMemories.length > 0)
        ? "\n\n## COHORT INTELLIGENCE:\n" +
          similarMemories.map((m: any) => `- ${m.mission_name} (${m.locked_path}): ${m.outcome_summary}`).join('\n')
        : "";

      const enrichedPrompt = finalSystemPrompt + legacyMemText + "\n\n" +
        (activeMission
          ? "If user explicitly logs a task completion/failure, set task_classification to 'completed' or 'failed'. Analyze their message for hesitation words ('but', 'maybe', 'try') to detect dropout risk."
          : "Guide user naturally through goal discovery. When data is sufficient, present simulated paths.");

      let smartResponse;
      try {
        smartResponse = await LLMService.generateSmartResponse(
          actualUserId,
          enrichedPrompt,
          [...conversationHistory, { role: 'user', parts: [{ text: message }] }] as any,
          !activeMission,
          model
        );
      } catch (err: any) {
        console.error('SMART_RESPONSE_ERROR:', getAIErrorMessage(err));

        const safeText = toUserSafeAIText(err);

        await DbService.saveMessage(currentThreadId, actualUserId, 'fp', safeText);

        return c.json(
          {
            status: 'success',
            data: {
              engine_result: result,
              ai_response: {
                response_text: safeText
              }
            }
          },
          200
        );
      }

      llmResponse.response_text = smartResponse.response_text;

      // 1. Handle Task Outcome Logging
      if (activeMission && !isTransitioningToExecution && smartResponse.task_classification && smartResponse.task_classification !== 'none') {
        const classification = smartResponse.task_classification;
        console.log(`MESSAGE: Detected task outcome -> ${classification}. Updating database.`);
        const scoreEvent = classification === 'completed' ? 'task_completed' : 'task_failed';
        const { newScore } = updateConsistencyScore(activeMission.consistencyScore, scoreEvent);
        
        let newStreak = activeMission.streakDays;
        if (classification === 'completed') newStreak += 1;
        else newStreak = 0;

        const updatedMission = {
          ...activeMission,
          consistencyScore: newScore,
          streakDays: newStreak,
          dayNumber: Math.min(activeMission.totalDays, activeMission.dayNumber + 1)
        };

        await DbService.saveMission(updatedMission);
        await DbService.addConsistencyLog(actualUserId, newScore);
      }

      // Layer 13: Critique/Message LLM Output Audit Interceptor & Disclaimer Appendage
      if (activeMission && state_context && state_context.contextMatrix) {
        const auditReport = runLegalAudit(
          state_context.contextMatrix,
          state_context.availablePaths || [],
          state_context.ambitionAssessment || { probabilityOfDeclaredGoal: 50 },
          activeMission.streakDays === 0 ? 1 : 0,
          activeMission.consistencyScore,
          llmResponse.response_text
        );

        if (!auditReport.passedLegalGate) {
          console.warn(`LEGAL_AUDIT: Critique response blocked due to compliance violation.`);
          return c.json({
            status: 'success',
            data: {
              engine_result: result,
              ai_response: {
                response_text: auditReport.requiredDisclaimers.join('\n\n') || "Response blocked due to legal compliance checks."
              }
            }
          });
        }

        if (auditReport.requiredDisclaimers && auditReport.requiredDisclaimers.length > 0) {
          llmResponse.response_text += "\n\n---\n*Disclaimer: " + auditReport.requiredDisclaimers.join(' | ') + "*";
        }
      }
    }

    // Save AI response
    if (llmResponse && llmResponse.response_text) {
      await DbService.saveMessage(currentThreadId, actualUserId, 'fp', llmResponse.response_text);
    }

    // =======================================================================
    // DEEP ANALYTICS: ASYNCHRONOUS EVENT QUEUE
    // =======================================================================
    // Completely decoupled from the API request thread for enterprise scalability
    if (activeMission) {
      analyticsWorker.enqueueMessageAnalysis(actualUserId, message);
    }

    // Background task: Auto-extract mission if no active mission exists yet and this seems like a goal
    if (!activeMission && conversationHistory.length >= 2) {
      LLMService.classifyMessageOutcome(message).then(async () => {
        try {
          const extractionPrompt = `
Analyze the following conversation to determine if the user has established a clear overarching goal or mission.
If they have NOT established a clear goal, return null.
If they HAVE established a goal, extract it into this JSON format:
{
  "missionName": "Short descriptive title (max 4 words)",
  "lockedPath": "alpha or beta (alpha = aggressive, beta = conservative)",
  "totalDays": 90,
  "mindsetBrief": "Short motivational quote summarizing their drive",
  "strategyContent": "High-level summary of the phases/steps they need to execute."
}

Conversation:
${conversationHistory.map(m => m.role + ': ' + m.parts[0].text).join('\n')}
user: ${message}

Output ONLY valid JSON inside the response_text string value. Do not include markdown formatting.
For example: {"response_text": "{\\"missionName\\":\\"My Goal\\", \\"lockedPath\\":\\"alpha\\"}"}`;

          const extractionRes = await LLMService.generateValidatedResponse(actualUserId, extractionPrompt, [], [], 3, 1000, true);
          if (extractionRes.response_text && extractionRes.response_text.trim() !== 'null') {
            const parsed = JSON.parse(extractionRes.response_text);
            if (parsed.missionName) {
              await DbService.saveMission({
                user_id: actualUserId,
                missionName: parsed.missionName,
                lockedPath: parsed.lockedPath || 'alpha',
                probabilityLow: 25.0,
                probabilityHigh: 75.0,
                dayNumber: 1,
                totalDays: parsed.totalDays || 90,
                consistencyScore: -1,
                streakDays: 0,
                mindsetBrief: parsed.mindsetBrief || "Execute the vision.",
                strategyContent: parsed.strategyContent || "Phase 1 initialized.",
                chatThreadId: currentThreadId
              });
              await DbService.addConsistencyLog(actualUserId, -1);
            }
          }
        } catch (e) {
          console.error('Background Mission Extraction Error:', e);
        }
      });
    }

    return c.json({
      status: 'success',
      data: {
        engine_result: result,
        ai_response: llmResponse,
        thread_id: currentThreadId
      }
    });

  } catch (err: any) {
    const safeText = toUserSafeAIText(err);

    console.error('INTERACTION_MESSAGE_FATAL:', getAIErrorMessage(err));

    return c.json(
      {
        status: 'success',
        data: {
          engine_result: { type: 'chat_response', data: {} },
          ai_response: {
            response_text: safeText
          }
        }
      },
      200
    );
  }
});

// Endpoint to fetch current user's active locked mission
interactionRoutes.get('/active-mission', async (c) => {
  const userId = c.get('userId');

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const mission = await DbService.getActiveMission(userId);
  if (!mission) {
    return c.json({ status: 'success', data: null });
  }

  // Calculate debt days
  const history = await DbService.getConsistencyHistory(userId);
  let debtDays = 0;
  if (history.length > 0) {
    const lastLog = history[history.length - 1];
    const lastDate = new Date(lastLog.logged_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    debtDays = Math.max(0, diffDays); // consecutive days since last log
  }

  const daysToGoal = Math.max(0, mission.totalDays - mission.dayNumber);

  let dynamicMindset = mission.mindsetBrief;
  let dynamicCoreStrategy = "Follow the locked path. Execute daily targets without fail.";
  let dynamicProtocol = mission.strategyContent;

  try {
    const prompt = `Generate a dynamic, real-time daily execution brief for the user's current state. 
Mission: ${mission.missionName}
Day: ${mission.dayNumber}/${mission.totalDays}
Consistency Score: ${mission.consistencyScore}%
Streak: ${mission.streakDays} days
Debt Days (missed days): ${debtDays}

Output ONLY valid JSON in this EXACT format:
{
  "mindsetBrief": "Short professional yet highly encouraging Hinglish motivational quote based on their current streak or progress (hybrid of ChatGPT, Claude, and Gemini style).",
  "coreStrategy": "1-2 lines summarizing the aggressive strategy for today.",
  "strategyContent": "List of 3-4 actionable protocol steps for today. Prefix each with a hyphen. Example:\\n- Wake up at 5 AM\\n- Clear 2 backlog lectures"
}
Do not use markdown blocks.`;
    
    const response = await LLMService.generateValidatedResponse(userId, prompt, [], []);
    if (response && response.response_text) {
      try {
        const parsed = JSON.parse(response.response_text);
        if (parsed.mindsetBrief) dynamicMindset = parsed.mindsetBrief;
        if (parsed.coreStrategy) dynamicCoreStrategy = parsed.coreStrategy;
        if (parsed.strategyContent) dynamicProtocol = parsed.strategyContent;
      } catch (e) { }
    } else if (response && (response as any).mindsetBrief) {
       dynamicMindset = (response as any).mindsetBrief;
       if ((response as any).coreStrategy) dynamicCoreStrategy = (response as any).coreStrategy;
       if ((response as any).strategyContent) dynamicProtocol = (response as any).strategyContent;
    }
  } catch (err) {
    console.error('ACTIVE_MISSION: Failed to generate dynamic brief, using stale:', err);
  }

  return c.json({
    status: 'success',
    data: {
      ...mission,
      mindsetBrief: dynamicMindset,
      coreStrategy: dynamicCoreStrategy,
      strategyContent: dynamicProtocol,
      debtDays,
      daysToGoal
    }
  });
});

// Endpoint to lock strategy trajectory when onboarding completes
interactionRoutes.post('/lock-trajectory', async (c) => {
  try {
    const {
      userId,
      missionName,
      lockedPath,
      probabilityLow,
      probabilityHigh,
      totalDays,
      mindsetBrief,
      strategyContent,
      chatThreadId
    } = await c.req.json();
    
    const actualUserId = c.get('userId');

    if (!actualUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const mission = {
      user_id: actualUserId,
      missionName: missionName || 'SaaS Trajectory Lock',
      lockedPath: lockedPath || 'alpha',
      probabilityLow: probabilityLow || 18.4,
      probabilityHigh: probabilityHigh || 24.0,
      dayNumber: 1,
      totalDays: totalDays || 90,
      consistencyScore: 100,
      streakDays: 0,
      mindsetBrief: mindsetBrief || 'Tu average nahi hai. Execute kar.',
      strategyContent: strategyContent || 'Phase 1: Foundation lock (Day 1-30).',
      chatThreadId: chatThreadId || 'thread-' + Date.now()
    };
    
    const savedMission = await DbService.saveMission(mission);
    await DbService.addConsistencyLog(actualUserId, 100);

    // Save initial lock profile to Vector Memory (Hive Mind)
    const profileText = `Goal: ${mission.missionName} | Path: ${mission.lockedPath} | Total Days: ${mission.totalDays} | Mindset: ${mission.mindsetBrief}`;
    VectorService.saveMemory({
      user_id: actualUserId,
      mission_name: mission.missionName,
      locked_path: mission.lockedPath,
      profile_text: profileText,
      outcome_summary: `Trajectory locked. Initial consistency set to 100%. Path: ${mission.lockedPath}.`,
      success_rate: 100
    }).catch(err => console.error('HIVE_MIND: Failed to store trajectory lock memory:', err));

    // Asynchronously generate initial market report on locking
    const mandate = `
═══════════════════════════════════════════════════════════════
FP-OS INTELLIGENCE RESEARCH MANDATE
User Profile: ${actualUserId}
Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
Active Mission: ${mission.missionName}
Locked Path: ${mission.lockedPath}
Total Days: ${mission.totalDays}

MANDATE:
Analyze real-time market opportunities, local gaps, competitor landscape, and timing signals for the target: "${mission.missionName}" using the ${mission.lockedPath} path.
Provide hyper-local data for Kanpur, Uttar Pradesh, India if applicable, or general metrics for remote work.

You MUST return JSON in this EXACT structure:
{
  "skillDemandSignals": [{"skillName": "...", "demandLevel": "High/Medium/Low", "trend": "Rising/Stable/Declining"}],
  "localMarketGaps": [{"gapDescription": "...", "opportunitySize": "Large/Medium/Small"}],
  "timingSignals": [{"timeframe": "...", "urgency": "CRITICAL/HIGH/NORMAL"}],
  "topInsight": "One paragraph summary in Hinglish about the most important market signal right now."
}
Do not use markdown. Return only the JSON object.
    `.trim();

    LLMService.generateGroundedIntelligenceReport(mandate)
      .then(async (groundedData) => {
        // Map backend schema to frontend schema if needed
        const normalizedData = groundedData.skillDemandSignals 
          ? groundedData
          : {
              skillDemandSignals: (groundedData.competitorLandscape || []).map((item: string, i: number) => ({
                skillName: item,
                demandLevel: i === 0 ? 'High' : 'Medium',
                trend: 'Rising'
              })),
              localMarketGaps: (groundedData.localOpportunities || []).map((item: string) => ({
                gapDescription: item,
                opportunitySize: 'Medium'
              })),
              timingSignals: [{ timeframe: 'Next 30 days', urgency: 'HIGH' }],
              topInsight: groundedData.marketSummary || groundedData.recommendedAction || 'Market data is being analyzed.'
            };
        await DbService.saveMarketReport(actualUserId, normalizedData);
        console.log('MARKET_REPORT: Generated and saved initial grounded report on lock.');
      })
      .catch((err) => {
        console.error('MARKET_REPORT: Initial generation failed on lock:', err);
      });

    return c.json({ status: 'success', data: savedMission });
  } catch (error: any) {
    console.error('Lock Trajectory Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Endpoint to log task completion/failure via button click
interactionRoutes.post('/log-task', async (c) => {
  try {
    const { userId, outcome } = await c.req.json();
    const actualUserId = c.get('userId');

    if (!actualUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const activeMission = await DbService.getActiveMission(actualUserId);
    if (!activeMission) {
      return c.json({ error: 'No active mission found' }, 404);
    }

    const scoreEvent = outcome === 'completed' ? 'task_completed' : 'task_failed';
    const { newScore } = updateConsistencyScore(activeMission.consistencyScore, scoreEvent);

    let newStreak = activeMission.streakDays;
    if (outcome === 'completed') {
      newStreak += 1;
    } else {
      newStreak = 0;
    }

    const updatedMission = {
      ...activeMission,
      consistencyScore: newScore,
      streakDays: newStreak,
      dayNumber: Math.min(activeMission.totalDays, activeMission.dayNumber + 1)
    };

    await DbService.saveMission(updatedMission);
    await DbService.addConsistencyLog(actualUserId, newScore);

    // Log task completion outcome in Vector Memory (Hive Mind)
    VectorService.saveMemory({
      user_id: actualUserId,
      mission_name: activeMission.missionName,
      locked_path: activeMission.lockedPath,
      profile_text: `Goal: ${activeMission.missionName} | Path: ${activeMission.lockedPath} | Day: ${activeMission.dayNumber}`,
      outcome_summary: `Task completion logged via action button: ${outcome}. New consistency score: ${newScore}%. Streak: ${newStreak} days.`,
      success_rate: newScore
    }).catch(err => console.error('HIVE_MIND: Failed to store task outcome memory:', err));

    return c.json({ status: 'success', data: updatedMission });
  } catch (err: any) {
    const safeText = toUserSafeAIText(err);

    console.error('INTERACTION_ROUTE /log-task ERROR:', getAIErrorMessage(err));

    return c.json(
      {
        status: 'success',
        data: {
          engine_result: { type: 'chat_response', data: {} },
          ai_response: {
            response_text: safeText
          }
        }
      },
      200
    );
  }
});

// Endpoint to fetch consistency log and AI strengths/bottlenecks for Reality Mirror
interactionRoutes.get('/reality-mirror', async (c) => {
  const userId = c.get('userId');

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const activeMission = await DbService.getActiveMission(userId);
  if (!activeMission) {
    return c.json({ status: 'success', data: null });
  }

  const history = await DbService.getConsistencyHistory(userId);
  const scores = history.map(h => h.score);

  let trend: 'up' | 'down' = 'up';
  if (scores.length >= 2) {
    const mid = Math.floor(scores.length / 2);
    const firstHalfAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalfAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    trend = secondHalfAvg >= firstHalfAvg ? 'up' : 'down';
  }

  let insightData = {
    strengths: [
      "Technical velocity is strong: stack expertise confirmed",
      "Liquid capital runway: stable status band",
      "Goal intent: high clarity on milestone metrics",
      "System parameters alignment: steady starting discipline"
    ],
    bottlenecks: [
      "Complexity trigger: likely to stall on integration gaps",
      "Execution environment: suboptimal setup for focus",
      "Consistency decay: vulnerable to weekend drifts",
      "Outreach loop delay: cold feedback cycles"
    ],
    insight: `Tu active mode ke paas hai. Score: ${activeMission.consistencyScore}/100. Teri technical setup ready hai. Daily execution check points log karna shuru kar. Bhai rukna mat.`
  };

  try {
    const prompt = `Analyze this user's active trajectory and current progress.
Active Mission Name: "${activeMission.missionName}"
Locked Path: "${activeMission.lockedPath}"
Current Day Number: ${activeMission.dayNumber} of ${activeMission.totalDays}
Consistency Score: ${activeMission.consistencyScore}/100
Streak Days: ${activeMission.streakDays}
Current Trend Direction: ${trend}

Generate:
1. 4 specific Strengths (in Hinglish/English, matching their execution style)
2. 4 specific Bottlenecks (in Hinglish/English, highlighting potential triggers like laziness, distraction)
3. A behavioral insight paragraph in friendly Hinglish (supportive, motivational but honest).

You must respond in ONLY JSON format conforming to this interface:
{
  "strengths": string[],
  "bottlenecks": string[],
  "insight": string
}
Do not include markdown or backticks.`;

    const response = await LLMService.generateValidatedResponse(userId, prompt, [], []);
    if (response && response.response_text) {
      try {
        const parsed = JSON.parse(response.response_text);
        if (parsed.strengths && parsed.bottlenecks) {
          insightData = parsed;
        }
      } catch {}
    } else if (response && response.strengths && response.bottlenecks) {
      insightData = {
        strengths: response.strengths,
        bottlenecks: response.bottlenecks,
        insight: response.insight || ""
      };
    }
  } catch (err) {
    console.error('REALITY_MIRROR: Insight LLM fail, using fallback:', err);
  }

  return c.json({
    status: 'success',
    data: {
      history: scores.length > 0 ? scores : [activeMission.consistencyScore],
      trend,
      strengths: insightData.strengths,
      bottlenecks: insightData.bottlenecks,
      insight: insightData.insight
    }
  });
});

// Endpoint to fetch and cache dynamic market reports
interactionRoutes.get('/market-report', async (c) => {
  const userId = c.get('userId');

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  let report = await DbService.getMarketReport(userId);
  
  let needsRefresh = false;
  if (!report) {
    needsRefresh = true;
  } else {
    const ageMs = Date.now() - new Date(report.created_at).getTime();
    const hours = ageMs / (1000 * 60 * 60);
    if (hours >= 24) {
      needsRefresh = true;
    }
  }
  
  if (needsRefresh) {
    console.log('MARKET_REPORT: Refreshing report data in the background...');
    DbService.getActiveMission(userId).then((activeMission) => {
      if (activeMission) {
        const mandate = `
═══════════════════════════════════════════════════════════════
FP-OS INTELLIGENCE RESEARCH MANDATE
User Profile: ${userId}
Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
CONTEXT:
Active Mission: ${activeMission.missionName}
Locked Path: ${activeMission.lockedPath}
Total Days: ${activeMission.totalDays}

MANDATE:
Analyze real-time market opportunities, local gaps, competitor landscape, and timing signals for the target: "${activeMission.missionName}" using the ${activeMission.lockedPath} path.
Provide hyper-local data for Kanpur, Uttar Pradesh, India if applicable, or general metrics for remote work.

You MUST return JSON in this EXACT structure:
{
  "skillDemandSignals": [{"skillName": "...", "demandLevel": "High/Medium/Low", "trend": "Rising/Stable/Declining"}],
  "localMarketGaps": [{"gapDescription": "...", "opportunitySize": "Large/Medium/Small"}],
  "timingSignals": [{"timeframe": "...", "urgency": "CRITICAL/HIGH/NORMAL"}],
  "topInsight": "One paragraph summary in Hinglish about the most important market signal right now."
}
Do not use markdown. Return only the JSON object.
        `.trim();

        LLMService.generateGroundedIntelligenceReport(mandate)
          .then(async (groundedData) => {
            // Map backend schema to frontend schema if needed
            const normalizedData = groundedData.skillDemandSignals 
              ? groundedData
              : {
                  skillDemandSignals: (groundedData.competitorLandscape || []).map((item: string, i: number) => ({
                    skillName: item,
                    demandLevel: i === 0 ? 'High' : 'Medium',
                    trend: 'Rising'
                  })),
                  localMarketGaps: (groundedData.localOpportunities || []).map((item: string) => ({
                    gapDescription: item,
                    opportunitySize: 'Medium'
                  })),
                  timingSignals: [{ timeframe: 'Next 30 days', urgency: 'HIGH' }],
                  topInsight: groundedData.marketSummary || groundedData.recommendedAction || 'Market data is being analyzed.'
                };
            await DbService.saveMarketReport(userId, normalizedData);
            console.log('MARKET_REPORT: Background report refreshed successfully.');
          })
          .catch((err) => {
            console.error('MARKET_REPORT: Background generation failed:', err);
          });
      }
    }).catch(err => {
      console.error('MARKET_REPORT: Failed to fetch active mission for background report:', err);
    });
  }
  
  return c.json({
    status: 'success',
    data: report ? report.report_data : null
  });
});

// Endpoint to fetch aggregated anonymous stats for Rival Index
interactionRoutes.get('/rival-index', async (c) => {
  const userId = c.get('userId');

  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const activeMission = await DbService.getActiveMission(userId);
  
  if (!activeMission) {
    return c.json({ status: 'success', data: null });
  }
  
  const stats = await DbService.getRivalIndexStats(userId, activeMission.missionName);
  return c.json({
    status: 'success',
    data: {
      totalUsers: stats.totalUsers,
      milestonePassedUsers: stats.milestonePassedUsers,
      category: activeMission.missionName
    }
  });
});

// Mode 1: Material Circumstances & Calibration Diagnosis
interactionRoutes.post('/diagnostic', async (c) => {
  try {
    const input = await c.req.json();
    const result = runCircumstantialDiagnosis(input);
    return c.json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Diagnostic API Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Mode 2: Tactical Architect Simulation & Opportunities Builder
interactionRoutes.post('/architect', async (c) => {
  try {
    const input = await c.req.json();
    const result = await runTacticalArchitect(input);
    return c.json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Tactical Architect API Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Mode 3: Execution Operator Task Logging (Adaptive + Self-Correcting Recalibration Loop)
interactionRoutes.post('/operator/task', async (c) => {
  try {
    const { input: taskInput, matrix, capabilityVector, frictionProfile } = await c.req.json();
    const actualUserId = c.get('userId');

    if (!actualUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    taskInput.userId = actualUserId;

    const result = await processOperatorTaskUpdate(taskInput, matrix, capabilityVector, frictionProfile);
    
    // Save state back to DB if mission is active
    const activeMission = await DbService.getActiveMission(actualUserId);
    if (activeMission) {
      const updatedMission = {
        ...activeMission,
        consistencyScore: result.updatedRuntime.strategyState.consistencyScore,
        streakDays: result.updatedRuntime.strategyState.currentStreak,
        dayNumber: result.updatedRuntime.strategyState.currentDayNumber
      };
      await DbService.saveMission(updatedMission);
      await DbService.addConsistencyLog(actualUserId, updatedMission.consistencyScore);

      // Log task update in Vector Memory (Hive Mind)
      VectorService.saveMemory({
        user_id: actualUserId,
        mission_name: activeMission.missionName,
        locked_path: activeMission.lockedPath,
        profile_text: `Goal: ${activeMission.missionName} | Path: ${activeMission.lockedPath} | Day: ${activeMission.dayNumber}`,
        outcome_summary: `Operator task update processed. Outcomes: ${taskInput.outcome}. Consistency updated to ${result.updatedRuntime.strategyState.consistencyScore}%.`,
        success_rate: result.updatedRuntime.strategyState.consistencyScore
      }).catch(err => console.error('HIVE_MIND: Failed to store task outcome memory:', err));
    }
    
    return c.json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Execution Operator Task Update API Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Mode 3: Execution Operator Critique Terminal (Dopamine & State Lock Audit checks)
interactionRoutes.post('/operator/critique', async (c) => {
  try {
    const input = await c.req.json();
    const actualUserId = c.get('userId');

    if (!actualUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    input.userId = actualUserId;

    const result = processOperatorCritique(input);
    return c.json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Execution Operator Critique API Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Mode 3: Dynamic task generation/fetch for current day execution
interactionRoutes.post('/operator/current-tasks', async (c) => {
  try {
    const { dayNumber, matrix, capabilityVector, frictionProfile, strategyState } = await c.req.json();
    const taskSprint = await generateDailyTaskSprint(
      dayNumber || 1,
      matrix,
      capabilityVector,
      frictionProfile,
      strategyState
    );
    return c.json({ status: 'success', data: taskSprint });
  } catch (error: any) {
    console.error('Fetch Current Tasks API Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// B2B CMO Dashboard Endpoint for PW Pitch (Real Aggregation)
interactionRoutes.get('/api/v1/analytics/cohort-health', async (c) => {
  try {
    const b2bData = await DbService.getB2bCohortAnalytics();
    
    return c.json({
      status: 'success',
      data: b2bData
    });
  } catch (err) {
    console.error("Cohort Health API Error:", err);
    return c.json({ error: "Failed to fetch cohort analytics" }, 500);
  }
});

// VIRAL ENGINE: REALITY ROAST
interactionRoutes.post('/roast', async (c) => {
  try {
    const { routine } = await c.req.json();
    if (!routine) return c.json({ error: "Routine is required" }, 400);

    const result = await LLMService.generateRealityRoast(routine);
    return c.json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('Roast API Error:', error);
    return c.json({ error: error.message }, 500);
  }
});
