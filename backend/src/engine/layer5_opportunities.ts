/**
 * FP-OS :: LAYER 5 — HYPER-LOCAL OPPORTUNITY MAPPING ENGINE
 *
 * This is the major moat. Generic AI gives generic opportunities.
 * FP maps opportunities to the user's SPECIFIC geographic and economic context.
 *
 * Three opportunity layers:
 * A → Local Geo-Arbitrage: What is scarce within 50–100km of this user?
 * B → National Digital Arbitrage: What can they do remotely if skills allow?
 * C → Trend Window Exploitation: What 6–18 month windows are open for this profile?
 *
 * The Hard Ban List is the engine's most legally and ethically important feature.
 * For certain profiles, generic recommendations are permanently prohibited.
 */

import {
  ContextMatrix,
  CapabilityVector,
  SurvivabilityAudit,
  OpportunityProfile,
  Opportunity,
  HardBanList,
  OpportunityCategory,
  GeographyTier,
  ENGINE_AXIOMS,
  HARD_BANNED_CATEGORIES,
  HardBannedCategory,
} from './types';
import { LLMService } from '../services/llm.service';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: HARD BAN LIST ENFORCER
// If capital < ₹5,000 AND comm score < 0.4 — certain categories are
// PERMANENTLY banned from any output. No exceptions.
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateHardBanList(matrix: ContextMatrix): HardBanList | null {
  const isLowCapital = matrix.socioeconomic.liquidCapital < ENGINE_AXIOMS.LOW_CAPITAL_THRESHOLD_INR;
  const isLowCommScore = matrix.humanCapital.communicationScore < ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD;

  if (isLowCapital && isLowCommScore) {
    return {
      bannedForThisProfile: [...HARD_BANNED_CATEGORIES],
      reasonForBan: `For users with capital under ₹${ENGINE_AXIOMS.LOW_CAPITAL_THRESHOLD_INR.toLocaleString('en-IN')} and communication score below ${ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD}, these paths have a structural failure rate above 95%. Recommending them would be irresponsible. The engine has permanently removed them from your option set.`,
      profileTrigger: `Capital ₹${matrix.socioeconomic.liquidCapital.toLocaleString('en-IN')} (threshold: ₹${ENGINE_AXIOMS.LOW_CAPITAL_THRESHOLD_INR.toLocaleString('en-IN')}) AND communication score ${matrix.humanCapital.communicationScore.toFixed(2)} (threshold: ${ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD}).`,
    };
  }

  // Partial ban: if only one condition is met
  if (isLowCapital) {
    const capitalOnlyBans: HardBannedCategory[] = [
      'generic_dropshipping',
      'amazon_fba_zero_capital',
      'crypto_adjacent_schemes',
      'mlm_structures',
    ];
    return {
      bannedForThisProfile: capitalOnlyBans,
      reasonForBan: `Capital-intensive paths are banned for your current financial profile. These require upfront investment you do not have.`,
      profileTrigger: `Capital ₹${matrix.socioeconomic.liquidCapital.toLocaleString('en-IN')} (below ₹${ENGINE_AXIOMS.LOW_CAPITAL_THRESHOLD_INR.toLocaleString('en-IN')} threshold).`,
    };
  }

  return null; // No bans apply
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: GEOGRAPHY-SPECIFIC OPPORTUNITY INTELLIGENCE
// Maps what is typically SCARCE and HIGH-VALUE in each geography tier.
// ─────────────────────────────────────────────────────────────────────────────

interface GeoOpportunityIntelligence {
  tier: GeographyTier;
  scarcities: string[];          // What local businesses desperately need
  underservedMarkets: string[];  // Markets with no proper competition
  localArbitrageMultiplier: number; // How much geo-arbitrage amplifies value
  typicalSMEProblems: string[];  // The exact problems local businesses face
}

export const GEO_OPPORTUNITY_MAP: Record<GeographyTier, GeoOpportunityIntelligence> = {
  tier1_metro: {
    tier: 'tier1_metro',
    scarcities: [
      'high-quality content creation for SMEs',
      'specialized technical consulting',
      'performance marketing for premium brands',
      'UX/UI design for funded startups',
    ],
    underservedMarkets: [
      'vernacular content for regional metro businesses',
      'b2b lead generation for tier-2 oriented brands',
    ],
    localArbitrageMultiplier: 0.8,  // Lower — market is competitive
    typicalSMEProblems: [
      'finding good designers without agency overhead',
      'automating customer follow-up workflows',
      'social media management that actually converts',
    ],
  },
  tier2_city: {
    tier: 'tier2_city',
    scarcities: [
      'basic business website development',
      'local SEO for businesses that have no online presence',
      'WhatsApp Business automation setup',
      'digital payment integration for traditional shops',
      'GST filing and basic accounting automation',
      'social media presence building',
    ],
    underservedMarkets: [
      'education technology for local coaching institutes',
      'inventory management for local retailers',
      'delivery route optimization for local distributors',
    ],
    localArbitrageMultiplier: 1.3,  // High — low competition, high demand
    typicalSMEProblems: [
      'no online presence and losing business to city competitors',
      'manual billing and stock-keeping losing money',
      'customers cannot find them on Google',
      'no systematic follow-up with existing customers',
    ],
  },
  tier3_semi_urban: {
    tier: 'tier3_semi_urban',
    scarcities: [
      'any digital presence help for local businesses',
      'basic smartphone training and digital literacy for shopkeepers',
      'Google My Business setup',
      'simple accounting app setup (Vyapar, OkCredit)',
      'online ordering setup for restaurants and shops',
    ],
    underservedMarkets: [
      'agricultural supply chain digitization',
      'local artisan marketplace access',
      'government scheme application assistance',
    ],
    localArbitrageMultiplier: 1.6,  // Very high — almost zero digital competition
    typicalSMEProblems: [
      'no awareness that digital solutions exist for their problems',
      'losing business to bigger cities because of lack of online presence',
      'manual cash management leading to losses',
    ],
  },
  rural: {
    tier: 'rural',
    scarcities: [
      'digital literacy and smartphone assistance',
      'government scheme navigation and application',
      'agricultural market price information access',
      'basic financial literacy and UPI assistance',
    ],
    underservedMarkets: [
      'connecting local produce directly to district buyers',
      'handicraft artisan online marketplace setup',
    ],
    localArbitrageMultiplier: 1.2,  // Moderate — demand exists but purchasing power is limited
    typicalSMEProblems: [
      'no access to fair market pricing for produce',
      'no systematic record keeping',
      'unable to apply for government schemes without assistance',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: OPPORTUNITY SCORE CALCULATOR
// Formula: (Market_Velocity * Local_Arbitrage_Multiplier) / Capital_Requirement_Index
// ─────────────────────────────────────────────────────────────────────────────

export function calculateOpportunityScore(params: {
  marketVelocity: number;         // 0.0 – 1.0. How fast is demand growing?
  localArbitrageMultiplier: number; // From geo map
  capitalRequirementINR: number;  // Capital needed
  userLiquidCapital: number;      // User's available capital
  skillMatchScore: number;        // 0.0 – 1.0. How well user's skills match
}): number {
  const capitalRequirementIndex = params.capitalRequirementINR === 0
    ? 0.1  // Zero capital requirement = best case (don't divide by 0)
    : Math.min(2.0, params.capitalRequirementINR / Math.max(1, params.userLiquidCapital));

  const rawScore = (params.marketVelocity * params.localArbitrageMultiplier * params.skillMatchScore)
    / capitalRequirementIndex;

  return Math.min(1.0, rawScore / 2); // Normalize to 0–1
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: LOCAL GEO-ARBITRAGE OPPORTUNITY GENERATOR
// Layer A: What can this user solve within 50-100km that no one else is solving?
// ─────────────────────────────────────────────────────────────────────────────

export function generateLocalGeoArbitrageOpportunities(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): Opportunity[] {
  const geoIntel = GEO_OPPORTUNITY_MAP[matrix.socioeconomic.geographyTier] || GEO_OPPORTUNITY_MAP['tier2_city'];
  const opportunities: Opportunity[] = [];

  // Match user skills to local scarcities
  for (const scarcity of geoIntel.scarcities.slice(0, 4)) { // Top 4 scarcities
    const skillMatchScore = calculateSkillMatchToScarcity(
      scarcity,
      capability,
      matrix.humanCapital.communicationScore,
    );

    if (skillMatchScore < 0.15) continue; // Not enough skill match

    const oppScore = calculateOpportunityScore({
      marketVelocity: 0.75, // Local SME digitization is growing fast everywhere
      localArbitrageMultiplier: geoIntel.localArbitrageMultiplier,
      capitalRequirementINR: 0, // Local service work = zero capital
      userLiquidCapital: matrix.socioeconomic.liquidCapital,
      skillMatchScore,
    });

    if (oppScore >= ENGINE_AXIOMS.MIN_OPPORTUNITY_SCORE) {
      opportunities.push({
        id: `local_${scarcity.replace(/\s+/g, '_').toLowerCase().slice(0, 20)}`,
        title: scarcity,
        category: 'local_geo_arbitrage',
        opportunityScore: oppScore,
        capitalRequired: 0,
        timeToFirstRevenue: 7,
        communicationScoreRequired: 0.30,
        technicalScoreRequired: 0.20,
        matchesUserProfile: skillMatchScore >= 0.30,
        geographySpecific: true,
        saturationRisk: `This will be competitive in ${matrix.socioeconomic.geographyTier === 'tier2_city' ? '12–18' : '24–36'} months.`,
        whyThisForThisUser: `In your ${matrix.socioeconomic.geographyTier} area, there are likely 50–200 businesses actively struggling with this. You don't need to win globally. You need to win locally. Capital required: ₹0. Your biggest asset: showing up in person, which no remote competitor can do.`,
        intelligenceEnriched: false,
      });
    }
  }

  return opportunities;
}

function calculateSkillMatchToScarcity(
  scarcity: string,
  capability: CapabilityVector,
  commScore: number,
): number {
  const s = scarcity.toLowerCase();
  let matchScore = 0;

  for (const skill of capability.calibratedSkills) {
    const skillLower = skill.skillName.toLowerCase();

    // Check for keyword overlap
    if (s.includes('website') && (skillLower.includes('web') || skillLower.includes('design'))) {
      matchScore = Math.max(matchScore, skill.verifiedLevel);
    }
    if (s.includes('seo') && skillLower.includes('seo')) {
      matchScore = Math.max(matchScore, skill.verifiedLevel);
    }
    if (s.includes('automation') && (skillLower.includes('automat') || skillLower.includes('no-code') || skillLower.includes('zapier'))) {
      matchScore = Math.max(matchScore, skill.verifiedLevel);
    }
    if (s.includes('social media') && (skillLower.includes('social') || skillLower.includes('content') || skillLower.includes('market'))) {
      matchScore = Math.max(matchScore, skill.verifiedLevel * commScore);
    }
    if (s.includes('digital') && skill.category === 'technical') {
      matchScore = Math.max(matchScore, skill.verifiedLevel * 0.6);
    }
    if (s.includes('accounting') && (skillLower.includes('excel') || skillLower.includes('account'))) {
      matchScore = Math.max(matchScore, skill.verifiedLevel);
    }
  }

  return matchScore;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: NATIONAL DIGITAL ARBITRAGE GENERATOR
// Layer B: What can they do remotely? Only unlocked if comm score qualifies.
// ─────────────────────────────────────────────────────────────────────────────

export function generateDigitalArbitrageOpportunities(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): Opportunity[] {
  // Hard gate: below comm score threshold = no remote client work
  if (matrix.humanCapital.communicationScore < ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD) {
    return []; // Gateway blocked
  }

  const opportunities: Opportunity[] = [];
  const techScore = capability.trueCapabilityScore;
  const commScore = matrix.humanCapital.communicationScore;

  // Technical path — non-client-facing remote work
  if (techScore >= 0.40) {
    opportunities.push({
      id: 'remote_tech_non_client',
      title: 'Remote Technical Work (Non-Client Facing)',
      category: 'national_digital_remote',
      opportunityScore: calculateOpportunityScore({
        marketVelocity: 0.80,
        localArbitrageMultiplier: 1.0,
        capitalRequirementINR: 0,
        userLiquidCapital: matrix.socioeconomic.liquidCapital,
        skillMatchScore: techScore,
      }),
      capitalRequired: 0,
      timeToFirstRevenue: 14,
      communicationScoreRequired: 0.40,
      technicalScoreRequired: 0.40,
      matchesUserProfile: true,
      geographySpecific: false,
      saturationRisk: 'Growing market. Saturation in your specific niche will take 2–3 years.',
      whyThisForThisUser: `Your technical score (${(techScore * 100).toFixed(0)}%) clears the threshold. Your communication score (${(commScore * 100).toFixed(0)}%) is above minimum for non-client-facing remote work. Target Indian startups and small product companies who need execution without the overhead.`,
      intelligenceEnriched: false,
    });
  }

  // High comm score path — client-facing remote consulting
  if (commScore >= 0.65 && techScore >= 0.30) {
    opportunities.push({
      id: 'remote_client_consulting',
      title: 'Remote Client Consulting (National or International)',
      category: 'national_digital_remote',
      opportunityScore: calculateOpportunityScore({
        marketVelocity: 0.70,
        localArbitrageMultiplier: 1.2,
        capitalRequirementINR: 0,
        userLiquidCapital: matrix.socioeconomic.liquidCapital,
        skillMatchScore: (commScore + techScore) / 2,
      }),
      capitalRequired: 0,
      timeToFirstRevenue: 21,
      communicationScoreRequired: 0.65,
      technicalScoreRequired: 0.30,
      matchesUserProfile: true,
      geographySpecific: false,
      saturationRisk: 'High-skill consulting is not easily saturated. Your specific niche knowledge is the moat.',
      whyThisForThisUser: `Your communication score is strong enough to compete in client-facing markets. Combined with your technical skills, this opens national remote work at rates significantly above local market pricing.`,
      intelligenceEnriched: false,
    });
  }

  return opportunities.filter(o => o.opportunityScore >= ENGINE_AXIOMS.MIN_OPPORTUNITY_SCORE);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: TREND WINDOW EXPLOITATION
// Layer C: What 6–18 month windows exist for this specific profile?
// ─────────────────────────────────────────────────────────────────────────────

interface TrendWindow {
  trend: string;
  windowMonths: number;          // How long before saturation
  requiredCapabilityKeyword: string;
  marketVelocity: number;
  whyNow: string;
}

const CURRENT_TREND_WINDOWS: TrendWindow[] = [
  {
    trend: 'AI Tool Implementation for Local Businesses',
    windowMonths: 14,
    requiredCapabilityKeyword: 'ai',
    marketVelocity: 0.95,
    whyNow: 'Local businesses are aware AI exists but 95% have no idea how to implement it. The window to be the person who does this locally is 12–14 months before it becomes a commodity service.',
  },
  {
    trend: 'WhatsApp Business Automation',
    windowMonths: 18,
    requiredCapabilityKeyword: 'automat',
    marketVelocity: 0.85,
    whyNow: 'Every Indian SME runs on WhatsApp. Very few have automated follow-ups, catalogs, or ordering. This gap is enormous and nobody is solving it at the local level.',
  },
  {
    trend: 'Short-Form Video for Local Brands',
    windowMonths: 12,
    requiredCapabilityKeyword: 'video',
    marketVelocity: 0.90,
    whyNow: 'Local businesses are losing customers to brands with good video content. The production cost barrier is dropping. Someone who can produce even basic reels for local brands is immediately valuable.',
  },
  {
    trend: 'No-Code App Development for Specific Industry Problems',
    windowMonths: 20,
    requiredCapabilityKeyword: 'no-code',
    marketVelocity: 0.80,
    whyNow: 'Industry-specific no-code solutions are not yet commoditized. A tool built for a specific problem (e.g., appointment booking for local clinics) can capture a market segment before developers catch on.',
  },
];

export function generateTrendWindowOpportunities(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const trend of CURRENT_TREND_WINDOWS) {
    // Check if user's skills can execute this trend
    const hasRelevantSkill = capability.calibratedSkills.some(
      (s) => s.skillName.toLowerCase().includes(trend.requiredCapabilityKeyword)
        || (trend.requiredCapabilityKeyword === 'ai' && s.category === 'technical' && s.verifiedLevel >= 0.30)
        || (trend.requiredCapabilityKeyword === 'automat' && s.category === 'technical' && s.verifiedLevel >= 0.25)
    );

    if (!hasRelevantSkill) continue;

    const score = calculateOpportunityScore({
      marketVelocity: trend.marketVelocity,
      localArbitrageMultiplier: (GEO_OPPORTUNITY_MAP[matrix.socioeconomic.geographyTier] || GEO_OPPORTUNITY_MAP['tier2_city']).localArbitrageMultiplier,
      capitalRequirementINR: 0,
      userLiquidCapital: matrix.socioeconomic.liquidCapital,
      skillMatchScore: 0.65,  // Trends reward early movers
    });

    opportunities.push({
      id: `trend_${trend.trend.replace(/\s+/g, '_').toLowerCase().slice(0, 25)}`,
      title: trend.trend,
      category: 'trend_window_exploitation',
      opportunityScore: score,
      capitalRequired: 0,
      timeToFirstRevenue: 21,
      communicationScoreRequired: 0.35,
      technicalScoreRequired: 0.30,
      matchesUserProfile: score >= ENGINE_AXIOMS.MIN_OPPORTUNITY_SCORE,
      geographySpecific: false,
      saturationRisk: `This window is open for approximately ${trend.windowMonths} months before it becomes a commodity service.`,
      whyThisForThisUser: trend.whyNow,
      intelligenceEnriched: false,
    });
  }

  return opportunities.filter(o => o.opportunityScore >= ENGINE_AXIOMS.MIN_OPPORTUNITY_SCORE);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: MAIN LAYER 5 ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export async function runOpportunityMapping(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  survivability: SurvivabilityAudit,
): Promise<OpportunityProfile> {
  // Step 1: Evaluate hard ban list
  const hardBanList = evaluateHardBanList(matrix);

  // Step 2: Generate opportunities across all three layers (Static Fallbacks)
  const localOpportunities = generateLocalGeoArbitrageOpportunities(matrix, capability);
  const digitalOpportunities = generateDigitalArbitrageOpportunities(matrix, capability);
  const trendOpportunities = generateTrendWindowOpportunities(matrix, capability);

  // Step 3: LLM Universal Infinite Generator
  let dynamicOpps: Opportunity[] = [];
  try {
    const rawDynamic = await LLMService.generateDynamicOpportunities(matrix, capability);
    dynamicOpps = rawDynamic.map(d => ({
      ...d,
      matchesUserProfile: true,
      geographySpecific: d.category === 'local_geo_arbitrage',
      saturationRisk: 'Dynamic market opportunity.',
      intelligenceEnriched: true,
      communicationScoreRequired: 0, // Bypassed since LLM handled constraints
      technicalScoreRequired: 0,
    }));
  } catch (err) {
    console.error("Dynamic opportunity generation failed, falling back to static", err);
  }

  // Step 4: Combine and rank
  const allOpportunities = [...dynamicOpps, ...localOpportunities, ...digitalOpportunities, ...trendOpportunities]
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Step 4: Identify top picks
  const topLocal = localOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)[0];
  const topDigital = matrix.humanCapital.communicationScore >= ENGINE_AXIOMS.COMM_SCORE_CLIENT_THRESHOLD
    ? digitalOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)[0] ?? null
    : null;

  // Fallback if no opportunities meet the threshold
  const fallbackOpportunity: Opportunity = {
    id: 'survival_labor',
    title: 'Immediate Local Labor Arbitrage',
    category: 'local_geo_arbitrage',
    opportunityScore: 0.75,
    capitalRequired: 0,
    timeToFirstRevenue: 1,
    communicationScoreRequired: 0.10,
    technicalScoreRequired: 0,
    matchesUserProfile: true,
    geographySpecific: true,
    saturationRisk: 'Always available — not scalable.',
    whyThisForThisUser: 'Zero barrier to entry. Use this to survive while building skills for better opportunities.',
    intelligenceEnriched: false,
  };

  return {
    rankedOpportunities: allOpportunities.length > 0 ? allOpportunities : [fallbackOpportunity],
    hardBanList,
    topLocalOpportunity: topLocal ?? fallbackOpportunity,
    topDigitalOpportunity: topDigital,
    topSocialMediaOpportunity: null,
    intelligenceEnriched: false,
  };
}
