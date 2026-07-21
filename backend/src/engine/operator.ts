/**
 * FP-OS :: EXECUTION OPERATOR (Mode 3 Core)
 *
 * Manages daily task execution sprints, monitors streaks, handles failsafe re-routing,
 * injects upskilling blocks, and executes the self-correcting neural feedback loops.
 */

import { generateDailyTaskSprint, checkMilestoneGate } from './layer11_execution';
import { updateConsistencyScore, lockStrategy, validateUnlockRequest } from './layer10_statelock';
import { runFailureDiagnostic, detectDopamineLoop, generateRealityCheck } from './layer12_accountability';
import { runLegalAudit } from './layer13_legalaudit';
import { buildFullSystemPrompt } from './systemPrompt';

import {
  UserRuntime,
  ContextMatrix,
  CapabilityVector,
  FrictionProfile,
  StrategyState,
  ConsistencyEvent,
  TaskSprint,
} from './types';

export interface TaskUpdateInput {
  userId: string;
  userRuntime: UserRuntime;
  taskId: string;
  outcome: 'completed' | 'failed' | 'partial';
  failureExplanation?: string;
  reportedEarnings?: number;
}

export interface OperatorOutput {
  updatedRuntime: UserRuntime;
  consistencyEvent: ConsistencyEvent;
  failureDiagnostic: ReturnType<typeof runFailureDiagnostic> | null;
  nextDayTaskSprint: TaskSprint | null;
  milestoneGateResult: ReturnType<typeof checkMilestoneGate> | null;
  systemPrompt: string;
  recalibrationOccurred: boolean;
}

/**
 * Handles daily task outcomes, streaks, and runs self-correcting capability recalibrations.
 */
export async function processOperatorTaskUpdate(
  input: TaskUpdateInput,
  matrix: ContextMatrix,
  capabilityVector: CapabilityVector,
  frictionProfile: FrictionProfile,
  userLanguage: string = 'Hinglish'
): Promise<OperatorOutput> {
  const { userRuntime, outcome, failureExplanation, reportedEarnings } = input;
  const currentState = userRuntime.strategyState;

  // 1. Update consistency score
  const scoreEvent = outcome === 'completed' ? 'task_completed'
    : outcome === 'partial' ? 'task_partial'
    : 'task_failed';

  const { newScore, delta, message } = updateConsistencyScore(currentState.consistencyScore, scoreEvent);

  let newStreak = currentState.currentStreak || 0;
  let consecutiveFailures = currentState.consecutiveFailureCount || 0;

  if (outcome === 'completed') {
    newStreak += 1;
    consecutiveFailures = 0;
  } else if (outcome === 'failed') {
    newStreak = 0;
    consecutiveFailures += 1;
  }

  const consistencyEvent: ConsistencyEvent = {
    date: new Date().toISOString(),
    delta,
    reason: message,
    newScore,
    streak: newStreak,
  };

  const history = [...userRuntime.consistencyHistory, consistencyEvent];

  // 2. Failure diagnostics & Failsafe Re-routing
  let failureDiagnostic = null;
  if (outcome === 'failed' && failureExplanation) {
    failureDiagnostic = runFailureDiagnostic(
      failureExplanation,
      userRuntime.contextMatrix,
      userRuntime.frictionProfile,
      currentState,
      0,
      1,
    );
  }

  // 3. Recursive Neural Feedback: down-regulate capability V_c if failures build up
  let updatedCapability = { ...capabilityVector };
  let recalibrationOccurred = false;
  if (consecutiveFailures >= 2 && capabilityVector.trueCapabilityScore > 0.15) {
    // Reduce capability score by 15% dynamically due to execution failures
    const priorScore = capabilityVector.trueCapabilityScore;
    const newScoreValue = Math.max(0.1, capabilityVector.trueCapabilityScore * 0.85);
    updatedCapability = {
      ...capabilityVector,
      trueCapabilityScore: newScoreValue,
      selfReportingInflationFactor: capabilityVector.selfReportingInflationFactor + (priorScore - newScoreValue),
    };
    recalibrationOccurred = true;
  }

  // 4. Advance day counter
  const nextDayNumber = currentState.currentDayNumber + 1;
  const updatedState: StrategyState = {
    ...currentState,
    consistencyScore: newScore,
    currentDayNumber: nextDayNumber,
    currentStreak: newStreak,
    consecutiveFailureCount: consecutiveFailures,
  };

  // 5. Check milestone gate
  let milestoneGateResult = null;
  if (currentState.lockedPath && reportedEarnings !== undefined) {
    milestoneGateResult = checkMilestoneGate(
      currentState.currentDayNumber,
      currentState.lockedPath,
      reportedEarnings,
    );
  }

  // 6. Generate next day's task sprint
  let nextDayTaskSprint = null;
  if (nextDayNumber <= currentState.totalTargetDays) {
    nextDayTaskSprint = await generateDailyTaskSprint(
      nextDayNumber,
      matrix,
      updatedCapability, // Pass potentially recalibrated V_c
      frictionProfile,
      updatedState,
    );
  }

  // 7. Run Legal Safety Audit
  const taskOutputText = nextDayTaskSprint
    ? nextDayTaskSprint.tasks.map((t: any) => `${t.title}: ${t.description}`).join(' ')
    : '';

  const legalAuditReport = runLegalAudit(
    matrix,
    userRuntime.availablePaths,
    userRuntime.ambitionAssessment,
    consecutiveFailures,
    updatedState.consistencyScore,
    taskOutputText
  );

  const updatedRuntime: UserRuntime = {
    ...userRuntime,
    capabilityVector: updatedCapability,
    strategyState: updatedState,
    currentTaskSprint: nextDayTaskSprint,
    consistencyHistory: history,
    legalAuditReport,
  };

  return {
    updatedRuntime,
    consistencyEvent,
    failureDiagnostic,
    nextDayTaskSprint,
    milestoneGateResult,
    systemPrompt: buildFullSystemPrompt('execution', updatedRuntime, userLanguage),
    recalibrationOccurred,
  };
}

/**
 * Handles conversational critique interactions (e.g. dopamine checks, locks).
 */
export function processOperatorCritique(input: {
  userId: string;
  userRuntime: UserRuntime;
  userMessage: string;
  tasksCompletedToDate: number;
  tasksAttemptedToDate: number;
  consecutiveFailureCount: number;
  userLanguage?: string;
}): {
  responseType: string;
  engineResponse: string | null;
  systemPrompt: string;
  consistencyDelta: number;
  dopamineLoopDetected: boolean;
} {
  const { userRuntime, userMessage, consecutiveFailureCount, userLanguage = 'Hinglish' } = input;

  // 1. Dopamine loop interceptor
  const dopamineCheck = detectDopamineLoop(userMessage);
  if (dopamineCheck.isDopamineLoop && dopamineCheck.confidence > 0.5) {
    const customPrompt = `Dopamine seeking detected. Direct them back to task execution immediately. Do not lecture on morality. Reference task: "${userRuntime.currentTaskSprint?.tasks[0]?.title || 'Daily targets'}".`;
    return {
      responseType: 'dopamine_loop_interrupt',
      engineResponse: `Dopamine seeking detected. Theoretical discussions do not advance consistency. Reference current task: "${userRuntime.currentTaskSprint?.tasks[0]?.title || 'Daily sprint task'}". Log completion or execute.`,
      systemPrompt: buildFullSystemPrompt('critique', userRuntime, userLanguage),
      consistencyDelta: 0,
      dopamineLoopDetected: true,
    };
  }

  // 2. Check for State Lock enforcement
  const unlockValidation = validateUnlockRequest(
    { reason: userMessage, requestedAt: new Date().toISOString() },
    userRuntime.strategyState,
  );

  if (!unlockValidation.approved && userRuntime.strategyState.isLocked) {
    const looksLikeUnlockAttempt = userMessage.toLowerCase().includes('want to change')
      || userMessage.toLowerCase().includes('different path')
      || userMessage.toLowerCase().includes('not working')
      || userMessage.toLowerCase().includes('try something else');

    if (looksLikeUnlockAttempt) {
      return {
        responseType: 'state_lock_enforcement',
        engineResponse: `Strategy change request rejected. Strategy remains locked. If you have encountered a genuine external blocker (technical error, dependency failure), please provide the specific error or data. Otherwise, continue execution.`,
        systemPrompt: buildFullSystemPrompt('critique', userRuntime, userLanguage),
        consistencyDelta: 0,
        dopamineLoopDetected: false,
      };
    }
  }

  // 3. Reality check for sustained failure patterns
  if (consecutiveFailureCount >= 3) {
    const realityCheck = generateRealityCheck(
      consecutiveFailureCount,
      userRuntime.strategyState.consistencyScore,
      userRuntime.contextMatrix.psychometric.egoLeveragePoint || 'freedom',
    );
    return {
      responseType: 'reality_check',
      engineResponse: realityCheck,
      systemPrompt: buildFullSystemPrompt('critique', userRuntime, userLanguage),
      consistencyDelta: 0,
      dopamineLoopDetected: false,
    };
  }

  // 4. Default: Let LLM generate response using specialized system prompt
  return {
    responseType: 'ai_generated',
    engineResponse: null,
    systemPrompt: buildFullSystemPrompt('critique', userRuntime, userLanguage),
    consistencyDelta: 0,
    dopamineLoopDetected: false,
  };
}
