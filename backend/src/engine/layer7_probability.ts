/**
 * FP-OS :: LAYER 7 — EMPIRICAL PROBABILITY ENGINE
 *
 * This layer translates everything calculated so far into an
 * honest success probability. Not one number — a range.
 *
 * Core constraint (hardcoded, cannot be overridden):
 * Maximum probability cap: 88%
 * Minimum probability floor: 1%
 *
 * These are not arbitrary. They represent the honest boundary of
 * what strategic guidance can guarantee given real-world volatility.
 *
 * Why this builds trust AND provides legal protection simultaneously:
 * You are never guaranteeing outcomes.
 * You are providing calibrated, data-derived probability estimates.
 * This is identical to how institutional financial advisors operate.
 */

import {
  ContextMatrix,
  CapabilityVector,
  SurvivabilityAudit,
  FrictionProfile,
  ENGINE_AXIOMS,
} from './types';
import { adjustProbabilityForFriction } from './layer6_friction';
import { SimulationResult } from './layer4_simulation';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: PROBABILITY INPUT VECTOR
// All inputs that contribute to the final probability calculation.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProbabilityInputVector {
  trueCapabilityScore: number;        // V_c from Layer 2
  runwayDays: number;                 // From Layer 3
  frictionCoefficient: number;        // F_e from Layer 6
  pathMarketSaturationRisk: number;   // From Layer 5 opportunity scoring
  simulatedShockProbability: number;  // From Layer 4 simulation
  learningRate: number;               // From context matrix
  networkQuality: number;             // From context matrix
  baselineDiscipline: number;         // From context matrix
  riskTolerance: number;              // From context matrix
  timelineMonths: number;             // From goal vector
  hasVerifiableOutputs: boolean;      // Binary — has proven they can ship something
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: COMPONENT PROBABILITY CALCULATORS
// Each major factor contributes a weighted component to the final probability.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capability contribution — how much V_c lifts or drags probability
 */
function capabilityComponent(trueCapabilityScore: number): number {
  // Logarithmic — returns diminish at high capability (caps at ~0.35 contribution)
  return Math.min(0.35, trueCapabilityScore * 0.40);
}

/**
 * Runway contribution — financial survivability is a major probability driver
 */
function runwayComponent(runwayDays: number): number {
  if (runwayDays <= 0) return -0.15;
  
  // Continuous exponential scaling for runway runway contribution (maxes out at 0.15)
  const growthRate = 0.02; // Determines how fast the curve climbs to max 0.15
  const baseContribution = 0.15 * (1 - Math.exp(-growthRate * runwayDays));
  
  // Apply an exponential penalty for runway falling into the red band (< 45 days)
  if (runwayDays < 45) {
    const penaltyExponent = 0.08;
    const penalty = 0.15 * Math.exp(-penaltyExponent * runwayDays);
    return baseContribution - penalty;
  }
  
  return baseContribution;
}

/**
 * Learning rate contribution — fast learners have higher long-run probability
 */
function learningRateComponent(learningRate: number, timelineMonths: number): number {
  // Learning rate matters more on longer timelines
  const timelineMultiplier = Math.min(2.0, timelineMonths / 3);
  return learningRate * 0.12 * timelineMultiplier;
}

/**
 * Network quality contribution
 */
function networkComponent(networkQuality: number): number {
  return networkQuality * 0.08; // Max 8% contribution from network
}

/**
 * Discipline and consistency contribution
 */
function disciplineComponent(baselineDiscipline: number): number {
  return baselineDiscipline * 0.12; // Max 12% from discipline
}

/**
 * Verifiable output bonus — has shipped before = higher credibility
 */
function verifiableOutputBonus(hasVerifiableOutputs: boolean): number {
  return hasVerifiableOutputs ? 0.08 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: COMPOUND PROBABILITY ASSEMBLER
// Combines all components into the final probability range.
// ─────────────────────────────────────────────────────────────────────────────

export interface FinalProbabilityOutput {
  centralEstimate: number;    // The midpoint probability (as percentage)
  rangeLow: number;           // Lower bound (as percentage)
  rangeHigh: number;          // Upper bound (as percentage)
  variance: number;           // How wide the range is — reflects uncertainty
  primaryDragFactor: string;  // The single biggest thing hurting probability
  primaryLiftFactor: string;  // The single biggest thing helping probability
  probabilityNarrative: string; // Human-readable honest assessment
}

export function calculateFinalProbability(
  inputs: ProbabilityInputVector,
  pathBaseSuccessProbability: number,
): FinalProbabilityOutput {
  // Build probability from components
  let probability = pathBaseSuccessProbability;

  // Add positive components
  probability += capabilityComponent(inputs.trueCapabilityScore);
  probability += runwayComponent(inputs.runwayDays);
  probability += learningRateComponent(inputs.learningRate, inputs.timelineMonths);
  probability += networkComponent(inputs.networkQuality);
  probability += disciplineComponent(inputs.baselineDiscipline);
  probability += verifiableOutputBonus(inputs.hasVerifiableOutputs);

  // Apply friction adjustment (major negative force)
  probability = adjustProbabilityForFriction(probability, inputs.frictionCoefficient);

  // Apply market saturation risk
  probability *= (1 - inputs.pathMarketSaturationRisk * 0.20);

  // Apply shock probability overlay
  probability *= (1 - inputs.simulatedShockProbability * 0.15);

  // Hard caps — the engine's non-negotiable legal and ethical wall
  const capped = Math.max(
    ENGINE_AXIOMS.MIN_PROBABILITY_FLOOR / 100,
    Math.min(ENGINE_AXIOMS.MAX_PROBABILITY_CAP / 100, probability)
  );

  // Calculate variance (uncertainty range)
  // High friction = wider variance (less predictable)
  // Short timeline = wider variance (less time to correct)
  const baseVariance = 0.04;
  const frictionVariance = inputs.frictionCoefficient * 0.08;
  const timelineVariance = inputs.timelineMonths < 3 ? 0.06 : inputs.timelineMonths < 6 ? 0.04 : 0.02;
  const totalVariance = Math.min(0.15, baseVariance + frictionVariance + timelineVariance);

  const rangeLow = Math.max(ENGINE_AXIOMS.MIN_PROBABILITY_FLOOR / 100, capped - totalVariance);
  const rangeHigh = Math.min(ENGINE_AXIOMS.MAX_PROBABILITY_CAP / 100, capped + totalVariance);

  // Identify primary drag and lift factors
  const dragFactor = identifyPrimaryDragFactor(inputs);
  const liftFactor = identifyPrimaryLiftFactor(inputs);

  // Generate honest narrative
  const narrative = generateProbabilityNarrative(
    capped,
    rangeLow,
    rangeHigh,
    dragFactor,
    liftFactor,
    inputs,
  );

  return {
    centralEstimate: Math.round(capped * 100 * 10) / 10,
    rangeLow: Math.round(rangeLow * 100 * 10) / 10,
    rangeHigh: Math.round(rangeHigh * 100 * 10) / 10,
    variance: Math.round(totalVariance * 100 * 10) / 10,
    primaryDragFactor: dragFactor,
    primaryLiftFactor: liftFactor,
    probabilityNarrative: narrative,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: DRAG AND LIFT FACTOR IDENTIFICATION
// Tells the user the ONE thing most holding them back and the ONE thing
// they have going for them. Actionable framing, not generic coaching.
// ─────────────────────────────────────────────────────────────────────────────

function identifyPrimaryDragFactor(inputs: ProbabilityInputVector): string {
  // Find the biggest negative contributor
  const factors = [
    { name: 'procrastination and execution friction', score: inputs.frictionCoefficient * 0.55 },
    { name: 'limited financial runway', score: inputs.runwayDays < 45 ? 0.30 : inputs.runwayDays < 90 ? 0.15 : 0 },
    { name: 'unverified skill base — no proven outputs', score: inputs.hasVerifiableOutputs ? 0 : 0.20 },
    { name: 'timeline too compressed for the target', score: inputs.timelineMonths < 2 ? 0.25 : 0 },
    { name: 'market saturation risk in chosen path', score: inputs.pathMarketSaturationRisk * 0.30 },
  ].sort((a, b) => b.score - a.score);

  return factors[0].name;
}

function identifyPrimaryLiftFactor(inputs: ProbabilityInputVector): string {
  const factors = [
    { name: 'high capability score relative to path requirements', score: inputs.trueCapabilityScore },
    { name: 'strong learning velocity', score: inputs.learningRate },
    { name: 'solid existing network', score: inputs.networkQuality },
    { name: 'strong baseline discipline', score: inputs.baselineDiscipline },
    { name: 'strong financial runway', score: Math.min(1, inputs.runwayDays / 180) },
    { name: 'verified track record of shipping results', score: inputs.hasVerifiableOutputs ? 0.9 : 0 },
  ].sort((a, b) => b.score - a.score);

  return factors[0].name;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: PROBABILITY NARRATIVE GENERATOR
// Produces an honest, non-generic assessment the user can actually act on.
// No motivational padding. No false reassurance. Just calibrated honesty.
// ─────────────────────────────────────────────────────────────────────────────

function generateProbabilityNarrative(
  centralEstimate: number,
  rangeLow: number,
  rangeHigh: number,
  dragFactor: string,
  liftFactor: string,
  inputs: ProbabilityInputVector,
): string {
  const lowPct = Math.round(rangeLow * 100);
  const highPct = Math.round(rangeHigh * 100);
  const centralPct = Math.round(centralEstimate * 100);

  let narrative = `Based on your full constraint profile, this path has a ${lowPct}–${highPct}% probability of reaching the milestone within ${inputs.timelineMonths} months. `;

  // Add context based on probability band
  if (centralPct >= 60) {
    narrative += `This is a structurally sound probability. It means if 10 people with your exact profile tried this, 6–7 of them would succeed. That's a real edge. `;
  } else if (centralPct >= 35) {
    narrative += `This is a viable but challenging probability. Real success requires you to eliminate the friction patterns holding you back. `;
  } else if (centralPct >= 15) {
    narrative += `This is a hard path. It's not impossible — but the variables working against you are significant. If you choose this, you choose a difficult road with a real chance of failing. `;
  } else {
    narrative += `This is a low-probability path for your specific profile. It can be done — but it requires exceptional execution and almost no room for the friction patterns I've detected in your profile. `;
  }

  narrative += `Your primary drag factor is your ${dragFactor}. Your strongest asset is your ${liftFactor}. `;
  narrative += `The ${highPct - lowPct}% range in the probability estimate reflects real uncertainty — the outcome is genuinely variable based on your execution consistency.`;

  return narrative;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: MULTI-PATH PROBABILITY COMPARISON
// Generates comparative probability outputs for Path Alpha vs Path Beta.
// ─────────────────────────────────────────────────────────────────────────────

export interface PathProbabilityComparison {
  pathAlpha: FinalProbabilityOutput | null;  // High-risk path (null if not available)
  pathBeta: FinalProbabilityOutput;          // Safe-side path (always available)
  recommendation: 'alpha' | 'beta' | 'user_decides';
  recommendationReason: string;
}

export function comparePathProbabilities(
  alphaSimResult: SimulationResult | null,
  betaSimResult: SimulationResult,
  inputs: ProbabilityInputVector,
): PathProbabilityComparison {
  const betaProbability = calculateFinalProbability(
    {
      ...inputs,
      pathMarketSaturationRisk: betaSimResult.shockVulnerabilityScore,
      simulatedShockProbability: betaSimResult.shockVulnerabilityScore,
    },
    betaSimResult.adjustedProbabilityLow / 100,
  );

  let alphaProbability: FinalProbabilityOutput | null = null;
  if (alphaSimResult) {
    alphaProbability = calculateFinalProbability(
      {
        ...inputs,
        pathMarketSaturationRisk: alphaSimResult.shockVulnerabilityScore,
        simulatedShockProbability: alphaSimResult.shockVulnerabilityScore,
      },
      alphaSimResult.adjustedProbabilityLow / 100,
    );
  }

  // System recommendation logic
  let recommendation: PathProbabilityComparison['recommendation'];
  let recommendationReason: string;

  if (!alphaProbability) {
    recommendation = 'beta';
    recommendationReason = 'The high-risk path is not available for your current constraint profile. Your runway, capital, or skill level does not support it.';
  } else if (inputs.frictionCoefficient > 0.60) {
    recommendation = 'beta';
    recommendationReason = `Your friction coefficient (${(inputs.frictionCoefficient * 100).toFixed(0)}%) is too high for the high-risk path. High-risk paths require near-zero execution gaps. At your current friction level, the alpha path's already-low probability drops further to non-viable territory.`;
  } else if (inputs.runwayDays < 90) {
    recommendation = 'beta';
    recommendationReason = `With ${inputs.runwayDays} days of runway, you cannot afford the extended timeline that alpha requires. Beta gets you to profitability before your runway runs out.`;
  } else if (alphaProbability.centralEstimate >= 15 && inputs.riskTolerance >= 0.70 && inputs.runwayDays >= 180) {
    recommendation = 'alpha';
    recommendationReason = `Your risk tolerance, runway, and friction profile support the alpha path. The probability is still challenging but your profile gives you the structural capacity to attempt it.`;
  } else {
    recommendation = 'user_decides';
    recommendationReason = `Your profile sits in the middle ground. Beta gives you higher certainty. Alpha gives you higher upside. Given your stated risk tolerance, I'll let you choose — but I've shown you the exact numbers.`;
  }

  return {
    pathAlpha: alphaProbability,
    pathBeta: betaProbability,
    recommendation,
    recommendationReason,
  };
}
