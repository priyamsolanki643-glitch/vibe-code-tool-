/**
 * FP-OS :: LAYER 4 — STOCHASTIC TRAJECTORY SIMULATION ENGINE
 *
 * FP does not guess paths. It runs mathematical modeling of lifetime
 * trajectories based on active user constraints.
 *
 * Instead of one expert opinion, the AI simulates thousands of possible
 * futures and finds the HIGH-PROBABILITY paths — not the hopeful ones.
 *
 * The engine stress-tests each path against real-world shock variables:
 * Platform bans, market saturation, personal disruptions, infrastructure failures.
 *
 * Output: A probability DISTRIBUTION, not a single number.
 * Because honest systems acknowledge variance.
 */

import {
  ContextMatrix,
  CapabilityVector,
  SurvivabilityAudit,
  RunwayBand,
  ENGINE_AXIOMS,
  GeographyTier,
  MarketIntelligenceReport,
  LocalMarketGap,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: SHOCK VARIABLE DEFINITIONS
// Real-world disruption events injected into every simulation run.
// Each shock has a probability of occurring and an impact magnitude.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShockVariable {
  id: string;
  name: string;
  probabilityOfOccurrence: number;   // 0.0 – 1.0 per timeline unit
  impactMagnitude: number;           // 0.0 = no impact, 1.0 = complete trajectory wipe
  isRecoverable: boolean;
  recoveryTimeDays: number;
  affectedPathTypes: string[];
}

export const SHOCK_VARIABLES: ShockVariable[] = [
  {
    id: 'platform_policy_change',
    name: 'Platform Policy / Fee Structure Change',
    probabilityOfOccurrence: 0.25,    // 1 in 4 chance per 6 months
    impactMagnitude: 0.35,
    isRecoverable: true,
    recoveryTimeDays: 21,
    affectedPathTypes: ['freelance_platform', 'marketplace_selling', 'content_monetization'],
  },
  {
    id: 'local_economic_slowdown',
    name: 'Regional Economic Slowdown',
    probabilityOfOccurrence: 0.15,
    impactMagnitude: 0.25,
    isRecoverable: true,
    recoveryTimeDays: 45,
    affectedPathTypes: ['local_geo_arbitrage', 'local_service_business'],
  },
  {
    id: 'personal_health_emergency',
    name: 'Personal Health / Family Emergency',
    probabilityOfOccurrence: 0.10,
    impactMagnitude: 0.60,
    isRecoverable: true,
    recoveryTimeDays: 14,
    affectedPathTypes: ['all'],
  },
  {
    id: 'market_saturation',
    name: 'Market Saturation in Target Niche',
    probabilityOfOccurrence: 0.30,    // High — markets fill up fast
    impactMagnitude: 0.45,
    isRecoverable: true,
    recoveryTimeDays: 30,             // Need to pivot or specialize
    affectedPathTypes: ['content_creation', 'dropshipping', 'generic_freelancing'],
  },
  {
    id: 'infrastructure_failure',
    name: 'Infrastructure Failure (Device / Internet)',
    probabilityOfOccurrence: 0.20,
    impactMagnitude: 0.20,
    isRecoverable: true,
    recoveryTimeDays: 7,
    affectedPathTypes: ['digital_remote', 'technical_build'],
  },
  {
    id: 'skill_acquisition_delay',
    name: 'Skill Acquisition Takes 2x Longer Than Projected',
    probabilityOfOccurrence: 0.40,   // Very common — people underestimate learning time
    impactMagnitude: 0.30,
    isRecoverable: true,
    recoveryTimeDays: 30,
    affectedPathTypes: ['technical_build', 'learning_heavy_paths'],
  },
  {
    id: 'client_payment_default',
    name: 'Client Non-Payment / Scope Creep',
    probabilityOfOccurrence: 0.35,
    impactMagnitude: 0.20,
    isRecoverable: true,
    recoveryTimeDays: 10,
    affectedPathTypes: ['freelance_client_work', 'agency'],
  },
  {
    id: 'competitive_entrant',
    name: 'Strong Competitor Enters Local Market',
    probabilityOfOccurrence: 0.20,
    impactMagnitude: 0.35,
    isRecoverable: true,
    recoveryTimeDays: 45,
    affectedPathTypes: ['local_geo_arbitrage', 'service_business'],
  },
  {
    id: 'motivational_burnout',
    name: 'Motivational Burnout / Execution Gap',
    probabilityOfOccurrence: 0.50,   // Highest probability shock — most people burn out
    impactMagnitude: 0.40,
    isRecoverable: true,
    recoveryTimeDays: 14,
    affectedPathTypes: ['all'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: PATH TEMPLATE REGISTRY
// Pre-defined path archetypes that the simulation engine selects from
// based on the user's constraint matrix.
// ─────────────────────────────────────────────────────────────────────────────

export interface PathTemplate {
  id: string;
  name: string;
  category: string;
  type: 'high_risk_upside' | 'safe_compounding' | 'survival';
  baseSuccessProbability: number;    // Before user-specific adjustments
  requiredMinCapital: number;        // INR
  requiredMinCommScore: number;
  requiredMinTechScore: number;
  requiredMinDailyHours: number;
  requiredGeographies: GeographyTier[] | 'all';
  timeToFirstRevenueDays: number;
  scalabilityIndex: number;          // 0.0 = linear, 1.0 = exponential
  capitalDependencyIndex: number;    // 0.0 = zero capital, 1.0 = capital-intensive
  shocksApplicable: string[];        // Which shock IDs affect this path
}

export const PATH_TEMPLATES: PathTemplate[] = [
  // ── SURVIVAL PATHS (Red/Yellow band only) ──
  {
    id: 'local_service_arbitrage',
    name: 'Local Service Arbitrage',
    category: 'local_geo_arbitrage',
    type: 'survival',
    baseSuccessProbability: 0.72,
    requiredMinCapital: 0,
    requiredMinCommScore: 0.2,
    requiredMinTechScore: 0,
    requiredMinDailyHours: 2,
    requiredGeographies: 'all',
    timeToFirstRevenueDays: 3,
    scalabilityIndex: 0.2,
    capitalDependencyIndex: 0,
    shocksApplicable: ['local_economic_slowdown', 'personal_health_emergency', 'motivational_burnout'],
  },

  // ── SAFE COMPOUNDING PATHS ──
  {
    id: 'local_sme_digitization',
    name: 'Local SME Digitization (No-Code Automation)',
    category: 'local_geo_arbitrage',
    type: 'safe_compounding',
    baseSuccessProbability: 0.68,
    requiredMinCapital: 0,
    requiredMinCommScore: 0.35,
    requiredMinTechScore: 0.25,
    requiredMinDailyHours: 3,
    requiredGeographies: ['tier2_city', 'tier3_semi_urban', 'rural'],
    timeToFirstRevenueDays: 14,
    scalabilityIndex: 0.5,
    capitalDependencyIndex: 0.05,
    shocksApplicable: ['local_economic_slowdown', 'client_payment_default', 'motivational_burnout'],
  },
  {
    id: 'skill_based_freelance_local',
    name: 'Skill-Based Local Freelancing',
    category: 'freelance_client_work',
    type: 'safe_compounding',
    baseSuccessProbability: 0.60,
    requiredMinCapital: 0,
    requiredMinCommScore: 0.35,
    requiredMinTechScore: 0.30,
    requiredMinDailyHours: 3,
    requiredGeographies: 'all',
    timeToFirstRevenueDays: 7,
    scalabilityIndex: 0.35,
    capitalDependencyIndex: 0,
    shocksApplicable: ['client_payment_default', 'motivational_burnout', 'competitive_entrant'],
  },
  {
    id: 'no_code_saas_local_problem',
    name: 'No-Code SaaS Solving a Real Local Problem',
    category: 'technical_build',
    type: 'safe_compounding',
    baseSuccessProbability: 0.45,
    requiredMinCapital: 500,
    requiredMinCommScore: 0.30,
    requiredMinTechScore: 0.40,
    requiredMinDailyHours: 4,
    requiredGeographies: 'all',
    timeToFirstRevenueDays: 30,
    scalabilityIndex: 0.80,
    capitalDependencyIndex: 0.10,
    shocksApplicable: ['skill_acquisition_delay', 'market_saturation', 'motivational_burnout'],
  },

  // ── HIGH RISK / UPSIDE PATHS ──
  {
    id: 'high_velocity_remote_agency',
    name: 'High-Velocity Remote Agency Model',
    category: 'agency',
    type: 'high_risk_upside',
    baseSuccessProbability: 0.25,
    requiredMinCapital: 2000,
    requiredMinCommScore: 0.65,
    requiredMinTechScore: 0.50,
    requiredMinDailyHours: 6,
    requiredGeographies: ['tier1_metro', 'tier2_city'],
    timeToFirstRevenueDays: 21,
    scalabilityIndex: 0.75,
    capitalDependencyIndex: 0.20,
    shocksApplicable: ['platform_policy_change', 'client_payment_default', 'market_saturation', 'motivational_burnout'],
  },
  {
    id: 'technical_product_build',
    name: 'Technical Product / AI-Augmented Tool',
    category: 'technical_build',
    type: 'high_risk_upside',
    baseSuccessProbability: 0.18,
    requiredMinCapital: 1000,
    requiredMinCommScore: 0.30,
    requiredMinTechScore: 0.70,
    requiredMinDailyHours: 5,
    requiredGeographies: 'all',
    timeToFirstRevenueDays: 45,
    scalabilityIndex: 0.95,
    capitalDependencyIndex: 0.15,
    shocksApplicable: ['skill_acquisition_delay', 'market_saturation', 'competitive_entrant', 'motivational_burnout'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: PATH ELIGIBILITY FILTER
// Filters path templates against the user's constraint matrix.
// A path is ineligible if any hard requirement is not met.
// ─────────────────────────────────────────────────────────────────────────────

export function filterEligiblePaths(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  survivability: SurvivabilityAudit,
): { eligible: PathTemplate[]; ineligible: { path: PathTemplate; reason: string }[] } {
  const eligible: PathTemplate[] = [];
  const ineligible: { path: PathTemplate; reason: string }[] = [];
  const userGeo = matrix.socioeconomic.geographyTier;

  for (const path of PATH_TEMPLATES) {
    // Survivability band gates - RELAXED: do not block paths; let the user see them,
    // but the system will warn them and default to Sprint 0 tasks where appropriate.

    // Capital requirement gate
    if (path.requiredMinCapital > matrix.socioeconomic.liquidCapital) {
      ineligible.push({ path, reason: `Requires ₹${path.requiredMinCapital} capital — user has ₹${matrix.socioeconomic.liquidCapital}.` });
      continue;
    }

    // Communication score gate
    if (path.requiredMinCommScore > matrix.humanCapital.communicationScore) {
      ineligible.push({ path, reason: `Requires communication score ${path.requiredMinCommScore} — user at ${matrix.humanCapital.communicationScore.toFixed(2)}.` });
      continue;
    }

    // Technical score gate
    if (path.requiredMinTechScore > capability.trueCapabilityScore) {
      ineligible.push({ path, reason: `Requires technical capability ${path.requiredMinTechScore} — user at ${capability.trueCapabilityScore.toFixed(2)}.` });
      continue;
    }

    // Daily hours gate
    if (path.requiredMinDailyHours > matrix.infrastructure.dailyUninterruptedHours) {
      ineligible.push({ path, reason: `Requires ${path.requiredMinDailyHours}h/day — user has ${matrix.infrastructure.dailyUninterruptedHours}h.` });
      continue;
    }

    // Geography gate
    if (path.requiredGeographies !== 'all' && !path.requiredGeographies.includes(userGeo)) {
      ineligible.push({ path, reason: `Not viable for ${userGeo} geography tier.` });
      continue;
    }

    eligible.push(path);
  }

  return { eligible, ineligible };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: PROBABILITY ADJUSTMENT ENGINE
// Takes the base probability of a path and adjusts it for the specific user's
// constraint profile. This is where generic paths become personalized.
// ─────────────────────────────────────────────────────────────────────────────

export function calculateAdjustedProbability(
  path: PathTemplate,
  matrix: ContextMatrix,
  capability: CapabilityVector,
  intelligenceReport?: MarketIntelligenceReport | null,
): { low: number; high: number } {
  let adjustedProb = path.baseSuccessProbability;

  // Positive adjustments
  // High learning rate = better probability on all paths
  adjustedProb += matrix.humanCapital.learningRate * 0.10;

  // Excess capability above minimum = bonus probability
  const capabilityExcess = Math.max(0, capability.trueCapabilityScore - path.requiredMinTechScore);
  adjustedProb += capabilityExcess * 0.15;

  // Strong network = significant advantage
  adjustedProb += matrix.humanCapital.networkQuality * 0.08;

  // High discipline = execution consistency
  adjustedProb += matrix.psychometric.baselineDiscipline * 0.10;

  // Negative adjustments
  // Procrastination is the single biggest killer
  adjustedProb -= matrix.psychometric.procrastinationScore * 0.20;

  // Low cognitive endurance hurts long deep-work paths
  if (matrix.psychometric.cognitiveEnduranceMinutes < 90) {
    adjustedProb -= 0.08;
  }

  // Infrastructure constraints
  if (matrix.infrastructure.internetStability === '2g_unstable') {
    adjustedProb -= 0.15;
  }
  if (matrix.infrastructure.deviceTier === 'mobile_only') {
    adjustedProb -= 0.20;
  }

  // Shock variable probability overlay
  let shockImpact = 0;
  for (const shockId of path.shocksApplicable) {
    const shock = SHOCK_VARIABLES.find((s) => s.id === shockId);
    if (shock) {
      shockImpact += shock.probabilityOfOccurrence * shock.impactMagnitude;
    }
  }
  adjustedProb -= (shockImpact / path.shocksApplicable.length) * 0.30; // Weighted shock contribution

  // INTELLIGENCE OVERLAY (Real Market Data Integration)
  if (intelligenceReport) {
    // If the path aligns with a local market gap, boost probability based on lack of competition
    const matchingGap = intelligenceReport.localMarketGaps.find((g: LocalMarketGap) => 
      path.category === 'local_geo_arbitrage' || g.requiredSkills.some((s: string) => path.name.toLowerCase().includes(s.toLowerCase()))
    );
    if (matchingGap && (matchingGap.competitorCount === 'none' || matchingGap.competitorCount === 'very_few')) {
      adjustedProb += 0.15;
    } else if (matchingGap && matchingGap.competitorCount === 'saturated') {
      adjustedProb -= 0.15;
    }

    // Overall market health adjustment
    const marketScoreDelta = intelligenceReport.overallMarketScore - 0.5; // -0.5 to +0.5
    adjustedProb += marketScoreDelta * 0.10;
  }

  // Hard cap: never exceed ENGINE_AXIOMS max, never go below floor
  const finalProb = Math.max(
    ENGINE_AXIOMS.MIN_PROBABILITY_FLOOR / 100,
    Math.min(ENGINE_AXIOMS.MAX_PROBABILITY_CAP / 100, adjustedProb)
  );

  // Return a range (honest systems acknowledge variance)
  const variance = 0.05 + (matrix.psychometric.procrastinationScore * 0.08);
  return {
    low: Math.max(ENGINE_AXIOMS.MIN_PROBABILITY_FLOOR / 100, finalProb - variance),
    high: Math.min(ENGINE_AXIOMS.MAX_PROBABILITY_CAP / 100, finalProb + variance),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: SIMULATION RUNNER
// Runs the full simulation across all eligible paths and ranks them.
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  pathTemplate: PathTemplate;
  adjustedProbabilityLow: number;    // As percentage (e.g., 18.4)
  adjustedProbabilityHigh: number;   // As percentage (e.g., 24.1)
  adjustedTargetAmount: number;      // Adjusted for the timeline
  shockVulnerabilityScore: number;   // How exposed this path is to shocks
  recommendationScore: number;       // Internal ranking score
  whyThisPathFitsUser: string;
}

export function runTrajectorySimulation(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  survivability: SurvivabilityAudit,
  intelligenceReport?: MarketIntelligenceReport | null,
): SimulationResult[] {
  const { eligible } = filterEligiblePaths(matrix, capability, survivability);
  const results: SimulationResult[] = [];

  for (const path of eligible) {
    const probRange = calculateAdjustedProbability(path, matrix, capability, intelligenceReport);

    // Calculate adjusted target amount (what's realistic given timeline and capability)
    const timelineMonths = matrix.goalVector.timelineMonths;
    const baselineMonthlyOutput = capability.trueCapabilityScore * 50000; // Base monthly earning potential
    const scalingFactor = 1 + (path.scalabilityIndex * timelineMonths * 0.1);
    const adjustedTarget = Math.floor(baselineMonthlyOutput * scalingFactor * timelineMonths);

    // Shock vulnerability score
    const shockVulnerability = path.shocksApplicable.reduce((sum, shockId) => {
      const shock = SHOCK_VARIABLES.find((s) => s.id === shockId);
      return sum + (shock ? shock.probabilityOfOccurrence * shock.impactMagnitude : 0);
    }, 0) / path.shocksApplicable.length;

    // Recommendation score: balanced between probability and potential return
    const recommendationScore =
      (probRange.low + probRange.high) / 2 * 0.50 +   // 50% weight on probability
      path.scalabilityIndex * 0.25 +                    // 25% weight on scalability
      (1 - shockVulnerability) * 0.15 +                 // 15% weight on stability
      (1 - path.capitalDependencyIndex) * 0.10;         // 10% weight on zero-capital advantage

    const whyFits = generatePathFitRationale(path, matrix, capability, probRange, intelligenceReport);

    results.push({
      pathTemplate: path,
      adjustedProbabilityLow: Math.round(probRange.low * 100 * 10) / 10,
      adjustedProbabilityHigh: Math.round(probRange.high * 100 * 10) / 10,
      adjustedTargetAmount: adjustedTarget,
      shockVulnerabilityScore: Math.round(shockVulnerability * 100) / 100,
      recommendationScore,
      whyThisPathFitsUser: whyFits,
    });
  }

  // Sort by recommendation score descending
  return results.sort((a, b) => b.recommendationScore - a.recommendationScore);
}

function generatePathFitRationale(
  path: PathTemplate,
  matrix: ContextMatrix,
  capability: CapabilityVector,
  probRange: { low: number; high: number },
  intelligenceReport?: MarketIntelligenceReport | null,
): string {
  const geo = matrix.socioeconomic.geographyTier;
  const prob = Math.round(((probRange.low + probRange.high) / 2) * 100);

  // Intelligence overlay injection for real market data
  let marketDataSnippet = '';
  if (intelligenceReport) {
    const topSkill = intelligenceReport.skillDemandSignals[0];
    if (topSkill) {
      marketDataSnippet = ` Based on live market data, demand for ${topSkill.skill} is currently ${topSkill.demandLevel.replace('_', ' ')} and ${topSkill.trendDirection} in your area.`;
    }
    const matchingGap = intelligenceReport.localMarketGaps[0];
    if (matchingGap && path.category === 'local_geo_arbitrage') {
      marketDataSnippet += ` There are an estimated ${matchingGap.estimatedAffectedBusinesses} businesses needing this within your reach, with ${matchingGap.competitorCount.replace('_', ' ')} competitors.`;
    }
  }

  if (path.id === 'local_sme_digitization') {
    return `In your ${geo} area, most SMEs are still running on manual processes. You don't need deep coding skills — you need the ability to identify one inefficiency and solve it with a no-code tool. Capital requirement: ₹0. Timeline to first payment: ~14 days. Probability: ${prob}%.${marketDataSnippet}`;
  }
  if (path.id === 'local_service_arbitrage') {
    return `This is the fastest path to cash given your runway situation. Zero capital, zero learning curve. You execute your most verified skill directly to someone who needs it today. Probability: ${prob}%.${marketDataSnippet}`;
  }
  if (path.id === 'no_code_saas_local_problem') {
    return `Your technical capability (${(capability.trueCapabilityScore * 100).toFixed(0)}%) is above the threshold for building a functional no-code product. The local market gap in your area makes this viable. First revenue in ~30 days. Scalability is high — this compounds. Probability: ${prob}%.${marketDataSnippet}`;
  }
  return `This path matches your constraint profile at a ${prob}% probability of success within your stated timeline.${marketDataSnippet}`;
}
