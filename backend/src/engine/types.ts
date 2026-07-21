/**
 * FP-OS :: MASTER TYPE DEFINITIONS
 * The Operating System for Human Ambition
 *
 * Every layer in the engine reads from and writes to these types.
 * This is the single source of truth for the entire reasoning pipeline.
 *
 * LEGAL DISCLAIMER (embedded in system):
 * FP-OS provides strategic guidance and educational coaching.
 * It does NOT constitute financial, investment, legal, or medical advice.
 * Users should consult qualified professionals for decisions involving
 * significant capital, health, or legal matters.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTER A — SOCIOECONOMIC REALITY
// ─────────────────────────────────────────────────────────────────────────────

export type GeographyTier = 'tier1_metro' | 'tier2_city' | 'tier3_semi_urban' | 'rural';
export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'other';

// Conversion rates to INR (updated periodically — not live)
export const CURRENCY_TO_INR: Record<SupportedCurrency, number> = {
  INR: 1,
  USD: 83,
  EUR: 90,
  GBP: 105,
  AED: 22.6,
  SGD: 62,
  other: 83, // Default to USD rate for unknown currencies
};

export interface SocioeconomicCluster {
  geographyTier: GeographyTier;
  country: string;
  region: string;
  city?: string;                        // Specific city for hyper-local intelligence
  liquidCapital: number;               // Deployable cash RIGHT NOW (INR). Not savings.
  monthlyBurnRate: number;             // Fixed monthly obligations (rent + food + transport)
  effectiveMonthlyBurn: number;        // monthlyBurnRate + debtMonthlyObligation (GAP 5 fix)
  runwayDays: number;                  // Calculated: liquidCapital / (effectiveMonthlyBurn / 30)
  familyDependencyScore: number;       // 0 = fully dependent earner, 1 = no dependents
  hasDebt: boolean;
  debtMonthlyObligation: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTER B — HUMAN CAPITAL
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillNode {
  skillName: string;
  selfReportedLevel: number;     // 0.0 – 1.0 (what user claims)
  verifiedLevel: number;         // 0.0 – 1.0 (what engine assigns after calibration)
  hasVerifiableOutput: boolean;  // Did they build/write/show something real?
  hasPassedCalibration?: boolean; // Did they pass the AI's micro-calibration test instead of providing a link?
  category: 'technical' | 'creative' | 'communication' | 'physical' | 'domain';
  compressionResistance: 'low' | 'medium' | 'high'; // GAP 11 fix: task compression tolerance
}

export interface HumanCapitalCluster {
  skills: SkillNode[];
  communicationScore: number;    // 0.0 – 1.0. AI-assessed from onboarding writing quality.
  technicalVelocity: number;     // 0.0 – 1.0. Speed of tool/code building.
  learningRate: number;          // 0.0 – 1.0 (lambda). Speed of concept assimilation.
  networkQuality: number;        // 0.0 – 1.0. Relevant contacts vs. zero network.
  hasVerifiableWork: boolean;    // Has shipped anything real to the world?
  languageRegister: 'english' | 'hindi' | 'hinglish' | 'regional'; // For comms calibration
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTER C — EXECUTION INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceTier = 'high_end' | 'mid_range' | 'low_tier' | 'mobile_only';
export type InternetStability = 'fiber_stable' | '4g_stable' | '4g_intermittent' | '2g_unstable';
export type WorkEnvironment = 'dedicated_quiet' | 'shared_manageable' | 'chaotic_noisy';

export interface InfrastructureCluster {
  dailyUninterruptedHours: number;  // Not total waking hours. UNINTERRUPTED blocks.
  deviceTier: DeviceTier;
  internetStability: InternetStability;
  workEnvironment: WorkEnvironment;
  canWorkAtNight: boolean;
  hasDedicatedWorkspace: boolean;
  preferredWorkStartTime?: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'; // GAP 16 fix
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTER D — PSYCHOMETRIC PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export type EgoLeveragePoint = 'status' | 'money' | 'family' | 'proving_someone_wrong' | 'freedom' | 'impact';
export type WorkStylePreference = 'deep_work_clusters' | 'high_velocity_sprints' | 'unknown';
export type MentalEvolutionStage = 'delusion' | 'resistance' | 'surrender' | 'momentum';

export interface PsychometricCluster {
  procrastinationScore: number;       // 0.0 = never, 1.0 = chronic. Engine-assessed.
  cognitiveEnduranceMinutes: number;  // Max uninterrupted high-focus duration
  emotionalResilience: number;        // 0.0 – 1.0. Bounce-back rate after failure.
  baselineDiscipline: number;         // 0.0 – 1.0. Historical task-to-completion rate.
  egoLeveragePoint: EgoLeveragePoint;
  preferredWorkStyle: WorkStylePreference;
  riskTolerance: number;              // 0.0 (risk-averse) – 1.0 (risk-seeking)
  ambitionIndex: number;              // Declared goal velocity vs current reality
  age: number;                        // Required for age verification (must be 18+)
  cognitiveDissonanceScore: number;   // 0.0 to 100. Gap between ambition and actual action.
  evolutionStage: MentalEvolutionStage; // Current psychological stage of the user.
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTER E — GOAL VECTOR
// ─────────────────────────────────────────────────────────────────────────────

export type SacrificeLevel = 'sleep' | 'social_life' | 'income_stability' | 'relationships';

export interface GoalVector {
  declaredGoal: string;             // Raw user input
  targetAmount: number;             // Numeric target — ALWAYS stored in INR internally
  targetAmountOriginalCurrency: number; // Original amount in user's stated currency
  currency: SupportedCurrency;
  timelineMonths: number;
  sacrificesToleratedList: SacrificeLevel[];
  nonNegotiables: string[];         // What they will NOT sacrifice
  pathPreference: 'high_risk_upside' | 'safe_compounding' | 'undecided';
  // NOTE: ambitionVelocity is NOT stored here anymore (GAP 2 fix — was inconsistent)
  // It is calculated ONLY in Layer 9 with the canonical formula
}

// ─────────────────────────────────────────────────────────────────────────────
// ED-TECH INTELLIGENCE (B2B COHORT HEALTH & VAULT)
// ─────────────────────────────────────────────────────────────────────────────

export interface SubjectVelocity {
  subjectName: string;
  learningRate: number;       // 0.0 to 1.0 (e.g., fast in Physics, struggling in Math)
  backlogHours: number;       // How far behind they are
}

export interface EdTechIntelligence {
  targetExam: 'JEE' | 'NEET' | 'UPSC' | 'CA' | 'OTHER';
  examDate: string | null;
  examProximityDays: number;
  examStressMultiplier: number; // 1.0 to 3.0 (scales up as exam gets closer)
  
  subjectVelocities: SubjectVelocity[];
  
  cohortDropoutRiskIndex: number; // 0-100%. If > 80%, triggers Red Band
  isRedBandDropoutRisk: boolean;  // B2B Dashboard Alert Flag
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MASTER CONTEXT MATRIX (C)
// Single source of truth for all downstream reasoning layers
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextMatrix {
  userId: string;
  socioeconomic: SocioeconomicCluster;
  humanCapital: HumanCapitalCluster;
  infrastructure: InfrastructureCluster;
  psychometric: PsychometricCluster;
  goalVector: GoalVector;
  edTechIntelligence?: EdTechIntelligence; // NEW: PW B2B Dashboard integration
  onboardingText: string;           // Raw onboarding conversation text for AI analysis
  onboardingCompletedAt: string;    // ISO timestamp
  consentGranted: boolean;          // DPDP Act 2023 / GDPR compliance
  consentGrantedAt: string | null;  // Timestamp of consent
  ageVerified: boolean;             // Must be 18+ to use FP-OS
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY VECTOR (Layer 2 Output)
// ─────────────────────────────────────────────────────────────────────────────

export interface CapabilityVector {
  trueCapabilityScore: number;          // V_c: 0.0 – 1.0. The honest executable capability.
  calibratedSkills: SkillNode[];        // Skills after structural downgrade calculation
  thirtyDayExecutionPotential: string;  // What they can realistically do in 30 days
  sixtyDayExecutionPotential: string;
  ninetyDayExecutionPotential: string;
  clientFacingViability: boolean;       // Can they do client work right now?
  technicalBuildViability: boolean;     // Can they build technical products right now?
  selfReportingInflationFactor: number; // How much they over-reported (avg 30-60%)
}

// ─────────────────────────────────────────────────────────────────────────────
// SURVIVABILITY AUDIT (Layer 3 Output)
// ─────────────────────────────────────────────────────────────────────────────

export type RunwayBand = 'red' | 'yellow' | 'green';

export interface SurvivabilityAudit {
  runwayDays: number;
  runwayBand: RunwayBand;
  dailyBurnRate: number;
  immediateIncomeRequired: boolean;   // true if Red band
  immediateTargetAmount: number;      // Min monthly needed to extend runway
  strategyGenerationUnlocked: boolean;
  survivabilityNotes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET INTELLIGENCE REPORT (Layer 0 Output — The Trillion-Dollar Feature)
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligenceBrief {
  // Structured queries the AI backend must answer before simulation runs
  skillDemandQueries: IntelligenceQuery[];
  localMarketQueries: IntelligenceQuery[];
  socialMediaTrendQueries: IntelligenceQuery[];
  competitorLandscapeQueries: IntelligenceQuery[];
  timingSignalQueries: IntelligenceQuery[];
  researchMandate: string;            // Full research brief for AI execution
  prioritySignals: string[];          // What to research first
}

export interface IntelligenceQuery {
  queryId: string;
  category: 'skill_demand' | 'local_market' | 'social_media' | 'competitor' | 'timing';
  query: string;                      // The exact question the AI must answer
  expectedDataFormat: string;         // What kind of answer is expected
  importance: 'critical' | 'high' | 'medium';
  searchHints: string[];              // Where to look (Google Trends, social platforms, etc.)
}

export interface SkillDemandSignal {
  skill: string;
  demandLevel: 'very_high' | 'high' | 'medium' | 'low' | 'declining';
  trendDirection: 'rising' | 'stable' | 'falling';
  localDemandVsNational: 'above_average' | 'average' | 'below_average';
  estimatedLocalOpportunities: number; // rough estimate of active demand
  averageRateRange: { low: number; high: number }; // INR per project/month
  adjacentSkillsInDemand: string[];   // What they could learn to 10x demand
  insightNarrative: string;
  dataConfidence: 'verified' | 'estimated' | 'inferred';
}

export interface LocalMarketGap {
  gapId: string;
  gapTitle: string;
  problemDescription: string;
  targetBusinessType: string;
  estimatedAffectedBusinesses: number;
  averageSpendPerBusiness: number; // INR/month willingness to pay
  competitorCount: 'none' | 'very_few' | 'few' | 'moderate' | 'saturated';
  windowDurationMonths: number;
  requiredSkills: string[];
  acquisitionStrategy: string;
  firstClientAcquisitionStep: string;
  revenueProjection: { month1: number; month3: number; month6: number };
}

export interface SocialMediaOpportunity {
  platform: 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'facebook' | 'whatsapp' | 'threads' | 'moj';
  niche: string;
  contentFormat: 'short_video' | 'long_video' | 'posts' | 'stories' | 'articles' | 'reels';
  trendVelocity: number;              // 0-1, how fast this is growing
  languagePreference: 'hindi' | 'english' | 'hinglish' | 'regional';
  currentOrganicReachLevel: 'very_high' | 'high' | 'medium' | 'low';
  monetizationPathway: string;
  timeToFirstRevenue: number;         // months
  postingFrequency: string;           // Specific recommendation (2x/week, daily, etc.)
  contentPillars: string[];           // 3-4 specific content angles
  insightNarrative: string;
  warningFlags: string[];             // Platform risks, policy issues, saturation warnings
}

export interface CompetitorLandscape {
  saturationLevel: 'unsaturated' | 'early_mover' | 'growing' | 'competitive' | 'saturated';
  estimatedLocalCompetitors: number;
  averageCompetitorQuality: 'very_low' | 'low' | 'medium' | 'high';
  differentiationOpportunity: string;
  winningStrategy: string;
  priceAnchor: { low: number; average: number; high: number }; // INR
}

export interface TimingSignal {
  signalId: string;
  signal: string;
  direction: 'rising' | 'stable' | 'falling' | 'volatile';
  urgency: 'act_now' | 'act_soon' | 'wait' | 'pass';
  durationMonths: number;
  narrative: string;
  source: string; // What data source this came from
}

export interface MarketIntelligenceReport {
  skillDemandSignals: SkillDemandSignal[];
  localMarketGaps: LocalMarketGap[];
  socialMediaOpportunities: SocialMediaOpportunity[];
  competitorLandscape: CompetitorLandscape;
  timingSignals: TimingSignal[];
  overallMarketScore: number;          // 0-1, how favorable is the overall market
  topInsight: string;                  // The single most important thing they should know
  generatedAt: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  legalDisclaimer: string;             // Must be shown with every intelligence output
  dataSourceNotes: string;             // Transparency on where data came from
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL GAP ANALYSIS (New — Intelligence Layer Output)
// ─────────────────────────────────────────────────────────────────────────────

export interface MissingSkill {
  skillName: string;
  currentLevel: number;               // 0-1
  requiredLevel: number;              // 0-1
  gapSize: number;                    // requiredLevel - currentLevel
  learningResources: string[];        // Free/low-cost resources
  estimatedLearningDays: number;
  isBlocker: boolean;                 // Without this skill, path is inaccessible
}

export interface BridgingStep {
  dayStart: number;
  dayEnd: number;
  action: string;
  outcome: string;
  skillUnlocked: string;
}

export interface SkillGapAnalysis {
  targetPathId: string;
  targetPathTitle: string;
  currentCapabilityScore: number;
  requiredCapabilityScore: number;
  gapScore: number;                   // How far they are from path requirements
  missingSkills: MissingSkill[];
  bridgingPlan: BridgingStep[];
  estimatedBridgingTimeDays: number;
  bridgingUnlocksRevenuePotential: number; // INR/month once gap is closed
  isWorthBridging: boolean;           // Is the ROI on learning worth it?
  alternativePath: string | null;     // If bridging is too long, what to do instead
}

// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY PROFILE (Layer 5 Output)
// ─────────────────────────────────────────────────────────────────────────────

export type OpportunityCategory =
  | 'local_geo_arbitrage'
  | 'national_digital_remote'
  | 'trend_window_exploitation'
  | 'survival_service_arbitrage'
  | 'social_media_monetization'       // NEW: social media specific path
  | 'skill_gap_bridge';               // NEW: learn-then-execute path

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  opportunityScore: number;           // (marketVelocity * localArbitrageMultiplier) / capitalRequirementIndex
  capitalRequired: number;            // INR
  timeToFirstRevenue: number;         // Days
  communicationScoreRequired: number;
  technicalScoreRequired: number;
  matchesUserProfile: boolean;
  geographySpecific: boolean;
  saturationRisk: string;             // How long before this market closes
  whyThisForThisUser: string;         // Non-generic, constraint-specific reasoning
  intelligenceEnriched: boolean;      // Was this enriched by Layer 0 real-time data?
  skillGapAnalysis?: SkillGapAnalysis; // If skills don't fully match, the bridge plan
}

export interface HardBanList {
  bannedForThisProfile: string[];
  reasonForBan: string;
  profileTrigger: string;             // What constraint triggered the ban
}

export interface OpportunityProfile {
  rankedOpportunities: Opportunity[];
  hardBanList: HardBanList | null;
  topLocalOpportunity: Opportunity;
  topDigitalOpportunity: Opportunity | null;  // null if comm score too low
  topSocialMediaOpportunity: SocialMediaOpportunity | null; // From Layer 0
  intelligenceEnriched: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// FRICTION PROFILE (Layer 6 Output)
// ─────────────────────────────────────────────────────────────────────────────

export type FrictionLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FrictionProfile {
  frictionCoefficient: number;        // F_e: 0.0 (zero friction) – 1.0 (maximum friction)
  frictionLevel: FrictionLevel;
  assignedWorkStyle: WorkStylePreference;
  checkInFrequency: 'daily' | 'twice_daily' | 'every_task';
  taskWindowHours: number;            // How long each task block should be
  accountabilityTriggerSensitivity: 'low' | 'medium' | 'high';
  procrastinationSignals: string[];   // Detected behavioral signals
}

// ─────────────────────────────────────────────────────────────────────────────
// AMBITION FILTER (Layer 9 Output)
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: 'delusional' renamed to 'structurally_misaligned' for legal/psychological safety
export type AmbitionFilterResult =
  | 'realistic'
  | 'aggressive_but_possible'
  | 'structurally_misaligned'           // Previously 'delusional' — renamed for legal safety
  | 'exceptional_requires_assessment';  // Previously 'exceptional_requires_warning'

export interface AmbitionAssessment {
  ambitionVelocity: number;            // A_v metric (canonical calculation from Layer 9 only)
  filterResult: AmbitionFilterResult;
  criticalThresholdExceeded: boolean;
  realisticAlternativeGoal: string;    // Non-generic alternative matching their profile
  realisticAlternativeAmount: number;
  realisticAlternativeTimeline: number; // months
  probabilityOfDeclaredGoal: number;   // 0–88% cap (now includes friction adjustment)
  egoReframeRequired: boolean;
  reframeMessage: string;
  professionalAdviceRecommended: boolean; // For high-capital goals, refer to SEBI advisor
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAJECTORY PATHS (Layer 8 Output)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrajectoryPath {
  pathId: 'alpha' | 'beta';
  label: string;                       // e.g., "Asymmetric Upside" or "Compounding Safe-Side"
  description: string;
  targetAmount: number;
  timelineMonths: number;
  probabilityRangeLow: number;         // e.g., 8.4
  probabilityRangeHigh: number;        // e.g., 12.1 (honest range, never 100%)
  requiredSacrifices: string[];
  keyRisks: string[];
  milestones: Milestone[];
  opportunityUsed: string;
  firstStepToday: string;             // What they do on Day 1
  isAvailableForThisUser: boolean;    // Blocked if constraints don't support it
  blockedReason?: string;             // Why it's not available
  legalDisclaimer: string;            // Required on all path outputs
}

export interface Milestone {
  day: number;
  target: string;
  metric: string;
  checkpointDescription: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY STATE (Layer 10 — The Lock)
// ─────────────────────────────────────────────────────────────────────────────

export type StateStatus =
  | 'intake'
  | 'simulating'
  | 'awaiting_selection'
  | 'locked'
  | 'paused'              // NEW (GAP 17 fix): temporary pause without penalty
  | 'structural_pivot'
  | 'reset';

export type UnlockReason = 'verified_structural_life_change' | 'complete_goal_reset' | 'market_fundamental_change';

export interface StrategyState {
  status: StateStatus;
  lockedPath: TrajectoryPath | null;
  lockedAt: string | null;             // ISO timestamp
  consistencyScore: number;            // 0–100. Starts at 50. Rises with completions.
  currentDayNumber: number;
  totalTargetDays: number;
  isLocked: boolean;
  lastUnlockRequest: string | null;
  unlockGranted: boolean;
  unlockReason: UnlockReason | null;
  pivotHistory: PivotEvent[];
  selectionPresentedAt: string | null; // NEW (GAP 10 fix): when simulation was shown to user
  consecutiveFailureCount: number;     // NEW (GAP 9 fix): tracks consecutive failures
  // Streak tracking (GAP 18 fix)
  currentStreak: number;
  maxStreak: number;
  lastCompletionDate: string | null;
  // Pause state (GAP 17 fix)
  pausedAt: string | null;
  pauseExpiresAt: string | null;
  pauseReason: string | null;
}

export interface PivotEvent {
  requestedAt: string;
  reason: string;
  approved: boolean;
  approvalReason: string;
  consistencyScoreAtTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK SPRINT (Layer 11 Output)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskArchitecture = 'deep_work_cluster' | 'high_velocity_sprint';
export type CompressionResistance = 'low' | 'medium' | 'high';

export interface TaskSprint {
  dayNumber: number;
  architecture: TaskArchitecture;
  tasks: DailyTask[];
  parkinsonsCompressionApplied: boolean;
  compressionFactor: number;            // varies by task type (GAP 11 fix)
  totalWorkHours: number;
  ideologiesActive: string[];
  scheduledTimeBlocks?: TimeBlock[];    // GAP 16 fix: time-of-day awareness
}

export interface TimeBlock {
  startHour: number;    // 24h format
  endHour: number;
  taskIds: string[];
  blockType: 'deep_work' | 'admin' | 'outreach' | 'review';
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  metricBound: string;                  // What "done" looks like. No ambiguity.
  timeAllocationHours: number;
  compressionResistance: CompressionResistance; // GAP 11 fix
  isCompleted: boolean;
  failureReason?: string;
  completedAt?: string;
  phase: 'survival' | 'build' | 'scale';
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'; // GAP 16 fix
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTABILITY / FAILURE DIAGNOSTICS (Layer 12)
// ─────────────────────────────────────────────────────────────────────────────

export type FailureType =
  | 'internal_procrastination'
  | 'internal_burnout'
  | 'external_infrastructure'
  | 'external_market'
  | 'external_personal_emergency';

export type AccountabilityResponseType =
  | 'ego_critique'
  | 'failure_forensic'
  | 'growth_delta'
  | 'structural_pivot_assessment'
  | 'strategy_lock_enforcement'
  | 'wellness_check';               // NEW: mental health gate

export interface FailureDiagnostic {
  failureType: FailureType;
  isInternal: boolean;
  isExternal: boolean;
  consistencyScoreDelta: number;    // Negative = degradation, 0 = hold
  responseType: AccountabilityResponseType;
  fpResponse: string;
  choices: DiagnosticChoice[];
  growthDeltaMessage: string | null;
  wellnessCheckTriggered: boolean;  // NEW: if sustained burnout detected
  wellnessReferral: string | null;  // NEW: mental health referral message
}

export interface DiagnosticChoice {
  label: string;
  action: 'recovery_sprint' | 'failure_mode_acknowledged' | 'structural_pivot_request' | 'ego_accepted_comeback' | 'wellness_pause';
  consequence: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL AUDIT REPORT (Layer 13 Output)
// ─────────────────────────────────────────────────────────────────────────────

export type LegalRiskCategory =
  | 'financial_advice'
  | 'mental_health'
  | 'data_privacy'
  | 'age_restriction'
  | 'coercive_language'
  | 'guarantee_language'
  | 'platform_compliance'
  | 'professional_referral_missing';

export interface LegalRisk {
  riskId: string;
  category: LegalRiskCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  triggeredBy: string;     // What in the user profile triggered this
  mitigation: string;
  outputBlocked: boolean;  // If true, the associated output is suppressed until fixed
  disclaimer: string;      // The specific disclaimer text to inject
}

export interface ComplianceCheck {
  regulation: string;
  jurisdiction: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  notes: string;
  actionRequired: string | null;
}

export interface LegalAuditReport {
  overallRiskLevel: 'clear' | 'low' | 'medium' | 'high' | 'critical';
  identifiedRisks: LegalRisk[];
  complianceChecks: ComplianceCheck[];
  requiredDisclaimers: string[];         // Must be injected into AI output
  blockedOutputCategories: string[];     // Categories of advice that are suppressed
  recommendedActions: string[];
  auditTimestamp: string;
  passedLegalGate: boolean;              // Must be true before strategy is shown
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL USER RUNTIME (The complete assembled profile)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRuntime {
  contextMatrix: ContextMatrix;
  capabilityVector: CapabilityVector;
  survivabilityAudit: SurvivabilityAudit;
  intelligenceBrief: IntelligenceBrief | null;       // NEW: Layer 0 brief
  intelligenceReport: MarketIntelligenceReport | null; // NEW: Layer 0 filled report
  opportunityProfile: OpportunityProfile;
  frictionProfile: FrictionProfile;
  ambitionAssessment: AmbitionAssessment;
  skillGapAnalysis: SkillGapAnalysis | null;          // NEW: skill gap bridge
  availablePaths: TrajectoryPath[];
  strategyState: StrategyState;
  currentTaskSprint: TaskSprint | null;
  consistencyHistory: ConsistencyEvent[];
  legalAuditReport: LegalAuditReport | null;          // NEW: Layer 13 report
  edTechIntelligence?: EdTechIntelligence;            // NEW: Layer for B2B Vault
}

export interface ConsistencyEvent {
  date: string;
  delta: number;
  reason: string;
  newScore: number;
  streak: number;           // NEW: streak at time of event
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE AXIOMS (Non-negotiable constants — RECALIBRATED)
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINE_AXIOMS = {
  // Probability bounds
  MAX_PROBABILITY_CAP: 88,              // Never output 100% probability. Legal + ethical wall.
  MIN_PROBABILITY_FLOOR: 1,            // Never output 0% — that would be a guarantee of failure.

  // Runway bands
  RED_BAND_RUNWAY_DAYS: 45,            // Below this = survival mode only.
  YELLOW_BAND_RUNWAY_DAYS: 90,         // Below this = hybrid strategy.

  // Capability calibration
  SELF_REPORT_INFLATION_AVG: 0.45,     // Users over-report skills by ~45% on average.
  SKILL_UNVERIFIED_DISCOUNT: 0.50,     // Unverified skills: 50% of claimed value. Applied ONCE.
  COMM_SCORE_CLIENT_THRESHOLD: 0.4,    // Below this = no client-facing work recommended.
  LOW_CAPITAL_THRESHOLD_INR: 5000,     // Below this + low comm score = hard ban list activates.
  MIN_OPPORTUNITY_SCORE: 0.75,         // Minimum match threshold for opportunity recommendation.

  // Ambition velocity thresholds (RECALIBRATED — GAP 12 fix)
  // Scaling: ₹50,000/month in 6 months at V_c 0.5 = A_v of 1.0
  AMBITION_VELOCITY_REALISTIC_MAX: 2.0,       // Below this = realistic
  AMBITION_VELOCITY_AGGRESSIVE: 4.0,          // Below this = aggressive but possible
  AMBITION_VELOCITY_CRITICAL: 8.0,            // Below this = exceptional (needs assessment)
  // Above CRITICAL = structurally misaligned (was: delusional)

  // Consistency scoring (RECALIBRATED — GAP 3 fix)
  CONSISTENCY_INITIAL_SCORE: 50,        // Starts neutral — not at 100
  CONSISTENCY_FAILURE_PENALTY: 8,       // Points deducted per failure (was 12 — too harsh)
  CONSISTENCY_COMPLETION_REWARD: 5,     // Points added per completion (was 8)
  CONSISTENCY_MILESTONE_REWARD: 20,     // Points added per milestone hit
  CONSISTENCY_PARTIAL_REWARD: 2,        // Points for partial completion
  CONSISTENCY_FLOOR_INTERVENTION: 15,   // Below this = trigger floor intervention

  // Streak bonuses (GAP 18 fix)
  STREAK_BONUS_PER_5_DAYS: 0.5,        // % probability boost per 5-day streak
  STREAK_MAX_BONUS: 3.0,               // Max streak bonus (percentage points)

  // Execution
  PARKINSON_COMPRESSION_FACTOR: 0.5,   // Base compression — adjusted by task type
  PARKINSON_COMPRESSION_LOW: 0.50,     // Writing, outreach — 50% compression fine
  PARKINSON_COMPRESSION_MEDIUM: 0.65,  // Planning, research — 65% compression
  PARKINSON_COMPRESSION_HIGH: 0.80,    // Technical builds — only 20% compression

  // Time gates (GAP 10 fix)
  SELECTION_TIMEOUT_HOURS: 72,          // Hours before engine defaults to Beta path
  MAX_PAUSE_DAYS: 7,                    // Maximum pause duration (GAP 17 fix)

  // Legal / safety
  MIN_USER_AGE: 18,                     // Minimum age for FP-OS
  FINANCIAL_ADVICE_DISCLAIMER: 'This is strategic coaching guidance for educational purposes only. It does not constitute financial, investment, or professional business advice. Consult a qualified professional for decisions involving significant capital.',
  MENTAL_HEALTH_REFERRAL_THRESHOLD: 3, // Consecutive burnout events before wellness referral
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HARD BAN CATEGORIES (Permanently blocked for qualifying profiles)
// ─────────────────────────────────────────────────────────────────────────────

export const HARD_BANNED_CATEGORIES = [
  'generic_dropshipping',
  'generic_freelancing_fiverr',
  'content_creation_agency_cold_start',
  'affiliate_marketing_cold_start',
  'crypto_adjacent_schemes',
  'mlm_structures',
  'amazon_fba_zero_capital',
] as const;

export type HardBannedCategory = typeof HARD_BANNED_CATEGORIES[number];
