/**
 * FP-OS :: LAYER 9 — CALIBRATED AMBITION FILTER
 *
 * This is where unrealistic goals are handled with PRECISION —
 * neither crushing the user's ambition nor validating delusion.
 *
 * The filter does NOT say "that's impossible."
 * It says: "Here is the EXACT GAP between your current state and what
 * this goal requires, here is what bridging that gap would actually
 * demand from you, and here is a comparative path that has a much higher
 * probability of making you genuinely wealthy."
 *
 * Then it lets the user choose.
 *
 * This is the Calibrated Ambition Reframe — the engine's most
 * psychologically sophisticated module.
 */

import {
  ContextMatrix,
  CapabilityVector,
  AmbitionAssessment,
  AmbitionFilterResult,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: AMBITION VELOCITY METRIC (A_v)
// A_v = G_val / (T * C_cap)
// Higher A_v = more ambitious relative to capability and time
// ─────────────────────────────────────────────────────────────────────────────

export function calculateAmbitionVelocity(
  targetAmount: number,
  timelineMonths: number,
  trueCapabilityScore: number,
): number {
  const timelineDays = timelineMonths * 30;

  // Prevent division by zero
  if (timelineDays <= 0 || trueCapabilityScore <= 0) {
    return 999; // Effectively infinite ambition velocity = delusional flag
  }

  // A_v = G_val / (T * C_cap * scaling_constant)
  // Scaling constant normalizes so that a "realistic" goal for an average
  // person (₹50,000/month, 6 months, V_c 0.5) gives A_v ≈ 1.0
  const scalingConstant = 50000 / (180 * 0.5);
  return targetAmount / (timelineDays * trueCapabilityScore * scalingConstant);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: FILTER RESULT CLASSIFIER
// Maps the ambition velocity to a categorical filter result.
// ─────────────────────────────────────────────────────────────────────────────

export function classifyAmbitionFilter(ambitionVelocity: number): AmbitionFilterResult {
  if (ambitionVelocity <= 0.8) return 'realistic';
  if (ambitionVelocity <= ENGINE_AXIOMS.AMBITION_VELOCITY_CRITICAL) return 'aggressive_but_possible';
  if (ambitionVelocity <= ENGINE_AXIOMS.AMBITION_VELOCITY_CRITICAL * 2) return 'exceptional_requires_assessment';
  return 'structurally_misaligned';
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: REALISTIC ALTERNATIVE GOAL GENERATOR
// When a goal triggers the filter, the engine offers a calibrated alternative
// that is still ambitious but has meaningful probability.
// This is NOT a downgrade — it's the reframe.
// ─────────────────────────────────────────────────────────────────────────────

export function generateRealisticAlternative(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  originalTarget: number,
  originalTimeline: number,
): { amount: number; timeline: number; description: string } {
  const monthlyEarningPotential = capability.trueCapabilityScore * 50000;
  const geo = matrix.socioeconomic.geographyTier;

  // Base realistic amount: what this user can genuinely build to in 3-4 months
  // with strong but non-exceptional execution
  let realisticMonthly = monthlyEarningPotential * 1.5; // With strategic guidance boost

  // Geography adjustment for local purchasing power context
  if (geo === 'tier3_semi_urban' || geo === 'rural') {
    realisticMonthly = Math.max(realisticMonthly, 15000); // Floor for less privileged contexts
  } else if (geo === 'tier2_city') {
    realisticMonthly = Math.max(realisticMonthly, 25000);
  } else {
    realisticMonthly = Math.max(realisticMonthly, 40000);
  }

  // Realistic total for their timeline (with compounding effect)
  const realisticTimeline = Math.min(originalTimeline, 6); // Cap at 6 months for realism
  const compoundingFactor = 1 + (matrix.humanCapital.learningRate * 0.3);
  const realisticTotal = Math.floor(realisticMonthly * realisticTimeline * compoundingFactor);

  // Generate the "staircase" description — how the realistic path leads to the big goal
  const stepsToOriginalGoal = Math.ceil(originalTarget / realisticTotal);
  const description = `Realistic path: ₹${realisticMonthly.toLocaleString('en-IN')}/month in ${realisticTimeline} months (${(45 + capability.trueCapabilityScore * 25).toFixed(0)}% probability). From that base, the path to ₹${(originalTarget / 100000).toFixed(1)} lakh becomes a compounding trajectory — not a leap of faith. Most people who reach your original target got there in ${stepsToOriginalGoal} phases, not one jump.`;

  return {
    amount: realisticTotal,
    timeline: realisticTimeline,
    description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: EGO-CRITIQUE REFRAME GENERATOR
// When the delusional filter triggers, FP generates a specific, honest
// reframe that challenges the user without destroying their ambition.
// This is surgical — not motivational.
// ─────────────────────────────────────────────────────────────────────────────

export function generateEgoCritiqueReframe(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  filterResult: AmbitionFilterResult,
  originalTarget: number,
  originalTimeline: number,
): string {
  const targetStr = `₹${originalTarget.toLocaleString('en-IN')}`;
  const timelineStr = `${originalTimeline} months`;
  const vcPct = (capability.trueCapabilityScore * 100).toFixed(0);
  const procrastinationPct = (matrix.psychometric.procrastinationScore * 100).toFixed(0);

  if (filterResult === 'structurally_misaligned') {
    return `You want ${targetStr} in ${timelineStr}. Let me show you what that actually requires.

To hit ${targetStr} in ${timelineStr}, assuming zero downtime and zero friction, you need to generate ₹${Math.floor(originalTarget / originalTimeline).toLocaleString('en-IN')}/month from day one.

Your current capability score is ${vcPct}%. Your procrastination signal is at ${procrastinationPct}%. The realistic monthly output for your profile right now is ₹${Math.floor(capability.trueCapabilityScore * 50000).toLocaleString('en-IN')}/month.

That is a gap of ${((originalTarget / originalTimeline) / (capability.trueCapabilityScore * 50000)).toFixed(1)}x.

I'm not saying this to crush you. I'm saying it because the gap is specific and bridgeable — just not in ${timelineStr}.

You have two choices:

[Path A] Lock this exact target and accept that you're running a top 0.1% execution path with a <3% probability of success. I'll give you the absolute maximum strategy for it — but I will not pretend it's likely.

[Path B] Lock a goal that makes you genuinely wealthy with a real probability of success. From there, your original target becomes Phase 3 of a compounding plan, not a Hail Mary.

Both options are available. No judgement. But choose with full information.`;
  }

  if (filterResult === 'exceptional_requires_assessment') {
    return `${targetStr} in ${timelineStr} is an exceptional goal. Here's the honest assessment.

This goal is in the top 1–5% of outcomes for people at your current capability level. That doesn't mean impossible. It means the margin for execution error is nearly zero.

Your procrastination signal (${procrastinationPct}%) and capability score (${vcPct}%) mean this path has roughly 3–8% probability for your specific profile.

Before you lock this, I need you to understand: this isn't about belief, it's about math. Three in every 100 people with your profile who pursue this goal will hit it. Ninety-seven won't.

Do you want to be in that 3% and accept what that demands? Or do you want to run a path where you have a 40–60% chance of outcomes that still change your life fundamentally?

Your call. But make it with your eyes open.`;
  }

  if (filterResult === 'aggressive_but_possible') {
    return `${targetStr} in ${timelineStr} is aggressive but within the range of what's possible for your profile.

This is not a warning — it's a calibration. Your capability score of ${vcPct}% means you can execute this, but your execution consistency needs to match the ambition. A goal this size does not forgive procrastination.

I'll build the strategy. But you need to know going in: this requires sustained execution without significant gaps. If you've struggled with consistency before, that pattern will determine this outcome more than the strategy itself.

Confirm you understand that — and we proceed.`;
  }

  // Realistic — no reframe needed, just confirm
  return `Your goal is within the realistic range for your current profile. The engine can build a full strategy around it.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: SOCIO-ECONOMIC REALISM GUARDRAIL
// Specific logic for less-privileged backgrounds.
// The engine never recommends paths that require communication skills or
// capital these users structurally don't have.
// ─────────────────────────────────────────────────────────────────────────────

export interface SocioEconomicGuardrailOutput {
  guardrailApplied: boolean;
  guardrailType: 'full' | 'partial' | 'none';
  redirectionMessage: string | null;
  recommendedStartingGoal: string | null;  // The "start here" goal before the big one
  bannedGenericAdvice: string[];
}

export function applySocioEconomicGuardrail(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  originalTarget: number,
): SocioEconomicGuardrailOutput {
  const isLowCapital = matrix.socioeconomic.liquidCapital < ENGINE_AXIOMS.LOW_CAPITAL_THRESHOLD_INR;
  const isLowComm = matrix.humanCapital.communicationScore < ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD;
  const isLesserPrivilegedGeo = ['tier3_semi_urban', 'rural'].includes(matrix.socioeconomic.geographyTier);

  if (isLowCapital && isLowComm && isLesserPrivilegedGeo) {
    const startingGoalAmount = Math.floor(capability.trueCapabilityScore * 50000 * 1.5);

    return {
      guardrailApplied: true,
      guardrailType: 'full',
      redirectionMessage: `Your goal is ₹${originalTarget.toLocaleString('en-IN')}. I hear you. And I'm going to take that target seriously.

But let me be straight with you about where you're starting. Your capital is ₹${matrix.socioeconomic.liquidCapital.toLocaleString('en-IN')}, your location is ${matrix.socioeconomic.geographyTier}, and your communication score from our interaction is ${(matrix.humanCapital.communicationScore * 100).toFixed(0)}%.

The generic advice — freelancing, dropshipping, content creation — has a 95%+ failure rate for your specific profile. I've blocked those from appearing in your recommendations. Not because you can't succeed. But because those paths require tools and resources you don't have right now.

Here's the real path: Lock ₹${startingGoalAmount.toLocaleString('en-IN')}/month as your Phase 1 target. That is your first real milestone. From there, your original goal becomes Phase 2. This is how actually privileged people got rich — they built a base first, then scaled it.`,
      recommendedStartingGoal: `₹${startingGoalAmount.toLocaleString('en-IN')}/month in 3 months via local high-demand, zero-capital services`,
      bannedGenericAdvice: ['dropshipping', 'generic freelancing', 'content creation agency', 'affiliate marketing cold start'],
    };
  }

  if (isLowCapital || (isLowComm && isLesserPrivilegedGeo)) {
    return {
      guardrailApplied: true,
      guardrailType: 'partial',
      redirectionMessage: `Your profile has some constraints that affect which paths are realistic. I've filtered out paths that require capital or communication skills above your current baseline. The recommendations you'll see are specifically chosen for your starting point.`,
      recommendedStartingGoal: null,
      bannedGenericAdvice: isLowCapital ? ['dropshipping', 'amazon fba', 'capital-intensive builds'] : ['international freelancing', 'remote client work'],
    };
  }

  return {
    guardrailApplied: false,
    guardrailType: 'none',
    redirectionMessage: null,
    recommendedStartingGoal: null,
    bannedGenericAdvice: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: MAIN LAYER 9 ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export function runAmbitionFilter(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): AmbitionAssessment {
  const { targetAmount, timelineMonths } = matrix.goalVector;
  const trueCapabilityScore = capability.trueCapabilityScore;

  // Step 1: Calculate ambition velocity
  const ambitionVelocity = calculateAmbitionVelocity(targetAmount, timelineMonths, trueCapabilityScore);

  // Step 2: Classify the filter result
  const filterResult = classifyAmbitionFilter(ambitionVelocity);
  const criticalThresholdExceeded = filterResult === 'structurally_misaligned' || filterResult === 'exceptional_requires_assessment';

  // Step 3: Generate realistic alternative (always, not just when triggered)
  const realisticAlternative = generateRealisticAlternative(matrix, capability, targetAmount, timelineMonths);

  // Step 4: Calculate honest probability of the declared goal
  // This uses the base path probability logic, heavily discounted for ambition delta
  const ambitionDeltaPenalty = Math.max(0, (ambitionVelocity - 1.0) * 0.15);
  const rawProbability = trueCapabilityScore * 0.40 * (1 - ambitionDeltaPenalty);
  const probabilityOfDeclaredGoal = Math.max(
    ENGINE_AXIOMS.MIN_PROBABILITY_FLOOR,
    Math.min(ENGINE_AXIOMS.MAX_PROBABILITY_CAP, rawProbability * 100)
  );

  // Step 5: Generate the ego reframe message
  const reframeMessage = generateEgoCritiqueReframe(
    matrix,
    capability,
    filterResult,
    targetAmount,
    timelineMonths,
  );

  return {
    ambitionVelocity,
    filterResult,
    criticalThresholdExceeded,
    realisticAlternativeGoal: realisticAlternative.description,
    realisticAlternativeAmount: realisticAlternative.amount,
    realisticAlternativeTimeline: realisticAlternative.timeline,
    probabilityOfDeclaredGoal,
    egoReframeRequired: criticalThresholdExceeded,
    reframeMessage,
    professionalAdviceRecommended: targetAmount > 1000000,
  };
}
