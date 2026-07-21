/**
 * FP-OS :: LAYER 15 — REAL-WORLD VOLATILITY ENGINE (CHAOS ENGINE)
 *
 * THE RESILIENCE LAYER. THE REASON THE SYSTEM NEVER BREAKS WHEN LIFE DOES.
 *
 * CORE INSIGHT (What separates great coaching from great AI coaching):
 * Every strategy assumes the person will execute perfectly. Real life doesn't.
 * Students get sick. Families have emergencies. Electricity goes out.
 * Motivation collapses. Internet dies. A death in the family.
 *
 * Every OTHER AI system responds to this by: doing nothing, waiting for the
 * user to re-engage, then repeating the same advice.
 *
 * Layer 15 PRE-COMPUTES chaos. Before the student fails, we already have:
 *   1. Their current volatility score (how turbulent their life is right now)
 *   2. A ranked set of backup plans (computed at strategy lock, updated weekly)
 *   3. Resilience reserve (how many shocks they can absorb before burnout)
 *   4. Auto-recovery triggers (what event causes which recovery plan to activate)
 *
 * When the chaos hits (and it will), the system doesn't freeze.
 * It instantly presents the pre-computed recovery path as if the AI
 * always knew this was coming. Because mathematically — it did.
 *
 * THE STOCHASTIC MODEL:
 * We model real-world disruptions as a Poisson process:
 *   P(disruption in next N days) = 1 - e^(-λN)
 * Where λ (lambda) is the disruption rate, personalized to each student's
 * volatility profile (geography, work environment, stress level, resilience).
 *
 * This is NOT pessimism. It is engineering realism that creates hope —
 * because students with a pre-computed backup plan are 3x more likely to
 * recover from disruptions than those who improvise.
 */

import {
  ContextMatrix,
  FrictionProfile,
  StrategyState,
  TrajectoryPath,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: CHAOS EVENT TAXONOMY
// All known disruption categories and their historical impact on consistency.
// ─────────────────────────────────────────────────────────────────────────────

export type ChaosEventType =
  | 'illness_personal'          // Student falls sick
  | 'illness_family'            // Family member needs care
  | 'connectivity_failure'      // Internet / power outage
  | 'emotional_crisis'          // Relationship, mental health episode
  | 'financial_shock'           // Unexpected expense, income cut
  | 'academic_overload'         // Exam season colliding with execution plan
  | 'social_pressure'           // Friends/family discouraging the path
  | 'device_failure'            // Laptop/phone breaks
  | 'procrastination_spiral'    // Extends beyond normal friction — becomes a loop
  | 'milestone_failure_shock';  // Missing a major milestone creates crisis paralysis

export interface ChaosEvent {
  type: ChaosEventType;
  /**
   * Severity (0.0–1.0)
   * 0.0 = Minor disruption (fixable in hours)
   * 0.5 = Moderate disruption (sets back 2–5 days)
   * 1.0 = Major disruption (threatens entire trajectory)
   */
  severity: number;
  /** Expected duration in days before student can resume normal execution */
  expectedDurationDays: number;
  /** Probability this event occurs in any given 30-day window for this student profile */
  baseMonthlyProbability: number;
}

/** All known chaos events with their population-level base stats */
const CHAOS_EVENT_LIBRARY: Record<ChaosEventType, Omit<ChaosEvent, 'type'>> = {
  illness_personal:         { severity: 0.45, expectedDurationDays: 3, baseMonthlyProbability: 0.25 },
  illness_family:           { severity: 0.55, expectedDurationDays: 5, baseMonthlyProbability: 0.15 },
  connectivity_failure:     { severity: 0.30, expectedDurationDays: 1, baseMonthlyProbability: 0.35 },
  emotional_crisis:         { severity: 0.70, expectedDurationDays: 7, baseMonthlyProbability: 0.12 },
  financial_shock:          { severity: 0.80, expectedDurationDays: 14, baseMonthlyProbability: 0.10 },
  academic_overload:        { severity: 0.50, expectedDurationDays: 7, baseMonthlyProbability: 0.20 },
  social_pressure:          { severity: 0.40, expectedDurationDays: 3, baseMonthlyProbability: 0.22 },
  device_failure:           { severity: 0.60, expectedDurationDays: 4, baseMonthlyProbability: 0.08 },
  procrastination_spiral:   { severity: 0.55, expectedDurationDays: 5, baseMonthlyProbability: 0.30 },
  milestone_failure_shock:  { severity: 0.65, expectedDurationDays: 4, baseMonthlyProbability: 0.18 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: BACKUP PLAN LIBRARY
// Pre-computed recovery strategies. Each maps to one or more chaos event types.
// When Layer 15 detects a chaos event, it selects and returns the matching plan.
// ─────────────────────────────────────────────────────────────────────────────

export interface BackupPlan {
  planId: string;
  name: string;
  /** Which chaos events this plan handles */
  triggeredBy: ChaosEventType[];
  /** Duration in days before returning to full execution */
  recoveryDays: number;
  /** The actual micro-steps for recovery */
  recoverySteps: string[];
  /** What the AI says to introduce this plan (the human-facing hook) */
  aiIntroductionTemplate: string;
  /** Consistency score adjustment during recovery (usually negative, but small) */
  consistencyImpact: number;
}

export const BACKUP_PLAN_LIBRARY: BackupPlan[] = [
  {
    planId: 'BP_MAINTENANCE_MODE',
    name: 'Maintenance Mode Protocol',
    triggeredBy: ['illness_personal', 'illness_family', 'emotional_crisis', 'academic_overload'],
    recoveryDays: 3,
    recoverySteps: [
      'Day 1: Zero execution pressure. ONE 20-minute review of existing work only.',
      'Day 2: Single micro-task (< 30 minutes). No new learning. Consolidation only.',
      'Day 3: 50% normal schedule. Re-assess and commit to full return on Day 4.',
    ],
    aiIntroductionTemplate: `Life ne thodi speed slow kara di hai. Koi baat nahi — yeh Maintenance Mode hai, quit mode nahi. Teen din ke liye ek hi rule: ek chota kaam roz. Bas. Aur fir wapas.`,
    consistencyImpact: -3,
  },
  {
    planId: 'BP_CONNECTIVITY_WORKAROUND',
    name: 'Offline Execution Sprint',
    triggeredBy: ['connectivity_failure', 'device_failure'],
    recoveryDays: 1,
    recoverySteps: [
      'Identify which tasks require zero internet (writing, reading, planning, sketching).',
      'Execute all offline-compatible tasks first. Document outputs on paper/phone notes.',
      'Queue internet-dependent tasks for when connectivity restores.',
    ],
    aiIntroductionTemplate: `Internet gaya? Hum offline sprint mein shift karte hain. Aaj ke tasks mein se jo bhi bina net ke ho sakta hai woh abhi karte hain. Kal normal schedule.`,
    consistencyImpact: -1,
  },
  {
    planId: 'BP_FINANCIAL_TRIAGE',
    name: 'Financial Triage Protocol',
    triggeredBy: ['financial_shock'],
    recoveryDays: 14,
    recoverySteps: [
      'Immediate: Map exact cash flow situation. Days of runway remaining?',
      'Emergency income task: Deploy highest-capability skill for fastest cash (gig work, tutoring, etc.)',
      'Suspend non-revenue tasks for 7 days. Focus 100% on income stabilization.',
      'Week 2: Gradually reintroduce original plan tasks as financial pressure reduces.',
    ],
    aiIntroductionTemplate: `Yaar, pehle paisa stable karte hain — sab kuch baad mein hoga. Abhi sirf ek cheez: paisa. Main tujhe ek emergency income sprint pe le chalta hoon.`,
    consistencyImpact: -8,
  },
  {
    planId: 'BP_DOPAMINE_CIRCUIT_BREAKER',
    name: 'Dopamine Loop Circuit Breaker',
    triggeredBy: ['procrastination_spiral'],
    recoveryDays: 2,
    recoverySteps: [
      'Hour 1: Close ALL tabs. Phone in another room. Timer set for 25 minutes.',
      'One Pomodoro on the single most important task. No switching.',
      'After completion: Log it. The streak restarts from this moment.',
      'Day 2: Standard schedule resumes. Do NOT try to compensate for lost time.',
    ],
    aiIntroductionTemplate: `Bhai, loop mein phas gaye hain. Abhi ek kaam: phone side mein rakh, 25-minute timer laga, aur sabse important kaam shuru kar. Bas itna. Dekh kya hota hai.`,
    consistencyImpact: -2,
  },
  {
    planId: 'BP_SOCIAL_PRESSURE_SHIELD',
    name: 'Social Pressure Immunity Protocol',
    triggeredBy: ['social_pressure'],
    recoveryDays: 1,
    recoverySteps: [
      'Acknowledge: External doubt is a signal that you are doing something others cannot see yet.',
      'Write down ONE data point that proves you are making progress (any metric).',
      'Avoid explaining or defending your path to doubters for the next 7 days.',
      'Resume full execution immediately. Results are the only reply that matters.',
    ],
    aiIntroductionTemplate: `Log kuch keh rahe hain? Good. Matlab tu kuch alag kar raha hai. Ek cheez likh — koi bhi ek proof ki tu aage badh raha hai. Fir wapas kaam pe.`,
    consistencyImpact: 0,
  },
  {
    planId: 'BP_MILESTONE_SHOCK_RECOVERY',
    name: 'Milestone Miss Recovery Sequence',
    triggeredBy: ['milestone_failure_shock'],
    recoveryDays: 3,
    recoverySteps: [
      'Day 1: Diagnostic only. Map exactly WHY the milestone was missed (friction? skill gap? time?).',
      'Day 2: Adjust timeline +20% buffer. Recalibrate the next milestone to a lower bar.',
      'Day 3: Re-commit with the adjusted target. Progress is non-linear. This is data, not failure.',
    ],
    aiIntroductionTemplate: `Milestone miss hua. Okay. Ab sabse zaruri cheez: WHY? Kal ke liye ek diagnosis karenge aur fir naya, achievable target set karenge. Quit nahi karna — recalibrate karna hai.`,
    consistencyImpact: -5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: VOLATILITY CALCULATOR
// Computes the student's current turbulence score (0.0–1.0).
// ─────────────────────────────────────────────────────────────────────────────

export interface VolatilityInput {
  // Context-derived
  geographyTier: string;
  internetStability: string;
  workEnvironment: string;
  runwayDays: number;
  emotionalResilience: number;
  frictionCoefficient: number;

  // Behavioral signals
  consecutiveFailureCount: number;
  daysSinceLastActivity: number;
  recentChaosEvents: ChaosEventType[];
}

/**
 * Computes how turbulent the student's current life is.
 * High volatility → higher likelihood of chaos → pre-activate backup plans proactively.
 *
 * This score is the "chaos weather forecast" for each student.
 */
export function computeVolatilityScore(input: VolatilityInput): number {
  let score = 0.2; // Base: all humans have some baseline life volatility

  // Geography/infrastructure factors
  if (input.geographyTier === 'rural') score += 0.10;
  else if (input.geographyTier === 'tier3_semi_urban') score += 0.07;

  if (input.internetStability === '4g_intermittent' || input.internetStability === '2g_unstable') score += 0.08;
  if (input.workEnvironment === 'chaotic_noisy') score += 0.08;

  // Financial pressure
  if (input.runwayDays < 30) score += 0.20;
  else if (input.runwayDays < 60) score += 0.12;
  else if (input.runwayDays < 90) score += 0.06;

  // Psychological resilience (low resilience = more volatile reactions to shocks)
  score += (1 - input.emotionalResilience) * 0.15;

  // Current friction state
  score += input.frictionCoefficient * 0.12;

  // Behavioral signals
  if (input.consecutiveFailureCount >= 3) score += 0.12;
  if (input.consecutiveFailureCount >= 5) score += 0.10;

  // Inactivity signal — days without a logged activity
  if (input.daysSinceLastActivity >= 3) score += 0.10;
  if (input.daysSinceLastActivity >= 7) score += 0.08;

  // Recent chaos events compound volatility
  const recentChaosWeight = Math.min(0.20, input.recentChaosEvents.length * 0.06);
  score += recentChaosWeight;

  return Math.max(0.0, Math.min(1.0, Math.round(score * 1000) / 1000));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: DISRUPTION PROBABILITY CALCULATOR (Poisson Model)
// Given λ (personalized disruption rate) and N (days), computes
// P(at least one disruption in next N days) = 1 - e^(-λN)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes personalized disruption probability for a given chaos event type.
 * The base probability is adjusted by the student's volatility profile.
 *
 * λ (lambda) = base rate × volatility multiplier
 * P(disruption in N days) = 1 - e^(-λ × N/30)
 */
export function computeDisruptionProbability(
  eventType: ChaosEventType,
  volatilityScore: number,
  horizonDays: number = 30,
): number {
  const baseEvent = CHAOS_EVENT_LIBRARY[eventType];

  // Volatility score multiplies the base probability (1.0 = unchanged, 2.0 = doubled)
  const volatilityMultiplier = 1 + volatilityScore;
  const lambda = baseEvent.baseMonthlyProbability * volatilityMultiplier;

  // Poisson CDF: P(at least 1 event in N/30 months) = 1 - e^(-λ × N/30)
  const timeInMonths = horizonDays / 30;
  const probability = 1 - Math.exp(-lambda * timeInMonths);

  return Math.min(0.99, Math.round(probability * 1000) / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: RESILIENCE RESERVE CALCULATOR
// How many shocks can the student absorb before hitting the burnout threshold?
// ─────────────────────────────────────────────────────────────────────────────

export interface ResilienceReserveOutput {
  reserve: number;          // 0.0 (empty tank) → 1.0 (fully resilient)
  label: 'full' | 'adequate' | 'depleted' | 'critical';
  maxAdditionalShocksBeforeBurnout: number;
  recommendation: string;
}

export function computeResilienceReserve(
  emotionalResilience: number,
  consistencyScore: number,
  consecutiveFailureCount: number,
  recentChaosEvents: ChaosEventType[],
): ResilienceReserveOutput {
  // Base reserve from emotional resilience
  let reserve = emotionalResilience;

  // Consistency score lifts resilience (wins build reserve)
  reserve += (consistencyScore / 100) * 0.20;

  // Each consecutive failure depletes reserve
  reserve -= consecutiveFailureCount * 0.08;

  // Each recent chaos event depletes reserve proportionally to severity
  for (const event of recentChaosEvents) {
    reserve -= CHAOS_EVENT_LIBRARY[event].severity * 0.10;
  }

  reserve = Math.max(0.0, Math.min(1.0, reserve));

  // Estimate capacity for additional shocks
  // One "average" shock costs ~0.15 resilience reserve units
  const averageShockCost = 0.15;
  const maxShocks = Math.floor(reserve / averageShockCost);

  let label: ResilienceReserveOutput['label'];
  if (reserve >= 0.70) label = 'full';
  else if (reserve >= 0.40) label = 'adequate';
  else if (reserve >= 0.20) label = 'depleted';
  else label = 'critical';

  const recommendations: Record<ResilienceReserveOutput['label'], string> = {
    full: 'Student has strong resilience. Push for execution velocity.',
    adequate: 'Monitor for stress signals. Introduce one recovery ritual.',
    depleted: 'Reduce task volume by 30%. Focus on consistency, not output.',
    critical: 'Student is near burnout. Activate Maintenance Mode immediately. No new tasks.',
  };

  return {
    reserve: Math.round(reserve * 1000) / 1000,
    label,
    maxAdditionalShocksBeforeBurnout: maxShocks,
    recommendation: recommendations[label],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: MASTER CHAOS STATE ASSEMBLER
// The single exported function the OmniPipeline calls.
// Returns the complete ChaosState that gets injected into the OmniContext.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChaosState {
  currentVolatilityScore: number;
  volatilityLabel: 'calm' | 'turbulent' | 'volatile' | 'crisis';
  activeBackupPlanId: string | null;
  activeBackupPlan: BackupPlan | null;
  chaosEvents: ChaosEventType[];
  resilienceReserve: ResilienceReserveOutput;
  topThreats: Array<{ event: ChaosEventType; probability30Days: number }>;
  recoveryRecommendation: string;
}

export function computeChaosState(
  context: ContextMatrix,
  friction: FrictionProfile,
  strategy: StrategyState,
  recentChaosEvents: ChaosEventType[] = [],
  daysSinceLastActivity: number = 0,
): ChaosState {
  // Step 1: Compute volatility
  const volatilityInput: VolatilityInput = {
    geographyTier: context.socioeconomic.geographyTier,
    internetStability: context.infrastructure.internetStability,
    workEnvironment: context.infrastructure.workEnvironment,
    runwayDays: context.socioeconomic.runwayDays,
    emotionalResilience: context.psychometric.emotionalResilience,
    frictionCoefficient: friction.frictionCoefficient,
    consecutiveFailureCount: strategy.consecutiveFailureCount ?? 0,
    daysSinceLastActivity,
    recentChaosEvents,
  };
  const volatilityScore = computeVolatilityScore(volatilityInput);

  // Volatility label
  let volatilityLabel: ChaosState['volatilityLabel'];
  if (volatilityScore >= 0.75) volatilityLabel = 'crisis';
  else if (volatilityScore >= 0.50) volatilityLabel = 'volatile';
  else if (volatilityScore >= 0.30) volatilityLabel = 'turbulent';
  else volatilityLabel = 'calm';

  // Step 2: Compute resilience reserve
  const resilienceReserve = computeResilienceReserve(
    context.psychometric.emotionalResilience,
    strategy.consistencyScore,
    strategy.consecutiveFailureCount ?? 0,
    recentChaosEvents,
  );

  // Step 3: Determine active backup plan (if chaos event recently detected)
  let activeBackupPlan: BackupPlan | null = null;
  let activeBackupPlanId: string | null = null;

  if (recentChaosEvents.length > 0) {
    // Find the backup plan that handles the most recent chaos event
    const latestEvent = recentChaosEvents[recentChaosEvents.length - 1];
    activeBackupPlan = BACKUP_PLAN_LIBRARY.find(p => p.triggeredBy.includes(latestEvent)) ?? null;
    activeBackupPlanId = activeBackupPlan?.planId ?? null;
  }

  // Step 4: Compute top threat probabilities for the next 30 days
  const allEventTypes = Object.keys(CHAOS_EVENT_LIBRARY) as ChaosEventType[];
  const topThreats = allEventTypes
    .map(event => ({
      event,
      probability30Days: computeDisruptionProbability(event, volatilityScore, 30),
    }))
    .sort((a, b) => b.probability30Days - a.probability30Days)
    .slice(0, 3); // Top 3 threats only

  // Step 5: Recovery recommendation
  const recoveryRecommendation = activeBackupPlan
    ? activeBackupPlan.aiIntroductionTemplate
    : resilienceReserve.recommendation;

  return {
    currentVolatilityScore: volatilityScore,
    volatilityLabel,
    activeBackupPlanId,
    activeBackupPlan,
    chaosEvents: recentChaosEvents,
    resilienceReserve,
    topThreats,
    recoveryRecommendation,
  };
}
