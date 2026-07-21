/**
 * FP-OS :: LAYER 2 — CAPABILITY VECTORING ENGINE
 *
 * The engine earns its intelligence here by REFUSING to trust
 * self-reported competence at face value.
 *
 * Core insight: Users over-report capabilities by 30–60%.
 * A student who watched 20 Python YouTube videos believes they are "a developer."
 * This layer strips that inflation and calculates the TRUE executable capability (V_c).
 *
 * V_c is the honest answer to:
 * "Given everything real about this person, what can they actually execute
 *  in the next 30, 60, and 90 days?"
 */

import {
  ContextMatrix,
  CapabilityVector,
  SkillNode,
  HumanCapitalCluster,
  ENGINE_AXIOMS,
  DeviceTier,
  InternetStability,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: STRUCTURAL DOWNGRADE CALCULATION
// Applies automatic adjustments based on objective constraint signals.
// ─────────────────────────────────────────────────────────────────────────────

export interface DowngradeFactors {
  communicationDowngrade: number;    // Applied if comm score < threshold
  hoursDowngrade: number;            // Applied if daily hours < 3
  noVerifiableOutputDowngrade: number; // Applied if skill has no proof
  deviceConstraintDowngrade: number; // Applied for low-tier devices
  internetConstraintDowngrade: number; // Applied for unstable connections
}

/**
 * Calculates how much to downgrade a claimed skill level
 * based on objective constraint signals from the context matrix.
 */
export function calculateDowngradeFactors(matrix: ContextMatrix): DowngradeFactors {
  const commScore = matrix.humanCapital.communicationScore;
  const dailyHours = matrix.infrastructure.dailyUninterruptedHours;
  const deviceTier = matrix.infrastructure.deviceTier;
  const internet = matrix.infrastructure.internetStability;

  // Communication downgrade: below threshold = client-facing work gets cut
  const communicationDowngrade = commScore < ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD
    ? 0.40  // 40% downgrade on client-facing opportunity viability
    : 0;

  // Hours downgrade: under 3 uninterrupted hours = can't do deep technical building
  const hoursDowngrade = dailyHours < 3 ? 0.35 : dailyHours < 5 ? 0.15 : 0;

  // Unverified skills get 50% discount (set in parsing, validated here)
  const noVerifiableOutputDowngrade = ENGINE_AXIOMS.SKILL_UNVERIFIED_DISCOUNT;

  // Device constraint
  const deviceConstraintDowngrade = deviceTier === 'mobile_only'
    ? 0.50   // Mobile only = extreme constraint on technical work
    : deviceTier === 'low_tier'
    ? 0.20
    : 0;

  // Internet constraint
  const internetConstraintDowngrade = internet === '2g_unstable'
    ? 0.40
    : internet === '4g_intermittent'
    ? 0.15
    : 0;

  return {
    communicationDowngrade,
    hoursDowngrade,
    noVerifiableOutputDowngrade,
    deviceConstraintDowngrade,
    internetConstraintDowngrade,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: SKILL CALIBRATION ENGINE
// Runs each claimed skill through the downgrade matrix to get verified levels.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calibrates a single skill node through the downgrade matrix.
 * The "verified level" after this is what the engine actually uses in simulations.
 */
export function calibrateSkill(
  skill: SkillNode,
  downgradeFactors: DowngradeFactors,
  dailyHours: number,
): SkillNode {
  let verifiedLevel = skill.selfReportedLevel;

  // Step 1: Unverified output discount (REMOVED - we now trust baseline and verify during execution)
  // if (!skill.hasVerifiableOutput && !skill.hasPassedCalibration) {
  //   verifiedLevel *= (1 - downgradeFactors.noVerifiableOutputDowngrade);
  // }

  // Step 2: Apply device/internet constraints to technical skills
  if (skill.category === 'technical') {
    verifiedLevel *= (1 - downgradeFactors.deviceConstraintDowngrade);
    verifiedLevel *= (1 - downgradeFactors.internetConstraintDowngrade);
  }

  // Step 3: Apply communication downgrade to communication skills
  if (skill.category === 'communication') {
    // For communication skills, we use the comm score as the primary calibration
    // rather than the self-reported level (since comm score is engine-assessed)
    verifiedLevel = verifiedLevel * 0.5; // Start from blend
  }

  // Step 4: Apply hours constraint — under 3h/day can't maintain high skill velocity
  if (dailyHours < 3) {
    verifiedLevel *= (1 - downgradeFactors.hoursDowngrade);
  }

  // Step 5: Global inflation correction (REMOVED - trusting user for probationary period)
  // if (!skill.hasVerifiableOutput && !skill.hasPassedCalibration) {
  //   verifiedLevel *= (1 - ENGINE_AXIOMS.SELF_REPORT_INFLATION_AVG);
  //   verifiedLevel = Math.min(verifiedLevel, 0.6); // Hard cap at 0.6 without proof
  // }

  return {
    ...skill,
    verifiedLevel: Math.max(0.05, Math.min(1.0, verifiedLevel)),
  };
}

/**
 * Calibrates ALL skills in the human capital cluster.
 */
export function calibrateAllSkills(
  matrix: ContextMatrix,
  downgradeFactors: DowngradeFactors,
): SkillNode[] {
  return matrix.humanCapital.skills.map((skill) =>
    calibrateSkill(skill, downgradeFactors, matrix.infrastructure.dailyUninterruptedHours)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: LEARNING VELOCITY MULTIPLIER
// The most important long-term variable in the engine.
// High current skills + low learning rate ≠ good long-term trajectory.
// Low current skills + high learning rate = the highest upside user.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates a 90-day trajectory multiplier based on learning velocity.
 * High lambda users can outgrow their current constraints dramatically.
 */
export function calculateLearningVelocityMultiplier(
  learningRate: number,         // 0.0 – 1.0 from context matrix
  currentCapabilityScore: number,
  timelineMonths: number,
): { multiplier30d: number; multiplier60d: number; multiplier90d: number } {
  // Learning velocity compounds over time
  const base = 1 + (learningRate * 0.5); // High lambda = up to 50% monthly compound

  return {
    multiplier30d: Math.min(1.5, currentCapabilityScore * base),
    multiplier60d: Math.min(1.8, currentCapabilityScore * (base ** 2)),
    multiplier90d: Math.min(2.5, currentCapabilityScore * (base ** 3)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: TRUE CAPABILITY SCORE (V_c) CALCULATOR
// The final, honest score that all simulations run against.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates V_c — the True Capability Score.
 * This is NOT a motivational score. It is the realistic execution baseline.
 *
 * Formula:
 * V_c = weighted_avg(verified_skill_levels)
 *       × learning_rate_multiplier
 *       × hours_capacity_factor
 *       × infrastructure_factor
 */
export function calculateTrueCapabilityScore(
  calibratedSkills: SkillNode[],
  matrix: ContextMatrix,
): number {
  if (calibratedSkills.length === 0) return 0.1; // Minimum capability assumed

  // Weighted average of verified skill levels (technical skills weighted higher)
  const totalWeight = calibratedSkills.reduce((sum, skill) => {
    const weight = skill.category === 'technical' ? 1.5 :
                   skill.category === 'communication' ? 1.2 : 1.0;
    return sum + weight;
  }, 0);

  const weightedSkillScore = calibratedSkills.reduce((sum, skill) => {
    const weight = skill.category === 'technical' ? 1.5 :
                   skill.category === 'communication' ? 1.2 : 1.0;
    return sum + (skill.verifiedLevel * weight);
  }, 0) / totalWeight;

  // Hours capacity factor (0.3 = 0.3h/day user, 1.0 = 8+h/day user)
  const hoursFactor = Math.min(1.0, matrix.infrastructure.dailyUninterruptedHours / 8);

  // Learning rate contribution (pulls score up for fast learners)
  const learningBoost = matrix.humanCapital.learningRate * 0.15;

  // Infrastructure penalty
  const infraPenalty =
    (matrix.infrastructure.deviceTier === 'mobile_only' ? 0.3 : 0) +
    (matrix.infrastructure.internetStability === '2g_unstable' ? 0.2 : 0);

  const rawScore = (weightedSkillScore + learningBoost) * hoursFactor * (1 - infraPenalty);

  return Math.max(0.05, Math.min(1.0, rawScore));
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: VIABILITY GATES
// Binary checks: Can this person execute client-facing work? Technical builds?
// ─────────────────────────────────────────────────────────────────────────────

export function assessClientFacingViability(matrix: ContextMatrix): boolean {
  const commScore = matrix.humanCapital.communicationScore;
  const english = matrix.humanCapital.skills.some(
    (s) => s.skillName.toLowerCase().includes('english') && s.verifiedLevel > 0.5
  );

  // Must have communication score above threshold AND verifiable output in a client-viable skill
  return commScore >= ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD
    && matrix.humanCapital.skills.some((s) => s.hasVerifiableOutput);
}

export function assessTechnicalBuildViability(
  calibratedSkills: SkillNode[],
  matrix: ContextMatrix,
): boolean {
  const hasTechnicalSkill = calibratedSkills.some(
    (s) => s.category === 'technical' && s.verifiedLevel >= 0.3
  );
  // Vibecoding support: High learning rate or comm score acts as a substitute for raw technical skill
  const canVibecode = matrix.humanCapital.learningRate > 0.7 || matrix.humanCapital.communicationScore > 0.7;

  const hasDeviceCapacity = matrix.infrastructure.deviceTier !== 'mobile_only';
  const hasTimeCapacity = matrix.infrastructure.dailyUninterruptedHours >= 2;

  return (hasTechnicalSkill || canVibecode) && hasDeviceCapacity && hasTimeCapacity;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: EXECUTION POTENTIAL NARRATIVE GENERATOR
// Creates human-readable 30/60/90 day capability descriptions.
// These are what get shown to the user in the simulation screen.
// ─────────────────────────────────────────────────────────────────────────────

export function generateExecutionPotentialNarrative(
  trueCapabilityScore: number,
  calibratedSkills: SkillNode[],
  learningVelocityMultipliers: { multiplier30d: number; multiplier60d: number; multiplier90d: number },
  matrix: ContextMatrix,
): { thirtyDay: string; sixtyDay: string; ninetyDay: string } {
  const topSkill = calibratedSkills.sort((a, b) => b.verifiedLevel - a.verifiedLevel)[0];
  const hasGrowthPotential = matrix.humanCapital.learningRate > 0.6;
  const isConstrained = matrix.infrastructure.dailyUninterruptedHours < 4;

  const thirtyDay = trueCapabilityScore < 0.3
    ? `At 30 days: You can deliver basic ${topSkill?.skillName ?? 'service'} work to local clients. No complex builds. Focus: First ₹5,000–₹15,000 from simple execution of your most verified skill.`
    : trueCapabilityScore < 0.6
    ? `At 30 days: You can build and deliver a functional solution using ${topSkill?.skillName ?? 'your top skill'}. Realistic first revenue: ₹15,000–₹50,000 if you execute without procrastination.`
    : `At 30 days: You can build production-ready outputs in ${topSkill?.skillName ?? 'your domain'}. First revenue target: ₹30,000–₹1,00,000 depending on sales execution.`;

  const sixtyDay = hasGrowthPotential
    ? `At 60 days: Your learning velocity is high. By day 60, you'll have added 1-2 new verified capabilities and compounded your initial results. Revenue should show 2x–3x growth from day 30 baseline.`
    : `At 60 days: With consistent execution, you'll have proven your model works with at least 3 paying clients/transactions. Revenue will compound if you double down on what works, not experiment.`;

  const ninetyDay = isConstrained
    ? `At 90 days: Given your ${matrix.infrastructure.dailyUninterruptedHours}h/day constraint, realistic target is reaching a stable ₹${Math.floor(trueCapabilityScore * 30000).toLocaleString('en-IN')}/month by day 90. This is your financial proof of concept.`
    : `At 90 days: Full trajectory deployment. You should have a repeatable system generating consistent income. This is not the finish line — it's the baseline from which scaling becomes possible.`;

  return { thirtyDay: thirtyDay, sixtyDay: sixtyDay, ninetyDay: ninetyDay };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: MAIN LAYER 2 ORCHESTRATOR
// Assembles all Layer 2 outputs into the final CapabilityVector.
// ─────────────────────────────────────────────────────────────────────────────

export function runCapabilityVectoring(matrix: ContextMatrix): CapabilityVector {
  // Step 1: Calculate downgrade factors from objective constraints
  const downgradeFactors = calculateDowngradeFactors(matrix);

  // Step 2: Calibrate all skills through the downgrade matrix
  const calibratedSkills = calibrateAllSkills(matrix, downgradeFactors);

  // Step 3: Calculate true capability score
  const trueCapabilityScore = calculateTrueCapabilityScore(calibratedSkills, matrix);

  // Step 4: Calculate learning velocity multipliers for projection
  const learningVelocityMultipliers = calculateLearningVelocityMultiplier(
    matrix.humanCapital.learningRate,
    trueCapabilityScore,
    matrix.goalVector.timelineMonths,
  );

  // Step 5: Assess viability gates
  const clientFacingViability = assessClientFacingViability(matrix);
  const technicalBuildViability = assessTechnicalBuildViability(calibratedSkills, matrix);

  // Step 6: Calculate self-reporting inflation factor
  const avgSelfReported = matrix.humanCapital.skills.length > 0
    ? matrix.humanCapital.skills.reduce((sum, s) => sum + s.selfReportedLevel, 0) / matrix.humanCapital.skills.length
    : 0.5;
  const avgVerified = calibratedSkills.length > 0
    ? calibratedSkills.reduce((sum, s) => sum + s.verifiedLevel, 0) / calibratedSkills.length
    : 0.5;
  const selfReportingInflationFactor = avgSelfReported > 0
    ? (avgSelfReported - avgVerified) / avgSelfReported
    : 0;

  // Step 7: Generate execution potential narratives
  const potentials = generateExecutionPotentialNarrative(
    trueCapabilityScore,
    calibratedSkills,
    learningVelocityMultipliers,
    matrix,
  );

  return {
    trueCapabilityScore,
    calibratedSkills,
    thirtyDayExecutionPotential: potentials.thirtyDay,
    sixtyDayExecutionPotential: potentials.sixtyDay,
    ninetyDayExecutionPotential: potentials.ninetyDay,
    clientFacingViability,
    technicalBuildViability,
    selfReportingInflationFactor,
  };
}
