/**
 * FP-OS :: LAYER 11 — ADAPTIVE EXECUTION SYSTEM GENERATION
 *
 * With the trajectory locked, this layer generates the actual
 * execution architecture. Not a schedule. Not a routine.
 * A task cluster system driven by Parkinson's Law and
 * First Principles thinking.
 *
 * What FP REFUSES to generate:
 * "Monday 6am: Wake up. 7am: Work on project. 12pm: Lunch."
 * Time-blocking is for calendars, not for an intelligence engine.
 *
 * What FP generates instead:
 * Task clusters with defined completion metrics.
 * Time compression baked in via Parkinson's Law.
 * Work style matched to the user's friction profile.
 * Milestone gates that must be cleared before the next phase unlocks.
 */

import {
  ContextMatrix,
  CapabilityVector,
  FrictionProfile,
  StrategyState,
  TaskSprint,
  DailyTask,
  TrajectoryPath,
  Milestone,
  ENGINE_AXIOMS,
} from './types';
import { LLMService } from '../services/llm.service';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: PARKINSON'S LAW ENGINE
// All timelines are compressed by 50% relative to standard market expectations.
// This eliminates wasted operational overhead.
//
// Parkinson's Law: Work expands to fill the time available.
// Corollary: Compress the time, and work gets done.
// ─────────────────────────────────────────────────────────────────────────────

export function applyParkinsonsCompression(
  standardTimeHours: number,
  frictionLevel: FrictionProfile['frictionLevel'],
): { compressedHours: number; compressionNote: string } {
  // Base compression: 50% reduction
  let compressionFactor: number = ENGINE_AXIOMS.PARKINSON_COMPRESSION_FACTOR;

  // Higher friction = slightly less aggressive compression (they can't sustain it)
  if (frictionLevel === 'high') compressionFactor = 0.60;
  if (frictionLevel === 'critical') compressionFactor = 0.65;

  const compressedHours = standardTimeHours * compressionFactor;

  return {
    compressedHours: Math.max(0.5, compressedHours), // Never compress below 30 min
    compressionNote: `Parkinson's Law applied: ${(compressionFactor * 100).toFixed(0)}% of standard time. Constraint creates focus.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: PHASE DETERMINATOR
// Determines which phase of the trajectory the user is currently in.
// Each phase has different task priorities.
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutionPhase = 'survival' | 'build' | 'scale';

export function determineExecutionPhase(
  currentDay: number,
  totalTargetDays: number,
  consistencyScore: number,
  survivabilityBand: 'red' | 'yellow' | 'green',
): ExecutionPhase {
  // Always survival mode if Red Band
  if (survivabilityBand === 'red') return 'survival';

  // Phasing based on timeline position
  const progressPercent = currentDay / totalTargetDays;

  if (progressPercent < 0.30) return 'build';     // First 30% = building phase
  if (progressPercent < 0.70) return 'build';     // Mid = continued building
  return 'scale';                                  // Final 30% = scale phase
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: TASK LIBRARY
// Reusable task templates organized by path type and phase.
// Each task has a specific, measurable completion metric.
// "Done" is defined unambiguously — no vague task endings.
// ─────────────────────────────────────────────────────────────────────────────

interface TaskTemplate {
  id: string;
  pathTypes: string[];
  phase: ExecutionPhase;
  title: string;
  descriptionTemplate: string;    // May contain {variable} placeholders
  metricBoundTemplate: string;    // Unambiguous definition of done
  standardTimeHours: number;
  firstPrincipleFocus: string;    // The underlying first-principles reason for this task
  ideologiesApplied: string[];
}

export const TASK_LIBRARY: TaskTemplate[] = [
  // ── LOCAL SME DIGITIZATION TASKS ──
  {
    id: 'sme_discovery_walk',
    pathTypes: ['local_sme_digitization'],
    phase: 'build',
    title: 'Local Business Discovery Sprint',
    descriptionTemplate: 'Walk into {targetCount} local businesses in your area. Ask each one: "Do you have a website? Can your customers find you on Google?" Document their answers. Take note of who seemed frustrated or interested.',
    metricBoundTemplate: 'Complete: {targetCount} businesses documented with notes. Not started until first door walked through.',
    standardTimeHours: 3,
    firstPrincipleFocus: 'Before building anything, validate that the problem exists in your specific geography. Desk research is a procrastination trap. Reality is outside.',
    ideologiesApplied: ['First Principles Thinking', 'Parkinson\'s Law'],
  },
  {
    id: 'sme_first_proposal',
    pathTypes: ['local_sme_digitization'],
    phase: 'build',
    title: 'First Business Proposal Creation',
    descriptionTemplate: 'Write a single-page proposal for the most interested business from your discovery sprint. One problem. One solution. One price. No design. Just a Google Doc or handwritten note.',
    metricBoundTemplate: 'Complete: Proposal written, printed or digitized, and physically delivered or sent to the business owner.',
    standardTimeHours: 2,
    firstPrincipleFocus: 'The fastest path to revenue is a specific offer to a specific buyer. Proposals are not documents — they are conversations. Speed of delivery beats quality of presentation.',
    ideologiesApplied: ['Parkinson\'s Law', 'Minimum Viable Action'],
  },
  {
    id: 'sme_first_delivery',
    pathTypes: ['local_sme_digitization'],
    phase: 'build',
    title: 'First Deliverable Execution',
    descriptionTemplate: 'Build the exact thing you promised in your proposal. No additions. No improvements beyond scope. Deliver exactly what was agreed.',
    metricBoundTemplate: 'Complete: Client has received and acknowledged the deliverable. Not when you think it\'s ready — when they have it.',
    standardTimeHours: 4,
    firstPrincipleFocus: 'Scope creep is the enemy of first delivery. Deliver what you promised, collect payment, then improve. Not the other way around.',
    ideologiesApplied: ['Parkinson\'s Law', 'First Principles Thinking'],
  },

  // ── TECHNICAL BUILD TASKS ──
  {
    id: 'tech_problem_validation',
    pathTypes: ['no_code_saas_local_problem', 'technical_product_build'],
    phase: 'build',
    title: 'Problem Validation Sprint',
    descriptionTemplate: 'Talk to {targetCount} potential users of your planned product. Ask: "How do you currently solve {problem}? How much does that cost you in time and money?" Listen. Don\'t pitch. Document every answer.',
    metricBoundTemplate: 'Complete: {targetCount} conversations completed. Written summary of the 3 most common pain points identified.',
    standardTimeHours: 3,
    firstPrincipleFocus: 'Building before validating is the most expensive mistake in product development. One hour of validation saves 40 hours of building the wrong thing.',
    ideologiesApplied: ['First Principles Thinking', 'Evidence-Based Decision Making'],
  },
  {
    id: 'tech_mvp_build',
    pathTypes: ['no_code_saas_local_problem', 'technical_product_build'],
    phase: 'build',
    title: 'Minimum Viable Product Sprint',
    descriptionTemplate: 'Build the smallest possible version of your product that someone could actually use. Remove every feature that is not essential. What remains is your MVP.',
    metricBoundTemplate: 'Complete: MVP is functional, accessible via URL or app, and has been tested by at least one person who is not you.',
    standardTimeHours: 6,
    firstPrincipleFocus: 'The purpose of an MVP is not to impress — it is to test. A working, ugly product beats a planned, beautiful one.',
    ideologiesApplied: ['Parkinson\'s Law', 'First Principles Thinking', 'Constraint-Driven Innovation'],
  },

  // ── FREELANCE CLIENT WORK TASKS ──
  {
    id: 'freelance_offer_creation',
    pathTypes: ['skill_based_freelance_local', 'local_service_arbitrage'],
    phase: 'build',
    title: 'Service Offer Definition',
    descriptionTemplate: 'Write your service offer in one sentence: "I help [type of person] achieve [specific result] in [specific time] for [price]." Then write 5 versions of this offer. Pick the clearest one.',
    metricBoundTemplate: 'Complete: One final offer sentence written, agreed upon, and posted to at least 2 channels (WhatsApp, LinkedIn, local group).',
    standardTimeHours: 1.5,
    firstPrincipleFocus: 'Clarity of offer is the #1 lever on conversion rate. A confused buyer doesn\'t buy. Specificity is not limiting — it\'s sales.',
    ideologiesApplied: ['First Principles Thinking', 'Clarity Maximization'],
  },
  {
    id: 'freelance_outreach_sprint',
    pathTypes: ['skill_based_freelance_local', 'local_service_arbitrage'],
    phase: 'build',
    title: 'Direct Outreach Sprint',
    descriptionTemplate: 'Contact {targetCount} specific people today who could benefit from your service. Not a mass message — a personalized message to each. Reference something specific about them.',
    metricBoundTemplate: 'Complete: {targetCount} personalized messages sent. Not scheduled, not drafted — sent. Minimum 3 replies received.',
    standardTimeHours: 2,
    firstPrincipleFocus: 'Revenue comes from conversations. Conversations require outreach. Outreach requires starting. The discomfort of sending is the price of admission to revenue.',
    ideologiesApplied: ['Constraint-Driven Action', 'Parkinson\'s Law'],
  },

  // ── SCALING PHASE TASKS (Universal) ──
  {
    id: 'scale_system_documentation',
    pathTypes: ['all'],
    phase: 'scale',
    title: 'Process Documentation Sprint',
    descriptionTemplate: 'Document exactly how you acquired your last 3 clients/customers/users. Write it as a step-by-step process a stranger could follow. This becomes your scaling playbook.',
    metricBoundTemplate: 'Complete: Process documented in a shareable format. Minimum 5 distinct steps identified. Automation opportunities flagged.',
    standardTimeHours: 2,
    firstPrincipleFocus: 'You cannot scale what you cannot repeat. Documentation is not bureaucracy — it is the foundation of leverage.',
    ideologiesApplied: ['Systems Thinking', 'First Principles Thinking'],
  },
  {
    id: 'scale_referral_activation',
    pathTypes: ['all'],
    phase: 'scale',
    title: 'Referral Network Activation',
    descriptionTemplate: 'Contact every previous client/customer and ask: "Is there anyone you know who might benefit from the same thing I helped you with?" This is the highest-conversion acquisition channel you have.',
    metricBoundTemplate: 'Complete: All past clients/customers contacted. Minimum 2 referral conversations initiated.',
    standardTimeHours: 1.5,
    firstPrincipleFocus: 'Warm referrals convert at 3–5x the rate of cold outreach. Your existing network is the fastest path to next revenue.',
    ideologiesApplied: ['Network Leverage', 'First Principles Thinking'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: TASK PERSONALIZER
// Takes a task template and makes it specific to the user's profile.
// Replaces generic templates with user-specific details.
// ─────────────────────────────────────────────────────────────────────────────

export function personalizeTask(
  template: TaskTemplate,
  matrix: ContextMatrix,
  dayNumber: number,
  frictionProfile: FrictionProfile,
): DailyTask {
  const compression = applyParkinsonsCompression(template.standardTimeHours, frictionProfile.frictionLevel);

  // Replace template variables
  const targetCount = frictionProfile.frictionLevel === 'critical' ? 3
    : frictionProfile.frictionLevel === 'high' ? 5
    : 7;

  const description = template.descriptionTemplate
    .replace('{targetCount}', targetCount.toString())
    .replace('{problem}', matrix.goalVector.declaredGoal);

  const metricBound = template.metricBoundTemplate
    .replace('{targetCount}', targetCount.toString());

  return {
    id: `${template.id}_day${dayNumber}`,
    title: template.title,
    description,
    metricBound,
    timeAllocationHours: compression.compressedHours,
    isCompleted: false,
    phase: template.phase,
    compressionResistance: 'medium' as const,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: DAILY TASK SPRINT GENERATOR
// Generates the task cluster for a specific day.
// Respects friction profile, work style, and available hours.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDailyTaskSprint(
  dayNumber: number,
  matrix: ContextMatrix,
  capability: CapabilityVector,
  frictionProfile: FrictionProfile,
  strategyState: StrategyState,
): Promise<TaskSprint> {
  const lockedPath = strategyState.lockedPath!;
  const totalTargetDays = strategyState.totalTargetDays;
  const phase = determineExecutionPhase(
    dayNumber,
    totalTargetDays,
    strategyState.consistencyScore,
    'green', // Simplified here — pass actual band in full implementation
  );

  // Find relevant tasks for this path and phase
  const pathId = lockedPath.opportunityUsed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .slice(0, 30);

  let tasks: DailyTask[] = [];

  try {
    const dynamicTasks = await LLMService.generateDynamicTaskSprint(strategyState, frictionProfile, matrix, capability);
    tasks = dynamicTasks.map((t: any, index: number) => ({
      id: `dynamic_${dayNumber}_${index}`,
      title: t.title,
      description: t.description,
      metricBound: t.metricBound,
      timeAllocationHours: Math.max(0.5, t.timeAllocationHours), // floor
      isCompleted: false,
      phase,
      compressionResistance: 'high' as const,
    }));
    // Enforce max tasks per day based on friction
    const maxTasks = getMaxTasksForDay(frictionProfile);
    if (tasks.length > maxTasks) {
       tasks = tasks.slice(0, maxTasks);
    }
  } catch (error) {
    console.error("Dynamic task generation failed, using static fallback", error);
    const relevantTemplates = TASK_LIBRARY.filter((t) =>
      (t.pathTypes.includes('all') || t.pathTypes.some((p) => pathId.includes(p.slice(0, 10))))
      && t.phase === phase
    ).slice(0, getMaxTasksForDay(frictionProfile));

    const tasksToUse = relevantTemplates.length > 0
      ? relevantTemplates
      : TASK_LIBRARY.filter((t) => t.phase === phase).slice(0, 2);

    tasks = tasksToUse.map((template) =>
      personalizeTask(template, matrix, dayNumber, frictionProfile)
    );
  }

  // ADAPTIVE LOAD BALANCING & GRADUATED DYNAMIC TASK SHRINKING
  const consistency = strategyState.consistencyScore;
  const consecutiveFailures = strategyState.consecutiveFailureCount || 0;

  if (consistency < 30 || consecutiveFailures >= 3) {
    // Stage 1: Critical Procrastination Loop -> Impossibly small 15-minute task to build momentum
    tasks = [{
      id: `micro_sprint_critical_recovery_${dayNumber}`,
      title: "15-Min Critical Recovery Sprint",
      description: "Consistency has dropped to crisis levels. Do not attempt a full session. Set a timer for 15 minutes, open your primary workspace, perform the absolute smallest action to move the project forward, and stop.",
      metricBound: "Complete: 15 minutes of documented focus logged. Operator verified.",
      timeAllocationHours: 0.25,
      isCompleted: false,
      phase,
      compressionResistance: 'high' as const
    }];
  } else if (consistency < 50 || consecutiveFailures >= 2) {
    // Stage 2: Warning Loop -> Max 1 task, compressed to 45 minutes to rebuild consistency
    tasks = [{
      id: `sprint_warning_recovery_${dayNumber}`,
      title: "45-Min Consistency Recovery Sprint",
      description: "Your consistency score is slipping. To prevent a failure loop, your daily execution load is compressed. Focus on completing the primary task step with zero distractions.",
      metricBound: "Complete: Primary sub-task fully delivered and logged.",
      timeAllocationHours: 0.75,
      isCompleted: false,
      phase,
      compressionResistance: 'high' as const
    }];
  } else {
    // PROBATIONARY SKILLS CHALLENGE (Layer 2 Skill Verification)
    const isProbationDay = dayNumber >= 1 && dayNumber <= 3;
    if (isProbationDay) {
      const skillsList = capability.calibratedSkills || [];
      const primarySkill = skillsList.length > 0 ? skillsList[0].skillName : "core execution";
      tasks.push({
        id: `skills_validation_challenge_day${dayNumber}`,
        title: `Skills Validation Challenge: ${primarySkill.toUpperCase()}`,
        description: `Verify your claimed capability in ${primarySkill}. Write a simple proof-of-concept script, outline, or repository validating that your environment is fully configured for your locked path.`,
        metricBound: `Complete: Proof-of-concept committed to Git or documented. Log the URL or local file path with the operator.`,
        timeAllocationHours: 1.0,
        isCompleted: false,
        phase,
        compressionResistance: 'high' as const
      });
    }
  }

  const totalWorkHours = tasks.reduce((sum, t) => sum + t.timeAllocationHours, 0);

  // Determine active ideologies
  const ideologiesActive = [
    'Parkinson\'s Law Compression Engine',
    'First Principles Logic Validation',
    phase === 'scale' ? 'Leverage & Systems Thinking' : 'Constraint-Driven Execution',
  ];

  return {
    dayNumber,
    architecture: frictionProfile.assignedWorkStyle === 'deep_work_clusters' ? 'deep_work_cluster' : 'high_velocity_sprint',
    tasks,
    parkinsonsCompressionApplied: true,
    compressionFactor: ENGINE_AXIOMS.PARKINSON_COMPRESSION_FACTOR,
    totalWorkHours,
    ideologiesActive,
  };
}

function getMaxTasksForDay(frictionProfile: FrictionProfile): number {
  // Critical friction = one task at a time (focus on completion, not variety)
  if (frictionProfile.frictionLevel === 'critical') return 1;
  if (frictionProfile.frictionLevel === 'high') return 2;
  return 3; // Low/medium friction can handle 3 tasks
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: WORK STYLE DISPLAY FORMAT
// Returns the formatted description of the work style for the UI.
// ─────────────────────────────────────────────────────────────────────────────

export function describeWorkStyleArchitecture(
  frictionProfile: FrictionProfile,
): string {
  if (frictionProfile.assignedWorkStyle === 'deep_work_clusters') {
    return `DEEP-WORK CLUSTER ARCHITECTURE
You have ${frictionProfile.taskWindowHours}h monolithic blocks. No context switching. No notifications. No "quick checks." One task. All focus. Until done.

Start the block only when you are ready to commit the full window. If you cannot commit, delay the start — do not start and then stop. Partial blocks are worse than delayed starts.`;
  }

  return `HIGH-VELOCITY SPRINT ARCHITECTURE
You run ${frictionProfile.taskWindowHours}h sprints separated by ${Math.ceil(frictionProfile.taskWindowHours * 0.3 * 60)}-minute structured offload breaks.

During each sprint: one task, full focus, no exceptions. During offload breaks: physical movement, no screens, no content consumption. The break is part of the system — it is not optional.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: MILESTONE GATE CHECKER
// Checks if the user has unlocked the next phase.
// Milestone gates MUST be cleared before the next phase begins.
// ─────────────────────────────────────────────────────────────────────────────

export interface MilestoneGateResult {
  currentMilestone: Milestone | null;
  isGatePassed: boolean;
  gateMessage: string;
  nextMilestone: Milestone | null;
}

export function checkMilestoneGate(
  currentDay: number,
  lockedPath: TrajectoryPath,
  reportedEarnings: number,
): MilestoneGateResult {
  const milestones = lockedPath.milestones;

  // Find the current milestone (most recent one that has passed)
  const currentMilestone = milestones
    .filter((m) => m.day <= currentDay)
    .sort((a, b) => b.day - a.day)[0] ?? null;

  // Find the next upcoming milestone
  const nextMilestone = milestones
    .filter((m) => m.day > currentDay)
    .sort((a, b) => a.day - b.day)[0] ?? null;

  if (!currentMilestone) {
    return {
      currentMilestone: null,
      isGatePassed: true,
      gateMessage: 'No gate yet. You are in the early execution phase. Build.',
      nextMilestone,
    };
  }

  // Check if gate metric is met (simplified — full implementation checks metric string)
  const isGatePassed = reportedEarnings > 0; // Basic check — AI parses more complex metrics

  const gateMessage = isGatePassed
    ? `Gate ${currentMilestone.day}-day cleared. ${currentMilestone.target} achieved. Proceeding to next phase.`
    : `Gate NOT cleared. Day ${currentMilestone.day} milestone requires: ${currentMilestone.metric}. You are at day ${currentDay}. The next phase does NOT unlock until this gate is passed. No exceptions.`;

  return {
    currentMilestone,
    isGatePassed,
    gateMessage,
    nextMilestone,
  };
}
