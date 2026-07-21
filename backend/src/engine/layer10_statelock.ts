/**
 * FP-OS :: LAYER 10 — IMMUTABLE TRAJECTORY STATE LOCK
 *
 * Once a path is selected by the user with full information,
 * the state machine enters lock protocol.
 *
 * Unlike standard LLMs (ChatGPT, Gemini, Claude) that allow users
 * to alter parameters mid-journey through excuses or corrupt data,
 * FP introduces a strict State Lock Protocol.
 *
 * The state changes ONLY under two precise conditions:
 * 1. Verified structural life change (job loss, major health event, capital change)
 * 2. Complete goal reset — which wipes consistency score to zero
 *
 * What does NOT trigger an unlock:
 * - Tiredness
 * - Boredom
 * - A new idea the user read about
 * - Feeling demotivated
 * - Excuses
 *
 * This distinction is the core product moat.
 */

import {
  StrategyState,
  StateStatus,
  UnlockReason,
  PivotEvent,
  TrajectoryPath,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: UNLOCK REQUEST VALIDATOR
// The engine that determines whether an unlock request is legitimate.
// This is the gatekeeper of the Strategy Anchor.
// ─────────────────────────────────────────────────────────────────────────────

export interface UnlockRequest {
  reason: string;           // Raw text from user explaining why they want to change
  evidence?: string;        // Any supporting evidence (optional)
  requestedAt: string;      // ISO timestamp
}

export interface UnlockValidationResult {
  approved: boolean;
  unlockReason: UnlockReason | null;
  systemResponse: string;
  consistencyPenalty: number;   // Applied even if approved (resets have major cost)
  nextState: StateStatus;
}

// Keywords that indicate LEGITIMATE structural changes (not excuses)
const STRUCTURAL_CHANGE_SIGNALS = [
  'lost job', 'lost my job', 'laid off', 'fired',
  'health emergency', 'hospital', 'hospitalized', 'diagnosed',
  'family emergency', 'family member', 'accident',
  'platform shut down', 'platform banned', 'account banned',
  'market collapsed', 'industry changed', 'regulation changed',
  'capital changed', 'got investment', 'inheritance', 'capital increased',
  'moved city', 'moved country', 'relocated',
  'completely changed goal', 'new goal', 'different goal', 'reset everything',
];

// Keywords that indicate EXCUSES, not structural changes
const EXCUSE_SIGNALS = [
  'tired', 'exhausted', 'burnt out', 'not feeling', 'not motivated',
  'found better idea', 'want to try', 'thinking about',
  'bored', 'too hard', 'too difficult', 'struggling',
  'maybe', 'might', 'could', 'considering', 'thinking',
  'procrastinated', 'missed a day', 'missed a week',
  'new opportunity', 'shiny', 'exciting new',
  'my friend said', 'i read', 'i saw', 'watched a video',
];

export function validateUnlockRequest(
  request: UnlockRequest,
  currentState: StrategyState,
): UnlockValidationResult {
  const reasonLower = request.reason.toLowerCase();

  // Check for structural change signals
  const hasStructuralSignal = STRUCTURAL_CHANGE_SIGNALS.some((signal) =>
    reasonLower.includes(signal)
  );

  // Check for excuse signals
  const hasExcuseSignal = EXCUSE_SIGNALS.some((signal) =>
    reasonLower.includes(signal)
  );

  // Check if it's a complete goal reset
  const isCompleteReset = reasonLower.includes('reset') || reasonLower.includes('completely change')
    || reasonLower.includes('different goal') || reasonLower.includes('new goal');

  // Check for evidence-backed execution failure pivot (Market Fundamental Change)
  const evidenceKeywords = [
    'calls', 'outreach', 'leads', 'github', 'code', 'tested', 'log',
    'rejections', 'numbers', 'data', 'sheet', 'proof', 'link', 'sent',
    'commits', 'response', 'rejected', 'failed outreach', 'no response'
  ];
  const hasEvidence = request.evidence && request.evidence.trim().length > 10;
  const containsEvidenceKeywords = request.evidence && evidenceKeywords.some(kw => 
    request.evidence!.toLowerCase().includes(kw)
  );

  const isEvidenceBackedPivot = (reasonLower.includes('pivot') || reasonLower.includes('stuck') || reasonLower.includes('feedback') || reasonLower.includes('fail') || reasonLower.includes('change')) && hasEvidence && containsEvidenceKeywords;

  if (isEvidenceBackedPivot) {
    return {
      approved: true,
      unlockReason: 'market_fundamental_change',
      systemResponse: `Evidence-Backed Market Pivot authorized.

Your submitted evidence has been analyzed: "${request.evidence}"

Because you have logged verified market feedback or outreach rejections, the system evaluates this as disciplined execution encountering a structural dead end, rather than avoidance of work.

Your consistency score is held at ${currentState.consistencyScore}/100 with 0 penalty points deducted.

We will now authorize a pivot. The engine will guide you to reformulate your path based on this real-world feedback. Confirm this transition to proceed.`,
      consistencyPenalty: 0,
      nextState: 'structural_pivot',
    };
  }

  // DECISION TREE
  if (isCompleteReset) {
    return {
      approved: true,
      unlockReason: 'complete_goal_reset',
      systemResponse: `I've registered your request for a complete goal reset.

Before I proceed: I need you to understand what this means.

Your consistency score (${currentState.consistencyScore}/100) will be wiped to zero. Your progress history, your task completion record, your velocity metrics — everything resets to Day 0 baselines.

This is not a punishment. It's the honest cost of starting over. You are not the same person you were on Day 0, but the system needs to re-learn your updated constraint profile.

If you're resetting because your circumstances have genuinely changed, that is a legitimate structural pivot. If you're resetting because you're avoiding the difficulty of your current path — that is the behavior the system is specifically designed to catch.

Confirm your reset decision, and I will wipe the slate and begin a new onboarding sequence.`,
      consistencyPenalty: currentState.consistencyScore, // Full wipe
      nextState: 'reset',
    };
  }

  if (hasStructuralSignal && !hasExcuseSignal) {
    return {
      approved: true,
      unlockReason: 'verified_structural_life_change',
      systemResponse: `I've detected a structural life change in your request. This qualifies as a legitimate reason to re-evaluate your trajectory.

I'm not unlocking the strategy wholesale — I'm initiating a Delta Assessment. The engine will recalculate your constraint matrix based on the new information and determine whether a trajectory adjustment or a full reset is warranted.

Your consistency score is held at ${currentState.consistencyScore} during this assessment. It will not be penalized for legitimate structural changes.

Please confirm the specific change so I can update your constraint matrix accurately.`,
      consistencyPenalty: 0,  // No penalty for legitimate structural changes
      nextState: 'structural_pivot',
    };
  }

  // Excuse detected — lock enforced
  if (hasExcuseSignal) {
    return {
      approved: false,
      unlockReason: null,
      systemResponse: generateLockEnforcementResponse(request.reason, currentState),
      consistencyPenalty: 0,  // No penalty for the request itself
      nextState: 'locked',    // Stays locked
    };
  }

  // Ambiguous request — ask for specifics
  return {
    approved: false,
    unlockReason: null,
    systemResponse: `Your request to modify your strategy trajectory is not specific enough for the system to evaluate.

The system recognizes two types of unlock requests:
1. Structural life changes (job loss, health emergency, capital change, market collapse)
2. Complete goal reset (starts the onboarding process over with full consistency score wipe)

Can you be more specific about what has changed in your actual circumstances?

If nothing has changed except how you feel about the difficulty — that is not a structural change. That is friction. And friction is handled by the execution engine, not the strategy engine.`,
    consistencyPenalty: 0,
    nextState: 'locked',
  };
}

function generateLockEnforcementResponse(userReason: string, currentState: StrategyState): string {
  return `Strategy state is locked. Excuses do not change reality vectors.

You said: "${userReason}"

That is not a structural change. It is a friction event.

Your strategy was built on your real constraint profile, not on your best days. It accounted for the fact that execution is hard. The difficulty you're experiencing right now was priced into the probability calculation.

Here is what your consistency score currently says: ${currentState.consistencyScore}/100.

If you execute your assigned tasks and log completion, that score will grow. If you unlock and change course based on current friction, you lose your accumulated trajectory momentum.

You have two choices right now:
[Choice A] Return to your task sprint and execute what's in front of you.
[Choice B] Declare structural failure and wipe your score for a full reset.

Awaiting your selection. No further unlock requests will be processed without a structural evidence statement.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: STATE MACHINE TRANSITIONS
// The finite state machine that governs all valid state transitions.
// ─────────────────────────────────────────────────────────────────────────────

type ValidTransition = {
  from: StateStatus;
  to: StateStatus;
  trigger: string;
};

export const VALID_STATE_TRANSITIONS: ValidTransition[] = [
  { from: 'intake', to: 'simulating', trigger: 'onboarding_complete' },
  { from: 'simulating', to: 'awaiting_selection', trigger: 'simulation_complete' },
  { from: 'awaiting_selection', to: 'locked', trigger: 'user_selects_path' },
  { from: 'locked', to: 'structural_pivot', trigger: 'verified_structural_change' },
  { from: 'locked', to: 'reset', trigger: 'complete_goal_reset' },
  { from: 'structural_pivot', to: 'locked', trigger: 'pivot_assessed_no_change' },
  { from: 'structural_pivot', to: 'simulating', trigger: 'pivot_requires_re_simulation' },
  { from: 'structural_pivot', to: 'reset', trigger: 'pivot_triggers_full_reset' },
  { from: 'reset', to: 'intake', trigger: 'reset_confirmed' },
];

export function isValidTransition(from: StateStatus, to: StateStatus): boolean {
  return VALID_STATE_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getTransitionTrigger(from: StateStatus, to: StateStatus): string | null {
  const transition = VALID_STATE_TRANSITIONS.find((t) => t.from === from && t.to === to);
  return transition?.trigger ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: STRATEGY LOCK EXECUTOR
// Executes the lock operation and returns the new locked state.
// ─────────────────────────────────────────────────────────────────────────────

export function lockStrategy(
  currentState: StrategyState,
  selectedPath: TrajectoryPath,
): StrategyState {
  if (!isValidTransition(currentState.status, 'locked')) {
    throw new Error(`Invalid state transition from '${currentState.status}' to 'locked'.`);
  }

  return {
    ...currentState,
    status: 'locked',
    lockedPath: selectedPath,
    lockedAt: new Date().toISOString(),
    isLocked: true,
    currentDayNumber: 1,
    totalTargetDays: selectedPath.timelineMonths * 30,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: PIVOT ASSESSOR
// When a structural change is verified, this determines whether
// the path needs adjustment or just a parameter update.
// ─────────────────────────────────────────────────────────────────────────────

export interface PivotAssessmentResult {
  pivotType: 'minor_parameter_update' | 'trajectory_adjustment' | 'full_reset_required';
  adjustmentDetails: string;
  nextAction: string;
  newStrategyState: StrategyState;
}

export function assessStructuralPivot(
  currentState: StrategyState,
  structuralChangeDescription: string,
  updatedCapitalChange?: number,    // Positive = gained capital, negative = lost capital
  updatedHoursChange?: number,      // Change in daily available hours
): PivotAssessmentResult {
  const changeLower = structuralChangeDescription.toLowerCase();

  // Minor parameter update — same path, updated variables
  const isMinorChange = (
    (updatedCapitalChange !== undefined && Math.abs(updatedCapitalChange) < 10000)
    || (updatedHoursChange !== undefined && Math.abs(updatedHoursChange) <= 1)
  );

  // Full reset triggers
  const requiresFullReset = changeLower.includes('completely different goal')
    || changeLower.includes('moved to') // Major relocation
    || changeLower.includes('lost all');

  // Trajectory adjustment (same goal, different path)
  const needsTrajectoryAdjustment = changeLower.includes('capital')
    || changeLower.includes('job')
    || changeLower.includes('market')
    || changeLower.includes('industry');

  if (requiresFullReset) {
    return {
      pivotType: 'full_reset_required',
      adjustmentDetails: 'Structural change requires a complete re-onboarding and constraint matrix rebuild.',
      nextAction: 'Initiate full reset. Consistency score wiped. New baseline assessment begins.',
      newStrategyState: {
        ...currentState,
        status: 'reset',
        consistencyScore: 0,
        lockedPath: null,
        lockedAt: null,
        isLocked: false,
        pivotHistory: [...currentState.pivotHistory, {
          requestedAt: new Date().toISOString(),
          reason: structuralChangeDescription,
          approved: true,
          approvalReason: 'Verified structural change requiring full reset',
          consistencyScoreAtTime: currentState.consistencyScore,
        }],
      },
    };
  }

  if (needsTrajectoryAdjustment && !isMinorChange) {
    return {
      pivotType: 'trajectory_adjustment',
      adjustmentDetails: 'Your core goal remains valid but the path needs re-simulation with updated constraint matrix.',
      nextAction: 'Re-run simulation with updated parameters. Consistency score is preserved. Day counter continues from current day.',
      newStrategyState: {
        ...currentState,
        status: 'simulating',
        pivotHistory: [...currentState.pivotHistory, {
          requestedAt: new Date().toISOString(),
          reason: structuralChangeDescription,
          approved: true,
          approvalReason: 'Verified structural change requiring trajectory re-simulation',
          consistencyScoreAtTime: currentState.consistencyScore,
        }],
      },
    };
  }

  // Minor update — no re-simulation, just parameter update
  return {
    pivotType: 'minor_parameter_update',
    adjustmentDetails: 'Minor constraint change recorded. Core trajectory remains valid. Task parameters may be adjusted.',
    nextAction: 'Update constraint matrix. Continue on current locked path. No re-simulation required.',
    newStrategyState: {
      ...currentState,
      status: 'locked',
      pivotHistory: [...currentState.pivotHistory, {
        requestedAt: new Date().toISOString(),
        reason: structuralChangeDescription,
        approved: true,
        approvalReason: 'Minor structural parameter update',
        consistencyScoreAtTime: currentState.consistencyScore,
      }],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: CONSISTENCY SCORE MANAGER
// Tracks and updates the consistency score based on task outcomes.
// ─────────────────────────────────────────────────────────────────────────────

export function updateConsistencyScore(
  currentScore: number,
  event: 'task_completed' | 'task_failed' | 'task_partial' | 'milestone_hit',
): { newScore: number; delta: number; message: string } {
  let delta = 0;
  let message = '';

  switch (event) {
    case 'task_completed':
      delta = ENGINE_AXIOMS.CONSISTENCY_COMPLETION_REWARD;
      message = `+${delta} — Task executed. Consistency score building.`;
      break;
    case 'task_failed':
      delta = -ENGINE_AXIOMS.CONSISTENCY_FAILURE_PENALTY;
      message = `-${Math.abs(delta)} — Execution gap logged. Score degraded.`;
      break;
    case 'task_partial':
      delta = Math.floor(ENGINE_AXIOMS.CONSISTENCY_COMPLETION_REWARD * 0.4);
      message = `+${delta} — Partial execution logged. Partial credit awarded. Full completion required next time.`;
      break;
    case 'milestone_hit':
      delta = ENGINE_AXIOMS.CONSISTENCY_COMPLETION_REWARD * 3;
      message = `+${delta} — Milestone achieved. Significant consistency score boost.`;
      break;
  }

  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  return { newScore, delta, message };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: INITIAL STATE FACTORY
// Creates a fresh strategy state for a new user.
// ─────────────────────────────────────────────────────────────────────────────

export function createInitialStrategyState(): StrategyState {
  return {
    status: 'intake',
    lockedPath: null,
    lockedAt: null,
    consistencyScore: ENGINE_AXIOMS.CONSISTENCY_INITIAL_SCORE,
    currentDayNumber: 0,
    totalTargetDays: 0,
    isLocked: false,
    lastUnlockRequest: null,
    unlockGranted: false,
    unlockReason: null,
    pivotHistory: [],
    selectionPresentedAt: null,
    consecutiveFailureCount: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastCompletionDate: null,
    pausedAt: null,
    pauseExpiresAt: null,
    pauseReason: null,
  };
}
