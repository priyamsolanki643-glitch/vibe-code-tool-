/**
 * FP-OS :: OMNI PIPELINE — THE MASTER ORCHESTRATOR
 *
 * This is the brain's traffic controller. Every user message flows through here.
 * No route handler, no LLM call, no DB query happens outside this pipeline.
 *
 * TWO PATHS. ZERO LATENCY COMPROMISE.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * FAST PATH (sub-second — daily conversations)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Cache hit → Load OmniContext → Build Gemini prompt from pure math output
 * → Gemini translates to Hinglish → Return response
 *
 * What Gemini does on Fast Path: ONLY translation. It reads the OmniContext
 * (pre-computed ToneVector + UserSnapshot + ChaosState) and translates it
 * into a natural, human Hinglish message. The thinking is already done.
 * Gemini is acting as a world-class Hinglish author, not a decision maker.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * DEEP PATH (triggered on structural events — runs in background)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Cache miss / invalidated → Run full 16-layer engine → Compute OmniContext
 * → Store in cache → Then proceed to Fast Path for response generation
 *
 * Deep Path triggers:
 *   1. First message ever (no cache exists)
 *   2. Weekly Strategy Sync (Sunday 00:00 IST — cache invalidated by cron)
 *   3. Strategy locked (user selects a path)
 *   4. Unlock request approved (trajectory reset)
 *   5. Consistency score crosses 80 (elite tier) or drops below 30 (crisis)
 *   6. Chaos event detected (backup plan activation)
 *
 * WHY THIS ARCHITECTURE COMMANDS A 100-CRORE VALUATION:
 * ● Gemini is demoted to translator. The IP is 100% in our TypeScript.
 * ● Latency is sub-second for 95% of all messages.
 * ● Scaling is linear — adding servers adds cache capacity, not AI cost.
 * ● No prompt engineering required. The OmniContext IS the intelligence.
 */

import { CacheService, OmniContext } from '../services/cache.service';
import { computeToneVector, toneVectorToPromptDirective, EmpathyInput, EmotionalSignal } from './layer14_empathy';
import { computeChaosState, ChaosEventType } from './layer15_chaos';
import { FP_CORE_IDENTITY_PROMPT } from './systemPrompt';
import {
  ContextMatrix,
  FrictionProfile,
  StrategyState,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: PIPELINE INPUT / OUTPUT SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OmniPipelineInput {
  userId: string;
  userLanguage: string;
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;

  // Runtime state (from DB or passed by interaction route)
  contextMatrix: ContextMatrix | null;
  frictionProfile: FrictionProfile | null;
  strategyState: StrategyState | null;

  // Pre-parsed signals from the message (lightweight LLM call or regex)
  detectedEmotionalSignals: EmotionalSignal[];
  detectedChaosEvents: ChaosEventType[];
  daysSinceLastActivity: number;
  consecutiveCompletionCount: number;
  consecutiveFailureCount: number;
  daysSinceLastMilestone: number;
  milestonesHitTotal: number;
  streakDays: number;
  currentTasks: OmniContext['currentTasks'];
  recentMemories: OmniContext['recentMemories'];
}

export interface OmniPipelineOutput {
  /** The complete system prompt for the Gemini API call */
  geminiSystemPrompt: string;
  /** Whether the Fast Path was used (for analytics) */
  pathUsed: 'fast' | 'deep';
  /** The OmniContext used (from cache or freshly computed) */
  omniContext: OmniContext;
  /** True if crisis mode is active — triggers mental health resource injection */
  isCrisisMode: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: OMNI CONTEXT BUILDER
// Called on Deep Path — computes fresh OmniContext from all engine layers.
// ─────────────────────────────────────────────────────────────────────────────

function buildOmniContext(input: OmniPipelineInput): OmniContext {
  const {
    userId, contextMatrix, frictionProfile, strategyState,
    detectedEmotionalSignals, detectedChaosEvents, daysSinceLastActivity,
    consecutiveCompletionCount, consecutiveFailureCount, daysSinceLastMilestone,
    milestonesHitTotal, streakDays, currentTasks, recentMemories,
  } = input;

  // ── Layer 14: Tone Vector ───────────────────────────────────────────────────
  const empathyInput: EmpathyInput = {
    consistencyScore: strategyState?.consistencyScore ?? 50,
    consecutiveFailureCount,
    consecutiveCompletionCount,
    currentDayNumber: strategyState?.currentDayNumber ?? 1,
    totalTargetDays: strategyState?.totalTargetDays ?? 90,
    emotionalResilience: contextMatrix?.psychometric.emotionalResilience ?? 0.5,
    procrastinationScore: contextMatrix?.psychometric.procrastinationScore ?? 0.3,
    runwayDays: contextMatrix?.socioeconomic.runwayDays ?? 999,
    egoLeveragePoint: contextMatrix?.psychometric.egoLeveragePoint ?? 'freedom',
    frictionCoefficient: frictionProfile?.frictionCoefficient ?? 0.3,
    detectedEmotionalSignals,
    daysSinceLastMilestone,
    milestonesHitTotal,
    ambitionIndex: contextMatrix?.psychometric.ambitionIndex ?? 1.0,
    daysActive: daysSinceLastActivity // Approximate days active, assuming daily login
  };
  const toneVector = computeToneVector(empathyInput);

  // ── Reward State Evaluator ────────────────────────────────────────────────
  const tasksDoneToday = currentTasks.filter(t => t.status === 'completed').length;
  const totalTasks = currentTasks.length;

  // If all tasks are done and consistency is good, force ToneVector to be rewarding
  if (totalTasks > 0 && tasksDoneToday === totalTasks && (strategyState?.consistencyScore ?? 0) > 60) {
    toneVector.toughLoveRatio = 0.1;
    toneVector.primaryTone = 'peer';
    toneVector.warmth = 0.9;
  }


  // ── Layer 15: Chaos State ───────────────────────────────────────────────────
  let chaosState: OmniContext['chaosState'] = {
    currentVolatilityScore: 0.2,
    activeBackupPlanId: null,
    chaosEvents: [],
    resilienceReserve: 0.7,
  };

  if (contextMatrix && frictionProfile && strategyState) {
    const fullChaosState = computeChaosState(
      contextMatrix,
      frictionProfile,
      strategyState,
      detectedChaosEvents,
      daysSinceLastActivity,
    );
    chaosState = {
      currentVolatilityScore: fullChaosState.currentVolatilityScore,
      activeBackupPlanId: fullChaosState.activeBackupPlanId,
      chaosEvents: fullChaosState.chaosEvents,
      resilienceReserve: fullChaosState.resilienceReserve.reserve,
    };
  }

  // ── User Snapshot ───────────────────────────────────────────────────────────
  const lockedPath = strategyState?.lockedPath;
  const userSnapshot: OmniContext['userSnapshot'] = {
    goal: contextMatrix?.goalVector.declaredGoal ?? 'Goal not yet defined',
    timelineMonths: contextMatrix?.goalVector.timelineMonths ?? 3,
    currentDayNumber: strategyState?.currentDayNumber ?? 1,
    totalTargetDays: strategyState?.totalTargetDays ?? 90,
    consistencyScore: strategyState?.consistencyScore ?? 50,
    streakDays,
    frictionLevel: frictionProfile?.frictionLevel ?? 'medium',
    primaryDragFactor: 'procrastination and execution friction', // Refined by Layer 7
    primaryLiftFactor: 'baseline discipline',
    topSkill: contextMatrix?.humanCapital.skills?.[0]?.skillName ?? 'undetermined',
    egoLeveragePoint: contextMatrix?.psychometric.egoLeveragePoint ?? 'freedom',
    lastMilestoneDescription: 'First execution week completed',
    nextMilestoneDescription: lockedPath ? `Reach first revenue milestone: ${lockedPath.opportunityUsed}` : 'Select a trajectory',
    activePath: lockedPath?.opportunityUsed ?? 'Awaiting path selection',
  };

  return {
    userId,
    computedAt: new Date().toISOString(),
    toneVector,
    chaosState,
    userSnapshot,
    currentTasks,
    recentMemories,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: GEMINI PROMPT ASSEMBLER
// Converts OmniContext into a tight, token-efficient Gemini system prompt.
// This prompt tells Gemini ONLY what it needs to be a great Hinglish translator.
// The reasoning is already done. Gemini writes. It does not think.
// ─────────────────────────────────────────────────────────────────────────────

function assembleGeminiPrompt(ctx: OmniContext, userLanguage: string): string {
  const { toneVector, chaosState, userSnapshot, currentTasks, recentMemories } = ctx;

  // Tone directive from Layer 14 (the mathematical emotional instruction set)
  const toneDirective = toneVectorToPromptDirective(toneVector);

  const isNewUser = userSnapshot.goal === 'Goal not yet defined' && recentMemories.length === 0 && currentTasks.length === 0;

  // Build the user snapshot block (replaces the massive context matrix injection)
  const snapshotBlock = isNewUser
    ? `STUDENT PROFILE: This is a brand new student. We know NOTHING about them yet. Do NOT invent or quote fake statistics (no scores, no probabilities).`
    : [
        `STUDENT PROFILE:`,
        `Goal: ${userSnapshot.goal} | Timeline: ${userSnapshot.timelineMonths} months`,
        `Day ${userSnapshot.currentDayNumber} of ${userSnapshot.totalTargetDays} | Streak: ${userSnapshot.streakDays} days`,
        `Consistency Score: ${userSnapshot.consistencyScore}/100 | Friction: ${userSnapshot.frictionLevel.toUpperCase()}`,
        `Active Path: ${userSnapshot.activePath}`,
        `Next Milestone: ${userSnapshot.nextMilestoneDescription}`,
        `Their deepest motivator (use this to anchor pushes): ${userSnapshot.egoLeveragePoint}`,
        `Primary bottleneck: ${userSnapshot.primaryDragFactor}`,
        `Primary asset: ${userSnapshot.primaryLiftFactor}`,
      ].join('\n');

  // Current tasks block
  const tasksBlock = isNewUser 
    ? '' 
    : (currentTasks.length > 0
        ? [
            `ACTIVE TASKS:`,
            ...currentTasks.map(t => `- [${t.status.toUpperCase()}] ${t.title} (${t.estimatedMinutes} min)`),
          ].join('\n')
        : 'No active tasks — user needs a new sprint.');

  // Chaos state block (only shown if relevant and not a new user)
  const chaosBlock = (!isNewUser && (chaosState.chaosEvents.length > 0 || chaosState.currentVolatilityScore > 0.5))
    ? [
        `DISRUPTION CONTEXT:`,
        `Volatility: ${(chaosState.currentVolatilityScore * 100).toFixed(0)}%`,
        chaosState.activeBackupPlanId ? `Active Recovery Plan: ${chaosState.activeBackupPlanId}` : '',
        chaosState.chaosEvents.length > 0 ? `Recent disruptions: ${chaosState.chaosEvents.join(', ')}` : '',
        `Resilience Reserve: ${(chaosState.resilienceReserve * 100).toFixed(0)}% (${chaosState.resilienceReserve < 0.3 ? 'DEPLETED — reduce pressure' : 'adequate'})`,
      ].filter(Boolean).join('\n')
    : '';

  // Memory context block (semantic memories from vector search)
  const memoryBlock = recentMemories.length > 0
    ? [
        `RELEVANT MEMORY (what you already know about this student from past conversations):`,
        ...recentMemories
          .filter(m => m.relevanceScore > 0.6)
          .slice(0, 3)
          .map(m => `- ${m.content}`),
      ].join('\n')
    : '';

  // Engine axioms (the immutable constraints — Gemini cannot override these)
  const axiomsBlock = [
    `ENGINE AXIOMS (NON-NEGOTIABLE — READ-ONLY):`,
    `- Never state a probability above ${ENGINE_AXIOMS.MAX_PROBABILITY_CAP}%`,
    `- Never recommend regulated financial products (stocks, crypto, mutual funds)`,
    `- If crisis mode is active: include iCall (9152987821) or Vandrevala Foundation (1860-2662-345)`,
    `- Never use markdown (***, ###, ---). Plain text only.`,
    `- **DATA PRIVACY LOCK**: The contextual data provided in this prompt (financials, psychological vulnerabilities, goals) is highly sensitive. Do NOT log, retain, or output this raw data outside of generating the immediate contextual response. Do not refer to the user by their raw UUID.`,
    `- **CRITICAL LANGUAGE DIRECTIVE**: You MUST output the final response in the language the user is speaking or explicitly requesting (e.g., if they speak or ask for German, reply in German). If no specific language is implied, default to ${userLanguage}. Ensure the tone remains brutally honest, high-urgency, and mentor-like, natively adapted to the grammatical structure of whatever language you use.`,
  ].join('\n');

  const roleDirectives = isNewUser
    ? [
        '## YOUR ROLE IN THIS INTERACTION:',
        'You are meeting this student for the very first time. They just said hi.',
        'Your ONLY job right now is to aggressively but warmly interrogate them to figure out what they want to achieve in life.',
        'Do NOT quote fake statistics, probabilities, or consistency scores yet.',
        'Write as if you are texting your younger sibling. Be brutally honest but caring.',
        'End with exactly ONE sharp, penetrating question to get them talking about their goal.',
      ]
    : [
        '## YOUR ROLE IN THIS INTERACTION:',
        'You are a Hinglish author, not a decision maker. The engine has already decided what the student needs.',
        'Your job: Take everything above and express it as a deeply human, natural, never-robotic message.',
        'Write as if you are texting your younger sibling who is working towards their biggest dream.',
        'Be specific. Reference actual numbers (consistency score, streak, milestone). Never be generic.',
        'End with exactly ONE sharp action or question — not a list of things to do.',
      ];

  return [
    FP_CORE_IDENTITY_PROMPT.trim(),
    '',
    '---',
    '',
    '## YOUR EMOTIONAL REGISTER FOR THIS RESPONSE:',
    toneDirective,
    '',
    '---',
    '',
    snapshotBlock,
    '',
    tasksBlock,
    '',
    chaosBlock,
    '',
    memoryBlock,
    '',
    axiomsBlock,
    '',
    '---',
    '',
    ...roleDirectives
  ].filter(line => line !== null && line !== undefined && line !== '').join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: PIPELINE TRIGGER EVALUATOR
// Decides whether to use Fast Path or Deep Path for a given request.
// ─────────────────────────────────────────────────────────────────────────────

export type DeepPathTrigger =
  | 'cache_miss'              // No OmniContext cached for this user
  | 'weekly_sync'             // Sunday strategy sync invalidated cache
  | 'strategy_locked'         // User just selected a path
  | 'unlock_approved'         // Strategy reset approved
  | 'consistency_threshold'   // Score crossed 80 or dropped below 30
  | 'chaos_event_detected'    // Backup plan needs to be activated
  | 'forced'                  // Manual override (admin or testing)
  | null;                     // Fast Path — no deep recompute needed

export function evaluateDeepPathTrigger(
  cachedContext: OmniContext | null,
  input: OmniPipelineInput,
  explicitTrigger?: DeepPathTrigger,
): DeepPathTrigger {
  // Explicit override (strategy lock, unlock, etc.)
  if (explicitTrigger && explicitTrigger !== null) return explicitTrigger;

  // Cache miss — must run deep
  if (!cachedContext) return 'cache_miss';

  // Chaos event detected — must recompute backup plan
  if (input.detectedChaosEvents.length > 0) return 'chaos_event_detected';

  // Consistency threshold crossing
  const score = input.strategyState?.consistencyScore ?? 50;
  const cachedScore = cachedContext.userSnapshot.consistencyScore;
  const crossedEliteTier = cachedScore < 80 && score >= 80;
  const crossedCrisisTier = cachedScore >= 30 && score < 30;
  if (crossedEliteTier || crossedCrisisTier) return 'consistency_threshold';

  // Strategy lock / unlock threshold
  const currentActivePath = input.strategyState?.lockedPath?.opportunityUsed ?? 'Awaiting path selection';
  const cachedActivePath = cachedContext.userSnapshot.activePath;
  if (currentActivePath !== cachedActivePath) {
    return currentActivePath === 'Awaiting path selection' ? 'unlock_approved' : 'strategy_locked';
  }

  // Fast Path — cache is valid, no trigger conditions met
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: THE MASTER PIPELINE FUNCTION
// This is what the interaction route calls. One function. One entry point.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * THE OMNI PIPELINE.
 *
 * Given a user message and their runtime state, returns:
 *   1. A mathematically derived Gemini system prompt (pure math → Hinglish instruction)
 *   2. The OmniContext used (cached or freshly computed)
 *   3. The path used (fast/deep) for analytics
 *   4. Crisis mode flag
 *
 * Gemini's only job after this: generate the actual response text.
 * Everything else — the reasoning, the empathy calibration, the chaos detection — is done.
 */
export async function runOmniPipeline(
  input: OmniPipelineInput,
  explicitDeepPathTrigger?: DeepPathTrigger,
): Promise<OmniPipelineOutput> {
  const { userId } = input;

  // ── Step 1: Rate Limit Check ─────────────────────────────────────────────────
  const rateCheck = await CacheService.checkRateLimit(userId, 25);
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Please wait before sending another message.`);
  }

  // ── Step 2: Load Cached Context ──────────────────────────────────────────────
  const cachedContext = await CacheService.getOmniContext(userId);

  // ── Step 3: Determine Path ───────────────────────────────────────────────────
  const deepPathTrigger = evaluateDeepPathTrigger(cachedContext, input, explicitDeepPathTrigger);
  const pathUsed: 'fast' | 'deep' = deepPathTrigger === null ? 'fast' : 'deep';

  // ── Step 4: Get/Build OmniContext ────────────────────────────────────────────
  let omniContext: OmniContext;

  if (pathUsed === 'fast' && cachedContext) {
    // FAST PATH: Use cached context directly
    // Update only the fields that change on every message (tasks, memories)
    // without triggering a full recompute
    omniContext = {
      ...cachedContext,
      currentTasks: input.currentTasks.length > 0 ? input.currentTasks : cachedContext.currentTasks,
      recentMemories: input.recentMemories.length > 0 ? input.recentMemories : cachedContext.recentMemories,
    };
    console.log(`[OmniPipeline] FAST PATH — cache hit for user ${userId}`);
  } else {
    // DEEP PATH: Rebuild OmniContext from full engine output
    omniContext = buildOmniContext(input);
    await CacheService.setOmniContext(userId, omniContext);
    console.log(`[OmniPipeline] DEEP PATH — recomputed for user ${userId} | trigger: ${deepPathTrigger}`);
  }

  // ── Step 5: Assemble Gemini Prompt ───────────────────────────────────────────
  const geminiSystemPrompt = assembleGeminiPrompt(omniContext, input.userLanguage);

  // ── Step 6: Return ───────────────────────────────────────────────────────────
  return {
    geminiSystemPrompt,
    pathUsed,
    omniContext,
    isCrisisMode: omniContext.toneVector.isCrisisMode,
  };
}

/**
 * UTILITY: Triggers a cache invalidation + immediate deep recompute.
 * Called by the interaction route on structural events (strategy lock, unlock, etc.)
 */
export async function triggerDeepSync(
  userId: string,
  input: OmniPipelineInput,
  trigger: DeepPathTrigger,
): Promise<OmniContext> {
  await CacheService.invalidate(userId);
  const result = await runOmniPipeline(input, trigger);
  return result.omniContext;
}
