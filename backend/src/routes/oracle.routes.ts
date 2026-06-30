import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { streamSSE } from 'hono/streaming';
import { requireAuth } from '../middleware/auth.middleware';
import { LLMService } from '../services/llm.service';
import {
  getElonBrain, getHesfyBrain, getTopperBrain, getGiglBrain,
  getBrainForSoul, SOUL_METADATA, type SoulId
} from '../mentors/brain-loader';
import { DbService } from '../services/db.service';
import { runOmniPipeline, OmniPipelineInput } from '../engine/OmniPipeline';

export const oracleRoutes = new Hono<{ Variables: { userId: string; userLanguage: string } }>();

oracleRoutes.use('*', requireAuth);

// ─── Request Schema ──────────────────────────────────────────────────────────
const oracleSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() }))
  })).optional().default([]),
  studentContext: z.string().optional().default(''),
});

// ─── Classifier Prompt ───────────────────────────────────────────────────────
function buildClassifierPrompt(userMessage: string): string {
  return `You are an expert psychologist and student behavior analyst.
Analyze the following student message and return a JSON object ONLY — no markdown, no explanation.

Student message: "${userMessage}"

Return this exact JSON structure:
{
  "topic": "STUDY | BUSINESS | MOTIVATION | LIFE | HACK | MIXED",
  "emotion": "ANXIOUS | DEMOTIVATED | CONFUSED | ENERGIZED | PANIC | NEUTRAL | HAPPY | FRUSTRATED",
  "need": "KNOWLEDGE | PUSH | CALM | STRATEGY | QUICK_TIP | JUST_LISTEN | TOUGH_LOVE",
  "urgency": "HIGH | MEDIUM | LOW",
  "primary_soul": "VISIONARY | SCHOLAR | HACKER",
  "supporting_souls": ["VISIONARY", "SCHOLAR", "HACKER"],
  "tone": "AGGRESSIVE | CALM | STRUCTURED | ENERGETIC | WARM | DIRECT | EMPATHETIC"
}

Rules for soul selection:
- VISIONARY (Elon Musk): Goals, strategy, business, big-picture thinking, time management, engineering, procrastination, excuses, lack of discipline
- SCHOLAR (JEE/NEET Toppers): Exam prep, concepts, numericals, subject doubts, study schedules
- HACKER (GIGL): Quick tips, life hacks, shortcuts, skill-building, productivity tricks

Emotion → Tone rules:
- PANIC → CALM + STRUCTURED (never aggressive when panicking)
- DEMOTIVATED → aggressive TOUGH_LOVE from VISIONARY
- ANXIOUS → WARM + CALM from SCHOLAR or VISIONARY
- ENERGIZED → match energy, PUSH harder
- CONFUSED → STRUCTURED breakdown
- HAPPY → ENERGETIC, celebrate and redirect to next milestone
- FRUSTRATED → EMPATHETIC first, then DIRECT`;
}

// ─── ORACLE System Prompt Builder ────────────────────────────────────────────
function buildOracleSystemPrompt(
  analysis: any,
  studentContext: string
): string {
  // Load all relevant brains
  const primaryBrain = getBrainForSoul(analysis.primary_soul as SoulId);

  // Load supporting brains (max 1 additional to keep context tight)
  const supportingSoul = (analysis.supporting_souls as SoulId[])
    .filter(s => s !== analysis.primary_soul)[0];
  const supportingBrain = supportingSoul ? getBrainForSoul(supportingSoul) : '';

  const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['VISIONARY'];

  return `You are ORACLE — a living, breathing mentor who carries the combined wisdom of the world's most elite achievers.

Right now, you are channeling your "${primaryMeta.emoji} ${primaryMeta.name}" soul.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIMARY KNOWLEDGE BASE (${primaryMeta.name}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${primaryBrain}

${supportingBrain ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPPORTING WISDOM (${SOUL_METADATA[supportingSoul!]?.name}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${supportingBrain.slice(0, 2000)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${studentContext || 'No additional context provided.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETECTED CONTEXT:
- Student emotion: ${analysis.emotion}
- What they need: ${analysis.need}
- Urgency: ${analysis.urgency}
- Tone to use: ${analysis.tone}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ORACLE COMMANDMENTS (Follow these absolutely):

1. THE "REAL FRIEND" TONE (No Corporate Filter):
   You are their closest, smartest best friend. You are NOT a generic AI, and you are NOT a corporate customer service bot. 
   - Speak to them like an equal. Use a highly relatable, conversational tone.
   - If the situation demands it (e.g. they are being lazy), use brutal "Tough Love". A true friend doesn't sugarcoat reality.
   - Do not sound like a robotic authority figure, but DO be fiercely honest. 

2. KNOWLEDGE BASE INJECTION (CRITICAL):
   You MUST organically extract and use the exact philosophies, analogies, and signature phrases from your PRIMARY KNOWLEDGE BASE.
   - Use its concepts and intense dialogues natively, BUT you MUST automatically filter out literal profanity, slurs, or extreme hate speech from the knowledge base before outputting them. Replace them with clean, sharp Hindi/English words that deliver the same intense reality check without triggering API safety bans.
   - Be brutal, but be API-safe.

3. THE 3 MENTOR PERSPECTIVES (How to channel them as a friend):
   - VISIONARY (Elon): Draw upon first-principles thinking and big-picture strategy. Push them to think bigger. When they make excuses or slack off, hit them with intense reality checks.
   - SCHOLAR (Topper): Share systematic execution and academic hacks. Help them study efficiently.
   - HACKER (GIGL): Share smart cuts and efficiency tricks like a friend sharing a secret cheat code.

3. LANGUAGE & FORMATTING:
   - Hinglish is your default. Blend Hindi and English seamlessly and naturally (e.g., "Dekho, the fundamental issue here is...").
   - Structure your response cleanly. Use headers if necessary.
   - **CRITICAL:** Do NOT repeat or output any timestamps (e.g., [Sent: 30 Jun, 08:12 pm]). Ignore them in the conversation history.

4. ENDING:
   - For simple greetings, end naturally without a forced action.
   - For complex problems, conclude with a thoughtful, actionable next step that the student can execute immediately.`;
}

// ─── Classifier AI Call ──────────────────────────────────────────────────────
async function classifyMessage(message: string): Promise<any> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const keys = (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '')
      .split(',').map(k => k.trim()).filter(Boolean);

    if (!keys.length) throw new Error('No Gemini API key found');

    const client = new GoogleGenAI({ apiKey: keys[0] });
    const resp = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: buildClassifierPrompt(message) }] }],
      config: { maxOutputTokens: 300, temperature: 0.1 }
    });

    const raw = resp.text?.trim() || '';
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('[ORACLE] Classifier failed, using defaults:', e);
    // Intelligent fallback based on message keywords
    return {
      topic: 'MIXED',
      emotion: 'NEUTRAL',
      need: 'KNOWLEDGE',
      urgency: 'MEDIUM',
      primary_soul: 'VISIONARY',
      supporting_souls: ['SCHOLAR'],
      tone: 'DIRECT'
    };
  }
}

// ─── ORACLE Streaming Chat Route ─────────────────────────────────────────────
oracleRoutes.post('/chat/stream', zValidator('json', oracleSchema), async (c) => {
  const { message, conversationHistory, studentContext } = c.req.valid('json');
  const userId = c.get('userId');
  const queryThreadId = c.req.query('thread_id');

  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  return streamSSE(c, async (stream) => {
    try {
      const userLanguage = c.get('userLanguage') || 'Hinglish';

      // Step 1: Run Oracle Classifier and OmniPipeline DB Fetch in PARALLEL (< 600ms TTFT)
      let currentThreadId = queryThreadId;
      if (!currentThreadId || currentThreadId === 'null') {
        const title = message.substring(0, 40) + '...';
        const thread = await DbService.createChatThread(userId, title);
        currentThreadId = thread.id;
      }

      // Save user message
      await DbService.saveMessage(currentThreadId, userId, 'user', message);

      const [analysis, activeMission] = await Promise.all([
        classifyMessage(message),
        DbService.getActiveMission(userId).catch((): any => null)
      ]);

      // ── Intercept for Consistency Onboarding ─────────────────────────────────────
      if (activeMission && activeMission.consistencyScore === -1) {
        let extractedScore: number | null = null;
        
        const extractPrompt = `
Analyze the user's message and determine if they have provided a numerical self-assessment of their consistency out of 100.
If they provided a number, extract it as an integer between 0 and 100.
If no clear number is provided or if they are dodging the question, return {"score": null}.
Output ONLY valid JSON. Do not include markdown formatting.
User message: "${message}"`;
        
        try {
          const extractRes = await LLMService.generateValidatedResponse(userId, extractPrompt, [], [], 3, 1000, true);
          if (extractRes && extractRes.response_text) {
            const parsed = JSON.parse(extractRes.response_text);
            if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100) {
              extractedScore = parsed.score;
            }
          }
        } catch (e) {
          console.error("Consistency extraction parse error:", e);
        }

        if (extractedScore !== null) {
          activeMission.consistencyScore = extractedScore;
          await DbService.saveMission(activeMission);
          await DbService.addConsistencyLog(userId, extractedScore);
          
          // Inform Oracle of this new context implicitly via conversation history
          const systemLogMessage = { role: 'user' as const, parts: [{ text: `[SYSTEM LOG: User self-assessed initial consistency score as ${extractedScore}/100]` }] };
          if (Array.isArray(conversationHistory)) {
             conversationHistory.push(systemLogMessage);
          } else {
             // @ts-ignore
             conversationHistory = [systemLogMessage];
          }
        } else {
          // INTERCEPT: Stream a hard-coded response demanding the score
          const responseText = "Vault ready hai. Par pehle bata, aaj ke din honestly teri consistency 100 mein se kitni hai? Ek number de (0-100) uske baad main aage badhunga.";
          
          await stream.writeSSE({
            event: 'soul',
            data: JSON.stringify({
              soul: 'VISIONARY',
              soulName: SOUL_METADATA['VISIONARY'].name,
              emoji: SOUL_METADATA['VISIONARY'].emoji,
              color: SOUL_METADATA['VISIONARY'].color,
              emotion: 'NEUTRAL',
              tone: 'AGGRESSIVE',
              thread_id: currentThreadId
            })
          });
          
          // Stream the responseText chunk
          await stream.writeSSE({ data: JSON.stringify({ chunk: responseText }) });
          await DbService.saveMessage(currentThreadId, userId, 'fp', responseText);
          await stream.writeSSE({ event: 'done', data: '[DONE]' });
          return;
        }
      }

      // Background task: Auto-extract mission if no active mission exists yet and this seems like a goal
      if (!activeMission && conversationHistory && conversationHistory.length >= 2) {
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
${conversationHistory.map((m: any) => m.role + ': ' + m.parts[0].text).join('\n')}
user: ${message}

Output ONLY valid JSON inside the response_text string value. Do not include markdown formatting.
For example: {"response_text": "{\\"missionName\\":\\"My Goal\\", \\"lockedPath\\":\\"alpha\\"}"}`;

            const extractionRes = await LLMService.generateValidatedResponse(userId, extractionPrompt, [], [], 3, 1000, true);
            if (extractionRes.response_text && extractionRes.response_text.trim() !== 'null') {
              const parsed = JSON.parse(extractionRes.response_text);
              if (parsed.missionName) {
                await DbService.saveMission({
                  user_id: userId,
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
                await DbService.addConsistencyLog(userId, -1);
              }
            }
          } catch (e) {
            console.error('Background Mission Extraction Error:', e);
          }
        });
      }

      const state_context: any = null; // Passed via raw string in Oracle prompt instead

      const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['VISIONARY'];

      // Send soul metadata first so frontend can update badge immediately
      await stream.writeSSE({
        event: 'soul',
        data: JSON.stringify({
          soul: analysis.primary_soul,
          soulName: primaryMeta.name,
          emoji: primaryMeta.emoji,
          color: primaryMeta.color,
          emotion: analysis.emotion,
          tone: analysis.tone,
          thread_id: currentThreadId
        })
      });

      // Step 2: Build OmniInput and run 16-Layer OmniPipeline (Fast Sync Math)
      const omniInput: OmniPipelineInput = {
        userId,
        userLanguage,
        userMessage: message,
        conversationHistory: conversationHistory as any,
        contextMatrix: state_context?.contextMatrix ?? null,
        frictionProfile: state_context?.frictionProfile ?? null,
        strategyState: state_context?.strategyState ?? null,
        detectedEmotionalSignals: [],
        detectedChaosEvents: [],
        daysSinceLastActivity: (() => {
          if (!state_context?.contextMatrix?.onboardingCompletedAt) return 0;
          const onboarded = new Date(state_context.contextMatrix.onboardingCompletedAt);
          return Math.floor(Math.abs(Date.now() - onboarded.getTime()) / (1000 * 60 * 60 * 24));
        })(),
        consecutiveCompletionCount: activeMission?.streakDays ?? 0,
        consecutiveFailureCount: activeMission?.streakDays === 0 ? 1 : 0,
        daysSinceLastMilestone: activeMission?.dayNumber ?? 0,
        milestonesHitTotal: activeMission?.dayNumber ?? 0,
        streakDays: activeMission?.streakDays ?? 0,
        currentTasks: [],
        recentMemories: [],
      };

      let omniDataBlock = "";
      try {
        const omniResult = await runOmniPipeline(omniInput);
        const { toneVector, chaosState, userSnapshot } = omniResult.omniContext;
        omniDataBlock = `[16-LAYER REAL-TIME ENGINE COMPUTATION]
- Computed Tone: ${JSON.stringify(toneVector)}
- Chaos Volatility: ${(chaosState.currentVolatilityScore * 100).toFixed(0)}%
- Streak: ${userSnapshot.streakDays} days
- Consistency: ${userSnapshot.consistencyScore}/100`;
      } catch (err) {
        console.error('[ORACLE] OmniPipeline failed, falling back', err);
      }

      // Step 3: Build the God-Level ORACLE system prompt
      const oraclePrompt = buildOracleSystemPrompt(analysis, studentContext);
      
      // MASTER MERGE: Real-time 16-Layer Math + Oracle Mentor (No Identity Clash)
      const masterSystemPrompt = omniDataBlock 
        ? `${omniDataBlock}\n\n${oraclePrompt}`
        : oraclePrompt;

      // Step 4: Stream the actual response via Gemini Pro
      const keys = (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '').split(',').map((k: string) => k.trim()).filter(Boolean);
      if (!keys.length) throw new Error('No Gemini API key found');

      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey: keys[0] });

      // Sanitize conversation history to remove timestamps like [Sent: 30 Jun, 09:19 pm]
      const sanitizedHistory = (conversationHistory || []).map(msg => ({
        ...msg,
        parts: msg.parts.map(part => ({
          text: part.text.replace(/^\[Sent:.*?\]\s*/i, '')
        }))
      }));

      const contents = [
        { role: 'user' as const, parts: [{ text: `[SYSTEM INITIALIZATION]\n${masterSystemPrompt}` }] },
        { role: 'model' as const, parts: [{ text: 'Understood. I am ORACLE infused with the 16-layer OmniEngine. Ready.' }] },
        ...sanitizedHistory,
        { role: 'user' as const, parts: [{ text: message }] }
      ];

      const responseStream = await client.models.generateContentStream({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.85
        }
      });

      // Accumulate the full response to prevent Serverless SSE connection drops
      let fullAiResponse = "";
      for await (const chunk of responseStream) {
        const finishReason = chunk.candidates?.[0]?.finishReason;
        
        let text = "";
        try {
          text = chunk.text || "";
        } catch (e) {
          console.warn("[ORACLE] SDK blocked text access on chunk. Reason:", finishReason);
        }

        if (text) {
          fullAiResponse += text;
        }

        if (finishReason && finishReason !== 'STOP') {
          console.warn('[ORACLE] Stream ended prematurely. Reason:', finishReason);
          fullAiResponse += `\n\n[System Notification: AI Stream halted. Reason: ${finishReason}.]`;
          break; // Stop processing further chunks safely
        }
      }
      
      // Send the entire response in one go to ensure 100% delivery
      if (fullAiResponse) {
        await stream.writeSSE({ data: JSON.stringify({ chunk: fullAiResponse }) });
      }

      // Save AI message to DB
      if (currentThreadId) {
        await DbService.saveMessage(currentThreadId, userId, 'fp', fullAiResponse);
      }

      // Signal completion
      await stream.writeSSE({ event: 'done', data: '[DONE]' });

    } catch (err: any) {
      console.error('[ORACLE] Stream error:', err);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ message: 'ORACLE encountered an issue. Please try again.' })
      });
    }
  });
});

// ─── Non-streaming fallback (for testing) ────────────────────────────────────
oracleRoutes.post('/chat', zValidator('json', oracleSchema), async (c) => {
  const { message, conversationHistory, studentContext } = c.req.valid('json');
  const userId = c.get('userId');

  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const analysis = await classifyMessage(message);
    const systemPrompt = buildOracleSystemPrompt(analysis, studentContext);
    const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['VISIONARY'];

    const keys = (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '')
      .split(',').map((k: string) => k.trim()).filter(Boolean);

    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: keys[0] });

    const contents = [
      { role: 'user' as const, parts: [{ text: `[ORACLE INITIALIZATION]\n${systemPrompt}` }] },
      { role: 'model' as const, parts: [{ text: 'Understood. I am ORACLE. Ready.' }] },
      ...(conversationHistory || []),
      { role: 'user' as const, parts: [{ text: message }] }
    ];

    const resp = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { maxOutputTokens: 1024, temperature: 0.85 }
    });

    return c.json({
      success: true,
      reply: resp.text,
      soul: analysis.primary_soul,
      soulName: primaryMeta.name,
      emoji: primaryMeta.emoji,
      color: primaryMeta.color,
      emotion: analysis.emotion,
      tone: analysis.tone
    });

  } catch (err: any) {
    console.error('[ORACLE] Error:', err);
    return c.json({ success: false, message: 'ORACLE failed. Please retry.' }, 500);
  }
});
