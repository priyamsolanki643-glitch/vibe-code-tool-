/**
 * FP-OS :: DIAGNOSTIC ENGINE (Mode 1 Core)
 *
 * Analyzes the user's material circumstances, logistical bounds,
 * and calibrates their true executable capability (V_c).
 * Zero psychological lecturing, zero blocking. Pure operational diagnostics.
 */

import {
  assembleContextMatrix,
  buildSocioeconomicCluster,
  parseSkillClaims,
  assessCommunicationScore,
  parseGoalVector,
  scoreProcrastination,
} from './layer1_intake';

import { runCapabilityVectoring } from './layer2_capability';
import { runSurvivabilityAudit } from './layer3_survivability';
import { runFrictionProfiling } from './layer6_friction';

import {
  ContextMatrix,
  CapabilityVector,
  FrictionProfile,
  UserRuntime,
  GeographyTier,
  DeviceTier,
  InternetStability,
  WorkEnvironment,
  WorkStylePreference,
  StrategyState,
} from './types';
import { createInitialStrategyState } from './layer10_statelock';

export interface DiagnosticInput {
  userId: string;
  geographyTier: GeographyTier;
  country: string;
  region: string;
  liquidCapital: number;
  monthlyBurnRate: number;
  hasDebt: boolean;
  debtMonthlyObligation: number;
  familyDependencyScore: number;
  rawSkillStrings: string[];
  hasVerifiableOutputMap: Record<string, boolean>;
  positiveCommSignals: string[];
  negativeCommSignals: string[];
  dailyUninterruptedHours: number;
  deviceTier: DeviceTier;
  internetStability: InternetStability;
  workEnvironment: WorkEnvironment;
  canWorkAtNight: boolean;
  hasDedicatedWorkspace: boolean;
  procrastinationSignals: {
    tookLongBetweenAnswers: boolean;
    setOptimisticDeadlines: boolean;
    gavelVagueGoalsNotSpecific: boolean;
    mentionedPastFailedAttempts: boolean;
    usedPassiveLanguage: boolean;
    conflatedPlanningWithExecution: boolean;
  };
  cognitiveEnduranceMinutes: number;
  emotionalResilience: number;
  baselineDiscipline: number;
  preferredWorkStyle: WorkStylePreference;
  riskTolerance: number;
  declaredGoal: string;
  targetAmount: number;
  currency: 'INR' | 'USD' | 'other';
  timelineMonths: number;
  sacrificesToleratedList: string[];
  nonNegotiables: string[];
  pathPreference: 'high_risk_upside' | 'safe_compounding' | 'undecided';
  onboardingText: string;
  detectedFrictionSignalIds: string[];
  age: number;
}

export interface DiagnosticOutput {
  contextMatrix: ContextMatrix;
  capabilityVector: CapabilityVector;
  survivabilityAudit: ReturnType<typeof runSurvivabilityAudit>;
  frictionProfile: FrictionProfile;
  circumstanceBrief: {
    runwayDays: number;
    runwayStatusBand: 'red' | 'yellow' | 'green';
    materialConstraintScore: number; // 0.0 (extreme constraints) to 1.0 (no constraints)
    infrastructureViability: string;
    learningRate: number;
  };
}

/**
 * Runs Mode 1: Material and Circumstantial Diagnostic.
 * Computes V_c and maps all constraint matrices.
 */
export function runCircumstantialDiagnosis(input: DiagnosticInput): DiagnosticOutput {
  // 1. Build Context Matrix
  const skills = parseSkillClaims(input.rawSkillStrings, input.hasVerifiableOutputMap);
  const communicationScore = assessCommunicationScore(input.positiveCommSignals, input.negativeCommSignals);
  const procrastinationScore = scoreProcrastination(input.procrastinationSignals);

  const socioeconomic = buildSocioeconomicCluster({
    geographyTier: input.geographyTier,
    country: input.country,
    region: input.region,
    liquidCapital: input.liquidCapital,
    monthlyBurnRate: input.monthlyBurnRate,
    hasDebt: input.hasDebt,
    debtMonthlyObligation: input.debtMonthlyObligation,
    familyDependencyScore: input.familyDependencyScore,
  });

  const humanCapital = {
    skills,
    communicationScore,
    technicalVelocity: skills.filter(s => s.category === 'technical').reduce((sum, s) => sum + s.verifiedLevel, 0) / Math.max(1, skills.filter(s => s.category === 'technical').length),
    learningRate: input.baselineDiscipline * 0.6 + (1 - procrastinationScore) * 0.4,
    networkQuality: 0.3,
    hasVerifiableWork: Object.values(input.hasVerifiableOutputMap).some(Boolean),
    languageRegister: 'english' as const,
  };

  const infrastructure = {
    dailyUninterruptedHours: input.dailyUninterruptedHours,
    deviceTier: input.deviceTier,
    internetStability: input.internetStability,
    workEnvironment: input.workEnvironment,
    canWorkAtNight: input.canWorkAtNight,
    hasDedicatedWorkspace: input.hasDedicatedWorkspace,
  };

  const psychometric = {
    procrastinationScore,
    cognitiveEnduranceMinutes: input.cognitiveEnduranceMinutes,
    emotionalResilience: input.emotionalResilience,
    baselineDiscipline: input.baselineDiscipline,
    egoLeveragePoint: 'freedom' as const, // Swapped out psychometric ego points
    preferredWorkStyle: input.preferredWorkStyle,
    riskTolerance: input.riskTolerance,
    ambitionIndex: 0,
    age: input.age,
    cognitiveDissonanceScore: 0,
    evolutionStage: 'surrender' as const,
  };

  const tempCapabilityEstimate = skills.reduce((sum, s) => sum + s.verifiedLevel, 0) / Math.max(1, skills.length);

  const goalVector = parseGoalVector({
    declaredGoal: input.declaredGoal,
    targetAmount: input.targetAmount,
    currency: input.currency,
    timelineMonths: input.timelineMonths,
    sacrificesToleratedList: input.sacrificesToleratedList,
    nonNegotiables: input.nonNegotiables,
    pathPreference: input.pathPreference,
    trueCapabilityScore: tempCapabilityEstimate,
  });

  const contextMatrix = assembleContextMatrix({
    userId: input.userId,
    socioeconomic,
    humanCapital,
    infrastructure,
    psychometric: { ...psychometric, ambitionIndex: (goalVector as any).ambitionVelocity || 0 },
    goalVector,
    onboardingText: input.onboardingText,
  });

  // 2. Compute Calibrated Capability
  const capabilityVector = runCapabilityVectoring(contextMatrix);

  // 3. Run Survivability Audit
  const survivabilityAudit = runSurvivabilityAudit(contextMatrix);

  // 4. Friction Profiling
  const frictionProfile = runFrictionProfiling(contextMatrix, input.detectedFrictionSignalIds);

  // 5. Calculate material constraints score
  // Low liquid capital, low-tier device, or poor internet drops this score
  let materialConstraintScore = 1.0;
  if (input.liquidCapital < 10000) materialConstraintScore -= 0.3;
  if (input.deviceTier === 'mobile_only' || input.deviceTier === 'low_tier') materialConstraintScore -= 0.3;
  if (input.internetStability === '2g_unstable' || input.internetStability === '4g_intermittent') materialConstraintScore -= 0.2;
  materialConstraintScore = Math.max(0.1, materialConstraintScore);

  let infrastructureViability = 'Optimal';
  if (materialConstraintScore < 0.5) {
    infrastructureViability = 'Highly Constrained (Device/Capital limitations will affect deep tech building. Suggesting low-barrier digital or local services)';
  } else if (materialConstraintScore < 0.8) {
    infrastructureViability = 'Moderate constraints (Stable for remote freelancing, SaaS deployment requires lean/Vibecoding methods)';
  }

  return {
    contextMatrix,
    capabilityVector,
    survivabilityAudit,
    frictionProfile,
    circumstanceBrief: {
      runwayDays: socioeconomic.runwayDays,
      runwayStatusBand: survivabilityAudit.runwayBand,
      materialConstraintScore,
      infrastructureViability,
      learningRate: humanCapital.learningRate,
    },
  };
}
