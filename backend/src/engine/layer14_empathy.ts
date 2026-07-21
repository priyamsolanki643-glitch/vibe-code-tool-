/**
 * FP-OS :: LAYER 14 — EMOTIONAL RESONANCE ENGINE
 *
 * THE EMPATHY LAYER. THE REASON IT NEVER FEELS LIKE A BOT.
 *
 * This layer sits between the cold mathematical output of Layers 1–13 and the
 * moment Gemini generates a response. Its job: compute a TONE VECTOR — a
 * precise, mathematically derived emotional instruction set — so that Gemini
 * knows EXACTLY how to deliver the truth without shattering the student.
 *
 * WHY THIS IS NOT "SCRIPTED EMPATHY" (The Critical Distinction):
 * Old bots: if (sad) → say "I understand your feelings." [Robotic. Dead. Users see through it.]
 * This engine: Analyzes 7 real behavioral signals → computes a continuous
 * ToneVector (warmth: 0.73, urgency: 0.41) → feeds to Gemini → Gemini
 * generates a UNIQUE, NEVER-REPEATED empathetic response every single time.
 *
 * THE MATH BEHIND EMPATHY:
 * Human empathy is not binary. It is a multi-dimensional state. A great mentor
 * calibrates:
 *   - How hard to push vs how much to hold space (Warmth ↔ Urgency)
 *   - Whether to validate first or confront first (HopeSignal ↔ ToughLoveRatio)
 *   - What PRIMARY tone to adopt (Peer / Mentor / Accountability / Crisis)
 *
 * These four dimensions, computed mathematically from real student data,
 * eliminate the possibility of a "cold calculator" response.
 *
 * LEGAL / CLINICAL SAFETY NOTE:
 * If the engine detects clinical-level distress (resilience < 0.2 AND
 * consecutive failures ≥ 5 AND explicit distress signal), it immediately
 * activates CRISIS_SUPPORT mode — which mandates that Gemini provide
 * mental health resources (iCall, Vandrevala). This is non-negotiable.
 */

import {
  ContextMatrix,
  FrictionProfile,
  StrategyState,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: TONE VECTOR (The Output Shape)
// Gemini reads this instead of the raw context matrix.
// It is the distilled emotional intelligence of the engine.
// ─────────────────────────────────────────────────────────────────────────────

export interface ToneVector {
  /**
   * Warmth (0.0 → 1.0)
   * 0.0 = Drill sergeant. Zero softness. Pure execution demands.
   * 0.5 = Tough love. Honest but kind.
   * 1.0 = Full empathy mode. Student is in crisis. Hold space first.
   *
   * Driven by: Emotional Resilience, Consecutive Failures, Burnout Risk
   */
  warmth: number;

  /**
   * Urgency (0.0 → 1.0)
   * 0.0 = Relaxed. Student is ahead of schedule. Celebrate and plan.
   * 0.5 = Standard daily execution push.
   * 1.0 = Red alert. Runway < 30 days OR milestone gate missed.
   *
   * Driven by: Runway Days, Days Behind Milestone, Consistency Score
   */
  urgency: number;

  /**
   * Tough Love Ratio (0.0 → 1.0)
   * 0.0 = Pure validation. "Tu kar lega bhai." (Used only in crisis, sparingly)
   * 0.5 = Balanced. Acknowledge the struggle, then push forward.
   * 1.0 = Hard confrontation. "Yaar, aaj kal bakwaas chal raha hai. Real baat karte hain."
   *
   * Driven by: Consecutive Failures, Dopamine Loop Signals, Procrastination Score
   */
  toughLoveRatio: number;

  /**
   * Hope Signal (0.0 → 1.0)
   * 0.0 = Pure reality check. No sugar coating. State the raw probability.
   * 0.5 = Balanced honesty with forward momentum.
   * 1.0 = Maximum motivation injection. Student needs to believe it's possible.
   *
   * Driven by: Consistency Score Trend (rising vs falling), Milestones Recently Hit
   */
  hopeSignal: number;

  /**
   * Primary Tone Mode — The override that controls Gemini's fundamental register.
   * 'peer'                  → Casual older brother. Hinglish, relaxed, relatable.
   * 'mentor'                → Strategic advisor. Clear, insightful, directional.
   * 'accountability_partner'→ Execution warden. Measurable, specific, no excuses.
   * 'crisis_support'        → Safe space. No pressure. Just presence. Refers to help.
   */
  primaryTone: 'peer' | 'mentor' | 'accountability_partner' | 'crisis_support';

  /**
   * The computed reason behind the tone (for system prompt injection).
   * Gemini reads this to understand WHY it should behave this way.
   */
  toneRationale: string;

  /**
   * Crisis flag — if true, Gemini MUST include mental health resources.
   * This flag is non-negotiable and overrides all other instructions.
   */
  isCrisisMode: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: BEHAVIORAL INPUT SIGNALS
// The raw data that Layer 14 consumes to compute the tone vector.
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpathyInput {
  // From StrategyState
  consistencyScore: number;              // 0–100
  consecutiveFailureCount: number;       // How many tasks failed in a row
  consecutiveCompletionCount: number;    // Positive streak momentum
  currentDayNumber: number;
  totalTargetDays: number;

  // From ContextMatrix
  emotionalResilience: number;           // 0.0–1.0 (psychometric)
  procrastinationScore: number;          // 0.0–1.0 (higher = more friction)
  runwayDays: number;                    // Financial runway remaining
  egoLeveragePoint: string;

  // From FrictionProfile
  frictionCoefficient: number;           // 0.0–1.0

  // From conversation analysis (detected by LLM parser before engine runs)
  detectedEmotionalSignals: EmotionalSignal[];

  // Milestone context
  daysSinceLastMilestone: number;
  milestonesHitTotal: number;
  
  // New Sentience Metrics
  ambitionIndex: number;
  daysActive: number; // Days since onboarding
}

export type EmotionalSignal =
  | 'explicit_burnout'         // "I'm exhausted", "I can't do this"
  | 'self_doubt'               // "Maybe I'm not meant for this"
  | 'anger_frustration'        // "This is stupid", "Why isn't this working"
  | 'hopeful_momentum'         // "I think I'm getting it"
  | 'explicit_celebration'     // "I did it!", "Achievement unlocked"
  | 'avoidance_behavior'       // Short messages, delayed replies
  | 'explicit_distress'        // "I want to give up", "I feel hopeless"
  | 'dopamine_loop_detected'   // Asking for motivation instead of executing
  | 'cognitive_dissonance';    // Flagged when ambition is high but action is zero

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2.5: SENTIENCE UPGRADE CALCULATORS (Cognitive Dissonance & Evolution)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * COGNITIVE DISSONANCE CALCULATOR (The Bullshit Detector)
 * Compares Ambition against Execution Consistency.
 * Grace Period: Returns 0 if user is active for less than 3 days.
 */
export function calculateCognitiveDissonance(
  ambitionIndex: number, 
  consistencyScore: number, 
  daysActive: number
): number {
  if (daysActive < 3) return 0; // The Grace Period Fix

  // Normalize ambition index (usually 0.5 to 8.0) to a 0-100 scale for comparison
  const normalizedAmbition = Math.min(100, Math.max(0, (ambitionIndex / 4.0) * 100));
  
  // If ambition is way higher than consistency, we have cognitive dissonance
  const gap = normalizedAmbition - consistencyScore;
  
  return gap > 0 ? gap : 0;
}

/**
 * MENTAL EVOLUTION STAGE CALCULATOR
 * Determines the psychological phase of the user.
 */
export function calculateEvolutionStage(
  dissonanceScore: number,
  consistencyScore: number,
  daysActive: number
): 'delusion' | 'resistance' | 'surrender' | 'momentum' {
  if (daysActive < 3) return 'surrender'; // Default learning phase for new users

  if (dissonanceScore > 50 && consistencyScore < 30) return 'delusion';
  if (consistencyScore >= 30 && consistencyScore < 60) return 'resistance';
  if (consistencyScore >= 60 && consistencyScore < 80) return 'surrender'; // Listening to the system
  return 'momentum'; // Consistency > 80
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: COMPONENT CALCULATORS
// Each dimension of the ToneVector is computed independently.
// This isolation means each calculation can be audited, tested, and tuned
// without affecting the others. Mathematical purity.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WARMTH CALCULATOR
 * High warmth when student is fragile. Low warmth when they are coasting.
 *
 * Formula: Base from resilience + failure penalty + crisis bonus
 * Range: [0.05, 0.98] — never 0 (we are never cold) never 1 (we never lose standards)
 */
function calculateWarmth(input: EmpathyInput): number {
  // Base: inversely proportional to resilience (low resilience = more warmth needed)
  let warmth = 0.3 + (1 - input.emotionalResilience) * 0.25;

  // Consecutive failure amplifier — each failure adds warmth
  const failureBoost = Math.min(0.30, input.consecutiveFailureCount * 0.08);
  warmth += failureBoost;

  // Explicit emotional signals — hardcoded boosts for human signal detection
  if (input.detectedEmotionalSignals.includes('explicit_burnout')) warmth += 0.20;
  if (input.detectedEmotionalSignals.includes('self_doubt')) warmth += 0.15;
  if (input.detectedEmotionalSignals.includes('explicit_distress')) warmth += 0.30;

  // Reduce warmth when student is on a winning streak (they need a push, not comfort)
  if (input.consecutiveCompletionCount >= 3) warmth -= 0.10;
  if (input.consecutiveCompletionCount >= 7) warmth -= 0.05;

  return Math.max(0.05, Math.min(0.98, warmth));
}

/**
 * URGENCY CALCULATOR
 * High urgency when runway is short or milestones are being missed.
 *
 * Formula: Base from timeline position + runway penalty + consistency penalty
 */
function calculateUrgency(input: EmpathyInput): number {
  // Timeline position: how far through the journey are they?
  const timelineProgress = input.currentDayNumber / Math.max(1, input.totalTargetDays);

  // Base urgency from timeline — urgency naturally increases as deadline approaches
  let urgency = 0.2 + timelineProgress * 0.25;

  // Runway urgency — financial pressure is a major urgency driver
  if (input.runwayDays < 30)  urgency += 0.35;
  else if (input.runwayDays < 60)  urgency += 0.20;
  else if (input.runwayDays < 90)  urgency += 0.10;

  // Consistency collapse — low score + high friction = high urgency
  if (input.consistencyScore < 30) urgency += 0.25;
  else if (input.consistencyScore < 50) urgency += 0.10;

  // Extended stagnation — no milestone hit in too long
  if (input.daysSinceLastMilestone > 21) urgency += 0.15;
  else if (input.daysSinceLastMilestone > 14) urgency += 0.08;

  // Dampen urgency in crisis mode — you can't urgency-push someone in distress
  if (input.detectedEmotionalSignals.includes('explicit_distress')) urgency *= 0.4;
  if (input.detectedEmotionalSignals.includes('explicit_burnout')) urgency *= 0.6;

  return Math.max(0.05, Math.min(0.95, urgency));
}

/**
 * TOUGH LOVE RATIO CALCULATOR
 * The balance between validation and confrontation.
 * High when student is procrastinating or in a dopamine loop.
 * Low when student is genuinely struggling (not just avoiding).
 */
function calculateToughLoveRatio(input: EmpathyInput): number {
  // Base from procrastination score
  let ratio = input.procrastinationScore * 0.45;

  // Friction amplifier
  ratio += input.frictionCoefficient * 0.20;

  // Dopamine loop is the #1 trigger for hard confrontation
  if (input.detectedEmotionalSignals.includes('dopamine_loop_detected')) ratio += 0.30;

  // Avoidance behavior is passive procrastination — needs confrontation
  if (input.detectedEmotionalSignals.includes('avoidance_behavior')) ratio += 0.15;

  // Reduce confrontation when the student is genuinely struggling
  if (input.detectedEmotionalSignals.includes('explicit_distress')) ratio -= 0.40;
  if (input.detectedEmotionalSignals.includes('explicit_burnout')) ratio -= 0.30;
  if (input.detectedEmotionalSignals.includes('anger_frustration')) ratio -= 0.15;

  // Cap: never full confrontation (0.85 max) — always some warmth
  return Math.max(0.0, Math.min(0.85, ratio));
}

/**
 * HOPE SIGNAL CALCULATOR
 * The injection of possibility. High when student needs to believe.
 * Calibrated so we never lie, but we never crush hope unnecessarily.
 */
function calculateHopeSignal(input: EmpathyInput): number {
  // Base: inversely related to current crisis depth
  let hope = 0.5;

  // Rising consistency trend = genuine hope
  if (input.consecutiveCompletionCount >= 5) hope += 0.25;
  else if (input.consecutiveCompletionCount >= 2) hope += 0.12;

  // Self-doubt explicitly detected = inject more hope
  if (input.detectedEmotionalSignals.includes('self_doubt')) hope += 0.20;

  // Active celebration = amplify the win
  if (input.detectedEmotionalSignals.includes('explicit_celebration')) hope += 0.30;

  // Multiple consecutive failures = tone down hope, inject reality
  if (input.consecutiveFailureCount >= 3) hope -= 0.20;
  if (input.consecutiveFailureCount >= 5) hope -= 0.15;

  // Recent milestone hit = earned hope signal
  if (input.daysSinceLastMilestone <= 3) hope += 0.15;

  // Hard cap: hope > 0.95 is false promise territory
  return Math.max(0.10, Math.min(0.95, hope));
}

/**
 * PRIMARY TONE MODE SELECTOR
 * The master override. Four modes. One active at a time.
 * This is the most important single decision the empathy engine makes.
 */
function selectPrimaryTone(
  input: EmpathyInput,
  warmth: number,
  urgency: number,
  toughLoveRatio: number,
): ToneVector['primaryTone'] {
  // CRISIS_SUPPORT — Highest priority. Non-negotiable.
  const isClinicallyDistressed =
    input.detectedEmotionalSignals.includes('explicit_distress') &&
    input.emotionalResilience < 0.25 &&
    input.consecutiveFailureCount >= 4;

  if (isClinicallyDistressed || input.detectedEmotionalSignals.includes('explicit_distress')) {
    return 'crisis_support';
  }

  // ACCOUNTABILITY_PARTNER — When student is clearly avoiding/looping
  if (
    input.detectedEmotionalSignals.includes('dopamine_loop_detected') ||
    (toughLoveRatio > 0.55 && urgency > 0.55)
  ) {
    return 'accountability_partner';
  }

  // MENTOR — High-stakes strategic moments (path decisions, milestone gates)
  if (input.milestonesHitTotal === 0 || input.daysSinceLastMilestone > 14) {
    return 'mentor';
  }

  // PEER — Default. The day-to-day "bhai" mode. Most common.
  return 'peer';
}

/**
 * TONE RATIONALE BUILDER
 * Generates the human-readable explanation for WHY this tone was chosen.
 * Gemini injects this into its reasoning so its response feels intentional,
 * not random. This is the "meta-context" that separates a genius response
 * from a generic one.
 */
function buildToneRationale(
  input: EmpathyInput,
  tone: ToneVector['primaryTone'],
  warmth: number,
  urgency: number,
): string {
  const parts: string[] = [];

  if (tone === 'crisis_support') {
    parts.push(`Student shows explicit distress signals. Full empathy mode. No execution pressure. Refer to iCall (9152987821) if signals persist.`);
  } else if (tone === 'accountability_partner') {
    parts.push(`Dopamine loop or avoidance pattern detected. Student does not need validation — they need a precise, measurable action to break the loop.`);
  } else if (tone === 'mentor') {
    parts.push(`Student is at a strategic inflection point. They need clarity and direction, not just motivation.`);
  } else {
    parts.push(`Standard peer interaction. Daily execution mode. Keep it human, keep it real.`);
  }

  if (input.consecutiveFailureCount >= 3) {
    parts.push(`${input.consecutiveFailureCount} consecutive task failures detected. Acknowledge the pattern explicitly but without shaming.`);
  }
  if (input.runwayDays < 45) {
    parts.push(`Financial runway critically low (${input.runwayDays} days). Real urgency — treat every day as high-stakes.`);
  }
  if (input.consistencyScore > 75) {
    parts.push(`Consistency score strong (${input.consistencyScore}/100). Celebrate the momentum before pushing forward.`);
  }

  // Sentience Upgrade Injections
  const dissonance = calculateCognitiveDissonance(input.ambitionIndex, input.consistencyScore, input.daysActive);
  const evolution = calculateEvolutionStage(dissonance, input.consistencyScore, input.daysActive);

  if (dissonance > 40) {
    parts.push(`COGNITIVE DISSONANCE DETECTED (Score: ${dissonance.toFixed(0)}/100). The student's ambition is massive, but their execution is zero. Confront this contradiction directly.`);
  }

  parts.push(`EVOLUTION STAGE: ${evolution.toUpperCase()}. Adapt your tone to this stage of their psychological journey.`);

  return parts.join(' | ');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: MASTER TONE VECTOR CALCULATOR
// The single exported function. Takes raw data, returns ToneVector.
// This is what the OmniPipeline calls.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the complete ToneVector for a given student moment.
 *
 * This is a PURE FUNCTION. Same inputs → same output. Always.
 * No randomness. No hidden state. Fully deterministic and testable.
 */
export function computeToneVector(input: EmpathyInput): ToneVector {
  const warmth = calculateWarmth(input);
  const urgency = calculateUrgency(input);
  const toughLoveRatio = calculateToughLoveRatio(input);
  const hopeSignal = calculateHopeSignal(input);
  const primaryTone = selectPrimaryTone(input, warmth, urgency, toughLoveRatio);
  const toneRationale = buildToneRationale(input, primaryTone, warmth, urgency);

  // Crisis mode is a strict boolean — NOT a gradient
  const isCrisisMode = primaryTone === 'crisis_support';

  return {
    warmth: Math.round(warmth * 1000) / 1000,         // 3 decimal precision
    urgency: Math.round(urgency * 1000) / 1000,
    toughLoveRatio: Math.round(toughLoveRatio * 1000) / 1000,
    hopeSignal: Math.round(hopeSignal * 1000) / 1000,
    primaryTone,
    toneRationale,
    isCrisisMode,
  };
}

/**
 * UTILITY: Converts ToneVector into a Gemini-ready instruction string.
 * This goes DIRECTLY into the Gemini prompt as the emotional directive.
 * It replaces the old "Tough Love + High Empathy" hardcoded text in systemPrompt.ts
 * with a dynamically computed, mathematically accurate behavioral directive.
 */
export function toneVectorToPromptDirective(tv: ToneVector): string {
  if (tv.isCrisisMode) {
    return `CRITICAL: Student is in emotional distress or burnout. Switch to caring older brother mode. No execution pressure. Validate their feelings. Say "Aaj ka din off tha. Koi na yaar, machine thodi hain hum. Aaj proper rest le." Be warm (${(tv.warmth * 100).toFixed(0)}% warmth). If they mention hopelessness, provide iCall helpline: 9152987821. Vandrevala Foundation: 1860-2662-345.`;
  }

  const toneDescriptions: Record<ToneVector['primaryTone'], string> = {
    peer: `You are the student's trusted older brother. Casual, warm but strict on execution (${(tv.warmth * 100).toFixed(0)}% warmth), Hinglish. Jump straight into the conversation.`,
    mentor: `You are an elite, PW-style mentor (like Alakh Pandey). Measured, insightful, directional. Warmth: ${(tv.warmth * 100).toFixed(0)}%. Give clarity first, then the action.`,
    accountability_partner: `You are a PW-style execution warden. Brutally honest. Warmth: ${(tv.warmth * 100).toFixed(0)}%. Call out the avoidance pattern directly: "Aise selection nahi hoga." Give ONE specific, measurable action. End with a commitment question.`,
    crisis_support: `CRISIS MODE — see above.`,
  };

  return [
    toneDescriptions[tv.primaryTone],
    `Urgency level: ${(tv.urgency * 100).toFixed(0)}% (${tv.urgency > 0.7 ? 'HIGH — treat every day as high-stakes' : tv.urgency > 0.4 ? 'MODERATE — maintain daily momentum' : 'LOW — student is ahead, celebrate then plan'}).`,
    `Tough love ratio: ${(tv.toughLoveRatio * 100).toFixed(0)}% (${tv.toughLoveRatio > 0.6 ? 'Lead with hard truth' : tv.toughLoveRatio > 0.3 ? 'Balance truth with encouragement' : 'Lead with validation first'}).`,
    `Hope signal: ${(tv.hopeSignal * 100).toFixed(0)}% (${tv.hopeSignal > 0.7 ? 'Inject belief — make them feel it is possible' : 'State reality honestly, then show the path forward'}).`,
    `Context: ${tv.toneRationale}`,
  ].join('\n');
}
