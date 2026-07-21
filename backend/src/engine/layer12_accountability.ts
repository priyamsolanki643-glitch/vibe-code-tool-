/**
 * FP-OS :: LAYER 12 — BEHAVIORAL ACCOUNTABILITY & EGO-CRITIQUE ENGINE
 *
 * The most psychologically sophisticated layer of FP-OS.
 *
 * When execution gaps occur, FP does NOT deploy generic motivational platitudes.
 * It initiates a root-cause forensic analysis sequence.
 *
 * This layer is the "reality-critique interface" — where the state machine
 * manages accountability tracking and analyzes execution errors.
 *
 * Core behaviors:
 * 1. Distinguish internal failure (procrastination, burnout) from external (infrastructure, market)
 * 2. Trigger ego-critique only for internal failures — external failures get tactical pivots
 * 3. Calculate the growth delta (what the user HAS achieved) to provide grounded assessment
 * 4. Never give a guarantee. Never give empty reassurance. Give calibrated honesty.
 */

import {
  ContextMatrix,
  FrictionProfile,
  StrategyState,
  FailureDiagnostic,
  FailureType,
  AccountabilityResponseType,
  DiagnosticChoice,
  ConsistencyEvent,
  ENGINE_AXIOMS,
  EgoLeveragePoint,
} from './types';
import { updateConsistencyScore } from './layer10_statelock';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: FAILURE TYPE CLASSIFIER
// Determines whether a failure is internal or external.
// This is the first branch in the forensic analysis tree.
// ─────────────────────────────────────────────────────────────────────────────

const INTERNAL_FAILURE_SIGNALS = [
  'procrastinated', 'procrastination', 'didn\'t start', 'couldn\'t start',
  'was distracted', 'distracted', 'scrolled', 'watched videos', 'netflix',
  'didn\'t feel like', 'wasn\'t motivated', 'laziness', 'lazy',
  'kept delaying', 'delayed', 'pushed it off', 'avoided',
  'spent time on', 'wasted time', 'lost track', 'forgot',
  'got bored', 'bored', 'overthought', 'in my head', 'overthinking',
  'burnout', 'burnt out', 'tired', 'exhausted', 'drained',
];

const EXTERNAL_FAILURE_SIGNALS = [
  'internet went', 'internet down', 'no internet', 'power cut', 'power outage',
  'device broke', 'phone died', 'laptop crashed', 'computer stopped',
  'family emergency', 'health emergency', 'hospital', 'sick', 'ill',
  'client cancelled', 'client backed out', 'client ghosted',
  'market changed', 'platform changed', 'platform shut down',
  'natural disaster', 'flood', 'no electricity', 'shop closed',
  'exam', 'unexpected commitment', 'forced to attend',
];

export function classifyFailureType(userExplanation: string): {
  failureType: FailureType;
  isInternal: boolean;
  confidence: number;
} {
  const explanationLower = userExplanation.toLowerCase();

  const internalMatchCount = INTERNAL_FAILURE_SIGNALS.filter((s) =>
    explanationLower.includes(s)
  ).length;

  const externalMatchCount = EXTERNAL_FAILURE_SIGNALS.filter((s) =>
    explanationLower.includes(s)
  ).length;

  if (externalMatchCount > internalMatchCount) {
    // Further classify external type
    const isInfrastructure = explanationLower.includes('internet') || explanationLower.includes('device')
      || explanationLower.includes('power') || explanationLower.includes('electricity');
    const isPersonalEmergency = explanationLower.includes('health') || explanationLower.includes('family')
      || explanationLower.includes('hospital') || explanationLower.includes('sick');

    return {
      failureType: isInfrastructure ? 'external_infrastructure'
        : isPersonalEmergency ? 'external_personal_emergency'
        : 'external_market',
      isInternal: false,
      confidence: Math.min(1.0, externalMatchCount / 3),
    };
  }

  if (internalMatchCount > 0) {
    const isBurnout = explanationLower.includes('burnout') || explanationLower.includes('burnt out')
      || explanationLower.includes('exhausted') || explanationLower.includes('drained');

    return {
      failureType: isBurnout ? 'internal_burnout' : 'internal_procrastination',
      isInternal: true,
      confidence: Math.min(1.0, internalMatchCount / 3),
    };
  }

  // Default to ambiguous when low confidence
  return {
    failureType: 'internal_procrastination', // Keep type for type-safety but flag it
    isInternal: true,
    confidence: 0.40, // Low confidence — ambiguous
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: EGO-CRITIQUE ENGINE
// Triggered only for internal failures.
// Uses the user's ego leverage point (identified in Layer 1) to
// apply precision psychological pressure — not generic motivation.
// ─────────────────────────────────────────────────────────────────────────────

export function generateEgoCritique(
  egoLeveragePoint: EgoLeveragePoint,
  failureType: FailureType,
  userFailureText: string,
  consistencyScore: number,
  dayNumber: number,
): string {
  const isBurnout = failureType === 'internal_burnout';

  if (isBurnout) {
    // Burnout gets a different response — it's real and requires tactical adjustment
    return `This is not procrastination — this is burnout. Those require different responses.

Burnout is your body/mind telling you the system is unsustainable. I take that seriously.

Here's the adjustment: Your task load is being recalibrated. The next 48 hours, you have ONE task per day, half the normal time allocation. This is not a reward — it is a recovery protocol to restore your execution capacity.

What I will not do: lower the goal. What I will adjust: the sprint intensity until your cognitive endurance recovers.

You've made it to day ${dayNumber}. Your consistency score is ${consistencyScore}/100. That represents real momentum. Do not interpret recovery as failure.`;
  }

  // Procrastination — ego-critique by leverage point
  const baseResponse = `Bhai, aaj tune apna task miss kiya hai. Let me be brutally honest with you.`;

  const leverageResponses: Record<EgoLeveragePoint, string> = {
    family: `${baseResponse}

Teri family mein koi hai jiski financial stability ya khushi iss baat pe depend karti hai ki tu aaj mehnat karega ya nahi. Har din jab tu procrastinate karta hai, tu actually unki expectations ka gala ghot raha hai. 

Main tujhe guilt trip nahi de raha, reality bata raha hoon. Tune khud bola tha ki tera motivation family hai. Phir Netflix ya phone scroll karna unse zyada important kaise ho gaya?

Tere paas abhi 2 choices hain:
[Choice A] Abhi phone rakh, aur agle 90 minute ek solid recovery sprint maar. Aaj ka target complete kar.
[Choice B] Khushfehmi mein reh ki sab apne aap theek ho jayega, and let them down.`,

    proving_someone_wrong: `${baseResponse}

Kisi ne tujhe bola tha na ki tu nahi kar payega? Aur aaj tune apne action se (ya inaction se) unko bilkul sahi saabit kar diya. 

Wo insaan abhi aaram se so raha hoga ya chill kar raha hoga, aur tu apna sapna barbaad kar raha hai. Inaction sirf tujhe aur tere sapno ko maar raha hai.

[Choice A] Agle 10 minute mein task shuru kar aur unko galat saabit karne ki aag wapas la.
[Choice B] Wahi reh jahan tu hai, aur ban ja ek average insaan jiske baare mein sab yahi kehte the.`,

    money: `${baseResponse}

Tune kaha tha tujhe paise kamane hain, financial freedom chahiye. Pata hai paise kamane ka sabse bada dushman kya hai? Ye aalas. Har ek task jo tu aaj chhod raha hai, wo literal paisa hai jo tu table pe chhod raha hai.

Teri procrastination ki bohot badi keemat hai bhai.

[Choice A] Abhi baith aur apna execution complete kar. Ye task abhi bhi khatam ho sakta hai.
[Choice B] Maan le ki tu sirf baatein karna jaanta hai, mehnat nahi. Din ko failed maan aur kal double mehnat karne ka jhootha wada kar.`,

    freedom: `${baseResponse}

Tujhe azaadi chahiye thi na? 9-to-5 ki ghulami ya restrictions se? Bhai, azaadi muft mein nahi milti. Uski keemat chukani padti hai daily execution ke form mein.

Jab tu aaj aalas kar raha hai, tu actually apni azaadi ko aur door dhakel raha hai. 

[Choice A] Agle 90 minute full focus ke saath kaam kar aur apni azaadi ki ek aur eent (brick) rakh.
[Choice B] Accept kar le ki tu discipline follow nahi kar sakta, aur tujhe hamesha kisi aur ke orders follow karne padenge.`,

    status: `${baseResponse}

Jin logo ki tu respect karta hai na, jo tere field ke top 1% hain, wo aisi tuchhi (petty) cheezo se distract nahi hote. Unka din chahe kaisa bhi ho, execution hota hai.

Tujhe status aur izzat chahiye toh kaam bhi waisa karna padega. Ek blank track record se izzat nahi milti.

[Choice A] Abhi task shuru kar. Track record build kar.
[Choice B] Wahi reh. Ek aur failed din apni life mein add kar le.`,

    impact: `${baseResponse}

Tune kaha tha tujhe impact create karna hai, duniya badalni hai, kisi badi problem ko solve karna hai. Lekin reality ye hai ki tu apna din control nahi kar paa raha. Duniya kya khak badlega?

Main tujhe judge nahi kar raha, tera mirror hoon main. Impact requires sustained, ruthless execution. 

[Choice A] Abhi apna task shuru kar aur gap ko close kar.
[Choice B] Accept kar ki aaj tu apne vision se door ho gaya hai.`,
  };

  return leverageResponses[egoLeveragePoint] ?? `${baseResponse}

You procrastinated. This is not a moral failure — it is an execution pattern that your strategy cannot absorb indefinitely.

Your consistency score is at ${consistencyScore}/100. If this pattern continues, your trajectory probability drops.

[Choice A] Execute your task in the next 90 minutes.
[Choice B] Declare the day failed and commit to full execution tomorrow.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: EXTERNAL FAILURE HANDLER
// External failures don't get ego-critique — they get tactical pivots.
// ─────────────────────────────────────────────────────────────────────────────

export function generateExternalFailureResponse(
  failureType: FailureType,
  userExplanation: string,
  strategyState: StrategyState,
): string {
  switch (failureType) {
    case 'external_infrastructure':
      return `Infrastructure failure logged. This is a real external constraint, not a personal execution failure.

Your consistency score is not penalized for genuine infrastructure events.

Immediate tactical adjustment:
1. Identify offline-executable tasks from your task list
2. Use this downtime to plan tomorrow's sprint in detail
3. If this infrastructure issue is recurring (not a one-off), flag it — we need to build infrastructure redundancy into your execution plan

What specifically failed and how long is it expected to affect you?`;

    case 'external_personal_emergency':
      return `Personal or family emergency logged. This is a legitimate interruption to normal execution.

Your trajectory is paused — not cancelled. Your consistency score is held at ${strategyState.consistencyScore} during the emergency period.

When you are ready to resume: Give me an update on your current status and we will recalibrate your task cadence from your re-entry day. No need to "catch up" on missed days — we rebuild from where you are.

Take care of what needs to be taken care of. The strategy will be here.`;

    case 'external_market':
      return `External market change logged. This requires a tactical assessment.

Your core trajectory may still be valid — market changes require a delta analysis, not an automatic pivot.

Tell me specifically: What changed? Platform policy? Local economic condition? A competitor? Client decision?

Based on that, I'll determine whether this requires:
[Option A] Minor tactical adjustment within your locked trajectory
[Option B] Re-simulation with updated market parameters (does NOT wipe consistency score)
[Option C] Full goal reset (only if the market change makes your target permanently inaccessible)`;

    default:
      return `External factor logged. Provide more specific details about what happened for me to generate an accurate tactical response.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: GROWTH DELTA CALCULATOR
// When a timeline fails or the user complains about not hitting the goal,
// the engine calculates what they HAVE achieved — quantitatively.
// This is not motivational padding — it's honest measurement.
// ─────────────────────────────────────────────────────────────────────────────

export interface GrowthDelta {
  day0ConsistencyScore: number;       // Where they started
  currentConsistencyScore: number;    // Where they are now
  consistencyGrowthPercent: number;
  tasksCompletedCount: number;
  tasksAttemptedCount: number;
  completionRate: number;
  cognitive_endurance_day0: number;   // Minutes
  cognitive_endurance_current: number;
  enduranceGrowthPercent: number;
  growthNarrative: string;
}

export function calculateGrowthDelta(
  day0ConsistencyScore: number,
  currentConsistencyScore: number,
  tasksCompletedCount: number,
  tasksAttemptedCount: number,
  cognitiveEnduranceDay0: number,
  cognitiveEnduranceCurrent: number,
): GrowthDelta {
  const consistencyGrowthPercent = day0ConsistencyScore > 0
    ? ((currentConsistencyScore - day0ConsistencyScore) / day0ConsistencyScore) * 100
    : currentConsistencyScore;

  const completionRate = tasksAttemptedCount > 0
    ? (tasksCompletedCount / tasksAttemptedCount) * 100
    : 0;

  const enduranceGrowthPercent = cognitiveEnduranceDay0 > 0
    ? ((cognitiveEnduranceCurrent - cognitiveEnduranceDay0) / cognitiveEnduranceDay0) * 100
    : 0;

  const growthNarrative = generateGrowthNarrative(
    consistencyGrowthPercent,
    completionRate,
    enduranceGrowthPercent,
    tasksCompletedCount,
    cognitiveEnduranceDay0,
    cognitiveEnduranceCurrent,
  );

  return {
    day0ConsistencyScore,
    currentConsistencyScore,
    consistencyGrowthPercent,
    tasksCompletedCount,
    tasksAttemptedCount,
    completionRate,
    cognitive_endurance_day0: cognitiveEnduranceDay0,
    cognitive_endurance_current: cognitiveEnduranceCurrent,
    enduranceGrowthPercent,
    growthNarrative,
  };
}

function generateGrowthNarrative(
  consistencyGrowth: number,
  completionRate: number,
  enduranceGrowth: number,
  tasksCompleted: number,
  enduranceStart: number,
  enduranceCurrent: number,
): string {
  let narrative = `The system has logged your trajectory data. Here's what the numbers actually say:\n\n`;

  if (enduranceGrowth > 50) {
    narrative += `At Day 0, your cognitive endurance was ${enduranceStart} minutes. Today it is ${enduranceCurrent} minutes. That is a ${enduranceGrowth.toFixed(0)}% improvement in your sustained focus capacity. This is not a small thing.\n\n`;
  }

  if (tasksCompleted > 0) {
    narrative += `You completed ${tasksCompleted} tasks over this period at a ${completionRate.toFixed(0)}% completion rate. Every single one of those was you choosing execution over avoidance.\n\n`;
  }

  narrative += `Success in high-yield domains is rarely linear. The people who eventually reach these targets are not the ones who succeeded on every attempt — they are the ones who attempted the most times.\n\n`;

  narrative += `The goal was not hit this cycle. That is a real result. The growth in your execution capacity is also a real result. Both are true simultaneously.\n\n`;

  narrative += `The engine is resetting to Target Loop 2 with your updated baseline metrics. Your capability score is higher than Day 0. Your procrastination patterns are better documented. Your next attempt has a higher probability than your first.`;

  return narrative;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: FULL FAILURE DIAGNOSTIC ORCHESTRATOR
// The main function that runs the full forensic analysis tree.
// ─────────────────────────────────────────────────────────────────────────────

export function runFailureDiagnostic(
  userExplanation: string,
  matrix: ContextMatrix,
  frictionProfile: FrictionProfile,
  strategyState: StrategyState,
  tasksCompletedCount: number,
  tasksAttemptedCount: number,
): FailureDiagnostic {
  // Step 1: Classify failure type
  const { failureType, isInternal, confidence } = classifyFailureType(userExplanation);

  // Step 2: Calculate consistency impact
  const consistencyUpdate = updateConsistencyScore(
    strategyState.consistencyScore,
    isInternal ? 'task_failed' : 'task_partial', // External failures are partial, not full failures
  );

  // Step 3: Generate appropriate response
  let fpResponse: string;
  let responseType: AccountabilityResponseType;

  if (isInternal) {
    if (confidence < 0.5) {
      fpResponse = `System logged a failure, but the root cause is unclear from your message. 

To calibrate correctly, I need precision. Was this failure due to an external blocker (e.g. infrastructure, emergency, technical error) or an internal execution gap (e.g. avoidance, distraction)? 

State the exact reason clearly.`;
      responseType = 'failure_forensic';
    } else {
      fpResponse = generateEgoCritique(
        matrix.psychometric.egoLeveragePoint,
        failureType,
        userExplanation,
        strategyState.consistencyScore,
        strategyState.currentDayNumber,
      );
      responseType = failureType === 'internal_burnout' ? 'failure_forensic' : 'ego_critique';
    }
  } else {
    fpResponse = generateExternalFailureResponse(failureType, userExplanation, strategyState);
    responseType = 'failure_forensic';
  }

  // Step 4: Build choice architecture
  const choices: DiagnosticChoice[] = buildDiagnosticChoices(isInternal, failureType);

  // Step 5: Build growth delta message (only for sustained failures, not single-task failures)
  const growthDeltaMessage = tasksAttemptedCount >= 5
    ? calculateGrowthDelta(
        100,
        strategyState.consistencyScore,
        tasksCompletedCount,
        tasksAttemptedCount,
        matrix.psychometric.cognitiveEnduranceMinutes,
        matrix.psychometric.cognitiveEnduranceMinutes * 1.5, // Estimated growth
      ).growthNarrative
    : null;

  return {
    failureType,
    isInternal,
    isExternal: !isInternal,
    consistencyScoreDelta: (isInternal && confidence >= 0.5) ? -ENGINE_AXIOMS.CONSISTENCY_FAILURE_PENALTY : 0,
    responseType,
    fpResponse,
    choices,
    growthDeltaMessage,
    wellnessCheckTriggered: false,
    wellnessReferral: null,
  };
}

function buildDiagnosticChoices(isInternal: boolean, failureType: FailureType): DiagnosticChoice[] {
  if (failureType === 'internal_procrastination') {
    return [
      {
        label: 'Run a recovery sprint NOW',
        action: 'recovery_sprint',
        consequence: 'Partial task completion logged. Consistency score stabilized. Day does not count as a full failure.',
      },
      {
        label: 'Accept today as a failed day and commit to tomorrow',
        action: 'failure_mode_acknowledged',
        consequence: `Consistency score decreases by ${ENGINE_AXIOMS.CONSISTENCY_FAILURE_PENALTY} points. Tomorrow's task sprint intensity remains unchanged.`,
      },
    ];
  }

  if (failureType === 'internal_burnout') {
    return [
      {
        label: 'Begin recovery protocol (reduced load for 48 hours)',
        action: 'recovery_sprint',
        consequence: 'Task load reduced by 50% for 48 hours. This is tactical, not a reward.',
      },
      {
        label: 'Continue at full load (high risk of deeper burnout)',
        action: 'ego_accepted_comeback',
        consequence: 'Full sprint continues. Monitor closely for compounding burnout.',
      },
    ];
  }

  // External failures
  return [
    {
      label: 'Log the external event and reschedule the task',
      action: 'recovery_sprint',
      consequence: 'Task rescheduled. Consistency score not penalized for genuine external events.',
    },
    {
      label: 'Request tactical pivot assessment',
      action: 'structural_pivot_request',
      consequence: 'Engine evaluates whether the external event requires strategy adjustment.',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: DOPAMINE LOOP DETECTOR
// Detects when a user is seeking validation instead of executing.
// The most subtle and important behavioral pattern to catch.
// ─────────────────────────────────────────────────────────────────────────────

const DOPAMINE_LOOP_SIGNALS = [
  'what do you think', 'is this good', 'am i on track', 'do you think i can',
  'i\'ve been thinking about', 'i have this idea', 'what if i', 'should i pivot',
  'tell me about', 'explain more about', 'can you give me more', 'what\'s the best way',
  'i want to learn more', 'i\'ve been researching', 'i read that', 'i watched',
  'motivate me', 'i need motivation', 'inspire me', 'i\'m feeling',
];

const EXECUTION_SIGNALS = [
  'i completed', 'i finished', 'i submitted', 'i sent', 'i built', 'i created',
  'i launched', 'i contacted', 'i delivered', 'i published', 'here is the result',
  'done', 'completed', 'finished', 'submitted', 'sent it', 'delivered',
];

const CLARIFICATION_SIGNALS = [
  'how to', 'explain', 'debug', 'why did', 'why is', 'error', 'not working',
  'what does this mean', 'help me understand', 'clarify', 'i don\'t understand',
  'fix this', 'issue', 'bug', 'can we change', 'different path'
];

export function detectDopamineLoop(userMessage: string): {
  isDopamineLoop: boolean;
  isExecution: boolean;
  confidence: number;
  response: string | null;
} {
  const messageLower = userMessage.toLowerCase();

  const clarificationSignalCount = CLARIFICATION_SIGNALS.filter((s) =>
    messageLower.includes(s)
  ).length;

  if (clarificationSignalCount > 0) {
    return {
      isDopamineLoop: false,
      isExecution: false,
      confidence: 0,
      response: null,
    };
  }

  const dopamineSignalCount = DOPAMINE_LOOP_SIGNALS.filter((s) =>
    messageLower.includes(s)
  ).length;

  const executionSignalCount = EXECUTION_SIGNALS.filter((s) =>
    messageLower.includes(s)
  ).length;

  if (executionSignalCount > 0) {
    return {
      isDopamineLoop: false,
      isExecution: true,
      confidence: Math.min(1.0, executionSignalCount / 2),
      response: null, // Execution = proceed normally, log completion
    };
  }

  if (dopamineSignalCount > 1) { // Requires at least 2 signals or stronger match
    return {
      isDopamineLoop: true,
      isExecution: false,
      confidence: Math.min(1.0, dopamineSignalCount / 3),
      response: `Ek baat bataa, is sawal ko puchne se pehle:

Tune apna aaj ka assigned task complete kiya hai?

Agar haan — toh task completion log kar aur phir sawal puch. Main log ke baad jawab dunga.
Agar nahi — toh ye jo tu sawal puch rha hai, ye sirf productive procrastination hai. Tu dimaag chalane ka validation chahta hai bina actually execute kiye.

Mujhse baatein karne se tera goal complete nahi hoga. Mera kaam tujhe motivate karna nahi, tujhse kaam karwana hai.

Task completion status kya hai: [yes/no]?`,
    };
  }

  return {
    isDopamineLoop: false,
    isExecution: false,
    confidence: 0,
    response: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: REALITY CHECKER RESPONSES
// FP's signature "are you seeking dopamine or results?" challenge.
// Used when user shows consistent gap between stated goals and behavior.
// ─────────────────────────────────────────────────────────────────────────────

export function generateRealityCheck(
  consecutiveFailureCount: number,
  consistencyScore: number,
  egoLeveragePoint: EgoLeveragePoint,
): string {
  if (consecutiveFailureCount >= 3 && consistencyScore < 50) {
    return `Bhai, ab ek seedhi aur sachhi baat karte hain.

Tere continuous ${consecutiveFailureCount} failures ho chuke hain aur tera consistency score sirf ${consistencyScore}/100 bacha hai.

Mujhe saaf-saaf bataa: Tujhe sach me ye goal achieve karna hai, ya bas "kuch bada kar rha hun" waale zone me reh kar maza lena hai?

Dono me bohot bada farq hota hai.

Planning karna, strategy padhna, mujhse sawal puchna — ye sab karne me maza aata hai kyuki bina mehnat ke lagta hai ki hum aage badh rhe hain. Ye dopamine loop hai. Comfortable hai, safe hai, aur isse guarantee hai ki tera zero kaam hoga.

Goal achieve tab hoga jab tu wo boring aur uncomfortable kaam karega jo tere saamne rakha hai. Har roz, chahe tera mood ho ya na ho.

Abhi tu kya choose kar rha hai? Awaiting your clear response:

[A] Mujhe goal achieve karna hai. Abhi se full execution start.
[B] Abhi mere se nahi ho raha. Mujhe trajectory bina reset kiye pause karni hai.
[C] Mujhe reset karna hai. Main koi aisa goal select karunga jiske liye main elite sacrifice ke liye ready hun.`;
  }

  if (consecutiveFailureCount >= 2) {
    return `Back-to-back 2 din failure. Pattern shuru ho rha hai tera.

Tere kaam rokne se strategy nahi rukti, bas progress rukti hai.

Kal ka task aur aaj ka task same rahega. Ye isliye nahi ki maine check nahi kiya, balki isliye ki jo kaam karna tha wo abhi bhi bacha hua hai.

Agle 2 ghante me tu kaunsa ek specific action lega? Mujhe bataye bina start kar.`;
  }

  return `Ek gap ho gaya tera. System ne note kar liya hai.

Recovery simple hai: aaj ka task execute kar, chahe partial hi sahi. Zero se behtar partial execution hai.

Agle 90 minutes me tera kya plan hai? Muh band kar aur execution start kar.`;
}
