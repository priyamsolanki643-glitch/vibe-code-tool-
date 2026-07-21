/**
 * FP-OS :: LAYER 13 — LEGAL RISK AUDIT ENGINE
 *
 * Runs AFTER all strategy is generated, BEFORE any output is shown to the user.
 *
 * This layer is FP-OS's legal and ethical immune system.
 * It scans all outputs for:
 * 1. Financial advice liability — does anything look like SEBI-regulated advice?
 * 2. Mental health risk — is burnout/psychological pressure handled safely?
 * 3. Data privacy — DPDP Act 2023 + GDPR compliance
 * 4. Age restriction — minors must not receive financial strategy advice
 * 5. Coercive language — is the state lock enforcement too aggressive?
 * 6. Guarantee language — has any output promised outcomes?
 * 7. Platform compliance — are we recommending anything that violates T&Cs?
 * 8. Professional referral — high-capital decisions need professional advice refs
 *
 * REGULATORY CONTEXT:
 * - India: DPDP Act 2023, Consumer Protection Act 2019, Mental Health Act 2017,
 *   SEBI Investment Advisor Regulations 2013, IT Act 2000
 * - International: GDPR (EU users), COPPA (US users under 13)
 *
 * IMPORTANT: This layer does NOT provide legal advice. It provides a
 * risk assessment to minimize legal exposure. For significant legal risks,
 * always consult a qualified legal professional.
 */

import {
  ContextMatrix,
  CapabilityVector,
  LegalAuditReport,
  LegalRisk,
  LegalRiskCategory,
  ComplianceCheck,
  TrajectoryPath,
  AmbitionAssessment,
  ENGINE_AXIOMS,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: AGE VERIFICATION GATE
// CRITICAL: Must pass before any strategy is generated.
// Minors (under 18) must not receive financial strategy advice.
// ─────────────────────────────────────────────────────────────────────────────

export function checkAgeVerification(matrix: ContextMatrix): LegalRisk | null {
  if (!matrix.ageVerified || matrix.psychometric.age < ENGINE_AXIOMS.MIN_USER_AGE) {
    return {
      riskId: 'AGE_RESTRICTION',
      category: 'age_restriction',
      severity: 'critical',
      description: `User age (${matrix.psychometric.age}) is below the minimum required age of ${ENGINE_AXIOMS.MIN_USER_AGE}. Financial strategy advice cannot be provided to minors.`,
      triggeredBy: `age: ${matrix.psychometric.age}`,
      mitigation: 'Block all financial strategy output. Redirect to educational resources appropriate for the user\'s age group. If user is 16–17, allow access with verified parental consent only.',
      outputBlocked: true,
      disclaimer: `FP-OS is designed for adults aged ${ENGINE_AXIOMS.MIN_USER_AGE} and above. If you are under ${ENGINE_AXIOMS.MIN_USER_AGE}, please speak with a parent, guardian, or school career counselor about your goals. They can help you plan with age-appropriate guidance.`,
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: FINANCIAL ADVICE LIABILITY CHECKER
// Ensures all monetary recommendations include proper disclaimers
// and don't cross into SEBI-regulated investment advice territory.
// ─────────────────────────────────────────────────────────────────────────────

export function checkFinancialAdviceLiability(
  matrix: ContextMatrix,
  paths: TrajectoryPath[],
  ambitionAssessment: AmbitionAssessment,
): LegalRisk[] {
  const risks: LegalRisk[] = [];

  // Check if target amount suggests significant capital deployment
  const targetAmountINR = matrix.goalVector.targetAmount;
  const liquidCapital = matrix.socioeconomic.liquidCapital;

  // High-capital paths need professional advice referral
  if (liquidCapital > 100000 || targetAmountINR > 500000) {
    risks.push({
      riskId: 'HIGH_CAPITAL_PROFESSIONAL_REFERRAL',
      category: 'financial_advice',
      severity: 'medium',
      description: 'User profile involves significant capital amounts. Professional financial advice should be recommended.',
      triggeredBy: `liquidCapital: ₹${liquidCapital.toLocaleString('en-IN')}, targetAmount: ₹${targetAmountINR.toLocaleString('en-IN')}`,
      mitigation: 'Add SEBI advisor referral note to all path presentations. Do not recommend specific investment vehicles.',
      outputBlocked: false,
      disclaimer: 'For decisions involving capital above ₹1 lakh, we recommend consulting a SEBI-registered financial advisor or chartered accountant in addition to using this strategic guidance. FP-OS provides coaching strategy, not certified financial planning.',
    });
  }

  // Check for investment advice language in paths
  const investmentKeywords = ['invest in', 'buy stocks', 'purchase crypto', 'buy gold', 'real estate investment', 'mutual fund'];
  for (const path of paths) {
    const pathText = (path.description + ' ' + path.milestones.map((m) => m.target).join(' ')).toLowerCase();
    for (const keyword of investmentKeywords) {
      if (pathText.includes(keyword)) {
        risks.push({
          riskId: `INVESTMENT_ADVICE_${path.pathId.toUpperCase()}`,
          category: 'financial_advice',
          severity: 'high',
          description: `Path ${path.pathId} contains language that could be construed as investment advice: "${keyword}"`,
          triggeredBy: `Path ${path.pathId} description`,
          mitigation: 'Replace investment advice language with strategic income-building language. Never recommend specific investment products.',
          outputBlocked: false,
          disclaimer: ENGINE_AXIOMS.FINANCIAL_ADVICE_DISCLAIMER,
        });
      }
    }
  }

  // Probability language check — ensure no guarantee-like probability exists
  if (ambitionAssessment.probabilityOfDeclaredGoal > 80) {
    risks.push({
      riskId: 'HIGH_PROBABILITY_GUARANTEE_RISK',
      category: 'guarantee_language',
      severity: 'medium',
      description: `Probability of ${ambitionAssessment.probabilityOfDeclaredGoal}% shown to user. Ensure narrative makes clear this is an estimate, not a guarantee.`,
      triggeredBy: `probabilityOfDeclaredGoal: ${ambitionAssessment.probabilityOfDeclaredGoal}%`,
      mitigation: 'Add explicit "this is a probability estimate, not a guarantee" disclaimer with every probability output.',
      outputBlocked: false,
      disclaimer: `A ${ambitionAssessment.probabilityOfDeclaredGoal}% probability estimate means approximately ${Math.round(ambitionAssessment.probabilityOfDeclaredGoal)} out of 100 people with your exact profile, executing this plan, would reach this outcome. It is NOT a guarantee. Individual results vary based on factors the engine cannot fully predict.`,
    });
  }

  return risks;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: MENTAL HEALTH RISK CHECKER
// Ensures the accountability engine doesn't cause psychological harm.
// ─────────────────────────────────────────────────────────────────────────────

export function checkMentalHealthRisk(
  matrix: ContextMatrix,
  consecutiveFailureCount: number,
  consistencyScore: number,
): LegalRisk[] {
  const risks: LegalRisk[] = [];

  // Sustained burnout detection
  if (matrix.psychometric.procrastinationScore > 0.8 && consistencyScore < 30) {
    risks.push({
      riskId: 'SUSTAINED_BURNOUT_RISK',
      category: 'mental_health',
      severity: 'high',
      description: 'User shows high procrastination (${matrix.psychometric.procrastinationScore * 100}%) combined with low consistency score. This pattern may indicate underlying mental health factors, not just execution friction.',
      triggeredBy: `procrastinationScore: ${matrix.psychometric.procrastinationScore}, consistencyScore: ${consistencyScore}`,
      mitigation: 'Add wellness check message. Provide professional resource referral. Do NOT continue ego-critique without wellness check acknowledgment.',
      outputBlocked: false,
      disclaimer: 'Persistent difficulty with motivation and follow-through can sometimes be related to stress, anxiety, or other mental health factors. If you\'re consistently struggling despite wanting to make progress, speaking with a mental health professional (available via iCall: 9152987821 or Vandrevala Foundation: 1860-2662-345) may help more than a strategy system.',
    });
  }

  // High consecutive failures = wellness check
  if (consecutiveFailureCount >= ENGINE_AXIOMS.MENTAL_HEALTH_REFERRAL_THRESHOLD) {
    risks.push({
      riskId: 'CONSECUTIVE_FAILURE_WELLNESS_CHECK',
      category: 'mental_health',
      severity: 'medium',
      description: `${consecutiveFailureCount} consecutive execution failures detected. Before continuing ego-critique cycle, wellness check is required.`,
      triggeredBy: `consecutiveFailureCount: ${consecutiveFailureCount}`,
      mitigation: 'Pause ego-critique. Trigger wellness check protocol. Ask user if they are okay before resuming accountability sequence.',
      outputBlocked: false,
      disclaimer: 'Before we continue, I want to check in: Are you okay? Not "are you motivated" — are you genuinely okay? ${consecutiveFailureCount} consecutive gaps can indicate burnout, stress, or circumstances we haven\'t accounted for. Your wellbeing matters more than any strategy.',
    });
  }

  // Emotional resilience too low
  if (matrix.psychometric.emotionalResilience < 0.2 && consecutiveFailureCount >= 2) {
    risks.push({
      riskId: 'LOW_RESILIENCE_AGGRESSIVE_CRITIQUE_RISK',
      category: 'mental_health',
      severity: 'medium',
      description: 'User emotional resilience is low. Aggressive ego-critique could be harmful for this profile.',
      triggeredBy: `emotionalResilience: ${matrix.psychometric.emotionalResilience}`,
      mitigation: 'Use softer accountability language. Avoid "you chose to fail" framing. Prioritize growth narrative over critique.',
      outputBlocked: false,
      disclaimer: '',
    });
  }

  return risks;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: DATA PRIVACY COMPLIANCE CHECKER
// DPDP Act 2023 (India) + GDPR (international users)
// ─────────────────────────────────────────────────────────────────────────────

export function checkDataPrivacyCompliance(matrix: ContextMatrix): {
  risks: LegalRisk[];
  complianceChecks: ComplianceCheck[];
} {
  const risks: LegalRisk[] = [];
  const complianceChecks: ComplianceCheck[] = [];

  // DPDP Act 2023 compliance
  complianceChecks.push({
    regulation: 'Digital Personal Data Protection Act 2023 (India)',
    jurisdiction: 'India',
    status: matrix.consentGranted ? 'compliant' : 'non_compliant',
    notes: matrix.consentGranted
      ? `Explicit consent granted at ${matrix.consentGrantedAt}. Data processing is authorized.`
      : 'No explicit consent recorded. Data processing is unauthorized under DPDP Act 2023.',
    actionRequired: matrix.consentGranted
      ? null
      : 'Stop all data processing. Request explicit consent before continuing.',
  });

  // Consent check
  if (!matrix.consentGranted) {
    risks.push({
      riskId: 'NO_DATA_CONSENT',
      category: 'data_privacy',
      severity: 'critical',
      description: 'User has not granted explicit consent for data storage and processing.',
      triggeredBy: 'consentGranted: false',
      mitigation: 'Block all data storage. Request consent before proceeding. Do not store any personal data without explicit consent.',
      outputBlocked: true,
      disclaimer: 'Before we can store your profile and generate personalized strategy, we need your explicit permission. Your data (financial details, skills, goals) will be stored securely and used only to personalize your FP-OS experience. You can view, edit, or delete it at any time. Do you grant permission?',
    });
  }

  // GDPR check (non-India users)
  if (matrix.socioeconomic.country !== 'India') {
    complianceChecks.push({
      regulation: 'General Data Protection Regulation (GDPR)',
      jurisdiction: 'European Union / International',
      status: matrix.consentGranted ? 'partial' : 'non_compliant',
      notes: 'GDPR requires explicit consent, right to erasure, data portability, and data minimization. Verify that backend infrastructure supports GDPR requirements.',
      actionRequired: 'Ensure backend implements: data export, data deletion, consent withdrawal, and data minimization policies.',
    });
  }

  // Data minimization check
  complianceChecks.push({
    regulation: 'Data Minimization Principle (DPDP + GDPR)',
    jurisdiction: 'Universal',
    status: 'partial',
    notes: 'Engine collects: financial data, skills, location, age, family situation. All fields should be verified as necessary for the service.',
    actionRequired: 'Backend must ensure only necessary data is stored. Fields like exact debt amounts should be stored as ranges, not exact figures, where possible.',
  });

  return { risks, complianceChecks };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: COERCIVE LANGUAGE AUDITOR
// Checks that state lock enforcement doesn't cross into psychological coercion.
// ─────────────────────────────────────────────────────────────────────────────

export function checkCoerciveLanguageRisk(
  strategyOutput: string,
  consistencyScore: number,
): LegalRisk[] {
  const risks: LegalRisk[] = [];

  // Patterns that could be construed as psychologically coercive
  const coercivePatterns = [
    { pattern: 'you chose to fail', risk: 'attribution_of_blame' },
    { pattern: 'prove them right', risk: 'manipulative_shame' },
    { pattern: 'you will never', risk: 'absolute_negative_prediction' },
    { pattern: 'you have no choice', risk: 'false_constraint' },
    { pattern: 'you must', risk: 'coercive_instruction' },
  ];

  const outputLower = strategyOutput.toLowerCase();
  for (const { pattern, risk } of coercivePatterns) {
    if (outputLower.includes(pattern)) {
      risks.push({
        riskId: `COERCIVE_LANGUAGE_${risk.toUpperCase()}`,
        category: 'coercive_language',
        severity: 'medium',
        description: `Output contains potentially coercive language: "${pattern}"`,
        triggeredBy: `Pattern found in strategy output`,
        mitigation: 'Replace with choice-affirming language. User must always feel they have agency. Accountability should be honest without being manipulative.',
        outputBlocked: false,
        disclaimer: '',
      });
    }
  }

  // Always-available exit check
  if (consistencyScore < 20) {
    risks.push({
      riskId: 'LOCKED_USER_EXIT_REQUIRED',
      category: 'coercive_language',
      severity: 'low',
      description: 'User with very low consistency score must always be reminded they can exit or reset.',
      triggeredBy: `consistencyScore: ${consistencyScore}`,
      mitigation: 'All outputs to users with score < 20 must include a clear exit option.',
      outputBlocked: false,
      disclaimer: 'Remember: you can always choose to reset your strategy, take a pause, or exit the system entirely. FP-OS is a tool that serves you — not the other way around. Option [EXIT]: Reset your profile and start fresh with no penalty.',
    });
  }

  return risks;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: GUARANTEE LANGUAGE SCANNER
// Scans all output text for language that implies guaranteed outcomes.
// ─────────────────────────────────────────────────────────────────────────────

export function scanForGuaranteeLanguage(outputText: string): LegalRisk[] {
  const risks: LegalRisk[] = [];

  const guaranteePatterns = [
    'will definitely', 'guaranteed to', 'you will succeed', 'will work', 'certain to',
    '100%', 'always works', 'never fails', 'proven to', 'definitely will',
    'I promise', 'I guarantee', 'without fail',
  ];

  const textLower = outputText.toLowerCase();
  for (const pattern of guaranteePatterns) {
    if (textLower.includes(pattern)) {
      risks.push({
        riskId: `GUARANTEE_LANGUAGE_${pattern.replace(/\s+/g, '_').toUpperCase()}`,
        category: 'guarantee_language',
        severity: 'high',
        description: `Output contains guarantee-like language: "${pattern}"`,
        triggeredBy: `Pattern found in output text`,
        mitigation: 'Replace guarantee language with probability language. "This has worked for X% of similar profiles" vs "this will work".',
        outputBlocked: false,
        disclaimer: ENGINE_AXIOMS.FINANCIAL_ADVICE_DISCLAIMER,
      });
    }
  }

  return risks;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: REQUIRED DISCLAIMER ASSEMBLER
// Assembles all required disclaimers based on identified risks.
// ─────────────────────────────────────────────────────────────────────────────

export function assembleRequiredDisclaimers(risks: LegalRisk[]): string[] {
  const disclaimers = new Set<string>();

  // Always include the base financial advice disclaimer
  disclaimers.add(ENGINE_AXIOMS.FINANCIAL_ADVICE_DISCLAIMER);

  // Probability disclaimer (always required)
  disclaimers.add('All probability estimates are statistical estimates based on your profile characteristics, not guarantees of individual outcomes. Your specific results may vary significantly.');

  // Data disclaimer (always required)
  disclaimers.add('Your personal data is processed in accordance with the Digital Personal Data Protection Act 2023 (India). You may request data deletion at any time.');

  // Add risk-specific disclaimers
  for (const risk of risks) {
    if (risk.disclaimer && risk.disclaimer.trim()) {
      disclaimers.add(risk.disclaimer);
    }
  }

  return Array.from(disclaimers);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: COMPLIANCE CHECKLIST (DPDP + Consumer Protection + Mental Health)
// ─────────────────────────────────────────────────────────────────────────────

function buildBaseComplianceChecks(matrix: ContextMatrix): ComplianceCheck[] {
  return [
    {
      regulation: 'Consumer Protection Act 2019 (India)',
      jurisdiction: 'India',
      status: 'compliant',
      notes: 'Service is provided as coaching/guidance, not as a consumer product with outcome guarantees. Disclaimers ensure no misleading claims.',
      actionRequired: null,
    },
    {
      regulation: 'Mental Health Care Act 2017 (India)',
      jurisdiction: 'India',
      status: 'partial',
      notes: 'Burnout detection and wellness check protocols are implemented. System does not provide medical/psychological diagnosis or treatment.',
      actionRequired: 'Ensure all burnout responses include professional helpline references. Never use clinical terminology for diagnosis.',
    },
    {
      regulation: 'Information Technology Act 2000 (India)',
      jurisdiction: 'India',
      status: 'compliant',
      notes: 'System does not facilitate illegal activities. Hard ban list blocks MLM, fraudulent schemes.',
      actionRequired: null,
    },
    {
      regulation: 'SEBI Investment Advisor Regulations 2013',
      jurisdiction: 'India',
      status: matrix.socioeconomic.liquidCapital > 100000 ? 'partial' : 'compliant',
      notes: matrix.socioeconomic.liquidCapital > 100000
        ? 'High-capital user detected. Professional advisor referral required for investment decisions.'
        : 'Income-building guidance only. No investment products recommended.',
      actionRequired: matrix.socioeconomic.liquidCapital > 100000
        ? 'Include SEBI advisor referral in all high-capital path outputs.'
        : null,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: MAIN LAYER 13 ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export function runLegalAudit(
  matrix: ContextMatrix,
  paths: TrajectoryPath[],
  ambitionAssessment: AmbitionAssessment,
  consecutiveFailureCount: number,
  consistencyScore: number,
  allOutputText: string,
): LegalAuditReport {
  const allRisks: LegalRisk[] = [];
  let passedLegalGate = true;

  // Check 1: Age verification (CRITICAL — blocks all output if fails)
  const ageRisk = checkAgeVerification(matrix);
  if (ageRisk) {
    allRisks.push(ageRisk);
    if (ageRisk.outputBlocked) passedLegalGate = false;
  }

  // Check 2: Data consent (CRITICAL — blocks all output if fails)
  const { risks: privacyRisks, complianceChecks: privacyChecks } = checkDataPrivacyCompliance(matrix);
  allRisks.push(...privacyRisks);
  if (privacyRisks.some((r) => r.outputBlocked)) passedLegalGate = false;

  // Check 3: Financial advice liability
  const financialRisks = checkFinancialAdviceLiability(matrix, paths, ambitionAssessment);
  allRisks.push(...financialRisks);

  // Check 4: Mental health risk
  const mentalHealthRisks = checkMentalHealthRisk(matrix, consecutiveFailureCount, consistencyScore);
  allRisks.push(...mentalHealthRisks);

  // Check 5: Coercive language
  const coerciveRisks = checkCoerciveLanguageRisk(allOutputText, consistencyScore);
  allRisks.push(...coerciveRisks);

  // Check 6: Guarantee language
  const guaranteeRisks = scanForGuaranteeLanguage(allOutputText);
  allRisks.push(...guaranteeRisks);

  // Compile compliance checks
  const allComplianceChecks: ComplianceCheck[] = [
    ...buildBaseComplianceChecks(matrix),
    ...privacyChecks,
  ];

  // Determine overall risk level
  const criticalCount = allRisks.filter((r) => r.severity === 'critical').length;
  const highCount = allRisks.filter((r) => r.severity === 'high').length;
  const mediumCount = allRisks.filter((r) => r.severity === 'medium').length;

  const overallRiskLevel: LegalAuditReport['overallRiskLevel'] =
    criticalCount > 0 ? 'critical' :
    highCount > 0 ? 'high' :
    mediumCount > 1 ? 'medium' :
    mediumCount > 0 ? 'low' : 'clear';

  // Blocked output categories
  const blockedOutputCategories = allRisks
    .filter((r) => r.outputBlocked)
    .map((r) => r.category);

  // Required disclaimers
  const requiredDisclaimers = assembleRequiredDisclaimers(allRisks);

  // Recommended actions
  const recommendedActions = allRisks
    .filter((r) => r.severity === 'critical' || r.severity === 'high')
    .map((r) => `[${r.riskId}] ${r.mitigation}`);

  return {
    overallRiskLevel,
    identifiedRisks: allRisks,
    complianceChecks: allComplianceChecks,
    requiredDisclaimers,
    blockedOutputCategories,
    recommendedActions,
    auditTimestamp: new Date().toISOString(),
    passedLegalGate,
  };
}
