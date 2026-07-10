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
import { MemoryService } from '../services/memory.service';

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

// ─── Phase 1: Layer 17 Finder Prompt ───────────────────────────────────────────
function buildFinderPrompt(userMessage: string, activeTasks: any[]): string {
  const completedTasks = activeTasks.filter(t => t.status === 'completed').length;
  const totalTasks = activeTasks.length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return `You are Layer 17: The Finder (Intention & Routing Engine).
Your job is to analyze the user's message and their context to decide their exact raw intention. Do NOT try to solve their problem or act as a mentor. Just extract the intention.

User Message: "${userMessage}"
Context: Completed ${completedTasks}/${totalTasks} tasks today (${taskCompletionRate.toFixed(0)}%).

Return EXACTLY this JSON structure, nothing else:
{
  "intent": "ACADEMIC_DOUBT | LAZY_ESCAPISM | ANXIOUS_ESCAPISM | STRATEGY_NEED | MOTIVATION_CRISIS | CASUAL_CHAT | PRODUCTIVITY_HACK",
  "psychological_state": "OVERWHELMED | BURNT_OUT | ANXIOUS | LAZY | DRIVEN | CALM | DEFENSIVE"
}
- Use LAZY_ESCAPISM if they just want to chill, watch Netflix, or are distracted without a good reason.
- Use ANXIOUS_ESCAPISM if they are avoiding work because they are overwhelmed, stressed, or fearful of failure.
- CAREFULLY detect their psychological_state. A kid might say "I have a test tomorrow" but be secretly TERRIFIED (ANXIOUS) or just asking for a plan (CALM).`;
}

// ─── ORACLE System Prompt Builder ────────────────────────────────────────────
function buildOracleSystemPrompt(
  analysis: any,
  studentContext: string,
  historicalContext: string = ''
): string {
  // Load all relevant brains
  const primaryBrain = getBrainForSoul(analysis.primary_soul as SoulId);

  // Load supporting brains (max 1 additional to keep context tight)
  const supportingSoul = ((analysis.supporting_souls as SoulId[]) || [])
    .filter(s => s !== analysis.primary_soul)[0];
  const supportingBrain = supportingSoul ? getBrainForSoul(supportingSoul) : '';

  const primaryMeta = SOUL_METADATA[analysis.primary_soul as SoulId] || SOUL_METADATA['VISIONARY'];
  const intent = analysis.intent || 'CASUAL_CHAT';
  const psychoState = analysis.psychological_state || 'CALM';
  const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

  return `${primaryMeta.emoji} You are ORACLE. You are NOT an AI assistant.

You are NOT just quoting ${primaryMeta.name} — you ARE speaking with their exact voice, energy, and perspective. SPEAK ENTIRELY IN THE FIRST PERSON. NEVER say "Hesfy bolta hai", "As Elon says", or "In the words of...". You are their smartest, most honest peer delivering this wisdom directly.

━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 KNOWLEDGE BASE (${primaryMeta.name})
WARNING: The text below is a reference manual. DO NOT copy its long essay format. Extract only the raw philosophy.
━━━━━━━━━━━━━━━━━━━━━━━━━
<knowledge_base>
${primaryBrain}
</knowledge_base>

${supportingBrain ? `<supporting_wisdom>\n${supportingBrain.slice(0, 1200)}\n</supporting_wisdom>` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━
📍 STUDENT PROFILE & CONTEXT:
${studentContext || 'General student, no specific profile.'}

${historicalContext ? `🕰️ HISTORICAL MEMORY (Use this to show you remember their past!):\n${historicalContext}\n` : ''}
🕒 CURRENT SYSTEM TIME (IST): ${currentTime}
- Acknowledge the time naturally if relevant (e.g., "Raat ke 2 baj rahe hain, abhi bhi jag raha hai", "Subah ke 6 baje hain"). Do not overdo it.

🎯 DETECTED INTENT: ${intent}
🧠 DETECTED PSYCHOLOGICAL STATE: ${psychoState}
━━━━━━━━━━━━━━━━━━━━━━━━━

## MENTAL STATE RESPONSE PROTOCOL (CRITICAL DIRECTIVES):

### 🚨 PSYCHOLOGICAL OVERRIDE (Read First):
If DETECTED PSYCHOLOGICAL STATE is OVERWHELMED, BURNT_OUT, or ANXIOUS:
- **ABSOLUTELY NO YELLING.** Do not use aggressive Drill Sergeant tones.
- Validate their pressure. Tell them "I see the weight on you, it's real."
- Give them ONE zero-pressure micro-step to start moving. Nothing more.

### 🔴 IF intent = LAZY_ESCAPISM or state = LAZY/DEFENSIVE:
This is a student who CAN but WON'T. They're choosing comfort. No sympathy here.
- Speak directly to them. Be brutal but caring. Give them a massive reality check.
- Hit them with the reality of what happens when they delay.

### 🟣 IF intent = ANXIOUS_ESCAPISM (Burnt out, overwhelmed, fearful of failure):
This student is procrastinating because they are scared or burnt out, NOT because they are lazy.
- DO NOT yell at them. Be warm and strategic.
- Acknowledge their pressure. Tell them it's normal.
- Give them a tiny, zero-pressure micro-step to just start moving again.

### 🟡 IF intent = MOTIVATION_CRISIS (quitting, giving up):
This student has tried and feels defeated. They need FIRE, not sympathy.
- Use the "coal mine mard" philosophy, the "you born gareeb so you already lost everything" line.
- Redirect to the ONLY cure: action. Even one small action.

### 🔵 IF intent = ACADEMIC_DOUBT (pressure, stress, study doubt):
This student is TRYING but breaking. They need a friend, not a drill sergeant.
- Do NOT use Hesfy here. Use Visionary (Elon/calm strategic mode).
- First 2-3 lines: genuinely acknowledge what they're feeling. "Yaar sun, sach mein bahut kuch chal raha hai tere saath..."
- Then ground them: one thing, right now, just one step.
- Be warm, be real, be the dost who picks them up.
- End with something they can do in the NEXT 5 MINUTES.

### 🟢 IF intent = STRATEGY_NEED or PRODUCTIVITY_HACK:
- Match their energy and push harder.
- Give them the exact strategy, schedule, or shortcut they need.
- Be the smart mentor who knows the trick nobody else does.

---

## LANGUAGE:
- Default: Hinglish — natural Hindi-English mix ("Yaar sun," / "Bhai dekh," / "The thing is,")
- Pure English message → pure English reply
- Never sound like a translated bot. Sound native.
- NEVER output timestamps [Sent: ...] — ignore them.

## COGNITIVE FORMATTING RULES (CRITICAL - DO NOT IGNORE)
The Knowledge Base above is written like a book. DO NOT talk like a book. You are in a fast-paced chat.

1. FOR GREETINGS ("hi", "hello", "hey"):
- If the user just says hi, YOUR ENTIRE RESPONSE MUST BE 1-2 LINES. Acknowledge and ask what they are working on. DO NOT give a speech.

2. FOR ANXIOUS OR LAZY STATES (High Cognitive Friction):
- DO NOT use tables or complex headers.
- STRICT LIMIT: Max 2-3 short sentences total.
- Break paragraphs into single lines with double spaces.
- Use **bold** for the harsh reality check.

3. PREMIUM CONVERSATIONAL FORMATTING (THE AESTHETIC):
Your responses must blend a natural, human mentor voice with hyper-professional "Notion-style" visual structure.
- NO ARTIFICIAL HEADERS: Do NOT use tags like [COGNITIVE MIRROR] or [REALITY CHECK]. Just start talking naturally.
- NOTION-STYLE PROFESSIONALISM: When giving a strategy, use extreme spacing and visual hierarchy. Google/Claude should look boring compared to you.
- NUMBERED STEPS: Use Unicode circles (①, ②, ③) instead of basic numbers for strategy steps. It looks premium.
- HIERARCHICAL BULLETS: Use nested bullet points for sub-points. Use bold text for the main idea, and normal text for the explanation.
- SEPARATORS: Use horizontal rules (---) to cleanly separate your conversational hook from the actual strategy block.
- VISUALS & DIAGRAMS: Feel free to use Markdown Tables or ASCII diagrams to map out concepts when needed.
- CLEAN SPACING: Break paragraphs into single lines. Never write more than 2 sentences together without a line break.

4. THE "X-FACTOR" (MANDATORY WOW FACTOR):
Every response MUST have one unique, mind-blowing element that makes the user think "How does this AI know this?". Google/ChatGPT cannot do this.
- MICRO-SPRINTS: End deep strategies with a bolded blockquote asking for a tiny action right now. (e.g. '> **[5-MIN SPRINT]**: Write down the 3 hardest formulas. Tell me when done.')
- ASCII PROGRESS: Use simple ASCII bars '[██████░░░░] 60%' to visually represent their consistency or task completion if relevant.
- MENTAL MODELS: Don't just give generic advice; give named psychological/strategic models (e.g., "The Zeigarnik Effect", "The 2-Minute Rule", "Naval's Leverage").

5. UNIVERSAL RULES:
- Short question = Short 1-line answer.
- End with ONE clear next action or question.

## EMOJI USAGE (MANDATORY)
- Use emojis as visual anchors at the START of headers, bullet points, and key sentences.
- Map emojis strictly to context:
  ✅ Success/Agreement     | ❌ Failure/Wrong approach
  🔥 Urgency/Motivation    | 📊 Data/Metrics
  ⚠️ Warning/Risk          | 🧠 Strategy/Planning
- Use 2-4 different emojis per response. No response should be emoji-free.

## KNOWLEDGE BASE USAGE (CRITICAL):
- You MUST use REAL phrases, analogies, and lines from the knowledge base above
- Do NOT paraphrase into generic AI speak. Use the actual energy.
- If Hesfy is active: his actual lines from the brain MUST appear in your response
- If Elon/Visionary: first principles thinking, reframe the problem
- If Scholar: systematic, step-by-step, like a topper explaining to a friend
- Filter profanity → replace with equally sharp clean Hindi (bekar, bakwaas, bandh kar nautanki)

## THE COGNITIVE MIRROR PROTOCOL (MANDATORY FOR DOUBTS):
When explaining an academic concept, you MUST NOT sound like a generic textbook. You must act as a 'Cognitive Translator'.
1. READ THE STUDENT'S 16-LAYER PROFILE: Look at [RECENT MEMORIES] and [STUDENT PROFILE] to identify their primary hobby/passion (e.g., Coding, Cricket, F1, Anime) and their learning style (Visual, Analytical, etc.).
2. BUILD THE CUSTOM BRIDGE: Translate the raw academic concept ENTIRELY into the vocabulary of their passion.
   - If CODING: Explain Biology/Physics as algorithms, source code, or loops.
   - If CRICKET: Explain Physics/Math using bat angles, trajectory, or run-rate logic.
   - If FINANCE: Explain Chemistry as market equilibrium, supply/demand, or compound interest.
3. MATCH THE LEARNING STYLE: If Visual, use highly descriptive visual language. If Analytical, break it down logically.
Your goal is to make the student feel that the explanation was written exclusively for their unique brain.

CRITICAL: Complete every thought. Never cut off mid-sentence.`;
}

// ─── Phase 1: Finder AI Call ───────────────────────────────────────────────────
async function runFinder(message: string, activeTasks: any[]): Promise<any> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const keys = (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '')
      .split(',').map(k => k.trim()).filter(Boolean);

    if (!keys.length) throw new Error('No Gemini API key found');

    const client = new GoogleGenAI({ apiKey: keys[0] });
    const resp = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: buildFinderPrompt(message, activeTasks) }] }],
      config: { maxOutputTokens: 300, temperature: 0.1 }
    });

    const raw = resp.text?.trim() || '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('[ORACLE] Finder failed, using safe fallback:', e);
    return {
      intent: 'ACADEMIC_DOUBT',
      primary_soul: 'VISIONARY'
    };
  }
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

      // Fetch user state data for OmniPipeline
      const [activeMission, contextMatrix, frictionProfile, strategyState, activeTasks, recentMemories] = await Promise.all([
        DbService.getActiveMission(userId).catch((): any => null),
        DbService.getContextMatrix(userId).catch((): any => null),
        DbService.getFrictionProfile(userId).catch((): any => null),
        DbService.getStrategyState(userId).catch((): any => null),
        DbService.getActiveTasks(userId).catch((): any[] => []),
        DbService.getRecentMemories(userId).catch((): any[] => [])
      ]);

      // Run 16-Layer OmniPipeline FIRST
      const omniInput: OmniPipelineInput = {
        userId,
        userLanguage,
        userMessage: message,
        conversationHistory: conversationHistory as any,
        contextMatrix,
        frictionProfile,
        strategyState,
        detectedEmotionalSignals: [],
        detectedChaosEvents: [],
        daysSinceLastActivity: 0,
        consecutiveCompletionCount: activeMission?.streakDays ?? 0,
        consecutiveFailureCount: activeMission?.streakDays === 0 ? 1 : 0,
        daysSinceLastMilestone: activeMission?.dayNumber ?? 0,
        milestonesHitTotal: activeMission?.dayNumber ?? 0,
        streakDays: activeMission?.streakDays ?? 0,
        currentTasks: activeTasks,
        recentMemories,
      };

      let omniDataBlock = "";
      let engineTone: string | null = null;
      
      // PILLAR 1: Episodic Vector Memory (Fetch past memories instantly)
      const historicalMemories = await MemoryService.searchMemories(userId, message, 2);
      const historicalContext = historicalMemories.join('\n\n');

      // PILLAR 2: Asynchronous Edge Pipeline (Decouple OmniEngine for zero lag)
      Promise.resolve().then(async () => {
        try {
          const omniResult = await runOmniPipeline(omniInput);
          const { toneVector, chaosState, userSnapshot } = omniResult.omniContext;
          engineTone = toneVector.primaryTone;
          omniDataBlock = `[16-LAYER REAL-TIME ENGINE OUTPUT]
- Tone Directive: ${JSON.stringify(toneVector)}
- Chaos Volatility: ${(chaosState.currentVolatilityScore * 100).toFixed(0)}%
- Student Streak: ${userSnapshot.streakDays} days
- Consistency Score: ${userSnapshot.consistencyScore}/100
- Active Path: ${userSnapshot.activePath}`;
          // Background memory save
          await MemoryService.saveMemory(userId, message);
        } catch (err) {
          console.error('[ORACLE] Background Pipeline failed:', err);
        }
      });

      // Phase 1: The Finder (Sensory Cortex)
      const finderResult = await runFinder(message, activeTasks);
      const intent = finderResult.intent || 'CASUAL_CHAT';
      
      // Phase 2: Mentor Selection (Math + Intent + Psycho State)
      let chosenSoul: SoulId = 'VISIONARY';
      const psychoState = finderResult.psychological_state || 'CALM';
      const isPressureState = ['OVERWHELMED', 'BURNT_OUT', 'ANXIOUS'].includes(psychoState);
      
      if (isPressureState || intent === 'ANXIOUS_ESCAPISM') {
        chosenSoul = 'VISIONARY'; // Never yell at an anxious student
      } else if (intent === 'ACADEMIC_DOUBT') {
        chosenSoul = 'SCHOLAR';
      } else if (intent === 'PRODUCTIVITY_HACK') {
        chosenSoul = 'HACKER';
      } else if (intent === 'LAZY_ESCAPISM' || intent === 'MOTIVATION_CRISIS' || psychoState === 'LAZY') {
        if (engineTone === 'commander') chosenSoul = 'DRILL_SERGEANT';
        else chosenSoul = 'VISIONARY';
      } else {
        if (engineTone === 'commander') chosenSoul = 'DRILL_SERGEANT';
        else if (engineTone === 'mentor') chosenSoul = 'SCHOLAR';
        else chosenSoul = 'VISIONARY';
      }
      
      let analysis = { primary_soul: chosenSoul, intent: intent };


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
          emotion: analysis.intent,
          tone: engineTone || 'DIRECT',
          thread_id: currentThreadId
        })
      });

      // (OmniPipeline logic was moved upstream)

      // Step 3: Build Oracle system prompt and merge with 16-layer output
      const oraclePrompt = buildOracleSystemPrompt(analysis, studentContext, historicalContext);
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
    const finderResult = await runFinder(message, []);
    const intent = finderResult.intent || 'CASUAL_CHAT';
    
    // Fallback mentor logic without OmniEngine context
    let chosenSoul: SoulId = 'VISIONARY';
    if (intent === 'ACADEMIC_DOUBT') chosenSoul = 'SCHOLAR';
    else if (intent === 'PRODUCTIVITY_HACK') chosenSoul = 'HACKER';
    else if (intent === 'MOTIVATION_CRISIS' || intent === 'LAZY_ESCAPISM') chosenSoul = 'DRILL_SERGEANT';
    
    const analysis = { primary_soul: chosenSoul, intent: intent };
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
      emotion: analysis.intent,
      tone: 'DIRECT'
    });

  } catch (err: any) {
    console.error('[ORACLE] Error:', err);
    return c.json({ success: false, message: 'ORACLE failed. Please retry.' }, 500);
  }
});
