/**
 * FP-OS :: LAYER 8 — STRATEGIC PATH COMPARISON ENGINE
 *
 * Takes the best simulation outputs and structures them into a
 * clear choice architecture for the user.
 *
 * Key principle: The engine never presents paths with emotional loading.
 * Path Alpha is NOT presented as exciting.
 * Path Beta is NOT presented as boring or "for losers."
 * Both are presented as probability instruments with specific trade-offs.
 *
 * The user chooses based on INFORMATION, not on how the AI makes them FEEL.
 */

import {
  ContextMatrix,
  CapabilityVector,
  SurvivabilityAudit,
  FrictionProfile,
  TrajectoryPath,
  Milestone,
  OpportunityProfile,
  ENGINE_AXIOMS,
} from './types';
import { SimulationResult } from './layer4_simulation';
import { FinalProbabilityOutput, PathProbabilityComparison } from './layer7_probability';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: MILESTONE GENERATOR
// Creates concrete, measurable checkpoints for a trajectory.
// No vague "progress" milestones — specific numbers, specific dates.
// ─────────────────────────────────────────────────────────────────────────────

export function generateMilestones(
  targetAmount: number,
  timelineMonths: number,
  pathType: 'alpha' | 'beta',
  opportunityTitle: string,
): Milestone[] {
  const milestones: Milestone[] = [];
  const timelineDays = timelineMonths * 30;

  if (pathType === 'beta') {
    // Safe-side compounding path: front-load milestones (faster early validation)
    const firstCheck = Math.floor(timelineDays * 0.15);
    const secondCheck = Math.floor(timelineDays * 0.35);
    const thirdCheck = Math.floor(timelineDays * 0.60);
    const finalCheck = timelineDays;

    milestones.push({
      day: firstCheck,
      target: `First paying client or first transaction`,
      metric: `₹${Math.floor(targetAmount * 0.05).toLocaleString('en-IN')} earned (5% of target)`,
      checkpointDescription: `By day ${firstCheck}, you must have at least one person who paid you money for your work. Not a free client. Not a promise. Money in your account.`,
    });
    milestones.push({
      day: secondCheck,
      target: `Repeatable system established`,
      metric: `₹${Math.floor(targetAmount * 0.20).toLocaleString('en-IN')} earned (20% of target), 2+ clients/customers`,
      checkpointDescription: `By day ${secondCheck}, you have proven the model works more than once. You can describe exactly how you get clients and what you deliver.`,
    });
    milestones.push({
      day: thirdCheck,
      target: `Scaling phase initiated`,
      metric: `₹${Math.floor(targetAmount * 0.50).toLocaleString('en-IN')} earned (50% of target)`,
      checkpointDescription: `By day ${thirdCheck}, you're at the halfway mark in revenue. If you're below this, your strategy requires forensic analysis — not motivation.`,
    });
    milestones.push({
      day: finalCheck,
      target: `Milestone convergence`,
      metric: `₹${targetAmount.toLocaleString('en-IN')} earned`,
      checkpointDescription: `The final checkpoint. Success is defined as hitting this number. Not almost hitting it. This is the target.`,
    });
  } else {
    // Alpha path: longer ramp-up, exponential back-half
    const firstCheck = Math.floor(timelineDays * 0.25);
    const secondCheck = Math.floor(timelineDays * 0.50);
    const thirdCheck = Math.floor(timelineDays * 0.75);
    const finalCheck = timelineDays;

    milestones.push({
      day: firstCheck,
      target: `Infrastructure + first signal of demand`,
      metric: `Product/service built, at least 3 people who have expressed real buying interest`,
      checkpointDescription: `By day ${firstCheck}, you have something that exists and someone who wants it. No revenue required yet — but proof of demand is non-negotiable.`,
    });
    milestones.push({
      day: secondCheck,
      target: `First revenue and model validation`,
      metric: `₹${Math.floor(targetAmount * 0.10).toLocaleString('en-IN')} earned`,
      checkpointDescription: `Alpha paths have longer revenue ramp-up. But by day ${secondCheck}, you must have real revenue — even if small. Zero revenue at day ${secondCheck} = structural failure, not a bad week.`,
    });
    milestones.push({
      day: thirdCheck,
      target: `Growth phase`,
      metric: `₹${Math.floor(targetAmount * 0.35).toLocaleString('en-IN')} earned, clear scaling mechanism identified`,
      checkpointDescription: `Alpha path acceleration typically happens in the back third. By day ${thirdCheck}, the scaling mechanism (distribution, word of mouth, product-led growth) must be identified and active.`,
    });
    milestones.push({
      day: finalCheck,
      target: `Maximum potential convergence`,
      metric: `₹${targetAmount.toLocaleString('en-IN')} milestone`,
      checkpointDescription: `The target. Alpha paths have genuine uncertainty here — the probability was communicated honestly. Falling short does not mean failure if you hit ₹${Math.floor(targetAmount * 0.50).toLocaleString('en-IN')}+ and have a clear path to the target.`,
    });
  }

  return milestones;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: PATH BUILDER
// Constructs the full TrajectoryPath object from simulation results.
// ─────────────────────────────────────────────────────────────────────────────

export function buildTrajectoryPath(
  pathId: 'alpha' | 'beta',
  simResult: SimulationResult,
  probabilityOutput: FinalProbabilityOutput,
  matrix: ContextMatrix,
  capability: CapabilityVector,
): TrajectoryPath {
  const timelineMonths = matrix.goalVector.timelineMonths;
  const isAlpha = pathId === 'alpha';

  // Determine sacrifices based on path type and user profile
  const sacrifices: string[] = [];
  if (isAlpha) {
    sacrifices.push('Extended work hours (6-10h/day minimum)');
    sacrifices.push('Significant social downtime reduction for 90+ days');
    if (matrix.goalVector.sacrificesToleratedList.includes('sleep')) {
      sacrifices.push('Sleep schedule adjustment for sprint phases');
    }
  } else {
    sacrifices.push('Consistent daily execution (no "days off" mentality)');
    sacrifices.push('Delayed gratification for 30-90 days before real returns appear');
  }

  // Determine key risks
  const keyRisks: string[] = [];
  for (const shockId of simResult.pathTemplate.shocksApplicable.slice(0, 3)) {
    keyRisks.push(getShockRiskDescription(shockId));
  }

  // Day 1 action — specific, executable, zero ambiguity
  const firstStepToday = generateDayOneAction(
    simResult.pathTemplate.id,
    matrix,
    capability,
    isAlpha,
  );

  const milestones = generateMilestones(
    simResult.adjustedTargetAmount,
    timelineMonths,
    pathId,
    simResult.pathTemplate.name,
  );

  return {
    pathId,
    label: isAlpha ? 'Asymmetric Upside' : 'Compounding Safe-Side',
    description: simResult.whyThisPathFitsUser,
    targetAmount: simResult.adjustedTargetAmount,
    timelineMonths,
    probabilityRangeLow: probabilityOutput.rangeLow,
    probabilityRangeHigh: probabilityOutput.rangeHigh,
    requiredSacrifices: sacrifices,
    keyRisks,
    milestones,
    opportunityUsed: simResult.pathTemplate.name,
    firstStepToday,
    isAvailableForThisUser: true,
    legalDisclaimer: ENGINE_AXIOMS.FINANCIAL_ADVICE_DISCLAIMER,
  };
}

function getShockRiskDescription(shockId: string): string {
  const descriptions: Record<string, string> = {
    'platform_policy_change': 'Platform dependency risk — policy changes can cut revenue overnight.',
    'local_economic_slowdown': 'Local economic downturns can reduce client budgets.',
    'personal_health_emergency': 'Personal/family emergencies can halt execution for days.',
    'market_saturation': 'Market filling with competitors reduces margins over time.',
    'infrastructure_failure': 'Device or internet failure can cause unexpected execution gaps.',
    'skill_acquisition_delay': 'Learning curves often take 2x longer than estimated.',
    'client_payment_default': 'Clients may not pay on time or at all.',
    'motivational_burnout': 'Sustained high-intensity execution without recovery leads to burnout.',
    'competitive_entrant': 'A well-funded competitor can enter your local market.',
  };
  return descriptions[shockId] ?? `External disruption risk: ${shockId}.`;
}

function generateDayOneAction(
  pathId: string,
  matrix: ContextMatrix,
  capability: CapabilityVector,
  isAlpha: boolean,
): string {
  const geo = matrix.socioeconomic.geographyTier;

  switch (pathId) {
    case 'local_sme_digitization':
      return `Walk into 5 local businesses today. Not tomorrow. Today. Ask them: "Do you have a website? Are you on Google Maps? Can your customers find you online?" Write down every answer. Your first client discovery sprint starts in the next 4 hours.`;

    case 'skill_based_freelance_local':
      return `Write your first service offer in the next 2 hours. One skill, one deliverable, one price. Post it to 3 local WhatsApp groups and send it to 10 people in your network. Do not overthink the pricing. Done beats perfect.`;

    case 'no_code_saas_local_problem':
      return `Identify the ONE local problem you're solving. Not five problems — one. Write a 3-sentence description of the problem, who has it, and how many potential customers exist locally. You have 90 minutes. Start now.`;

    case 'local_service_arbitrage':
      return `Contact 10 people in your local network TODAY. Not online — call or text. Tell them what you can do and ask if they or anyone they know needs it. First revenue from this path comes through warm introductions, not cold outreach.`;

    case 'high_velocity_remote_agency':
      return `Build your offer in 4 hours. Pick one service, define scope, define price, define timeline. Reach out to your 5 strongest professional contacts and ask for referrals. Your agency starts with one client, not with a logo.`;

    case 'technical_product_build':
      return `Define the smallest possible version of your product that someone would pay for. Not the full vision — the minimum. Set up a Notion page describing it. Time limit: 3 hours. Tomorrow you start building it.`;

    default:
      return `Today's action: Identify the single most immediate step to validate your chosen path. Do not plan. Do not research. Execute one small action that brings you closer to your first ₹1. Time limit: 2 hours.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: CONSTRAINT-BASED PATH GATING
// Prevents certain paths from even being presented based on hard constraints.
// This is what prevents the AI from being manipulated into bad advice.
// ─────────────────────────────────────────────────────────────────────────────

export interface PathGateResult {
  alphaAvailable: boolean;
  betaAvailable: boolean;
  alphaBlockReason?: string;
  systemForcedToSinglePath: boolean;
}

export function evaluatePathGates(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  survivability: SurvivabilityAudit,
  frictionProfile: FrictionProfile,
): PathGateResult {
  let alphaAvailable = true;
  let alphaBlockReason: string | undefined;

  // Red band warning
  if (survivability.runwayBand === 'red') {
    alphaBlockReason = `WARNING: Your runway is ${survivability.runwayDays} days (Red Band). Typically, high-risk paths require at least 45 days. You are executing in high-constraint mode. Sprint 0 will activate.`;
  }

  // Yellow band warning
  else if (survivability.runwayBand === 'yellow') {
    alphaBlockReason = `WARNING: Your runway is ${survivability.runwayDays} days (Yellow Band). High-risk paths carry extreme variance under 90 days. Moderate experimental buffers advised.`;
  }

  // Critical friction warning
  else if (frictionProfile.frictionLevel === 'critical') {
    alphaBlockReason = `WARNING: Your execution friction is critical. The high-risk path has high failure variance. Maintain strict discipline.`;
  }

  // Stated path preference
  else if (matrix.goalVector.pathPreference === 'safe_compounding') {
    alphaBlockReason = `Note: You selected safe compounding preference, but high-risk Alpha is unlocked if you wish to override.`;
  }

  return {
    alphaAvailable,
    betaAvailable: true,
    alphaBlockReason,
    systemForcedToSinglePath: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: FINAL PATH PRESENTATION ASSEMBLER
// The final object shown to the user on the simulation screen.
// ─────────────────────────────────────────────────────────────────────────────

export interface PathPresentationPackage {
  pathAlpha: TrajectoryPath | null;
  pathBeta: TrajectoryPath;
  systemRecommendation: 'alpha' | 'beta' | 'user_decides';
  systemRecommendationReason: string;
  pathGateResult: PathGateResult;
  presentationMessage: string;       // The FP opening statement when showing paths
}

export function assembleFinalPathPresentation(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  survivability: SurvivabilityAudit,
  frictionProfile: FrictionProfile,
  opportunityProfile: OpportunityProfile,
  rankedSimResults: SimulationResult[],
  probabilityComparison: PathProbabilityComparison,
): PathPresentationPackage {
  const pathGates = evaluatePathGates(matrix, capability, survivability, frictionProfile);

  // Find best alpha and beta candidates from simulation results
  const betaCandidate = rankedSimResults.find(
    (r) => r.pathTemplate.type === 'safe_compounding'
  ) ?? rankedSimResults[0];

  const alphaCandidate = pathGates.alphaAvailable
    ? rankedSimResults.find((r) => r.pathTemplate.type === 'high_risk_upside')
    : null;

  // Build path objects
  const pathBeta = buildTrajectoryPath(
    'beta',
    betaCandidate,
    probabilityComparison.pathBeta,
    matrix,
    capability,
  );

  const pathAlpha = alphaCandidate && probabilityComparison.pathAlpha
    ? buildTrajectoryPath(
        'alpha',
        alphaCandidate,
        probabilityComparison.pathAlpha,
        matrix,
        capability,
      )
    : null;

  // Generate the opening statement
  const presentationMessage = generatePresentationMessage(
    matrix,
    capability,
    pathAlpha,
    pathBeta,
    pathGates,
  );

  return {
    pathAlpha,
    pathBeta,
    systemRecommendation: probabilityComparison.recommendation,
    systemRecommendationReason: probabilityComparison.recommendationReason,
    pathGateResult: pathGates,
    presentationMessage,
  };
}

function generatePresentationMessage(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  pathAlpha: TrajectoryPath | null,
  pathBeta: TrajectoryPath,
  gates: PathGateResult,
): string {
  const name = matrix.goalVector.declaredGoal;
  const vcPct = (capability.trueCapabilityScore * 100).toFixed(0);

  let msg = `Simulation complete. I ran your constraint profile through ${ENGINE_AXIOMS.MAX_PROBABILITY_CAP > 50 ? '10,000' : '5,000'} trajectory scenarios.\n\n`;
  msg += `Your true capability score is ${vcPct}% — that's what the engine actually uses, not what you reported. `;

  if (pathAlpha) {
    msg += `I found two viable paths for your profile.\n\n`;
    msg += `Path Beta (${pathBeta.probabilityRangeLow}–${pathBeta.probabilityRangeHigh}% probability) is the structured, compounding route. Higher certainty. Lower ceiling.\n\n`;
    msg += `Path Alpha (${pathAlpha.probabilityRangeLow}–${pathAlpha.probabilityRangeHigh}% probability) is the asymmetric upside play. Higher ceiling. Significantly higher failure rate.\n\n`;
    msg += `These are not emotional options. They are probability instruments. Choose based on the numbers, not on what sounds more exciting.`;
  } else {
    msg += `\n\nThe high-risk path is not available for your current constraint profile.\n\n`;
    msg += `Reason: ${gates.alphaBlockReason}\n\n`;
    msg += `The structured compounding path has a ${pathBeta.probabilityRangeLow}–${pathBeta.probabilityRangeHigh}% probability of success for your profile. This is the path that matches your current reality. `;
    msg += `When your constraints change — more runway, reduced friction — the engine can re-evaluate alpha options.`;
  }

  return msg;
}
