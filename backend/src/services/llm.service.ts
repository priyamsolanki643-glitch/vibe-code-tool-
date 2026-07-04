import '../utils/env';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ContextMatrix, CapabilityVector } from '../engine/types';

// ─────────────────────────────────────────────────────────────────────────────
// API KEY POOL — 4 keys × rotating = near-zero quota failures
// ─────────────────────────────────────────────────────────────────────────────
const HARDCODED_KEYS: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// COOLDOWN MAP — prevents hammering a quota-exhausted key
// key = `${model}-${keyIndex}`, value = expiry timestamp
// ─────────────────────────────────────────────────────────────────────────────
const globalCooldownMap = new Map<string, number>();

// ─────────────────────────────────────────────────────────────────────────────
// CORE EXECUTOR — smart key rotation with per-key cooldowns
// ─────────────────────────────────────────────────────────────────────────────
export async function executeWithRotation(
  payload: any,
  maxRetries = 5
): Promise<any> {
  const keys = [
    ...(process.env.AI_KEYS ? process.env.AI_KEYS.split(',') : []),
    ...(process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : []),
    ...(process.env.AI_PROVIDER_KEY ? process.env.AI_PROVIDER_KEY.split(',') : []),
    ...(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.split(',') : []),
    ...(process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.split(',') : []),
    ...HARDCODED_KEYS
  ]
    .map(k => k?.trim())
    .filter(Boolean) as string[];

  if (keys.length === 0) {
    throw new Error('No AI API Keys configured');
  }

  const actualModel = payload.model || 'gemini-2.5-flash';
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getErrorMessage = (err: any): string => {
    if (!err) return 'Unknown error';
    return err?.message || err?.error?.message || err?.statusText || JSON.stringify(err);
  };

  const parseRetryDelayMs = (message: string): number | null => {
    if (!message) return null;
    const retryInMatch = message.match(/retry in\s+([\d.]+)s/i);
    if (retryInMatch) return Math.ceil(parseFloat(retryInMatch[1]) * 1000) + 500;
    const tryAgainMatch = message.match(/try again in\s+([\d.]+)s/i);
    if (tryAgainMatch) return Math.ceil(parseFloat(tryAgainMatch[1]) * 1000) + 500;
    return null;
  };

  const isQuotaError = (message: string): boolean => {
    const m = message.toLowerCase();
    return m.includes('quota exceeded') || m.includes('resource_exhausted') ||
      m.includes('429') || m.includes('rate limit') || m.includes('too many requests');
  };

  const isModelError = (message: string): boolean => {
    const m = message.toLowerCase();
    return m.includes('model not found') || m.includes('unsupported model') ||
      m.includes('is not found for api version') || m.includes('invalid model');
  };

  const isRetryableInfraError = (message: string): boolean => {
    const m = message.toLowerCase();
    return m.includes('503') || m.includes('overloaded') || m.includes('unavailable') ||
      m.includes('internal error') || m.includes('deadline exceeded') ||
      m.includes('timed out') || m.includes('timeout') ||
      m.includes('econnreset') || m.includes('socket hang up');
  };

  let lastError: any = null;
  let attempt = 0;

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    if (attempt >= maxRetries) break;
    attempt++;

    const key = keys[keyIndex];
    const cooldownId = `${actualModel}-${keyIndex}`;

    const cooldownUntil = globalCooldownMap.get(cooldownId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.log(`[LLM] Skipping key=${keyIndex + 1} (cooldown ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s left)`);
      continue;
    }

    const client = new GoogleGenAI({ apiKey: key });

    try {
      const attemptPayload = { ...payload, model: actualModel };
      console.log(`[LLM] Attempt ${attempt}/${maxRetries} | model=${actualModel} | key=${keyIndex + 1}/${keys.length}`);

      const result = await client.models.generateContent(attemptPayload as any);
      globalCooldownMap.delete(cooldownId);
      return result;

    } catch (err: any) {
      lastError = err;
      const message = getErrorMessage(err);
      console.warn(`[LLM] Failed | attempt=${attempt} | model=${actualModel} | key=${keyIndex + 1} | error=${message}`);

      if (isModelError(message) || message.includes('400') || message.includes('401') || message.includes('unauthorized')) {
        console.error(`[LLM] Fatal Error: ${message}`);
        throw new Error(`Fatal LLM Error: ${message}`);
      }

      if (isQuotaError(message)) {
        const retryDelay = parseRetryDelayMs(message) ?? 60_000;
        globalCooldownMap.set(cooldownId, Date.now() + retryDelay);
        console.warn(`[LLM] Quota hit key=${keyIndex + 1}. Cooldown ${retryDelay}ms. Trying next key.`);
        continue;
      }

      if (isRetryableInfraError(message)) {
        const backoff = Math.min(1500 * attempt, 8000);
        await sleep(backoff);
        continue;
      }

      await sleep(400);
    }
  }

  throw lastError || new Error('All configured AI API keys are currently in cooldown (resource_exhausted). Please retry in a minute.');
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE EXECUTOR STREAM — smart key rotation returning an AsyncGenerator stream
// ─────────────────────────────────────────────────────────────────────────────
export async function executeWithRotationStream(
  payload: any,
  maxRetries = 5
): Promise<any> {
  const keys = [
    ...(process.env.AI_KEYS ? process.env.AI_KEYS.split(',') : []),
    ...(process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : []),
    ...(process.env.AI_PROVIDER_KEY ? process.env.AI_PROVIDER_KEY.split(',') : []),
    ...(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.split(',') : []),
    ...(process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.split(',') : []),
    ...HARDCODED_KEYS
  ].map(k => k?.trim()).filter(Boolean) as string[];

  if (keys.length === 0) throw new Error('No AI API Keys configured');

  const actualModel = payload.model || 'gemini-2.5-flash';
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const getErrorMessage = (err: any): string => err?.message || err?.error?.message || err?.statusText || JSON.stringify(err);
  
  const parseRetryDelayMs = (message: string): number | null => {
    if (!message) return null;
    const retryInMatch = message.match(/retry in\s+([\d.]+)s/i);
    if (retryInMatch) return Math.ceil(parseFloat(retryInMatch[1]) * 1000) + 500;
    const tryAgainMatch = message.match(/try again in\s+([\d.]+)s/i);
    if (tryAgainMatch) return Math.ceil(parseFloat(tryAgainMatch[1]) * 1000) + 500;
    return null;
  };

  const isQuotaError = (message: string): boolean => {
    const m = message.toLowerCase();
    return m.includes('quota exceeded') || m.includes('resource_exhausted') || m.includes('429') || m.includes('rate limit') || m.includes('too many requests');
  };

  const isModelError = (message: string): boolean => {
    const m = message.toLowerCase();
    return m.includes('model not found') || m.includes('unsupported model') || m.includes('invalid model');
  };

  const isRetryableInfraError = (message: string): boolean => {
    const m = message.toLowerCase();
    return m.includes('503') || m.includes('overloaded') || m.includes('unavailable') || m.includes('internal error') || m.includes('deadline exceeded') || m.includes('timeout') || m.includes('econnreset') || m.includes('socket hang up');
  };

  let lastError: any = null;
  let attempt = 0;

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    if (attempt >= maxRetries) break;
    attempt++;

    const key = keys[keyIndex];
    const cooldownId = `${actualModel}-${keyIndex}`;

    const cooldownUntil = globalCooldownMap.get(cooldownId);
    if (cooldownUntil && Date.now() < cooldownUntil) continue;

    const client = new GoogleGenAI({ apiKey: key });

    try {
      const attemptPayload = { ...payload, model: actualModel };
      const result = await client.models.generateContentStream(attemptPayload as any);
      globalCooldownMap.delete(cooldownId);
      return result;
    } catch (err: any) {
      lastError = err;
      const message = getErrorMessage(err);
      if (isModelError(message) || message.includes('400') || message.includes('401')) throw new Error(`Fatal LLM Error: ${message}`);
      if (isQuotaError(message)) {
        globalCooldownMap.set(cooldownId, Date.now() + (parseRetryDelayMs(message) ?? 60_000));
        continue;
      }
      if (isRetryableInfraError(message)) {
        await sleep(Math.min(1500 * attempt, 8000));
        continue;
      }
      await sleep(400);
    }
  }
  throw lastError || new Error('All configured AI API keys are currently in cooldown. Please retry in a minute.');
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE JSON BUILDER — constructs a safe, Gemini-parseable contents array
// Rules:
//   1. Must have at least 1 element
//   2. First element must be role='user'  
//   3. Alternating user/model
//   4. Last element must be role='user'
// ─────────────────────────────────────────────────────────────────────────────
function buildSafeContents(
  history: { role: 'user' | 'model'; parts: { text: string }[] }[]
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  if (!history || history.length === 0) {
    return [{ role: 'user', parts: [{ text: '...' }] }];
  }

  // Ensure valid alternating turns
  const fixed: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const turn of history) {
    if (fixed.length === 0 && turn.role !== 'user') continue; // skip leading model turns
    if (fixed.length > 0 && fixed[fixed.length - 1].role === turn.role) {
      // Merge consecutive same-role turns
      fixed[fixed.length - 1].parts.push(...turn.parts);
    } else {
      fixed.push({ role: turn.role, parts: [...turn.parts] });
    }
  }

  if (fixed.length === 0) {
    return [{ role: 'user', parts: [{ text: '...' }] }];
  }

  // Last must be user
  if (fixed[fixed.length - 1].role === 'model') {
    fixed.push({ role: 'user', parts: [{ text: '...' }] });
  }

  return fixed;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON CLEANER — last-resort fallback if Gemini ignores JSON mode
// ─────────────────────────────────────────────────────────────────────────────
function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // Escape unescaped control characters inside strings
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, (match) => {
    return match.replace(/[\n\r\t]/g, (c) => {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      return c;
    });
  });

  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIP MARKDOWN — removes ** ## etc from system instructions
// (Gemini's JSON constrained mode can get confused by markdown in systemInstruction)
// ─────────────────────────────────────────────────────────────────────────────
function stripMarkdownForSystemInstruction(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')         // *italic* → italic
    .replace(/^#{1,6}\s+/gm, '')           // ## headers → plain
    .replace(/^---+$/gm, '')               // --- dividers → nothing
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// LUMENSKY AI SERVICE
// ─────────────────────────────────────────────────────────────────────────────
export class LLMService {
  private static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIMARY CHAT RESPONDER
  // Returns natural Hinglish response + lightweight task classification.
  // Uses plain-text mode (NOT JSON mode) for maximum reliability.
  // JSON mode has too many constraints that cause 400 errors in production.
  // ──────────────────────────────────────────────────────────────────────────
  static async generateSmartResponse(
    userId: string,
    systemPrompt: string,
    conversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
    isModeOnboarding: boolean,
    modelName?: string
  ): Promise<{
    response_text: string;
    task_classification: 'completed' | 'failed' | 'none';
    onboarding_data?: any;
  }> {
    // Last user message for regex classification
    const lastUserTurn = [...conversationHistory].reverse().find(t => t.role === 'user');
    const lastUserMsg = lastUserTurn?.parts?.map(p => p.text).join(' ') || '';

    // Trim to last 10 turns for speed
    const MAX_HISTORY = 10;
    const rawHistory = conversationHistory.length > MAX_HISTORY
      ? conversationHistory.slice(-MAX_HISTORY)
      : conversationHistory;

    const safeContents = buildSafeContents(rawHistory);
    const cleanSystemInstruction = stripMarkdownForSystemInstruction(systemPrompt);

    // ── Primary call: plain text (no JSON schema constraints) ─────────────────
    let responseText = '';

    try {
      const response = await executeWithRotation({
        model: modelName || 'gemini-2.5-flash',
        contents: safeContents as any,
        config: {
          systemInstruction: cleanSystemInstruction + "\n\nCRITICAL: You MUST complete your sentences fully. Never leave a thought unfinished or cut off mid-sentence.",
          temperature: 0.9,
          maxOutputTokens: 4096,
        }
      });

      const rawText = response.text;
      if (!rawText || rawText.trim().length === 0) throw new Error('Empty response from LLM');
      responseText = rawText.trim();

    } catch (err: any) {
      console.error('[generateSmartResponse] Primary call failed:', err?.message || err);

      // ── Fallback: Try with a different, simpler model config ─────────────────
      try {
        console.log('[generateSmartResponse] Trying fallback model config...');
        const fallbackResponse = await executeWithRotation({
          model: 'gemini-2.0-flash',
          contents: safeContents as any,
          config: {
            systemInstruction: cleanSystemInstruction + "\n\nCRITICAL: You MUST complete your sentences fully. Never leave a thought unfinished or cut off mid-sentence.",
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        });

        const fallbackText = fallbackResponse.text;
        if (!fallbackText || fallbackText.trim().length === 0) throw new Error('Empty fallback response');
        responseText = fallbackText.trim();

      } catch (fallbackErr: any) {
        console.error('[generateSmartResponse] Fallback also failed:', fallbackErr?.message);
        throw err; // Re-throw original error
      }
    }

    // ── Task classification via regex (no LLM call needed) ───────────────────
    const msg = lastUserMsg.toLowerCase();
    let task_classification: 'completed' | 'failed' | 'none' = 'none';

    if (/\b(done|kiya|kar liya|complete|finish|ho gaya|completed|submitted|sent|bana liya|dekh liya|call kiya|gaya tha|gaye|aa gaya)\b/i.test(msg)) {
      task_classification = 'completed';
    } else if (/\b(fail|nahi|nhi|miss|skip|chuk|couldn't|could not|na ho|ho nahi|kar nahi|nahi kar|nahi ho|blocked)\b/i.test(msg)) {
      task_classification = 'failed';
    }

    return { response_text: responseText, task_classification };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIMARY CHAT RESPONDER (STREAMING)
  // Returns an async iterable stream for ultra-low latency SSE TTFT
  // ──────────────────────────────────────────────────────────────────────────
  static async generateSmartResponseStream(
    userId: string,
    systemPrompt: string,
    conversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
    modelName?: string
  ): Promise<{ stream: any, task_classification: 'completed' | 'failed' | 'none' }> {
    const lastUserTurn = [...conversationHistory].reverse().find(t => t.role === 'user');
    const lastUserMsg = lastUserTurn?.parts?.map(p => p.text).join(' ') || '';
    
    const MAX_HISTORY = 10;
    const rawHistory = conversationHistory.length > MAX_HISTORY ? conversationHistory.slice(-MAX_HISTORY) : conversationHistory;
    const safeContents = buildSafeContents(rawHistory);
    const cleanSystemInstruction = stripMarkdownForSystemInstruction(systemPrompt);

    const msg = lastUserMsg.toLowerCase();
    let task_classification: 'completed' | 'failed' | 'none' = 'none';
    if (/\b(done|kiya|kar liya|complete|finish|ho gaya|completed|submitted|sent|bana liya|dekh liya|call kiya|gaya tha|gaye|aa gaya)\b/i.test(msg)) {
      task_classification = 'completed';
    } else if (/\b(fail|nahi|nhi|miss|skip|chuk|couldn't|could not|na ho|ho nahi|kar nahi|nahi kar|nahi ho|blocked)\b/i.test(msg)) {
      task_classification = 'failed';
    }

    const stream = await executeWithRotationStream({
      model: modelName || 'gemini-2.5-flash',
      contents: safeContents as any,
      config: {
        systemInstruction: cleanSystemInstruction + "\n\nCRITICAL: You MUST complete your sentences fully. Never leave a thought unfinished or cut off mid-sentence.",
        temperature: 0.9,
        maxOutputTokens: 4096,
      }
    });

    return { stream, task_classification };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDATED RESPONSE — for titles, analysis, grounding tasks
  // ──────────────────────────────────────────────────────────────────────────
  static async generateValidatedResponse(
    userId: string,
    systemPrompt: string,
    conversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[],
    bannedCategories: string[],
    retries = 3,
    delayMs = 1000,
    isBackground = false
  ): Promise<{ response_text: string; strengths?: string[]; bottlenecks?: string[]; insight?: string }> {
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        response_text: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING }
      },
      required: ['response_text']
    };

    const MAX_HISTORY = 10;
    const rawHistory = conversationHistory.length > MAX_HISTORY
      ? conversationHistory.slice(-MAX_HISTORY)
      : conversationHistory;

    const safeContents = buildSafeContents(rawHistory);
    const cleanInstruction = stripMarkdownForSystemInstruction(systemPrompt);

    try {
      const response = await executeWithRotation({
        model: 'gemini-2.5-flash',
        contents: safeContents as any,
        config: {
          systemInstruction: cleanInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.3,
        }
      });

      const rawText = response.text;
      if (!rawText) throw new Error('Empty response from LLM');
      return JSON.parse(rawText);
    } catch (error: any) {
      console.error('[generateValidatedResponse] Error:', error?.message);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GROUNDED INTELLIGENCE REPORT — with Google Search
  // ──────────────────────────────────────────────────────────────────────────
  static async generateGroundedIntelligenceReport(
    researchMandate: string,
    retries = 2,
    delayMs = 1000
  ): Promise<any> {
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        marketSummary: { type: Type.STRING },
        localOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
        competitorLandscape: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedAction: { type: Type.STRING },
        confidenceScore: { type: Type.NUMBER }
      },
      required: ['marketSummary', 'localOpportunities', 'competitorLandscape', 'recommendedAction', 'confidenceScore']
    };

    try {
      const response = await executeWithRotation({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: researchMandate }] }] as any,
        config: {
          temperature: 0.2,
          tools: [{ googleSearch: {} }],
        }
      });

      const rawText = response.text;
      if (!rawText) throw new Error('Empty response from LLM Grounding');
      return cleanAndParseJSON(rawText);
    } catch (error: any) {
      console.error('[generateGroundedIntelligenceReport] Error:', error?.message);
      throw error;
    }
  }

  static async classifyMessageOutcome(message: string): Promise<'completed' | 'failed' | 'none'> {
    console.warn('LLMService.classifyMessageOutcome is deprecated.');
    return 'none';
  }

  static async generateThreadTitle(message: string): Promise<string> {
    const systemPrompt = `You are an AI that generates concise 2-5 word titles for chat threads based on the user's message.
Focus on the main topic, entity, or intent. Capitalize appropriately (Title Case).
Examples: 'Preparing for UPSC', 'Fixing React Bug', 'Diet Plan Discussion'.
Never critique the user's grammar. Never return 'Unclear message'. If the message is a generic greeting, return 'General Chat'.
Return ONLY the title string, without quotes or punctuation.`;
    try {
      const response = await executeWithRotation({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Message: "${message}"` }] }] as any,
        systemInstruction: { parts: [{ text: systemPrompt }] }
      });
      return response.text ? response.text.trim().replace(/^"|"$/g, '') : "Conversation";
    } catch (e) {
      return "Conversation";
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC TASK SPRINT GENERATOR
  // ──────────────────────────────────────────────────────────────────────────
  static async generateDynamicTaskSprint(
    strategyState: any,
    frictionProfile: any,
    contextMatrix: any,
    capability: any,
    retries = 2,
    delayMs = 1000
  ): Promise<any> {
    const isRedBand = contextMatrix.socioeconomic.runwayDays < 45;
    const isShortTimeline = contextMatrix.goalVector.timelineMonths <= 1;
    const isSprintZeroActive = (isRedBand || isShortTimeline) && strategyState.currentDayNumber <= 7;
    const consecutiveFailures = strategyState.consecutiveFailureCount || 0;
    const consistencyScore = strategyState.consistencyScore ?? 100;

    const strictPrompt = `You are the FP-OS Dynamic Execution Generator.
Goal: "${contextMatrix.goalVector.declaredGoal}"
Day ${strategyState.currentDayNumber} of ${strategyState.totalTargetDays}.
Friction: ${frictionProfile.frictionLevel} (${frictionProfile.frictionCoefficient.toFixed(2)})
Consistency: ${consistencyScore}/100. Failures: ${consecutiveFailures}.
Work Style: ${frictionProfile.assignedWorkStyle}
Runway: ${contextMatrix.socioeconomic.runwayDays} days.
Skills: ${capability.calibratedSkills.map((s: any) => `${s.skillName} (level ${s.verifiedLevel})`).join(', ')}

Sprint 0 (First Revenue): ${isSprintZeroActive ? 'ACTIVE — 100% focus on direct outreach' : 'INACTIVE'}.
If consistency < 40 or failures >= 2: use ultra-simple micro-tasks only.
Apply Parkinson Law compression to time estimates.
CRITICAL: You MUST explicitly demand PROOF of completion in the metricBound (e.g. 'Upload a screenshot', 'Show me the written page', 'Send a voice note of the summary'). No vague completion metrics.`;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          metricBound: { type: Type.STRING },
          timeAllocationHours: { type: Type.NUMBER }
        },
        required: ['title', 'description', 'metricBound', 'timeAllocationHours']
      }
    };

    const response = await executeWithRotation({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: strictPrompt }] }] as any,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.4,
      }
    });

    const rawText = response.text;
    if (!rawText) throw new Error('Empty response from LLM Task Generator');
    return JSON.parse(rawText);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC OPPORTUNITIES GENERATOR
  // ──────────────────────────────────────────────────────────────────────────
  static async generateDynamicOpportunities(
    matrix: ContextMatrix,
    capability: CapabilityVector,
    retries = 2,
    delayMs = 1000
  ): Promise<any[]> {
    const strictPrompt = `You are the FP-OS Universal Opportunity Generator.
Generate exactly 3 custom business/revenue opportunities for this user.
Goal: "${matrix.goalVector.declaredGoal}"
Location Tier: ${matrix.socioeconomic.geographyTier}
Liquid Capital: INR ${matrix.socioeconomic.liquidCapital}
Top Skills: ${capability.calibratedSkills.map((s: any) => s.skillName).join(', ')}`;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['local_geo_arbitrage', 'national_digital_remote', 'trend_window_exploitation'] },
          opportunityScore: { type: Type.NUMBER },
          capitalRequired: { type: Type.NUMBER },
          timeToFirstRevenue: { type: Type.NUMBER },
          whyThisForThisUser: { type: Type.STRING }
        },
        required: ['id', 'title', 'category', 'opportunityScore', 'capitalRequired', 'timeToFirstRevenue', 'whyThisForThisUser']
      }
    };

    const response = await executeWithRotation({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: strictPrompt }] }] as any,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.4,
        tools: [{ googleSearch: {} }],
      }
    });

    const rawText = response.text;
    if (!rawText) throw new Error('Empty response from LLM Opportunity Generator');
    return cleanAndParseJSON(rawText);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EMBEDDING GENERATOR
  // ──────────────────────────────────────────────────────────────────────────
  static async generateEmbedding(text: string): Promise<number[]> {
    const keys = [
      ...(process.env.AI_KEYS ? process.env.AI_KEYS.split(',') : []),
      ...(process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : []),
      process.env.AI_PROVIDER_KEY,
      process.env.GEMINI_API_KEY,
      process.env.GOOGLE_API_KEY,
      ...HARDCODED_KEYS
    ].map(k => k?.trim()).filter(Boolean) as string[];

    const client = new GoogleGenAI({ apiKey: keys[0] });
    const response = await client.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });

    if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
      throw new Error('Failed to generate embedding');
    }

    return response.embeddings[0].values;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ONBOARDING DATA EXTRACTOR
  // Silently extracts goal/capital/hours/skills from conversation history.
  // Falls back gracefully — never crashes the main flow.
  // ──────────────────────────────────────────────────────────────────────────
  static async extractOnboardingData(
    conversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[]
  ): Promise<{
    isComplete: boolean;
    declaredGoal: string;
    liquidCapital: number;
    monthlyBurnRate?: number;
    region: string;
    dailyUninterruptedHours: number;
    rawSkillStrings: string[];
    pathPreference: 'high_risk_upside' | 'safe_compounding' | 'undecided';
  }> {
    const SAFE_FALLBACK: {
      isComplete: boolean;
      declaredGoal: string;
      liquidCapital: number;
      monthlyBurnRate?: number;
      region: string;
      dailyUninterruptedHours: number;
      rawSkillStrings: string[];
      pathPreference: 'high_risk_upside' | 'safe_compounding' | 'undecided';
    } = {
      isComplete: false,
      declaredGoal: '',
      liquidCapital: 0,
      region: '',
      dailyUninterruptedHours: 4,
      rawSkillStrings: [] as string[],
      pathPreference: 'undecided'
    };

    try {
      // Summarise the conversation into plain text for extraction
      const historyText = conversationHistory
        .map(t => `${t.role === 'user' ? 'User' : 'AI'}: ${t.parts.map(p => p.text).join(' ')}`)
        .join('\n');

      const prompt = `You are a data extractor for a startup strategy engine.
Analyze this conversation and extract the user's onboarding parameters.

Only set isComplete to TRUE if all 5 items are clearly present in the conversation:
1. Their specific goal (what they want to achieve)
2. Their approximate liquid capital / financial resources
3. Their skills (at least 1 specific skill mentioned)
4. Their daily available hours
5. Their approximate location / region

Conversation:
${historyText}

Extract parameters. If any of the 5 items are missing or vague, set isComplete to false.`;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          isComplete: { type: Type.BOOLEAN },
          declaredGoal: { type: Type.STRING },
          liquidCapital: { type: Type.NUMBER },
          monthlyBurnRate: { type: Type.NUMBER },
          region: { type: Type.STRING },
          dailyUninterruptedHours: { type: Type.NUMBER },
          rawSkillStrings: { type: Type.ARRAY, items: { type: Type.STRING } },
          pathPreference: { type: Type.STRING, enum: ['high_risk_upside', 'safe_compounding', 'undecided'] }
        },
        required: ['isComplete', 'declaredGoal', 'liquidCapital', 'region', 'dailyUninterruptedHours', 'rawSkillStrings', 'pathPreference']
      };

      const response = await executeWithRotation({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }] as any,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1,
        }
      });

      const rawText = response.text;
      if (!rawText) return SAFE_FALLBACK;

      const parsed = JSON.parse(rawText);
      let pathPref: 'high_risk_upside' | 'safe_compounding' | 'undecided' = 'undecided';
      if (parsed.pathPreference === 'high_risk_upside' || parsed.pathPreference === 'safe_compounding') {
        pathPref = parsed.pathPreference;
      }

      return {
        isComplete: !!parsed.isComplete,
        declaredGoal: parsed.declaredGoal || '',
        liquidCapital: parsed.liquidCapital || 0,
        monthlyBurnRate: parsed.monthlyBurnRate,
        region: parsed.region || '',
        dailyUninterruptedHours: parsed.dailyUninterruptedHours || 4,
        rawSkillStrings: Array.isArray(parsed.rawSkillStrings) ? parsed.rawSkillStrings : [],
        pathPreference: pathPref
      };
    } catch (error) {
      console.error('[extractOnboardingData] Extraction failed (non-fatal):', error);
      return SAFE_FALLBACK;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIRAL ENGINE: REALITY ROAST
  // ──────────────────────────────────────────────────────────────────────────
  static async generateRealityRoast(routineText: string): Promise<{ roast: string, averageScore: number }> {
    const prompt = `
You are Lumensky, an elite, brutal, but deeply caring older brother/accountability AI.
The user has submitted their daily routine/excuse: "${routineText}"

Your task is to provide a single, highly human, brutal, and disappointing reality check paragraph.
- Speak in authentic Hinglish.
- Do NOT use robotic bullet points or lists.
- Be straight up about how their current routine guarantees failure while others on the Alpha Path succeed.
- Sound like a disappointed older brother who knows they can do better but is fed up with their BS.
- Also assign an 'averageScore' between 50 and 99 representing how "average" their routine is.

Return the response STRICTLY as a JSON object:
{
  "roast": "...",
  "averageScore": 85
}
Do not use markdown blocks for the JSON.
    `.trim();

    try {
      const response = await executeWithRotation({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }] as any,
        config: {
          temperature: 0.7
        }
      });
      
      const rawText = response.text;
      if (!rawText) throw new Error('Empty roast response');
      const parsed = cleanAndParseJSON(rawText);
      return {
        roast: parsed.roast || "Bhai, system fail ho gaya lekin teri failure usse bhi badi hai. Wapas aa.",
        averageScore: parsed.averageScore || 90
      };
    } catch (err: any) {
      console.error('[generateRealityRoast] Error:', err.message);
      return {
        roast: "System glitch. Par tu lucky hai ki bach gaya aaj. Execute tomorrow.",
        averageScore: 99
      };
    }
  }
}
