/**
 * FP-OS :: LAYER 6 — EXECUTION FRICTION PROFILING
 *
 * The most underestimated variable in any strategy is the gap
 * between what a person PLANS to do and what they actually EXECUTE.
 *
 * This layer measures that gap and bakes it into every probability calculation.
 *
 * Key principle: The friction coefficient is NOT self-reported.
 * It is derived from behavioral signals observed during onboarding.
 * How the user writes, how long they take to answer, whether they
 * ask clarifying questions or just push forward — all of this is signal.
 *
 * High-friction users get:
 *   → Shorter task windows (90 minutes vs 4 hours)
 *   → More frequent check-ins (every task vs. daily)
 *   → More aggressive accountability triggers
 *   → Sprint architecture instead of deep-work clusters
 */

import {
  ContextMatrix,
  FrictionProfile,
  FrictionLevel,
  WorkStylePreference,
  PsychometricCluster,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: FRICTION SIGNAL TAXONOMY
// All behavioral signals that the engine uses to calculate friction.
// These are observed during onboarding — not asked about directly.
// ─────────────────────────────────────────────────────────────────────────────

interface FrictionSignal {
  id: string;
  description: string;
  frictionWeight: number;          // Positive = adds friction, negative = reduces it
  observationMethod: string;
}

export const FRICTION_SIGNALS: FrictionSignal[] = [
  // HIGH-FRICTION SIGNALS
  {
    id: 'chronic_procrastination',
    description: 'Declared history of starting but not finishing multiple past attempts',
    frictionWeight: 0.25,
    observationMethod: 'User explicitly mentions past failed attempts during onboarding',
  },
  {
    id: 'passive_language_dominant',
    description: 'Uses "I want to" "I would like to" instead of "I will" "I am"',
    frictionWeight: 0.15,
    observationMethod: 'Language pattern analysis of onboarding responses',
  },
  {
    id: 'sets_optimistic_unrealistic_timelines',
    description: 'Expects major results in unrealistically short timeframes',
    frictionWeight: 0.12,
    observationMethod: 'Goal timeline vs capability score delta assessment',
  },
  {
    id: 'avoids_specific_numbers',
    description: 'Gives vague answers when asked for specific measurable data',
    frictionWeight: 0.10,
    observationMethod: 'Quality of responses to specific numerical questions',
  },
  {
    id: 'conflates_planning_with_doing',
    description: 'Has detailed plans but no verifiable execution history',
    frictionWeight: 0.18,
    observationMethod: 'Skills declared vs. verifiable outputs for those skills',
  },
  {
    id: 'low_cognitive_endurance',
    description: 'Cannot sustain focused work for more than 60 minutes',
    frictionWeight: 0.15,
    observationMethod: 'Self-reported max focus duration, validated against task response patterns',
  },
  {
    id: 'environment_chaos',
    description: 'Works in a chaotic, high-interruption environment',
    frictionWeight: 0.10,
    observationMethod: 'Work environment self-report (non-critical, but contributes)',
  },
  {
    id: 'social_validation_seeking',
    description: 'Asks for reassurance rather than moving forward with decisions',
    frictionWeight: 0.08,
    observationMethod: 'Number of reassurance-seeking questions during onboarding',
  },

  // LOW-FRICTION SIGNALS (negative friction weight = reduces total friction)
  {
    id: 'has_verifiable_outputs',
    description: 'Has previously shipped something real that others can see',
    frictionWeight: -0.20,
    observationMethod: 'Verifiable output count in skill declarations',
  },
  {
    id: 'specific_numeric_answers',
    description: 'Responds with specific numbers without being pushed',
    frictionWeight: -0.12,
    observationMethod: 'Answer specificity during intake',
  },
  {
    id: 'asks_clarifying_questions',
    description: 'Asks "what do you mean by X?" rather than giving vague answers',
    frictionWeight: -0.08,
    observationMethod: 'Question quality during onboarding interaction',
  },
  {
    id: 'high_baseline_discipline',
    description: 'Self-reports and demonstrates pattern of completing commitments',
    frictionWeight: -0.15,
    observationMethod: 'Consistency of narrative across all onboarding responses',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: FRICTION COEFFICIENT CALCULATOR
// F_e: 0.0 = zero friction (perfect executor), 1.0 = maximum friction (chronic procrastinator)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateFrictionCoefficient(
  psychometric: PsychometricCluster,
  detectedSignalIds: string[],
): number {
  // 1. Calculate raw linear friction inputs
  let rawInput = psychometric.procrastinationScore * 0.45;  // Weighted procrastination
  rawInput += (1 - psychometric.baselineDiscipline) * 0.30;  // Lack of discipline weight
  rawInput += (1 - psychometric.emotionalResilience) * 0.15; // Low resilience weight

  // Apply cognitive endurance factor to the raw input
  const enduranceMinutes = psychometric.cognitiveEnduranceMinutes;
  if (enduranceMinutes < 30) rawInput += 0.20;
  else if (enduranceMinutes < 60) rawInput += 0.12;
  else if (enduranceMinutes < 90) rawInput += 0.05;
  else if (enduranceMinutes > 180) rawInput -= 0.08; // High endurance reduces raw friction input

  // Apply behavioral signal overlay
  for (const signalId of detectedSignalIds) {
    const signal = FRICTION_SIGNALS.find((s) => s.id === signalId);
    if (signal) {
      rawInput += signal.frictionWeight;
    }
  }

  // 2. Sigmoid activation mapping: translates the raw score to a non-linear 0-1 scale.
  // This simulates how small friction factors build compounding execution barriers.
  const steepness = 6.0;
  const midpoint = 0.45;
  const sigmoidFriction = 1 / (1 + Math.exp(-steepness * (rawInput - midpoint)));

  return Math.max(0, Math.min(1.0, sigmoidFriction));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: FRICTION LEVEL CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export function classifyFrictionLevel(frictionCoefficient: number): FrictionLevel {
  if (frictionCoefficient < 0.25) return 'low';
  if (frictionCoefficient < 0.50) return 'medium';
  if (frictionCoefficient < 0.75) return 'high';
  return 'critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: WORK STYLE ASSIGNMENT ENGINE
// Based on friction profile, assigns the optimal execution architecture.
// ─────────────────────────────────────────────────────────────────────────────

export function assignWorkStyle(
  frictionLevel: FrictionLevel,
  cognitiveEnduranceMinutes: number,
  userPreference: WorkStylePreference,
): WorkStylePreference {
  // If user has a verified preference AND their profile supports it, respect it
  if (userPreference !== 'unknown') {
    if (userPreference === 'deep_work_clusters' && frictionLevel === 'critical') {
      // Override: critical friction users cannot sustain deep work, even if they think they can
      return 'high_velocity_sprints';
    }
    return userPreference;
  }

  // Engine assignment based on friction + endurance
  if (frictionLevel === 'low' && cognitiveEnduranceMinutes >= 180) {
    return 'deep_work_clusters';
  }
  if (frictionLevel === 'medium' && cognitiveEnduranceMinutes >= 120) {
    return 'deep_work_clusters';
  }
  // High friction, low endurance = sprints by default
  return 'high_velocity_sprints';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: TASK WINDOW CALCULATOR
// How long should each task block be, given the friction profile?
// ─────────────────────────────────────────────────────────────────────────────

export function calculateTaskWindowHours(
  workStyle: WorkStylePreference,
  frictionLevel: FrictionLevel,
  cognitiveEnduranceMinutes: number,
): number {
  if (workStyle === 'deep_work_clusters') {
    const base = Math.min(6, cognitiveEnduranceMinutes / 60); // Never more than 6 hours
    return frictionLevel === 'low' ? base : base * 0.75;      // Friction reduces effective window
  }

  // Sprint architecture: 90 minutes maximum, adjusted downward for friction
  const sprintMaxMinutes = Math.min(90, cognitiveEnduranceMinutes);
  return frictionLevel === 'critical'
    ? Math.min(0.75, sprintMaxMinutes / 60)  // 45-min sprints for critical friction
    : sprintMaxMinutes / 60;                  // Full sprint otherwise
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: ACCOUNTABILITY TRIGGER CALIBRATION
// High friction = more aggressive triggers, more frequent check-ins.
// Low friction = more autonomy, longer blocks.
// ─────────────────────────────────────────────────────────────────────────────

export function calibrateAccountabilityTriggers(frictionLevel: FrictionLevel): {
  checkInFrequency: FrictionProfile['checkInFrequency'];
  triggerSensitivity: FrictionProfile['accountabilityTriggerSensitivity'];
  egoTriggerDelayMinutes: number;   // How quickly to escalate to ego-critique
} {
  switch (frictionLevel) {
    case 'low':
      return {
        checkInFrequency: 'daily',
        triggerSensitivity: 'low',
        egoTriggerDelayMinutes: 120,  // Give 2 hours before escalating
      };
    case 'medium':
      return {
        checkInFrequency: 'daily',
        triggerSensitivity: 'medium',
        egoTriggerDelayMinutes: 60,
      };
    case 'high':
      return {
        checkInFrequency: 'twice_daily',
        triggerSensitivity: 'high',
        egoTriggerDelayMinutes: 30,
      };
    case 'critical':
      return {
        checkInFrequency: 'every_task',
        triggerSensitivity: 'high',
        egoTriggerDelayMinutes: 0,   // Immediate trigger — no grace period
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: PROCRASTINATION SIGNAL EXTRACTOR
// Extracts human-readable signal descriptions for the friction profile.
// ─────────────────────────────────────────────────────────────────────────────

export function extractProcrastinationSignalDescriptions(
  detectedSignalIds: string[],
): string[] {
  return detectedSignalIds
    .map((id) => FRICTION_SIGNALS.find((s) => s.id === id && s.frictionWeight > 0))
    .filter(Boolean)
    .map((s) => s!.description);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: PROBABILITY ADJUSTMENT FROM FRICTION
// Takes a base probability and adjusts it based on friction coefficient.
// This is the key integration point with Layer 7.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A strategy that would work for a zero-friction executor at 70% probability
 * might drop to 30% for a high-friction user executing the same strategy.
 * This function calculates that adjustment.
 */
export function adjustProbabilityForFriction(
  baseProbability: number,
  frictionCoefficient: number,
): number {
  // Friction has a non-linear impact — critical friction doesn't just halve probability
  // it creates compounding execution gaps
  const frictionPenalty = frictionCoefficient ** 0.7; // Slightly less than linear
  const adjusted = baseProbability * (1 - frictionPenalty * 0.55); // Max 55% reduction from friction

  return Math.max(ENGINE_AXIOMS.MIN_PROBABILITY_FLOOR / 100, adjusted);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: MAIN LAYER 6 ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export function runFrictionProfiling(
  matrix: ContextMatrix,
  detectedSignalIds: string[],
): FrictionProfile {
  const frictionCoefficient = calculateFrictionCoefficient(
    matrix.psychometric,
    detectedSignalIds,
  );

  const frictionLevel = classifyFrictionLevel(frictionCoefficient);

  const assignedWorkStyle = assignWorkStyle(
    frictionLevel,
    matrix.psychometric.cognitiveEnduranceMinutes,
    matrix.psychometric.preferredWorkStyle,
  );

  const taskWindowHours = calculateTaskWindowHours(
    assignedWorkStyle,
    frictionLevel,
    matrix.psychometric.cognitiveEnduranceMinutes,
  );

  const accountabilityConfig = calibrateAccountabilityTriggers(frictionLevel);
  const procrastinationSignals = extractProcrastinationSignalDescriptions(detectedSignalIds);

  return {
    frictionCoefficient,
    frictionLevel,
    assignedWorkStyle,
    checkInFrequency: accountabilityConfig.checkInFrequency,
    taskWindowHours,
    accountabilityTriggerSensitivity: accountabilityConfig.triggerSensitivity,
    procrastinationSignals,
  };
}
