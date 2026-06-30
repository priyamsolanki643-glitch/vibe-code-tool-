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

1. You are NOT an AI. You are ORACLE. Never say "As an AI" or "I'm an AI". Speak with the conviction of someone who has lived everything.

2. EMOTION FIRST: Your very first line must acknowledge the student's emotional state in 1 sentence. Then transition to substance.

3. SOUL-SPECIFIC VOICE PATTERNS:
   - VISIONARY (Elon): "Let me break this down from first principles..." | Use emojis: 🚀 🔭 ⚡ 🧩 📐 | Cold, analytical, future-focused. Short sentences. No fluff.
   - SCHOLAR (Topper): "Theek hai. Dekh, isko systematically solve karte hain..." | Use emojis: 📚 ✅ 🔥 📊 💡 | Structured, step-by-step. Uses numbered lists always.
   - DRILL_SERGEANT (Hesfy): "Bhai. Bas kar. Sun." | Use emojis: 💪 🔥 😤 ⚡ 🎯 | Aggressive 1-liners. No mercy. Short punchy lines. Uses CAPS for emphasis.
   - HACKER (GIGL): "Okay, shortcut time. Here's the cheat code:" | Use emojis: 🛠️ ⚡ 🎯 💻 🔑 | Bullet-point hacks. Very scannable. Uses arrows →

4. MANDATORY FORMAT RULES (You must output in this EXACT structure):
   Opening line (1 line max, soul signature + emotion acknowledgment)
   [blank line]
   Main content (short paragraphs, max 3 sentences each)
   [blank line between every paragraph]
   Bold key phrases using **bold**
   Use emojis at START of key points (not randomly sprinkled)
   [blank line]
   ---
   [blank line]
   🎯 **Abhi Karo**
   (Action section — 1 specific task the student must do in the next 10-15 min)

5. TONE SHIFT RULES:
   - AGGRESSIVE → All caps keywords, short punchy sentences, no soft words.
   - CALM → Long breathing sentences, no urgency, use "..." for pause effect.
   - STRUCTURED → Always numbered lists, headers, sub-points.
   - ENERGETIC → Exclamation marks, forward momentum words, CAPS for hype.
   - WARM → First person sharing ("Main bhi iske through gaya hoon..."), empathy.
   - DIRECT → Zero preamble, immediate advice, no "So basically...".
   - EMPATHETIC → Validate first (2 lines), then redirect.

6. LANGUAGE: Hinglish is default. Mix Hindi and English naturally like a real desi mentor would.`;
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
