/**
 * FP-OS :: TACTICAL ARCHITECT (Mode 2 Core)
 *
 * Runs opportunity mappings, local market gap analyses, stochastic
 * path simulations, and checks user commitment for extreme goals.
 */

import { runIntelligenceMatrix } from './layer0_intelligence';
import { runTrajectorySimulation } from './layer4_simulation';
import { runOpportunityMapping } from './layer5_opportunities';
import { runFrictionProfiling } from './layer6_friction';
import { comparePathProbabilities, ProbabilityInputVector } from './layer7_probability';
import { assembleFinalPathPresentation } from './layer8_paths';
import { runAmbitionFilter, applySocioEconomicGuardrail, SocioEconomicGuardrailOutput } from './layer9_ambition';

import {
  ContextMatrix,
  CapabilityVector,
  FrictionProfile,
  UserRuntime,
  TrajectoryPath,
  OpportunityProfile,
  AmbitionAssessment,
  ENGINE_AXIOMS,
} from './types';
import { createInitialStrategyState } from './layer10_statelock';

export interface ArchitectInput {
  contextMatrix: ContextMatrix;
  capabilityVector: CapabilityVector;
  survivabilityAudit: any;
  frictionProfile: FrictionProfile;
}

export interface ArchitectOutput {
  opportunityProfile: OpportunityProfile;
  simulationResults: any[];
  pathPresentation: ReturnType<typeof assembleFinalPathPresentation>;
  ambitionAssessment: AmbitionAssessment;
  socioEconomicGuardrail: SocioEconomicGuardrailOutput;
  intelligenceBrief: any;
  intelligenceReport: any;
}

/**
 * Runs Mode 2: Tactical Path & Opportunity Architecting.
 * Synthesizes hyper-local business opportunities and runs simulations.
 */
export async function runTacticalArchitect(input: ArchitectInput): Promise<ArchitectOutput> {
  const { contextMatrix, capabilityVector, survivabilityAudit, frictionProfile } = input;

  // 1. Run Market Intelligence Matrix
  const { intelligenceBrief, intelligenceReport } = await runIntelligenceMatrix(contextMatrix, capabilityVector);

  // 2. Run Trajectory Simulation
  const simulationResults = runTrajectorySimulation(contextMatrix, capabilityVector, survivabilityAudit, intelligenceReport);

  // 3. Run Opportunity Mapping
  const opportunityProfile = await runOpportunityMapping(contextMatrix, capabilityVector, survivabilityAudit);

  // 4. Calculate Path Probabilities
  const betaResult = simulationResults.find(r => r.pathTemplate.type === 'safe_compounding') ?? simulationResults[0];
  const alphaResult = simulationResults.find(r => r.pathTemplate.type === 'high_risk_upside') ?? null;

  const probabilityInputs: ProbabilityInputVector = {
    trueCapabilityScore: capabilityVector.trueCapabilityScore,
    runwayDays: survivabilityAudit.runwayDays,
    frictionCoefficient: frictionProfile.frictionCoefficient,
    pathMarketSaturationRisk: betaResult?.shockVulnerabilityScore ?? 0.3,
    simulatedShockProbability: 0.25,
    learningRate: contextMatrix.humanCapital.learningRate,
    networkQuality: contextMatrix.humanCapital.networkQuality,
    baselineDiscipline: contextMatrix.psychometric.baselineDiscipline,
    riskTolerance: contextMatrix.psychometric.riskTolerance,
    timelineMonths: contextMatrix.goalVector.timelineMonths,
    hasVerifiableOutputs: contextMatrix.humanCapital.hasVerifiableWork,
  };

  const probabilityComparison = comparePathProbabilities(alphaResult, betaResult, probabilityInputs);

  // 5. Assemble Path Presentation
  const pathPresentation = assembleFinalPathPresentation(
    contextMatrix,
    capabilityVector,
    survivabilityAudit,
    frictionProfile,
    opportunityProfile,
    simulationResults,
    probabilityComparison,
  );

  // 6. Run Ambition Filter & Guardrails
  const baseAmbitionAssessment = runAmbitionFilter(contextMatrix, capabilityVector);
  const socioEconomicGuardrail = applySocioEconomicGuardrail(contextMatrix, capabilityVector, contextMatrix.goalVector.targetAmount);

  // 7. Inject Custom Extreme Goal Commitment Check (Mode 2 Custom)
  const isExtreme = baseAmbitionAssessment.filterResult === 'structurally_misaligned' || 
                    baseAmbitionAssessment.filterResult === 'exceptional_requires_assessment';
  
  let ambitionAssessment = { ...baseAmbitionAssessment };

  if (isExtreme) {
    const targetStr = `₹${contextMatrix.goalVector.targetAmount.toLocaleString('en-IN')}`;
    const timelineStr = `${contextMatrix.goalVector.timelineMonths} months`;
    const probPct = baseAmbitionAssessment.probabilityOfDeclaredGoal.toFixed(1);

    const extremeReframe = `Bhai, look at the mathematical reality of this goal. 
You want to hit ${targetStr} in ${timelineStr}. 

The statistical probability is relatively low (${probPct}%) under normal parameters. To achieve this, it requires exceptionally high focus and structured effort.

I will NOT block this path. If you are serious, you have two choices:

[Option A] The Extreme Path: Lock this target. We will build high-frequency, direct execution tasks with rapid feedback loops. It requires strict discipline and persistence.

[Option B] The Compounding Path: Choose a balanced compounding goal (with a 40–60% chance of success) to build your foundation first, making your original target the next phase of our plan.

Let's make a calculated decision together.`;

    ambitionAssessment = {
      ...baseAmbitionAssessment,
      reframeMessage: extremeReframe,
      egoReframeRequired: true,
    };
  }

  return {
    opportunityProfile,
    simulationResults,
    pathPresentation,
    ambitionAssessment,
    socioEconomicGuardrail,
    intelligenceBrief,
    intelligenceReport,
  };
}
