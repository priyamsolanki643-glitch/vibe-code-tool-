import { processOnboarding, OnboardingInput } from './src/engine/index';
import { lockStrategy, validateUnlockRequest } from './src/engine/layer10_statelock';
import { GeographyTier } from './src/engine/types';
import { LLMService } from './src/services/llm.service';

// Mock LLMService to avoid using Gemini API tokens
LLMService.generateGroundedIntelligenceReport = async (mandate) => {
  console.log('[MOCK] Intercepted LLM Call. Failing to trigger silent structural fallback.');
  throw new Error("Mocked failure to save tokens");
};

async function runTests() {
  console.log('--- STARTING FP-OS ENGINE TESTS ---');

  // Profile 1: Zero capital survival mode, delusional goal
  const profile1: any = {
    userId: 'user_1',
    declaredGoal: '1 crore in 1 month',
    targetAmount: 10000000,
    currency: 'INR',
    timelineMonths: 1,
    geographyTier: 'tier3_semi_urban',
    country: 'India',
    region: 'UP',
    liquidCapital: 0,
    monthlyBurnRate: 5000,
    hasDebt: false,
    debtMonthlyObligation: 0,
    familyDependencyScore: 0.5,
    rawSkillStrings: ['basic excel'],
    hasVerifiableOutputMap: {},
    positiveCommSignals: [],
    negativeCommSignals: [],
    procrastinationSignals: { tookLongBetweenAnswers: false, setOptimisticDeadlines: false, gavelVagueGoalsNotSpecific: false, mentionedPastFailedAttempts: false, usedPassiveLanguage: false, conflatedPlanningWithExecution: false },
    sacrificesToleratedList: ['sleep'],
    nonNegotiables: [],
    pathPreference: 'high_risk_upside',
    onboardingText: 'I need 1 crore in 1 month right now using basic excel.',
    dailyUninterruptedHours: 8,
    deviceTier: 'mobile_only',
    internetStability: 'intermittent',
    workEnvironment: 'chaotic',
    canWorkAtNight: true,
    hasDedicatedWorkspace: false,
    cognitiveEnduranceMinutes: 60,
    emotionalResilience: 0.5,
    baselineDiscipline: 0.3,
    preferredWorkStyle: 'solo',
    riskTolerance: 1.0,
    detectedFrictionSignalIds: []
  };

  try {
    console.log('\n>>> RUNNING PROFILE 1 (Zero capital, delusional) <<<');
    const out1 = await processOnboarding(profile1);
    console.log('Survivability Band:', out1.userRuntime.survivabilityAudit.runwayBand);
    console.log('Is Strategy Generation Unlocked?', out1.userRuntime.survivabilityAudit.strategyGenerationUnlocked);
    console.log('Ambition Filter Result:', out1.ambitionAssessment.filterResult);
    if (out1.survivalModeResponse) {
      console.log('Survival Mode Response:', out1.survivalModeResponse.blockedMessage);
    }
  } catch (err: any) {
    console.error('Error Profile 1:', err);
  }

  // Profile 2: Normal user realistic goal
  const profile2: any = {
    userId: 'user_2',
    declaredGoal: '50000 per month',
    targetAmount: 50000,
    currency: 'INR',
    timelineMonths: 6,
    geographyTier: 'tier2_city',
    country: 'India',
    region: 'MP',
    liquidCapital: 15000,
    monthlyBurnRate: 8000,
    hasDebt: false,
    debtMonthlyObligation: 0,
    familyDependencyScore: 0.2,
    rawSkillStrings: ['web design', 'canva'],
    hasVerifiableOutputMap: {},
    positiveCommSignals: [],
    negativeCommSignals: [],
    procrastinationSignals: { tookLongBetweenAnswers: false, setOptimisticDeadlines: false, gavelVagueGoalsNotSpecific: false, mentionedPastFailedAttempts: false, usedPassiveLanguage: false, conflatedPlanningWithExecution: false },
    sacrificesToleratedList: ['weekends'],
    nonNegotiables: [],
    pathPreference: 'safe_compounding',
    onboardingText: 'I want to earn 50k per month doing web design.',
    dailyUninterruptedHours: 6,
    deviceTier: 'budget_laptop',
    internetStability: 'stable',
    workEnvironment: 'private_room',
    canWorkAtNight: true,
    hasDedicatedWorkspace: true,
    cognitiveEnduranceMinutes: 120,
    emotionalResilience: 0.7,
    baselineDiscipline: 0.6,
    preferredWorkStyle: 'solo',
    riskTolerance: 0.5,
    detectedFrictionSignalIds: []
  };

  try {
    console.log('\n>>> RUNNING PROFILE 2 (Normal user) <<<');
    const out2 = await processOnboarding(profile2);
    console.log('Survivability Band:', out2.userRuntime.survivabilityAudit.runwayBand);
    console.log('Is Strategy Generation Unlocked?', out2.userRuntime.survivabilityAudit.strategyGenerationUnlocked);
    console.log('Ambition Filter Result:', out2.ambitionAssessment.filterResult);
    
    // Profile 3: Excuse-based unlock attempt
    console.log('\n>>> RUNNING PROFILE 3 (State Lock testing) <<<');
    let strategyState = out2.userRuntime.strategyState;
    const selectedPath = out2.userRuntime.availablePaths[0]; // pick Beta path
    
    if (selectedPath) {
      // Transition to locked
      strategyState.status = 'awaiting_selection'; // mock state transition requirement
      strategyState = lockStrategy(strategyState, selectedPath as any);
      console.log('State locked successfully. Status:', strategyState.status);

      // Attempt unlock
      const unlockReq = {
        reason: 'I am tired and bored of this path',
        requestedAt: new Date().toISOString()
      };
      const validation = validateUnlockRequest(unlockReq, strategyState);
      console.log('Unlock Approved?', validation.approved);
      console.log('Unlock System Response:', validation.systemResponse.substring(0, 100) + '...');
      console.log('Next State:', validation.nextState);
    } else {
      console.log('No paths available to lock.');
    }
  } catch (err: any) {
    console.error('Error Profile 2/3:', err);
  }

  console.log('\n--- TESTS COMPLETED ---');
}

runTests();
