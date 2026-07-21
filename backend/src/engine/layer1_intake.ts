/**
 * FP-OS :: LAYER 1 — IDENTITY & CONSTRAINT INGESTION ENGINE
 *
 * This layer does NOT think about goals. It thinks about REALITY.
 * It builds the Context Matrix (C) — the single source of truth
 * that every downstream reasoning layer will read from.
 *
 * Key principle: The engine assesses what users CAN'T see about themselves.
 * It catches over-reporting, detects psychometric signals from writing style,
 * and maps the full constraint landscape before strategy is ever considered.
 */

import {
  ContextMatrix,
  SocioeconomicCluster,
  HumanCapitalCluster,
  InfrastructureCluster,
  PsychometricCluster,
  GoalVector,
  SkillNode,
  GeographyTier,
  DeviceTier,
  InternetStability,
  WorkEnvironment,
  EgoLeveragePoint,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: COMMUNICATION SCORE ASSESSOR
// Assesses user communication quality from their raw onboarding text.
// This is NOT self-reported — it's derived from how they actually write.
// ─────────────────────────────────────────────────────────────────────────────

interface CommunicationSignal {
  signal: string;
  weight: number;
  positiveIndicator: boolean;
}

const COMMUNICATION_SIGNALS: CommunicationSignal[] = [
  // Positive signals — increase score
  { signal: 'uses_punctuation_correctly', weight: 0.08, positiveIndicator: true },
  { signal: 'sentences_complete_thoughts', weight: 0.12, positiveIndicator: true },
  { signal: 'uses_specific_numbers_not_vague', weight: 0.15, positiveIndicator: true },
  { signal: 'asks_clarifying_questions', weight: 0.10, positiveIndicator: true },
  { signal: 'structured_response_format', weight: 0.10, positiveIndicator: true },
  { signal: 'uses_domain_vocabulary_correctly', weight: 0.15, positiveIndicator: true },
  { signal: 'self_corrects_or_adds_nuance', weight: 0.08, positiveIndicator: true },
  { signal: 'explains_reasoning_not_just_conclusion', weight: 0.12, positiveIndicator: true },

  // Negative signals — decrease score
  { signal: 'excessive_abbreviations_slang', weight: 0.10, positiveIndicator: false },
  { signal: 'very_short_vague_answers', weight: 0.15, positiveIndicator: false },
  { signal: 'contradicts_own_statements', weight: 0.12, positiveIndicator: false },
  { signal: 'only_one_word_answers', weight: 0.20, positiveIndicator: false },
  { signal: 'cannot_explain_own_skills', weight: 0.18, positiveIndicator: false },
];

/**
 * Assesses communication score from raw onboarding text.
 * Returns a score 0.0–1.0.
 * This function takes AI-parsed signal flags and computes the score.
 */
export function assessCommunicationScore(
  detectedPositiveSignals: string[],
  detectedNegativeSignals: string[],
): number {
  let score = 0.4; // Baseline score — average communicator

  for (const signal of COMMUNICATION_SIGNALS) {
    const detected = signal.positiveIndicator
      ? detectedPositiveSignals.includes(signal.signal)
      : detectedNegativeSignals.includes(signal.signal);

    if (detected) {
      score += signal.positiveIndicator ? signal.weight : -signal.weight;
    }
  }

  return Math.max(0.05, Math.min(1.0, score)); // Clamp to [0.05, 1.0]
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: SOCIOECONOMIC CLUSTER BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function buildSocioeconomicCluster(raw: {
  geographyTier: GeographyTier;
  country: string;
  region: string;
  liquidCapital: number;
  monthlyBurnRate: number;
  hasDebt: boolean;
  debtMonthlyObligation: number;
  familyDependencyScore: number;
}): SocioeconomicCluster {
  const effectiveMonthlyBurn = raw.monthlyBurnRate + (raw.hasDebt ? raw.debtMonthlyObligation : 0);
  const dailyBurn = effectiveMonthlyBurn / 30;
  const runwayDays = dailyBurn > 0
    ? Math.floor(raw.liquidCapital / dailyBurn)
    : 999; // No burn = infinite runway edge case

  return {
    ...raw,
    effectiveMonthlyBurn,
    runwayDays,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: SKILL INTAKE PARSER
// Parses raw skill claims into SkillNode[] with unverified flags.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skill claim parser.
 * Takes raw skill strings from user input and maps them to structured nodes.
 * All self-reported skills start as "unverified" — Layer 2 will calibrate them.
 */
export function parseSkillClaims(
  rawSkillStrings: string[], // e.g., ["Python", "Graphic Design", "Excel"]
  hasVerifiableOutputMap: Record<string, boolean>, // { "Python": true, "GraphicDesign": false }
): SkillNode[] {
  return rawSkillStrings.map((skillName) => {
    const hasOutput = hasVerifiableOutputMap[skillName] ?? false;

    return {
      skillName,
      selfReportedLevel: 0.7,       // Assume 0.7 until user demonstrates — will be calibrated
      verifiedLevel: hasOutput       // If no verifiable output, treat as 50% of claimed value
        ? 0.7                        // Will be refined in Layer 2
        : 0.7 * ENGINE_AXIOMS.SKILL_UNVERIFIED_DISCOUNT,
      hasVerifiableOutput: hasOutput,
      category: inferSkillCategory(skillName),
      compressionResistance: 'medium' as const,
    };
  });
}

/**
 * Maps common skill names to their category.
 * The AI layer will handle edge cases; this covers the clear cases deterministically.
 */
function inferSkillCategory(
  skillName: string,
): SkillNode['category'] {
  const lower = skillName.toLowerCase();

  const technicalKeywords = ['code', 'python', 'javascript', 'java', 'react', 'node', 'sql',
    'excel', 'data', 'web', 'app', 'software', 'programming', 'dev', 'figma', 'photoshop',
    'video', 'edit', 'seo', 'ads', 'automation', 'no-code', 'zapier', 'airtable'];
  const communicationKeywords = ['write', 'writ', 'speak', 'present', 'teach', 'market',
    'sales', 'negotiat', 'content', 'copy', 'blog', 'script'];
  const physicalKeywords = ['fitness', 'sport', 'train', 'gym', 'yoga', 'cook', 'craft', 'build'];

  if (technicalKeywords.some((k) => lower.includes(k))) return 'technical';
  if (communicationKeywords.some((k) => lower.includes(k))) return 'communication';
  if (physicalKeywords.some((k) => lower.includes(k))) return 'physical';
  return 'domain';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: PROCRASTINATION SIGNAL DETECTOR
// Detects procrastination patterns from behavioral signals in onboarding.
// NOT self-reported — derived from how the user behaves during intake.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcrastinationSignals {
  tookLongBetweenAnswers: boolean;       // Long pauses suggest avoidance
  setOptimisticDeadlines: boolean;       // "I'll start tomorrow" type responses
  gavelVagueGoalsNotSpecific: boolean;   // Can't give concrete numbers
  mentionedPastFailedAttempts: boolean;  // Started but didn't finish before
  usedPassiveLanguage: boolean;          // "I want to" vs "I will"
  conflatedPlanningWithExecution: boolean; // Thinks planning IS doing the work
}

export function scoreProcrastination(signals: ProcrastinationSignals): number {
  const weights = {
    tookLongBetweenAnswers: 0.15,
    setOptimisticDeadlines: 0.20,
    gavelVagueGoalsNotSpecific: 0.18,
    mentionedPastFailedAttempts: 0.12,
    usedPassiveLanguage: 0.20,
    conflatedPlanningWithExecution: 0.15,
  };

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (signals[key as keyof ProcrastinationSignals]) {
      score += weight;
    }
  }

  return Math.min(1.0, score); // 0.0 = no procrastination, 1.0 = chronic
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: EGO LEVERAGE DETECTOR
// Identifies what specifically drives this person.
// Used by the accountability engine to trigger the right motivational pressure.
// ─────────────────────────────────────────────────────────────────────────────

export function detectEgoLeveragePoint(
  rawGoalText: string,
  rawOnboardingResponses: string,
): EgoLeveragePoint {
  const text = (rawGoalText + ' ' + rawOnboardingResponses).toLowerCase();

  // Priority-ordered: first match wins (most explicit motivators first)
  if (text.includes('prove') || text.includes('show them') || text.includes('log they said')
      || text.includes('doubt') || text.includes('underestimate')) {
    return 'proving_someone_wrong';
  }
  if (text.includes('family') || text.includes('parents') || text.includes('mother')
      || text.includes('father') || text.includes('support') || text.includes('maa')
      || text.includes('papa') || text.includes('ghar')) {
    return 'family';
  }
  if (text.includes('freedom') || text.includes('travel') || text.includes('own time')
      || text.includes('independent') || text.includes('9-5') || text.includes('job chhod')) {
    return 'freedom';
  }
  if (text.includes('impact') || text.includes('change') || text.includes('people')
      || text.includes('society') || text.includes('problem solve')) {
    return 'impact';
  }
  if (text.includes('status') || text.includes('respect') || text.includes('recognition')
      || text.includes('famous') || text.includes('known') || text.includes('brand')) {
    return 'status';
  }

  return 'money'; // Default — money is the default stated motivator
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: GOAL VECTOR PARSER
// Extracts the numeric goal from raw text and calculates ambition velocity.
// ─────────────────────────────────────────────────────────────────────────────

export function parseGoalVector(raw: {
  declaredGoal: string;
  targetAmount: number;
  currency: 'INR' | 'USD' | 'other';
  timelineMonths: number;
  sacrificesToleratedList: string[];
  nonNegotiables: string[];
  pathPreference: 'high_risk_upside' | 'safe_compounding' | 'undecided';
  trueCapabilityScore: number;      // Comes from Layer 2 — passed in after capability vectoring
}): GoalVector {
  const timelineDays = raw.timelineMonths * 30;

  // A_v = G_val / (T * C_cap)
  // Higher A_v = more ambitious relative to capability and time
  const ambitionVelocity = timelineDays > 0 && raw.trueCapabilityScore > 0
    ? raw.targetAmount / (timelineDays * raw.trueCapabilityScore * 100)
    : raw.targetAmount / timelineDays; // Fallback if capability not yet scored

  return {
    declaredGoal: raw.declaredGoal,
    targetAmount: raw.targetAmount,
    targetAmountOriginalCurrency: raw.targetAmount,
    currency: raw.currency as any,
    timelineMonths: raw.timelineMonths,
    sacrificesToleratedList: raw.sacrificesToleratedList as GoalVector['sacrificesToleratedList'],
    nonNegotiables: raw.nonNegotiables,
    pathPreference: raw.pathPreference,
    ambitionVelocity,
  } as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: CONTEXT MATRIX ASSEMBLER
// Final assembly of all clusters into the master Context Matrix.
// This is what gets stored and passed to every downstream layer.
// ─────────────────────────────────────────────────────────────────────────────

export function assembleContextMatrix(params: {
  userId: string;
  socioeconomic: SocioeconomicCluster;
  humanCapital: HumanCapitalCluster;
  infrastructure: InfrastructureCluster;
  psychometric: PsychometricCluster;
  goalVector: GoalVector;
  onboardingText: string;
}): ContextMatrix {
  return {
    ...params,
    onboardingCompletedAt: new Date().toISOString(),
    consentGranted: true,
    consentGrantedAt: new Date().toISOString(),
    ageVerified: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: ONBOARDING FLOW REMOVED
// The user will input everything in a single conversational dump.
// The engine will extract the Context Matrix directly from the raw text.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: ONBOARDING VALIDATOR
// Validates completeness and quality of intake data before allowing progression.
// ─────────────────────────────────────────────────────────────────────────────

export interface IntakeValidationResult {
  isComplete: boolean;
  missingFields: string[];
  qualityWarnings: string[];
  canProceedToSimulation: boolean;
}

export function validateIntakeCompleteness(matrix: Partial<ContextMatrix>): IntakeValidationResult {
  const missingFields: string[] = [];
  const qualityWarnings: string[] = [];

  // Check critical fields
  if (!matrix.socioeconomic?.geographyTier) missingFields.push('geographyTier');
  if (matrix.socioeconomic?.liquidCapital === undefined) missingFields.push('liquidCapital');
  if (!matrix.socioeconomic?.monthlyBurnRate) missingFields.push('monthlyBurnRate');
  if (!matrix.humanCapital?.skills?.length) missingFields.push('skills');
  if (!matrix.infrastructure?.dailyUninterruptedHours) missingFields.push('dailyUninterruptedHours');
  if (!matrix.goalVector?.targetAmount) missingFields.push('targetAmount');
  if (!matrix.goalVector?.timelineMonths) missingFields.push('timelineMonths');

  // Quality warnings (non-blocking but flagged)
  if (matrix.infrastructure?.dailyUninterruptedHours
      && matrix.infrastructure.dailyUninterruptedHours > 12) {
    qualityWarnings.push('Declared 12+ hours/day — flagged as potentially optimistic. Will apply realistic discount in simulation.');
  }
  if (matrix.socioeconomic?.liquidCapital === 0) {
    qualityWarnings.push('Zero liquid capital confirmed. Survivability audit will gate path options heavily.');
  }
  if (matrix.humanCapital?.skills?.length === 1) {
    qualityWarnings.push('Single skill declared. Opportunity mapping will be constrained. Recommend verifying this skill has output.');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    qualityWarnings,
    canProceedToSimulation: missingFields.length === 0,
  };
}
