/**
 * FP-OS :: LAYER 3 — SURVIVABILITY AUDIT
 * "The Floor Before The Ceiling"
 *
 * This stage runs BEFORE any opportunity analysis.
 * Without passing this gate, NO strategy is generated.
 *
 * Core law: You cannot optimize a trajectory for a person
 * who won't be financially alive to execute it.
 *
 * The three runway bands determine which mode the entire engine operates in:
 * RED   → Survival operator mode. No strategy. Pure immediate cash.
 * YELLOW → Hybrid mode. 60% survival, 40% strategy.
 * GREEN → Full strategy generation unlocked.
 */

import {
  ContextMatrix,
  SurvivabilityAudit,
  RunwayBand,
  ENGINE_AXIOMS,
  GeographyTier,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: RUNWAY BAND CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export function classifyRunwayBand(runwayDays: number): RunwayBand {
  if (runwayDays < ENGINE_AXIOMS.RED_BAND_RUNWAY_DAYS) return 'red';
  if (runwayDays < ENGINE_AXIOMS.YELLOW_BAND_RUNWAY_DAYS) return 'yellow';
  return 'green';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: MINIMUM INCOME CALCULATOR
// Calculates the minimum monthly income needed to extend runway to safety.
// ─────────────────────────────────────────────────────────────────────────────

export function calculateMinimumViableIncome(matrix: ContextMatrix): number {
  const monthlyBurn = matrix.socioeconomic.monthlyBurnRate;
  const debtObligation = matrix.socioeconomic.debtMonthlyObligation;
  const geographyBuffer = getGeographySurvivalBuffer(matrix.socioeconomic.geographyTier);

  // Minimum = burn rate + debt obligations + geography-specific emergency buffer
  return Math.ceil(monthlyBurn + debtObligation + geographyBuffer);
}

/**
 * Geography-specific survival buffer — accounts for cost of living variance.
 * Tier 1 metros have higher emergency buffers because failure is more expensive there.
 */
function getGeographySurvivalBuffer(tier: GeographyTier): number {
  const buffers: Record<GeographyTier, number> = {
    tier1_metro: 8000,      // Metro emergencies cost more
    tier2_city: 4000,
    tier3_semi_urban: 2000,
    rural: 1000,
  };
  return buffers[tier] || 4000;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: RED BAND HANDLER
// When runway < 45 days, the engine becomes a survival operator.
// No strategy is generated. Only immediate cash generation paths.
// This is a HARD GATE — not a warning, not a suggestion.
// ─────────────────────────────────────────────────────────────────────────────

export interface SurvivalOnlyResponse {
  mode: 'SURVIVAL_OPERATOR';
  urgencyLevel: 'CRITICAL' | 'HIGH';
  immediateActions: ImmediateAction[];
  targetDailyIncome: number;
  daysToExtendRunwayToYellow: number;
  blockedMessage: string;
}

export interface ImmediateAction {
  title: string;
  description: string;
  capitalRequired: number;          // INR — zero capital actions prioritized
  timeToFirstPayout: number;        // Days
  requiredSkill: string;
  estimatedDailyIncome: number;
  localityRequired: boolean;        // Can this be done online or needs physical presence?
}

/**
 * Generates survival-mode immediate actions based on what skills exist.
 * Zero capital, zero learning curve. Pure execution of existing skills.
 */
export function generateSurvivalActions(matrix: ContextMatrix): ImmediateAction[] {
  const skills = matrix.humanCapital.skills;
  const actions: ImmediateAction[] = [];
  const tier = matrix.socioeconomic.geographyTier;

  // ALWAYS AVAILABLE — works regardless of skills
  actions.push({
    title: 'Local Labor Arbitrage',
    description: 'Find immediate physical/digital work in your local area. Delivery, data entry, local shop assistance, tutoring. No learning curve required.',
    capitalRequired: 0,
    timeToFirstPayout: 1,
    requiredSkill: 'None',
    estimatedDailyIncome: tier === 'tier1_metro' ? 800 : tier === 'tier2_city' ? 500 : 300,
    localityRequired: true,
  });

  // SKILL-BASED SURVIVAL ACTIONS
  for (const skill of skills) {
    if (skill.verifiedLevel >= 0.3) {
      // Technical skills
      if (skill.category === 'technical' && skill.hasVerifiableOutput) {
        actions.push({
          title: `Emergency Gig: ${skill.skillName}`,
          description: `Post your ${skill.skillName} skill on Internshala, LinkedIn, or reach out to 10 local businesses directly. Don't pitch packages — pitch a single, immediate deliverable they can pay for today.`,
          capitalRequired: 0,
          timeToFirstPayout: 2,
          requiredSkill: skill.skillName,
          estimatedDailyIncome: 500,
          localityRequired: false,
        });
      }

      // Communication/teaching skills
      if (skill.category === 'communication' && skill.verifiedLevel >= 0.4) {
        actions.push({
          title: 'Emergency Tutoring Sprint',
          description: `You can teach. Post immediately on local Facebook groups, WhatsApp communities, and school boards. Charge ₹200–₹500 per session. Target: 2 students by day 3.`,
          capitalRequired: 0,
          timeToFirstPayout: 2,
          requiredSkill: skill.skillName,
          estimatedDailyIncome: 600,
          localityRequired: true,
        });
      }
    }
  }

  // Sort by time to first payout (fastest first), then by estimated income
  return actions.sort((a, b) => a.timeToFirstPayout - b.timeToFirstPayout || b.estimatedDailyIncome - a.estimatedDailyIncome);
}

export function buildSurvivalModeResponse(matrix: ContextMatrix): SurvivalOnlyResponse {
  const runwayDays = matrix.socioeconomic.runwayDays;
  const dailyBurn = matrix.socioeconomic.monthlyBurnRate / 30;
  const targetIncome = calculateMinimumViableIncome(matrix);
  const immediateActions = generateSurvivalActions(matrix);

  // Days needed to generate enough income to push runway to yellow band
  const incomeNeededPerDay = dailyBurn;
  const daysToExtendToYellow = Math.ceil(
    (ENGINE_AXIOMS.RED_BAND_RUNWAY_DAYS - runwayDays) * dailyBurn / (targetIncome / 30)
  );

  return {
    mode: 'SURVIVAL_OPERATOR',
    urgencyLevel: runwayDays < 15 ? 'CRITICAL' : 'HIGH',
    immediateActions,
    targetDailyIncome: Math.ceil(incomeNeededPerDay),
    daysToExtendRunwayToYellow: Math.max(7, daysToExtendToYellow),
    blockedMessage: `Your runway is ${runwayDays} days. Strategy generation is locked. Before I build your path to your goal, I need to ensure you survive long enough to execute it. Right now, the only objective is generating ₹${Math.ceil(incomeNeededPerDay * 30).toLocaleString('en-IN')}/month to extend your runway above 45 days. Everything else is secondary. Here's what you execute immediately:`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: YELLOW BAND HANDLER
// Hybrid mode: 60% immediate income, 40% path building.
// ─────────────────────────────────────────────────────────────────────────────

export interface YellowBandConfiguration {
  survivalAllocation: 0.60;      // 60% of capacity to immediate income
  strategyAllocation: 0.40;      // 40% of capacity to medium-term building
  prohibitedPathTypes: string[]; // High-risk, long-horizon paths are blocked
  maxCapitalDeployable: number;  // Hard cap on capital at risk in this band
  notes: string[];
}

export function buildYellowBandConfig(matrix: ContextMatrix): YellowBandConfiguration {
  const liquidCapital = matrix.socioeconomic.liquidCapital;

  return {
    survivalAllocation: 0.60,
    strategyAllocation: 0.40,
    prohibitedPathTypes: [
      'high_risk_long_horizon',
      'capital_intensive_build',
      'full_time_learning_pivot',
      'business_registration_investment',
    ],
    // In yellow band, never deploy more than 20% of liquid capital
    maxCapitalDeployable: Math.floor(liquidCapital * 0.20),
    notes: [
      `Runway: ${matrix.socioeconomic.runwayDays} days. Hybrid mode active.`,
      `60% of your time/energy must generate income NOW. 40% builds your medium-term path.`,
      `No quitting existing income sources until runway exceeds 90 days.`,
      `Capital deployment capped at ₹${Math.floor(liquidCapital * 0.20).toLocaleString('en-IN')}.`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: SURVIVABILITY FLOOR VALIDATOR
// The hard gate that prevents irresponsible advice generation.
// Logs the decision for legal protection.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * This function is the core legal protection mechanism.
 * Every call is logged. If a user later claims "FP told me to quit my job,"
 * this function's output proves the system explicitly blocked that advice.
 */
export function validateSurvivabilityFloor(matrix: ContextMatrix): {
  passed: boolean;
  band: RunwayBand;
  blockedAdviceTypes: string[];
  auditLog: string;
} {
  const band = classifyRunwayBand(matrix.socioeconomic.runwayDays);

  const blockedAdviceTypes: string[] = [];
  if (band === 'red') {
    blockedAdviceTypes.push(
      'quit_job_advice',
      'full_time_pivot',
      'high_risk_investment',
      'medium_term_strategy',
      'long_term_path_selection',
      'capital_deployment_above_zero',
    );
  } else if (band === 'yellow') {
    blockedAdviceTypes.push(
      'quit_job_advice',
      'high_risk_long_horizon',
      'capital_intensive_strategies',
    );
  }

  const auditLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    userId: matrix.userId,
    runwayDays: matrix.socioeconomic.runwayDays,
    band,
    blockedAdviceTypes,
    strategyGenerationUnlocked: band === 'green',
    systemDecision: band === 'red'
      ? 'SURVIVAL_MODE_ONLY'
      : band === 'yellow'
      ? 'HYBRID_MODE'
      : 'FULL_STRATEGY_UNLOCKED',
  });

  return {
    passed: band !== 'red',  // Red band = floor not passed
    band,
    blockedAdviceTypes,
    auditLog,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: MAIN LAYER 3 ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export function runSurvivabilityAudit(matrix: ContextMatrix): SurvivabilityAudit {
  const runwayDays = matrix.socioeconomic.runwayDays;
  const runwayBand = classifyRunwayBand(runwayDays);
  const dailyBurnRate = matrix.socioeconomic.monthlyBurnRate / 30;
  const immediateIncomeRequired = runwayBand === 'red';
  const immediateTargetAmount = calculateMinimumViableIncome(matrix);

  const survivabilityNotes: string[] = [];

  if (runwayBand === 'red') {
    survivabilityNotes.push(`🔴 CRITICAL: ${runwayDays} days runway. Survival mode activated. All strategy generation blocked.`);
    survivabilityNotes.push(`Priority: Generate ₹${immediateTargetAmount.toLocaleString('en-IN')}/month to reach Yellow Band.`);
    survivabilityNotes.push(`No capital deployment. Zero-cost execution paths only.`);
  } else if (runwayBand === 'yellow') {
    survivabilityNotes.push(`🟡 CAUTION: ${runwayDays} days runway. Hybrid mode active.`);
    survivabilityNotes.push(`60% of execution capacity allocated to income generation. 40% to path building.`);
    survivabilityNotes.push(`High-risk paths are blocked until runway exceeds 90 days.`);
  } else {
    survivabilityNotes.push(`🟢 CLEAR: ${runwayDays} days runway. Full strategy generation unlocked.`);
    survivabilityNotes.push(`All path types available. Capital deployment governed by risk tolerance and ambition filter.`);
  }

  return {
    runwayDays,
    runwayBand,
    dailyBurnRate,
    immediateIncomeRequired,
    immediateTargetAmount,
    strategyGenerationUnlocked: runwayBand !== 'red',
    survivabilityNotes,
  };
}
