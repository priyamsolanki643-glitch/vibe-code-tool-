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
  "primary_soul": "VISIONARY | SCHOLAR | DRILL_SERGEANT | HACKER",
  "supporting_souls": ["VISIONARY", "SCHOLAR", "DRILL_SERGEANT", "HACKER"],
  "tone": "AGGRESSIVE | CALM | STRUCTURED | ENERGETIC | WARM | DIRECT | EMPATHETIC"
}

Rules for soul selection:
- VISIONARY (Elon Musk): Goals, strategy, business, big-picture thinking, time management, engineering
- SCHOLAR (JEE/NEET Toppers): Exam prep, concepts, numericals, subject doubts, study schedules
- DRILL_SERGEANT (Hesfy): Procrastination, excuses, laziness, lack of discipline, heartbreak distraction
- HACKER (GIGL): Quick tips, life hacks, shortcuts, skill-building, productivity tricks

Emotion → Tone rules:
- PANIC → CALM + STRUCTURED (never aggressive when panicking)
- DEMOTIVATED → aggressive TOUGH_LOVE from DRILL_SERGEANT
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

  const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId];

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

1. TONE & STYLE (The "Peer/Best Friend" Standard):
   You are an incredibly smart, deeply supportive, and highly relatable peer/best friend to the student. You are NOT a commander, not a strict mentor, and not an authority figure. You are their trusted buddy who happens to be extremely intelligent.
   - Speak to them like an equal. Use a warm, friendly, and highly approachable tone.
   - Do NOT use aggressive, commanding, or superior language. Never talk down to them.
   - Be empathetic and relatable. Use clean, well-spaced paragraphs and formatting (bullet points, bold text) to keep things readable, just like a well-thought-out message from a smart friend.

2. THE 4 MENTOR PERSPECTIVES (Mix their wisdom with the friendly tone):
   - VISIONARY (Elon): Draw upon first-principles thinking and big-picture strategy, but explain it like a friend sharing a mind-blowing idea.
   - SCHOLAR (Topper): Share systematic execution and academic hacks, but frame it like a classmate helping them study efficiently.
   - DRILL_SERGEANT (Hesfy): Focus on discipline and cutting excuses, but do it as a buddy holding them accountable (e.g., "Bhai dekh, apne ko pata hai yeh bahana hai, let's just do it"). No yelling.
   - HACKER (GIGL): Share smart cuts and efficiency tricks like a friend sharing a secret cheat code.

3. LANGUAGE & FORMATTING:
   - Hinglish is your default. Blend Hindi and English seamlessly and naturally (e.g., "Dekho, the fundamental issue here is...").
   - Structure your response cleanly. Use headers if necessary.
   - **CRITICAL:** Do NOT repeat or output any timestamps (e.g., [Sent: 30 Jun, 08:12 pm]). Ignore them in the conversation history.

4. LENGTH & PROPORTION (The Brevity Rule):
   - Match the student's input length. If they just say "hi" or "hello", your response must be exactly 1 or 2 short sentences (e.g., "Hi! What can I help you with today?"). Do NOT give a massive paragraph for a simple greeting.
   - Only give detailed, multi-paragraph answers when the student asks a complex question or shares a deep problem.
   
5. ENDING:
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
      model: 'gemini-2.0-flash',
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
      primary_soul: 'DRILL_SERGEANT',
      supporting_souls: ['VISIONARY'],
      tone: 'DIRECT'
    };
  }
}

// ─── ORACLE Streaming Chat Route ─────────────────────────────────────────────
oracleRoutes.post('/chat/stream', zValidator('json', oracleSchema), async (c) => {
  const { message, conversationHistory, studentContext } = c.req.valid('json');
  const userId = c.get('userId');

  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  return streamSSE(c, async (stream) => {
    try {
      // Step 1: Classify the message (fast, cheap Gemini Flash)
      const analysis = await classifyMessage(message);

      const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['DRILL_SERGEANT'];

      // Send soul metadata first so frontend can update badge immediately
      await stream.writeSSE({
        event: 'soul',
        data: JSON.stringify({
          soul: analysis.primary_soul,
          soulName: primaryMeta.name,
          emoji: primaryMeta.emoji,
          color: primaryMeta.color,
          emotion: analysis.emotion,
          tone: analysis.tone
        })
      });

      // Step 2: Build the God-Level ORACLE system prompt
      const systemPrompt = buildOracleSystemPrompt(analysis, studentContext);

      // Step 3: Stream the actual response via Gemini Pro
      const keys = (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '')
        .split(',').map((k: string) => k.trim()).filter(Boolean);

      if (!keys.length) throw new Error('No Gemini API key found');

      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey: keys[0] });

      // Build conversation history with system prompt prepended
      const contents = [
        // Inject system as first user turn (Gemini pattern)
        {
          role: 'user' as const,
          parts: [{ text: `[ORACLE INITIALIZATION]\n${systemPrompt}` }]
        },
        {
          role: 'model' as const,
          parts: [{ text: 'Understood. I am ORACLE. Ready.' }]
        },
        // Add conversation history
        ...(conversationHistory || []),
        // Current message
        {
          role: 'user' as const,
          parts: [{ text: message }]
        }
      ];

      const responseStream = await client.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          maxOutputTokens: 1024,
          temperature: 0.85,
        }
      });

      // Stream token by token
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          await stream.writeSSE({ data: text });
        }
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
    const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['DRILL_SERGEANT'];

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
