/**
 * FP-OS :: MASTER ENGINE ORCHESTRATOR
 *
 * This is the entry point for all FP reasoning.
 * It sequences and exposes the upgraded specialized domain engines:
 * 1. Diagnostic Engine (Mode 1)
 * 2. Tactical Architect (Mode 2)
 * 3. Execution Operator (Mode 3)
 */

import {
  runCircumstantialDiagnosis,
  DiagnosticInput,
  DiagnosticOutput,
} from './diagnostic';

import {
  runTacticalArchitect,
  ArchitectInput,
  ArchitectOutput,
} from './architect';

import {
  processOperatorTaskUpdate,
  processOperatorCritique,
  TaskUpdateInput,
} from './operator';

import {
  assembleFinalPathPresentation,
} from './layer8_paths';

import {
  runAmbitionFilter,
  applySocioEconomicGuardrail,
} from './layer9_ambition';

import {
  createInitialStrategyState,
  lockStrategy,
  validateUnlockRequest,
  updateConsistencyScore,
} from './layer10_statelock';

import {
  generateDailyTaskSprint,
  checkMilestoneGate,
} from './layer11_execution';

import {
  runFailureDiagnostic,
} from './layer12_accountability';

import {
  buildFullSystemPrompt,
  FPStage,
} from './systemPrompt';

import {
  runLegalAudit,
} from './layer13_legalaudit';

import {
  UserRuntime,
  ContextMatrix,
  CapabilityVector,
  FrictionProfile,
  StrategyState,
  TrajectoryPath,
  ConsistencyEvent,
  GeographyTier,
  DeviceTier,
  InternetStability,
  WorkEnvironment,
  EgoLeveragePoint,
  WorkStylePreference,
  TaskSprint,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD COMPATIBLE API ENVELOPE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingInput extends DiagnosticInput {
  detectedFrictionSignalIds: string[];
}

export interface SimulationOutput {
  userRuntime: UserRuntime;
  pathPresentation: ReturnType<typeof assembleFinalPathPresentation>;
  ambitionAssessment: ReturnType<typeof runAmbitionFilter>;
  socioEconomicGuardrail: ReturnType<typeof applySocioEconomicGuardrail>;
  survivalModeResponse: any | null;
  systemPrompt: string;
}

export interface UnlockRequestInput {
  userId: string;
  userRuntime: UserRuntime;
  reason: string;
  evidence?: string;
}

export interface CritiqueInput {
  userId: string;
  userRuntime: UserRuntime;
  userMessage: string;
  tasksCompletedToDate: number;
  tasksAttemptedToDate: number;
  consecutiveFailureCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE ENTRY 1: PROCESS ONBOARDING (Backwards Compatible Wrapper)
// Runs Mode 1 (Diagnostic) and Mode 2 (Tactical Architect) in sequence.
// ─────────────────────────────────────────────────────────────────────────────

export async function processOnboarding(input: OnboardingInput, userLanguage: string = 'Hinglish'): Promise<SimulationOutput> {
  // 1. Run Diagnostic Engine
  const diagnostic = runCircumstantialDiagnosis(input);

  // 2. Run Tactical Architect
  const architect = await runTacticalArchitect({
    contextMatrix: diagnostic.contextMatrix,
    capabilityVector: diagnostic.capabilityVector,
    survivabilityAudit: diagnostic.survivabilityAudit,
    frictionProfile: diagnostic.frictionProfile,
  });

  // 3. Assemble UserRuntime
  const initialState = createInitialStrategyState();
  initialState.status = 'awaiting_selection';

  const paths = [
    ...(architect.pathPresentation.pathAlpha ? [architect.pathPresentation.pathAlpha] : []),
    architect.pathPresentation.pathBeta,
  ];

  const allOutputText = paths.map(p => `${p.label} ${p.description} ${p.milestones.map(m => m.target).join(' ')}`).join(' ');

  const legalAuditReport = runLegalAudit(
    diagnostic.contextMatrix,
    paths,
    architect.ambitionAssessment,
    0,
    100,
    allOutputText
  );

  const userRuntime: UserRuntime = {
    contextMatrix: diagnostic.contextMatrix,
    capabilityVector: diagnostic.capabilityVector,
    survivabilityAudit: diagnostic.survivabilityAudit,
    intelligenceBrief: architect.intelligenceBrief,
    intelligenceReport: architect.intelligenceReport,
    opportunityProfile: architect.opportunityProfile,
    frictionProfile: diagnostic.frictionProfile,
    ambitionAssessment: architect.ambitionAssessment,
    skillGapAnalysis: null,
    availablePaths: paths,
    strategyState: initialState,
    currentTaskSprint: null,
    consistencyHistory: [],
    legalAuditReport,
  };

  return {
    userRuntime,
    pathPresentation: architect.pathPresentation,
    ambitionAssessment: architect.ambitionAssessment,
    socioEconomicGuardrail: architect.socioEconomicGuardrail,
    survivalModeResponse: diagnostic.survivabilityAudit.runwayBand === 'red' ? diagnostic.survivabilityAudit : null,
    systemPrompt: buildFullSystemPrompt('simulation', userRuntime, userLanguage),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE ENTRY 2: LOCK TRAJECTORY
// ─────────────────────────────────────────────────────────────────────────────

export async function transitionToExecution(
  runtime: UserRuntime,
  lockedPathId: string,
  userLanguage: string = 'Hinglish'
): Promise<{ updatedRuntime: UserRuntime; systemPrompt: string; day1TaskSprint: TaskSprint }> {
  const selectedPath = runtime.availablePaths.find(p => p.pathId === lockedPathId);
  if (!selectedPath) {
    throw new Error(`Path '${lockedPathId}' is not available in this runtime.`);
  }

  const lockedState = lockStrategy(runtime.strategyState, selectedPath);

  // Generate Day 1 Sprint
  const day1Sprint = await generateDailyTaskSprint(
    1,
    runtime.contextMatrix,
    runtime.capabilityVector,
    runtime.frictionProfile,
    lockedState
  );

  if (!day1Sprint) {
    throw new Error('Critical Engine Error: Failed to generate Day 1 task sprint.');
  }

  const taskOutputText = day1Sprint ? day1Sprint.tasks.map(t => `${t.title}: ${t.description}`).join(' ') : '';
  const legalAuditReport = runLegalAudit(
    runtime.contextMatrix,
    runtime.availablePaths,
    runtime.ambitionAssessment,
    0,
    lockedState.consistencyScore,
    taskOutputText
  );

  const updatedRuntime: UserRuntime = {
    ...runtime,
    strategyState: lockedState,
    currentTaskSprint: day1Sprint,
    legalAuditReport,
  };

  return {
    updatedRuntime,
    systemPrompt: buildFullSystemPrompt('execution', updatedRuntime, userLanguage),
    day1TaskSprint: day1Sprint,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE ENTRY 3: PROCESS TASK UPDATE (Execution Operator wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export async function processTaskUpdate(
  input: TaskUpdateInput,
  matrix: ContextMatrix,
  capabilityVector: CapabilityVector,
  frictionProfile: FrictionProfile,
  userLanguage: string = 'Hinglish'
): Promise<{
  updatedRuntime: UserRuntime;
  consistencyEvent: ConsistencyEvent;
  failureDiagnostic: ReturnType<typeof runFailureDiagnostic> | null;
  nextDayTaskSprint: TaskSprint | null;
  milestoneGateResult: ReturnType<typeof checkMilestoneGate> | null;
  systemPrompt: string;
}> {
  const result = await processOperatorTaskUpdate(input, matrix, capabilityVector, frictionProfile);
  return {
    updatedRuntime: result.updatedRuntime,
    consistencyEvent: result.consistencyEvent,
    failureDiagnostic: result.failureDiagnostic,
    nextDayTaskSprint: result.nextDayTaskSprint,
    milestoneGateResult: result.milestoneGateResult,
    systemPrompt: buildFullSystemPrompt(result.updatedRuntime.strategyState.status === 'locked' ? 'execution' : 'simulation', result.updatedRuntime, userLanguage),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE ENTRY 4: PROCESS CRITIQUE MESSAGE (Critique wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export function processCritiqueMessage(input: CritiqueInput, userLanguage: string = 'Hinglish'): {
  responseType: string;
  engineResponse: string | null;
  systemPrompt: string;
  consistencyDelta: number;
  dopamineLoopDetected: boolean;
} {
  return processOperatorCritique({
    userId: input.userId,
    userRuntime: input.userRuntime,
    userMessage: input.userMessage,
    tasksCompletedToDate: input.tasksCompletedToDate,
    tasksAttemptedToDate: input.tasksAttemptedToDate,
    consecutiveFailureCount: input.consecutiveFailureCount,
    userLanguage
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE ENTRY 5: PROCESS UNLOCK REQUEST
// ─────────────────────────────────────────────────────────────────────────────

export function processUnlockRequest(input: UnlockRequestInput, userLanguage: string = 'Hinglish'): {
  updatedRuntime: UserRuntime;
  validationResult: ReturnType<typeof validateUnlockRequest>;
  systemPrompt: string;
} {
  const validationResult = validateUnlockRequest(
    { reason: input.reason, evidence: input.evidence, requestedAt: new Date().toISOString() },
    input.userRuntime.strategyState,
  );

  let updatedState = input.userRuntime.strategyState;

  if (validationResult.approved) {
    updatedState = {
      ...updatedState,
      status: validationResult.nextState,
      consistencyScore: Math.max(0, updatedState.consistencyScore - (validationResult.consistencyPenalty ?? 0)),
      unlockGranted: true,
      unlockReason: validationResult.unlockReason,
      lastUnlockRequest: new Date().toISOString(),
    };
  }

  const updatedRuntime: UserRuntime = {
    ...input.userRuntime,
    strategyState: updatedState,
  };

  const stage: FPStage = validationResult.approved && validationResult.nextState === 'reset'
    ? 'onboarding'
    : validationResult.approved && validationResult.nextState === 'simulating'
    ? 'simulation'
    : 'critique';

  return {
    updatedRuntime,
    validationResult,
    systemPrompt: buildFullSystemPrompt(stage, updatedRuntime, userLanguage),
  };
}

// ── EXPORTS FOR ENDPOINTS ───────────────────────────────────────────────────
export { runCircumstantialDiagnosis } from './diagnostic';
export { runTacticalArchitect } from './architect';
export { processOperatorTaskUpdate, processOperatorCritique } from './operator';

export {
  // Layer 1
  assessCommunicationScore,
  validateIntakeCompleteness,
} from './layer1_intake';

export { FRICTION_SIGNALS } from './layer6_friction';

export {
  // Layer 10
  VALID_STATE_TRANSITIONS,
  createInitialStrategyState,
} from './layer10_statelock';

export {
  // Layer 11
  describeWorkStyleArchitecture,
  TASK_LIBRARY,
  generateDailyTaskSprint,
} from './layer11_execution';

export {
  // Layer 12
  detectDopamineLoop,
  generateRealityCheck,
} from './layer12_accountability';

export {
  // System prompt
  buildFullSystemPrompt,
  FP_SPECIAL_RESPONSES,
  buildUserContextBlock,
} from './systemPrompt';

// Type exports
export type {
  UserRuntime,
  ContextMatrix,
  StrategyState,
  TrajectoryPath,
  ConsistencyEvent,
  TaskSprint,
} from './types';

export { ENGINE_AXIOMS } from './types';
