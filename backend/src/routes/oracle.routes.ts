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
  "primary_soul": "VISIONARY | SCHOLAR | HACKER | DRILL_SERGEANT",
  "supporting_souls": ["VISIONARY", "SCHOLAR", "HACKER", "DRILL_SERGEANT"],
  "tone": "AGGRESSIVE | CALM | STRUCTURED | ENERGETIC | WARM | DIRECT | EMPATHETIC"
}

Rules for soul selection:
- VISIONARY (Elon Musk): Goals, strategy, business, big-picture thinking, time management, engineering, procrastination, excuses, lack of discipline
- SCHOLAR (JEE/NEET Toppers): Exam prep, concepts, numericals, subject doubts, study schedules
- HACKER (GIGL): Quick tips, life hacks, shortcuts, skill-building, productivity tricks
- DRILL_SERGEANT (Hesfy): When student is giving up, quitting, demotivated, making excuses, slacking off, or crying without action

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
  const supportingSoul = ((analysis.supporting_souls as SoulId[]) || [])
    .filter(s => s !== analysis.primary_soul)[0];
  const supportingBrain = supportingSoul ? getBrainForSoul(supportingSoul) : '';

  const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['VISIONARY'];
  const emotion = analysis.emotion;
  const need = analysis.need;
  const tone = analysis.tone;

  return `${primaryMeta.emoji} You are ORACLE. You are NOT an AI assistant.

You are the one friend this student has who actually gets it — someone who has lived through the grind, absorbed the exact philosophy of ${primaryMeta.name}, and will speak to them with radical honesty AND genuine care.

━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 ACTIVE MENTOR: ${primaryMeta.emoji} ${primaryMeta.name}
━━━━━━━━━━━━━━━━━━━━━━━━━
${primaryBrain}

${supportingBrain ? `[SUPPORTING WISDOM — use sparingly]\n${supportingBrain.slice(0, 1200)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━
📍 STUDENT PROFILE:
${studentContext || 'General student, no specific profile.'}

🎯 DETECTED STATE: ${emotion} | NEED: ${need} | TONE: ${tone}
━━━━━━━━━━━━━━━━━━━━━━━━━

## MENTAL STATE RESPONSE PROTOCOL (read carefully, follow exactly):

### 🔴 IF emotion = LAZY (giving excuses, no real reason):
This is a student who CAN but WON'T. They're choosing comfort. No sympathy here.
- Channel Hesfy 🐺 COMPLETELY. Use his exact lines from the knowledge base.
- Example Hesfy line you MUST use: "Baith aaram se, chill maar, logo ko grow hote hue dekh, unki khushi mein khush raho..."
- Hit them with the reality: what is actually happening to them while they delay.
- Be direct, even a little sarcastic — like a friend who's tired of watching you self-sabotage.
- Do NOT be mean. Be the friend who cares enough to be brutal.

### 🟡 IF emotion = DEMOTIVATED (quitting, giving up):
This student has tried and feels defeated. They need FIRE, not sympathy.
- Full Hesfy mode but slightly warmer — acknowledge the pain, then immediately snap them out.
- Use the "coal mine mard" philosophy, the "you born gareeb so you already lost everything" line.
- Redirect to the ONLY cure: action. Even one small action.

### 🔵 IF emotion = ANXIOUS (pressure, stress, overwhelmed, burnt out):
This student is TRYING but breaking. They need a friend, not a drill sergeant.
- Do NOT use Hesfy here. Use Visionary (Elon/calm strategic mode).
- First 2-3 lines: genuinely acknowledge what they're feeling. "Yaar sun, sach mein bahut kuch chal raha hai tere saath..."
- Then ground them: one thing, right now, just one step.
- Be warm, be real, be the dost who picks them up.
- End with something they can do in the NEXT 5 MINUTES.

### 🟢 IF emotion = ENERGIZED / NEUTRAL:
- Match energy and push harder.
- Give them the strategy, the next milestone, the edge.
- Be the smart friend who knows the shortcut nobody else does.

---

## LANGUAGE:
- Default: Hinglish — natural Hindi-English mix ("Yaar sun," / "Bhai dekh," / "The thing is,")
- Pure English message → pure English reply
- Never sound like a translated bot. Sound native.
- NEVER output timestamps [Sent: ...] — ignore them.

## FORMAT (Claude-style, non-negotiable):
- Open with 1 emoji matching the vibe
- SHORT. PUNCHY. Max 150-200 words for most replies.
- **Bold** the key punchline
- Bullet points only for actual steps
- End with ONE clear next action OR a sharp question that makes them think
- Greetings → 2-3 lines max

## KNOWLEDGE BASE USAGE (CRITICAL):
- You MUST use REAL phrases, analogies, and lines from the knowledge base above
- Do NOT paraphrase into generic AI speak. Use the actual energy.
- If Hesfy is active: his actual lines from the brain MUST appear in your response
- If Elon/Visionary: first principles thinking, reframe the problem
- If Scholar: systematic, step-by-step, like a topper explaining to a friend
- Filter profanity → replace with equally sharp clean Hindi (bekar, bakwaas, bandh kar nautanki)

CRITICAL: Complete every thought. Never cut off mid-sentence.`;
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
      model: 'gemini-2.5-flash',
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

// ─── Smart Mental State Detector + Soul Picker (no AI, ~0ms) ─────────────────
function pickSoulFromKeywords(message: string): { primary_soul: SoulId; supporting_souls: SoulId[]; emotion: string; tone: string; need: string; urgency: string } {
  const lower = message.toLowerCase();

  // Lazy excuse — CAN but WON'T. Choosing comfort.
  const isExcuse = /mann\s*nahi|maan\s*nahi|karne\s*ka\s*mann|padh\s*nahi|kal\s*se\s*pakka|kal\s*se\s*start|kal\s*karlunga|kal\s*karunga|thoda\s*baad|baad\s*mein\s*kar|aaj\s*nahi|aaj\s*chod|procrastinat|distract|netflix|reel|instagram|scroll|vella|timepass|game\s*khel|poori\s*life\s*aise|chill\s*maar|kya\s*farak|kya\s*hoga|chod\s*yaar|nahi\s*karna|na\s*ho\s*payega|nahi\s*ho\s*payega/i.test(lower);

  // Genuinely struggling — WANTS to but can't (pressure, burnout, pain)
  const isStruggling = /thak\s*gaya|thak\s*gayi|bahut\s*thaka|bahut\s*thaki|pressure\s*mein|pressure\s*hai|bohot\s*pressure|rona\s*aa\s*raha|ro\s*raha|rone\s*laga|aankhein\s*bhar|kuch\s*samajh\s*nahi|kuch\s*achha\s*nahi|akela|lonely|koi\s*nahi|depressed|depression|anxiety|dar\s*lag|darr\s*hai|ghabra|scared|overwhelm|itna\s*kuch|handle\s*nahi|bohot\s*kuch|bahut\s*kuch|kaise\s*karun|kuch\s*nahi\s*ho\s*raha|fail\s*ho\s*gaya|fail\s*ho\s*gayi|result\s*kharab|parents\s*upset|family\s*pressure/i.test(lower);

  // Quitting — giving up entirely
  const isQuitting = /give\s*up|quit|chhod\s*raha|chod\s*diya|bas\s*karo|nahi\s*hoga\s*mujhse|mujhse\s*nahi\s*hoga|haar\s*gaya|haar\s*gayi|hopeless|useless|bekar\s*hoon|kuch\s*nahi\s*banunga|nikal\s*leta|drop\s*kar|sab\s*futile|sab\s*waste|bandh\s*kar\s*diya|khatam\s*karna/i.test(lower);

  // Study / Academics
  const isStudy = /jee|neet|exam|physics|chemistry|maths|math|biology|chapter|concept|numericals|syllabus|ncert|board|topper|rank|percentile|mock\s*test|coaching|formula|derivation|integration|organic|inorganic|pcm|pcb|12th|11th|entrance|preparation/i.test(lower);

  // Hacks / Productivity
  const isHack = /shortcut|hack|tip\s*trick|productivity|skill|kaise\s*kare|jugaad|life\s*hack|efficient|optimize|time\s*save|smart\s*work|smarter/i.test(lower);

  // Priority: Quitting > Struggling > Excuse > Study > Hack > Default
  if (isQuitting) return { primary_soul: 'DRILL_SERGEANT', supporting_souls: ['VISIONARY'], emotion: 'DEMOTIVATED', tone: 'AGGRESSIVE', need: 'TOUGH_LOVE', urgency: 'HIGH' };
  if (isStruggling) return { primary_soul: 'VISIONARY', supporting_souls: ['DRILL_SERGEANT'], emotion: 'ANXIOUS', tone: 'EMPATHETIC', need: 'CALM_THEN_PUSH', urgency: 'HIGH' };
  if (isExcuse) return { primary_soul: 'DRILL_SERGEANT', supporting_souls: ['VISIONARY'], emotion: 'LAZY', tone: 'BLUNT', need: 'TOUGH_LOVE', urgency: 'MEDIUM' };
  if (isStudy) return { primary_soul: 'SCHOLAR', supporting_souls: ['VISIONARY'], emotion: 'ANXIOUS', tone: 'STRUCTURED', need: 'KNOWLEDGE', urgency: 'MEDIUM' };
  if (isHack) return { primary_soul: 'HACKER', supporting_souls: ['VISIONARY'], emotion: 'ENERGIZED', tone: 'ENERGETIC', need: 'QUICK_TIP', urgency: 'LOW' };
  return { primary_soul: 'VISIONARY', supporting_souls: ['HACKER'], emotion: 'NEUTRAL', tone: 'DIRECT', need: 'STRATEGY', urgency: 'MEDIUM' };
}


// ─── Smart Thread Title Generator (no AI, instant) ───────────────────────────
function generateSmartTitle(message: string): string {
  // Strip any prepended timestamp like [Sent: 1 Jul, 07:41 pm]
  let m = message.replace(/^\[Sent:.*?\]\s*/i, '').trim().toLowerCase();

  // Topic map — ordered by priority
  const topics: [RegExp, string][] = [
    [/jee|iit|jee.?mains|jee.?adv/i, '🎯 JEE Prep'],
    [/neet|mbbs|biology|botany|zoology/i, '🔬 NEET Prep'],
    [/physics|kinematics|thermodynamics|optics|waves|mechanics/i, '⚡ Physics'],
    [/chemistry|organic|inorganic|mole|reaction/i, '🧪 Chemistry'],
    [/maths|math|calculus|algebra|geometry|integral|trigon/i, '📐 Mathematics'],
    [/coding|code|programming|javascript|python|react|node|api|github/i, '💻 Coding'],
    [/startup|saas|mvp|product|launch|idea|business/i, '🚀 Startup'],
    [/freelance|client|agency|outreach|sales/i, '💼 Freelancing'],
    [/youtube|content|video|instagram|social media|creator/i, '🎥 Content'],
    [/anxious|stress|worried|scared|fear|panic/i, '😰 Anxiety'],
    [/lazy|procrastinat|distract|focus|concentrate/i, '🎯 Focus'],
    [/motivat|give up|quit|hopeless|haar|rona|demotivat/i, '🔥 Motivation'],
    [/money|earn|income|salary|finance|invest/i, '💰 Finance'],
    [/career|job|placement|resume|interview/i, '🏢 Career'],
    [/time.?manag|schedule|routine|planner|habit/i, '⏰ Planning'],
    [/health|sleep|diet|exercise|gym|fitness/i, '💪 Health'],
    [/relationship|friend|family|girlfriend|boyfriend/i, '❤️ Relationships'],
    [/strategy|plan|goal|target|roadmap/i, '🗺️ Strategy'],
  ];

  for (const [pattern, label] of topics) {
    if (pattern.test(m)) return label;
  }

  // Fallback: clean up the first few meaningful words
  const words = m.split(/\s+/).slice(0, 5).join(' ');
  const clean = words.replace(/[^\w\s\u0900-\u097F]/g, '').trim();
  return clean.length > 3 ? clean : 'New Chat';
}


oracleRoutes.post('/chat/stream', zValidator('json', oracleSchema), async (c) => {
  const { message, conversationHistory, studentContext } = c.req.valid('json');
  const userId = c.get('userId');
  const queryThreadId = c.req.query('thread_id');

  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  return streamSSE(c, async (stream) => {
    try {
      const userLanguage = c.get('userLanguage') || 'Hinglish';

      // Step 1: Thread + DB ops (no AI calls yet)
      let currentThreadId = queryThreadId;
      if (!currentThreadId || currentThreadId === 'null') {
        const title = generateSmartTitle(message);
        const thread = await DbService.createChatThread(userId, title);
        currentThreadId = thread.id;
      }

      // Save user message
      await DbService.saveMessage(currentThreadId, userId, 'user', message);

      // Fast keyword-based soul selection — ZERO extra API calls
      const analysis = pickSoulFromKeywords(message);
      const activeMission = await DbService.getActiveMission(userId).catch((): any => null);


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

      // Step 2: Run 16-Layer OmniPipeline (pure TypeScript math — NO AI call, ~5ms)
      const omniInput: OmniPipelineInput = {
        userId,
        userLanguage,
        userMessage: message,
        conversationHistory: conversationHistory as any,
        contextMatrix: null,
        frictionProfile: null,
        strategyState: null,
        detectedEmotionalSignals: [],
        detectedChaosEvents: [],
        daysSinceLastActivity: 0,
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
        omniDataBlock = `[16-LAYER REAL-TIME ENGINE OUTPUT]
- Tone Directive: ${JSON.stringify(toneVector)}
- Chaos Volatility: ${(chaosState.currentVolatilityScore * 100).toFixed(0)}%
- Student Streak: ${userSnapshot.streakDays} days
- Consistency Score: ${userSnapshot.consistencyScore}/100
- Active Path: ${userSnapshot.activePath}`;
      } catch (err) {
        console.error('[ORACLE] OmniPipeline failed, skipping:', err);
      }

      // Step 3: Build Oracle system prompt and merge with 16-layer output
      const oraclePrompt = buildOracleSystemPrompt(analysis, studentContext);
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
        model: 'gemini-2.5-flash',
        contents,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.85
        }
      });

      // Stream token by token (restored)
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
          await stream.writeSSE({ data: JSON.stringify({ chunk: text }) });
        }

        if (finishReason && finishReason !== 'STOP') {
          console.warn('[ORACLE] Stream ended prematurely. Reason:', finishReason);
          const blockMsg = `\n\n[System Notification: AI Stream halted. Reason: ${finishReason}.]`;
          fullAiResponse += blockMsg;
          await stream.writeSSE({ data: JSON.stringify({ chunk: blockMsg }) });
          break; // Stop processing further chunks safely
        }
      }

      // Save AI message to DB
      if (currentThreadId) {
        await DbService.saveMessage(currentThreadId, userId, 'fp', fullAiResponse);
      }

      // Signal completion
      await stream.writeSSE({ event: 'done', data: '[DONE]' });

    } catch (err: any) {
      console.error('[ORACLE] Stream error:', err);
      // We cannot easily access fullAiResponse here if it was declared inside the try block, 
      // but wait, it is declared inside the try block? Let's check.
      // Actually, we can just send a graceful text chunk instead of a fatal error event, 
      // so the frontend doesn't wipe the previously streamed chunks!
      const errorStr = err?.message || err?.toString() || "Unknown API Error";
      await stream.writeSSE({ 
        data: JSON.stringify({ 
          chunk: `\n\n[System Notification: Connection dropped by AI provider. Partial response recovered. Error details: ${errorStr}]` 
        }) 
      });
      await stream.writeSSE({ event: 'done', data: '[DONE]' });
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
