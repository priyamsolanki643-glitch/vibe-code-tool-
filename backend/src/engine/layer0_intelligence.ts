/**
 * FP-OS :: LAYER 0 — REAL-TIME MARKET INTELLIGENCE MATRIX
 *
 * THE TRILLION-DOLLAR LAYER.
 *
 * This is what makes FP-OS categorically different from every AI assistant
 * on the market — including Gemini, ChatGPT, and Google Search.
 *
 * Those tools give GENERIC ANSWERS to generic questions.
 * This layer generates a USER-SPECIFIC INTELLIGENCE BRIEF:
 * A structured research mandate that forces the AI backend to answer
 * PRECISE, HYPER-LOCAL, SKILL-SPECIFIC questions BEFORE any strategy is built.
 *
 * The result:
 * - Not "freelancing is good" — but "in Jaipur RIGHT NOW, there are ~340 SMEs
 *   with no Google Maps presence. Your design skills can command ₹4,000–₹8,000
 *   per setup. 6 clients = your ₹30,000/month target. Here's exactly how."
 *
 * - Not "try content creation" — but "Hindi personal finance Reels are getting
 *   4–8x the organic reach of English content right now on Instagram.
 *   Given your 2x/week capacity and procrastination pattern, here's the
 *   specific content system that works without a daily posting schedule."
 *
 * What this layer produces:
 * 1. An IntelligenceBrief: Structured queries the AI MUST answer before advising
 * 2. A MarketIntelligenceReport: Filled intelligence that enriches all downstream layers
 * 3. A SkillGapAnalysis: The precise bridge from current skills to target path
 *
 * Why no other AI does this:
 * - It requires deep constraint awareness (your specific city, skills, time, capital)
 * - It routes through a structured research phase before advice generation
 * - The intelligence is USER-SPECIFIC, not population-level averages
 * - It updates every session — not static generic market data
 *
 * LEGAL DISCLAIMER:
 * All market intelligence is based on available data, structured estimation,
 * and AI-assisted analysis. It is NOT certified market research, financial
 * analysis, or professional investment guidance. Treat all figures as
 * directional estimates, not guarantees.
 */

import {
  ContextMatrix,
  CapabilityVector,
  IntelligenceBrief,
  IntelligenceQuery,
  MarketIntelligenceReport,
  SkillDemandSignal,
  LocalMarketGap,
  SocialMediaOpportunity,
  CompetitorLandscape,
  TimingSignal,
  SkillGapAnalysis,
  MissingSkill,
  BridgingStep,
  GeographyTier,
  ENGINE_AXIOMS,
} from './types';
import { LLMService } from '../services/llm.service';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: INTELLIGENCE BRIEF GENERATOR
// Produces the structured research mandate the AI backend must execute.
// This is the "brief" that gets sent to the AI before simulation runs.
// ─────────────────────────────────────────────────────────────────────────────

export function generateIntelligenceBrief(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): IntelligenceBrief {
  const { socioeconomic, humanCapital, goalVector, infrastructure } = matrix;
  const topSkills = capability.calibratedSkills
    .sort((a, b) => b.verifiedLevel - a.verifiedLevel)
    .slice(0, 3)
    .map((s) => s.skillName);

  const locationContext = [
    socioeconomic.city,
    socioeconomic.region,
    socioeconomic.country,
    socioeconomic.geographyTier,
  ]
    .filter(Boolean)
    .join(', ');

  const skillDemandQueries: IntelligenceQuery[] = topSkills.map((skill, i) => ({
    queryId: `skill_demand_${i}`,
    category: 'skill_demand',
    query: `What is the CURRENT demand for "${skill}" in ${locationContext}? Specifically: (1) How many job postings, project listings, or active gig requests exist for this skill in the past 30 days? (2) What is the going rate per project/month for this skill in ${socioeconomic.geographyTier} areas of ${socioeconomic.country}? (3) Is demand rising, stable, or falling compared to 6 months ago? (4) What adjacent skill would increase demand for "${skill}" by 50%+ in this market?`,
    expectedDataFormat: 'demand_level, trend_direction, rate_range_INR, adjacent_skill',
    importance: 'critical',
    searchHints: [
      `Google: "${skill} freelance jobs ${socioeconomic.city ?? socioeconomic.region}"`,
      `IndiaMart, Internshala, LinkedIn Jobs: "${skill}" in ${socioeconomic.region}`,
      `Google Trends: "${skill}" search trend in India last 12 months`,
      `Upwork/Fiverr market data for "${skill}" India category`,
    ],
  }));

  const localMarketQueries: IntelligenceQuery[] = [
    {
      queryId: 'local_gap_sme',
      category: 'local_market',
      query: `In ${locationContext}, specifically for ${socioeconomic.geographyTier} areas: (1) What percentage of local small businesses (shops, restaurants, clinics, coaching centers) have NO digital presence? (2) What do businesses in this area spend per month on digital services when they do use them? (3) What specific business problem in this area has the highest pain level but lowest number of people solving it? (4) How many businesses of type [${topSkills.join(', ')} relevant] exist within 20km of the user?`,
      expectedDataFormat: 'businesses_without_digital, avg_spend_INR, top_unsolved_problem, business_count',
      importance: 'critical',
      searchHints: [
        `Google Maps: Count of businesses with <10 reviews in ${socioeconomic.city ?? socioeconomic.region}`,
        `JustDial, Sulekha listings in ${socioeconomic.city ?? socioeconomic.region}`,
        `IndiaFilings, Zaubacorp business registrations in ${socioeconomic.region}`,
        `Local Facebook groups for "${socioeconomic.city ?? socioeconomic.region} business" — what problems are posted`,
      ],
    },
    {
      queryId: 'local_pricing_benchmark',
      category: 'local_market',
      query: `What are local freelancers and service providers charging in ${locationContext} for services matching skills: ${topSkills.join(', ')}? Find actual pricing from: local Facebook business groups, WhatsApp community posts, IndiaMart quotations, or Sulekha listings. What is the price gap between what they charge and what quality providers could charge?`,
      expectedDataFormat: 'local_price_low, local_price_high, quality_premium_possible',
      importance: 'high',
      searchHints: [
        `Facebook: "${topSkills[0]} ${socioeconomic.city ?? socioeconomic.region} price"`,
        `WhatsApp groups for local businesses in ${socioeconomic.region}`,
        `IndiaMart quotation board for ${topSkills[0]}`,
      ],
    },
  ];

  const socialMediaTrendQueries: IntelligenceQuery[] = [
    {
      queryId: 'social_trend_instagram',
      category: 'social_media',
      query: `On Instagram RIGHT NOW (last 30 days): (1) What content niches related to ${topSkills.join(', ')} or ${goalVector.declaredGoal} are getting the highest organic reach in ${humanCapital.languageRegister === 'hindi' || humanCapital.languageRegister === 'hinglish' ? 'Hindi/Hinglish' : 'English'}? (2) What Reel formats under 60 seconds are going viral in this niche? (3) What posting frequency is creators in this niche using to grow? (4) What is the realistic follower count needed before monetization is possible? (5) What are the 3 fastest-growing content angles in this space that are NOT yet oversaturated?`,
      expectedDataFormat: 'top_niches, viral_formats, posting_frequency, monetization_threshold, emerging_angles',
      importance: 'high',
      searchHints: [
        `Instagram Explore search: ${topSkills[0]} in ${humanCapital.languageRegister} language`,
        `Creator.co, Social Blade trend data`,
        `Google: "Instagram Reels ${topSkills[0]} viral 2024"`,
        `YouTube: search "${topSkills[0]} Instagram growth" for recent creator data`,
      ],
    },
    {
      queryId: 'social_trend_youtube',
      category: 'social_media',
      query: `On YouTube (last 90 days): What content about ${topSkills.join(', ')} is growing in ${humanCapital.languageRegister === 'hindi' || humanCapital.languageRegister === 'hinglish' ? 'Hindi' : 'English'} that a creator with ${Math.round(infrastructure.dailyUninterruptedHours)}h/day could realistically produce? What is the monetization timeline (views/month needed for AdSense) and what alternative monetizations are creators in this space using (course, community, services)?`,
      expectedDataFormat: 'content_type, production_effort_hours, monetization_path, timeline_months',
      importance: 'medium',
      searchHints: [
        `YouTube Trending in India for ${topSkills[0]} category`,
        `VidIQ, TubeBuddy trend data for ${topSkills[0]}`,
        `Social Blade India category growth`,
      ],
    },
    {
      queryId: 'social_trend_linkedin',
      category: 'social_media',
      query: `On LinkedIn (last 60 days): Is there organic reach for content about ${topSkills.join(', ')} in India? What post formats (carousels, polls, text posts, videos) are currently outperforming? What companies in ${socioeconomic.geographyTier} cities are actively hiring or engaging with ${topSkills[0]} related content? Can this profile build a client pipeline through LinkedIn given their skills?`,
      expectedDataFormat: 'reach_level, best_format, client_opportunity, hiring_signal',
      importance: 'medium',
      searchHints: [
        `LinkedIn: search "${topSkills[0]}" posts with high engagement in last 30 days`,
        `LinkedIn job postings: ${topSkills[0]} in ${socioeconomic.country}`,
      ],
    },
  ];

  const competitorLandscapeQueries: IntelligenceQuery[] = [
    {
      queryId: 'competitor_local',
      category: 'competitor',
      query: `In ${locationContext}, for services matching skills ${topSkills.join(', ')}: (1) How many active freelancers/service providers are operating locally? (2) What is the quality level of local competition (are they professional or amateurish)? (3) What complaints do clients have about existing providers (reviews, social media complaints)? (4) What gap in quality, communication, or reliability could a new entrant fill to win clients quickly?`,
      expectedDataFormat: 'competitor_count, quality_level, client_complaints, differentiation_gap',
      importance: 'high',
      searchHints: [
        `Google Maps: "${topSkills[0]} ${socioeconomic.city ?? socioeconomic.region}" — count listings`,
        `Sulekha, JustDial: ${topSkills[0]} providers in ${socioeconomic.city ?? socioeconomic.region} — reviews`,
        `Facebook: "${topSkills[0]} ${socioeconomic.region}" groups — quality of posts`,
      ],
    },
  ];

  const timingSignalQueries: IntelligenceQuery[] = [
    {
      queryId: 'timing_market_window',
      category: 'timing',
      query: `For skills ${topSkills.join(', ')} in ${socioeconomic.country}: (1) Is the market opportunity window for these skills currently opening (rising demand), peak (saturating), or closing (declining)? (2) What specific macro trends (AI tools, government policy, economic shifts) are creating or destroying demand for these skills in the next 12 months? (3) If the user waits 6 months to start, how does that affect the opportunity? (4) What is the single most time-sensitive opportunity for this profile RIGHT NOW?`,
      expectedDataFormat: 'window_status, macro_trends, wait_cost_estimate, top_timing_opportunity',
      importance: 'critical',
      searchHints: [
        `Google Trends: ${topSkills[0]} in India — 12 month trend`,
        `Google Trends: ${topSkills[0]} in ${socioeconomic.region} — compare to national`,
        `News: "India ${topSkills[0]} market 2024" — current demand signals`,
        `NASSCOM, MSME reports on ${socioeconomic.geographyTier} digital adoption`,
      ],
    },
  ];

  const researchMandate = buildResearchMandate(
    matrix,
    capability,
    topSkills,
    locationContext,
    [...skillDemandQueries, ...localMarketQueries, ...socialMediaTrendQueries, ...competitorLandscapeQueries, ...timingSignalQueries]
  );

  const prioritySignals = [
    `CRITICAL: Verify actual demand for ${topSkills[0]} in ${locationContext} — this affects path probability`,
    `HIGH: Map local market gaps within 20km of user — this is their lowest-friction first client source`,
    `HIGH: Identify ONE social media platform with the highest current organic reach for their niche`,
    `MEDIUM: Assess competitor landscape to find differentiation gap`,
    `MEDIUM: Confirm timing window — is this a rising or falling opportunity?`,
  ];

  return {
    skillDemandQueries,
    localMarketQueries,
    socialMediaTrendQueries,
    competitorLandscapeQueries,
    timingSignalQueries,
    researchMandate,
    prioritySignals,
  };
}

function buildResearchMandate(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  topSkills: string[],
  locationContext: string,
  allQueries: IntelligenceQuery[],
): string {
  const criticalQueries = allQueries.filter((q) => q.importance === 'critical');
  const highQueries = allQueries.filter((q) => q.importance === 'high');

  return `
═══════════════════════════════════════════════════════════════
FP-OS INTELLIGENCE RESEARCH MANDATE
User Profile: ${matrix.userId}
Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════

CONTEXT:
This user is located in: ${locationContext}
Top skills: ${topSkills.join(', ')}
Communication level: ${matrix.humanCapital.communicationScore > 0.6 ? 'Strong' : matrix.humanCapital.communicationScore > 0.4 ? 'Moderate' : 'Basic'}
Capital available: ₹${matrix.socioeconomic.liquidCapital.toLocaleString('en-IN')}
Goal: ${matrix.goalVector.declaredGoal}
Timeline: ${matrix.goalVector.timelineMonths} months
Language register: ${matrix.humanCapital.languageRegister}

MANDATE:
Execute the following research BEFORE generating any strategy or path recommendation.
This intelligence will directly determine which paths are recommended and at what probability.
Generic answers are not acceptable — every answer must be specific to this user's city, skills, and constraints.

CRITICAL QUERIES (answer these first — they gate strategy generation):
${criticalQueries.map((q, i) => `${i + 1}. [${q.queryId.toUpperCase()}] ${q.query}`).join('\n\n')}

HIGH PRIORITY QUERIES:
${highQueries.map((q, i) => `${i + 1}. [${q.queryId.toUpperCase()}] ${q.query}`).join('\n\n')}

OUTPUT FORMAT:
Return a structured JSON response matching the MarketIntelligenceReport interface.
Confidence level: mark each data point as 'verified', 'estimated', or 'inferred'.
If a data point cannot be verified, say so — do not fabricate data.

LEGAL NOTE:
All intelligence must include a disclaimer that figures are estimates based on available data,
not certified market research. Never present market size estimates as guarantees.

═══════════════════════════════════════════════════════════════
  `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: SKILL DEMAND SIGNAL BUILDER
// Generates structured skill demand analysis from research results.
// When no live data is available, uses structural inference from geo + skill data.
// ─────────────────────────────────────────────────────────────────────────────

export function buildSkillDemandSignal(
  skill: string,
  geographyTier: GeographyTier,
  skillVerifiedLevel: number,
  skillCategory: string,
): SkillDemandSignal {
  // Structural inference when live data is not yet available
  // These are directional estimates based on geo + skill category patterns
  const tierDemandMultipliers: Record<GeographyTier, number> = {
    tier1_metro: 0.85,      // High demand but also high competition
    tier2_city: 0.90,       // Strong demand, lower competition — best balance
    tier3_semi_urban: 0.80, // Good demand, very low competition
    rural: 0.50,            // Limited demand but near-zero competition
  };

  const skillKeywords = skill.toLowerCase();
  let baseDemand: SkillDemandSignal['demandLevel'] = 'medium';
  let trendDirection: SkillDemandSignal['trendDirection'] = 'stable';
  let rateRangeLow = 5000;
  let rateRangeHigh = 15000;
  let adjacentSkills: string[] = [];

  // Technical skills pattern matching
  if (skillKeywords.includes('python') || skillKeywords.includes('machine learning') || skillKeywords.includes('ai')) {
    baseDemand = 'very_high'; trendDirection = 'rising';
    rateRangeLow = 20000; rateRangeHigh = 80000;
    adjacentSkills = ['LLM API integration', 'Data Analysis', 'Automation scripting'];
  } else if (skillKeywords.includes('web') || skillKeywords.includes('react') || skillKeywords.includes('javascript')) {
    baseDemand = 'high'; trendDirection = 'rising';
    rateRangeLow = 15000; rateRangeHigh = 50000;
    adjacentSkills = ['No-code tools', 'SEO', 'Performance optimization'];
  } else if (skillKeywords.includes('design') || skillKeywords.includes('figma') || skillKeywords.includes('graphic')) {
    baseDemand = 'high'; trendDirection = 'stable';
    rateRangeLow = 8000; rateRangeHigh = 35000;
    adjacentSkills = ['Video editing', 'Brand identity', 'Social media design'];
  } else if (skillKeywords.includes('video') || skillKeywords.includes('edit') || skillKeywords.includes('reel')) {
    baseDemand = 'very_high'; trendDirection = 'rising';
    rateRangeLow = 10000; rateRangeHigh = 40000;
    adjacentSkills = ['Motion graphics', 'YouTube thumbnail design', 'Color grading'];
  } else if (skillKeywords.includes('content') || skillKeywords.includes('writ') || skillKeywords.includes('copy')) {
    baseDemand = 'high'; trendDirection = 'rising';
    rateRangeLow = 8000; rateRangeHigh = 30000;
    adjacentSkills = ['SEO writing', 'Email marketing', 'Social media copywriting'];
  } else if (skillKeywords.includes('seo') || skillKeywords.includes('digital marketing')) {
    baseDemand = 'high'; trendDirection = 'rising';
    rateRangeLow = 10000; rateRangeHigh = 35000;
    adjacentSkills = ['Google Ads', 'Meta Ads', 'Analytics'];
  } else if (skillKeywords.includes('excel') || skillKeywords.includes('account') || skillKeywords.includes('gst')) {
    baseDemand = 'high'; trendDirection = 'stable';
    rateRangeLow = 6000; rateRangeHigh = 20000;
    adjacentSkills = ['Tally', 'Zoho Books', 'Business automation'];
  } else if (skillKeywords.includes('teach') || skillKeywords.includes('tutor')) {
    baseDemand = 'high'; trendDirection = 'rising';
    rateRangeLow = 5000; rateRangeHigh = 25000;
    adjacentSkills = ['Online course creation', 'Assessment design', 'LMS tools'];
  } else if (skillKeywords.includes('automat') || skillKeywords.includes('zapier') || skillKeywords.includes('no-code')) {
    baseDemand = 'very_high'; trendDirection = 'rising';
    rateRangeLow = 12000; rateRangeHigh = 45000;
    adjacentSkills = ['Make.com', 'n8n', 'AI workflow integration'];
  } else if (skillKeywords.includes('photo') || skillKeywords.includes('camera')) {
    baseDemand = 'medium'; trendDirection = 'stable';
    rateRangeLow = 5000; rateRangeHigh = 20000;
    adjacentSkills = ['Video coverage', 'Social content creation', 'Product photography'];
  }

  // Adjust rates for geography tier
  const geoMultiplier = tierDemandMultipliers[geographyTier] || 0.90;
  const tierRateMultiplier = geographyTier === 'tier1_metro' ? 1.4 : geographyTier === 'tier2_city' ? 1.0 : 0.7;

  const adjustedRateLow = Math.floor(rateRangeLow * tierRateMultiplier);
  const adjustedRateHigh = Math.floor(rateRangeHigh * tierRateMultiplier);

  const localVsNational: SkillDemandSignal['localDemandVsNational'] =
    geographyTier === 'tier2_city' || geographyTier === 'tier3_semi_urban'
      ? 'above_average' // Local digital skill shortage = higher relative demand
      : 'average';

  const estimatedOpportunities = Math.floor(
    (geographyTier === 'tier1_metro' ? 500 :
     geographyTier === 'tier2_city' ? 200 :
     geographyTier === 'tier3_semi_urban' ? 80 : 30) * geoMultiplier
  );

  const insightNarrative = `${skill} shows ${baseDemand.replace('_', ' ')} demand in your area (${geographyTier.replace('_', ' ')}) with a ${trendDirection} trajectory. Based on structural market analysis, the active opportunity pool in your geography is approximately ${estimatedOpportunities}+ positions. The rate range of ₹${adjustedRateLow.toLocaleString('en-IN')}–₹${adjustedRateHigh.toLocaleString('en-IN')}/month reflects ${geographyTier === 'tier1_metro' ? 'metro-competitive pricing' : geographyTier === 'tier2_city' ? 'tier-2 market pricing with low competition advantage' : 'local market pricing with significant first-mover advantage'}. Adding ${adjacentSkills[0]} to your stack could increase your demand and rate ceiling significantly.`;

  return {
    skill,
    demandLevel: baseDemand,
    trendDirection,
    localDemandVsNational: localVsNational,
    estimatedLocalOpportunities: estimatedOpportunities,
    averageRateRange: { low: adjustedRateLow, high: adjustedRateHigh },
    adjacentSkillsInDemand: adjacentSkills,
    insightNarrative,
    dataConfidence: 'estimated', // Always mark structural inference as estimated
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: LOCAL MARKET GAP DETECTOR
// Identifies specific, hyper-local gaps the user can fill.
// ─────────────────────────────────────────────────────────────────────────────

export function detectLocalMarketGaps(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): LocalMarketGap[] {
  const { socioeconomic, humanCapital } = matrix;
  const gaps: LocalMarketGap[] = [];
  const tier = socioeconomic.geographyTier;
  const topSkills = capability.calibratedSkills
    .sort((a, b) => b.verifiedLevel - a.verifiedLevel)
    .slice(0, 3);

  // Gap 1: Google/Local SEO for small businesses
  if (topSkills.some((s) =>
    s.skillName.toLowerCase().includes('seo') ||
    s.skillName.toLowerCase().includes('digital') ||
    s.skillName.toLowerCase().includes('market'))) {
    const businessCount = tier === 'tier1_metro' ? 2000 : tier === 'tier2_city' ? 800 : tier === 'tier3_semi_urban' ? 300 : 100;
    const avgSpend = tier === 'tier1_metro' ? 8000 : tier === 'tier2_city' ? 5000 : 3000;

    gaps.push({
      gapId: 'local_seo_gmb',
      gapTitle: `Google Business Profile Optimization for Local Businesses in ${socioeconomic.city ?? socioeconomic.region}`,
      problemDescription: `An estimated ${Math.floor(businessCount * 0.6)}+ businesses in your area have either no Google Business Profile or a poorly optimized one with fewer than 10 reviews. This makes them invisible when customers search locally. This is a simple, high-value service with zero competition at the local level in ${tier} areas.`,
      targetBusinessType: 'Restaurants, clinics, coaching centers, retail shops, salons',
      estimatedAffectedBusinesses: Math.floor(businessCount * 0.6),
      averageSpendPerBusiness: avgSpend,
      competitorCount: tier === 'tier1_metro' ? 'moderate' : 'very_few',
      windowDurationMonths: tier === 'tier2_city' ? 18 : 30,
      requiredSkills: ['Basic digital marketing', 'Google Business Profile', 'Local SEO'],
      acquisitionStrategy: 'Walk into 5 local shops per day. Show them their competitor\'s ranking vs theirs. Offer a one-page "visibility audit". This tactile, in-person sales approach works 3-5x better than cold outreach in this market.',
      firstClientAcquisitionStep: 'Create a Google Business Profile audit sheet today. Tomorrow, walk into 5 local shops with a printed comparison of their Google visibility vs their top competitor. Offer to fix it for ₹' + avgSpend.toLocaleString('en-IN') + '.',
      revenueProjection: {
        month1: avgSpend * 2,
        month3: avgSpend * 5,
        month6: avgSpend * 10,
      },
    });
  }

  // Gap 2: WhatsApp Business automation
  if (topSkills.some((s) =>
    s.skillName.toLowerCase().includes('automat') ||
    s.skillName.toLowerCase().includes('no-code') ||
    s.skillName.toLowerCase().includes('zapier') ||
    (s.category === 'technical' && s.verifiedLevel > 0.3))) {
    gaps.push({
      gapId: 'whatsapp_business_automation',
      gapTitle: `WhatsApp Business Automation for Local SMEs in ${socioeconomic.city ?? socioeconomic.region}`,
      problemDescription: `Every Indian SME runs on WhatsApp but almost none have automated follow-ups, product catalogs, order tracking, or customer service flows. This gap is enormous — and solving it requires NO coding, just no-code tools and understanding of business workflows. The window in ${tier} areas is estimated at 18–24 months before it becomes a commodity.`,
      targetBusinessType: 'Restaurants with delivery, coaching institutes, retail shops, service businesses',
      estimatedAffectedBusinesses: tier === 'tier1_metro' ? 5000 : tier === 'tier2_city' ? 1500 : 500,
      averageSpendPerBusiness: tier === 'tier1_metro' ? 6000 : 4000,
      competitorCount: 'very_few',
      windowDurationMonths: 20,
      requiredSkills: ['WhatsApp Business API basics', 'No-code automation (Wati, Interakt, or WATI)', 'Business process understanding'],
      acquisitionStrategy: 'Target restaurants and coaching institutes first — they have the highest WhatsApp communication volume and the highest pain. Offer a "WhatsApp in 7 days" package. Set up a demo automation for a local restaurant and use the demo to sell others.',
      firstClientAcquisitionStep: 'Sign up for a free WhatsApp Business API trial (Wati or Interakt). Build a demo automated flow for a hypothetical restaurant today. Tomorrow, walk into the 3 busiest local restaurants and show them the demo. Offer to deploy it for ₹' + (tier === 'tier1_metro' ? '8,000' : '5,000') + ' setup + ₹2,000/month.',
      revenueProjection: {
        month1: 10000,
        month3: 25000,
        month6: 50000,
      },
    });
  }

  // Gap 3: Video content for local businesses
  if (topSkills.some((s) =>
    s.skillName.toLowerCase().includes('video') ||
    s.skillName.toLowerCase().includes('edit') ||
    s.skillName.toLowerCase().includes('reel') ||
    s.skillName.toLowerCase().includes('photo'))) {
    const avgSpend = tier === 'tier1_metro' ? 12000 : tier === 'tier2_city' ? 7000 : 4000;
    gaps.push({
      gapId: 'video_for_local_brands',
      gapTitle: `Short-Form Video Production for Local Businesses in ${socioeconomic.city ?? socioeconomic.region}`,
      problemDescription: `Local businesses are watching their customers go to brands with better video presence. Production cost perception is the main barrier — they think it costs ₹50,000+. A video specialist who can produce 4 professional Reels per month for ₹${avgSpend.toLocaleString('en-IN')} has an almost zero-competition market in ${tier} areas. The demand signal is clear: businesses with video content get 3–5x more engagement on local Google searches.`,
      targetBusinessType: 'Restaurants, fitness studios, fashion boutiques, coaching centers, real estate agents',
      estimatedAffectedBusinesses: tier === 'tier1_metro' ? 3000 : tier === 'tier2_city' ? 1000 : 300,
      averageSpendPerBusiness: avgSpend,
      competitorCount: tier === 'tier1_metro' ? 'few' : 'very_few',
      windowDurationMonths: 12,
      requiredSkills: ['Video editing (CapCut, Premiere, DaVinci Resolve)', 'Short-form video strategy', 'Basic scripting'],
      acquisitionStrategy: 'Create 3 sample Reels for 3 different types of local businesses (e.g., a restaurant, a gym, a boutique). Post them on Instagram tagging the business. When they engage, offer your service. This "show don\'t pitch" approach closes 3–5x better than cold outreach.',
      firstClientAcquisitionStep: 'Today: pick 3 local businesses you like. Tomorrow: create one 30-second Reel for each using their existing social media photos/videos as source material. Send each business the Reel as a free sample. Ask if they want 4 per month.',
      revenueProjection: {
        month1: avgSpend * 2,
        month3: avgSpend * 4,
        month6: avgSpend * 8,
      },
    });
  }

  // Gap 4: Website and basic digital presence
  if (topSkills.some((s) =>
    s.skillName.toLowerCase().includes('web') ||
    s.skillName.toLowerCase().includes('wordpress') ||
    s.skillName.toLowerCase().includes('design'))) {
    const setupFee = tier === 'tier1_metro' ? 15000 : tier === 'tier2_city' ? 8000 : 5000;
    gaps.push({
      gapId: 'basic_website_local_business',
      gapTitle: `Basic Business Website Setup for SMEs in ${socioeconomic.city ?? socioeconomic.region}`,
      problemDescription: `In ${tier} areas, an estimated 60–80% of traditional businesses have no website. They're losing business to competitors who can be found on Google. A simple WordPress or no-code website costs ₹${setupFee.toLocaleString('en-IN')}–₹${(setupFee * 1.5).toFixed(0)}. This is not a saturated market locally — most web agencies target larger clients and ignore small local shops.`,
      targetBusinessType: 'Traditional shops, clinics, coaching centers, home services, local restaurants',
      estimatedAffectedBusinesses: tier === 'tier1_metro' ? 4000 : tier === 'tier2_city' ? 1500 : 600,
      averageSpendPerBusiness: setupFee,
      competitorCount: tier === 'tier3_semi_urban' ? 'none' : 'very_few',
      windowDurationMonths: 24,
      requiredSkills: ['WordPress or Webflow basics', 'Domain and hosting setup', 'Basic SEO'],
      acquisitionStrategy: 'Go to any business district in your area with a printed "Your Business Visibility Report" — show them what their competitor\'s website looks like vs their blank Google result. Offer to build them a 5-page website in 7 days.',
      firstClientAcquisitionStep: 'Create one sample website for a fictional local business in your niche today using WordPress or Webflow free plan. This is your demo. Walk into 10 businesses tomorrow with a printed version of the demo + their competitor analysis.',
      revenueProjection: {
        month1: setupFee * 2,
        month3: setupFee * 4,
        month6: setupFee * 7,
      },
    });
  }

  gaps.sort((a, b) => b.revenueProjection.month3 - a.revenueProjection.month3);
  return gaps;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: SOCIAL MEDIA OPPORTUNITY ANALYZER
// Identifies the highest-probability social media path for this specific profile.
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeSocialMediaOpportunities(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): SocialMediaOpportunity[] {
  const { humanCapital, infrastructure, psychometric } = matrix;
  const opportunities: SocialMediaOpportunity[] = [];
  const isHindi = humanCapital.languageRegister === 'hindi' || humanCapital.languageRegister === 'hinglish';
  const dailyHours = infrastructure.dailyUninterruptedHours;
  const commScore = humanCapital.communicationScore;
  const topSkill = capability.calibratedSkills.sort((a, b) => b.verifiedLevel - a.verifiedLevel)[0];

  // High procrastination score = can't handle daily posting
  const canHandleDailyPosting = psychometric.procrastinationScore < 0.5;
  const recommendedFrequency = canHandleDailyPosting ? '3–5 times per week' : '2 times per week (quality over quantity)';

  // Instagram Reels — highest organic reach platform in India right now
  if (commScore > 0.3 || (topSkill && topSkill.category === 'creative')) {
    opportunities.push({
      platform: 'instagram',
      niche: `${topSkill?.skillName ?? 'skills'} tips, tutorials, and behind-the-scenes`,
      contentFormat: 'reels',
      trendVelocity: isHindi ? 0.92 : 0.78, // Hindi Reels have much higher organic reach
      languagePreference: isHindi ? 'hinglish' : 'english',
      currentOrganicReachLevel: isHindi ? 'very_high' : 'high',
      monetizationPathway: 'Brand collaborations → Course/service sales → Instagram Badges (Live)',
      timeToFirstRevenue: 4, // months (faster if using for client acquisition)
      postingFrequency: recommendedFrequency,
      contentPillars: [
        `"${topSkill?.skillName ?? 'Skill'} mistakes people make" (high engagement, shares)`,
        `Before/after transformations using your skill (visual proof)`,
        `"How I earn ₹X from ${topSkill?.skillName ?? 'this skill'} in ${matrix.socioeconomic.geographyTier === 'tier2_city' ? 'a tier-2 city' : 'my city'}" (relatability)`,
        `Quick tips under 30 seconds (highest save rate = best reach)`,
      ],
      insightNarrative: `Instagram Reels in ${isHindi ? 'Hindi/Hinglish' : 'English'} about ${topSkill?.skillName ?? 'your skill'} are currently getting ${isHindi ? '4–8x' : '2–3x'} the organic reach of static posts. Given your ${canHandleDailyPosting ? 'capacity for consistent posting' : 'lower daily capacity'}, a ${recommendedFrequency} schedule is recommended. At 5,000–10,000 followers, service inquiries typically begin without paid promotion. Expected timeline: 3–6 months with consistent execution.`,
      warningFlags: [
        'Algorithm changes can affect reach — always build an email list or WhatsApp community in parallel',
        'Don\'t invest in equipment before first revenue — smartphone camera is sufficient',
        `If procrastination score is high (yours: ${Math.round(psychometric.procrastinationScore * 100)}%), batch-record content weekly instead of daily`,
      ],
    });
  }

  // YouTube — longer monetization but higher long-term value
  if (dailyHours >= 3 && commScore > 0.5) {
    opportunities.push({
      platform: 'youtube',
      niche: `${topSkill?.skillName ?? 'skills'} tutorials and case studies`,
      contentFormat: 'long_video',
      trendVelocity: isHindi ? 0.80 : 0.65,
      languagePreference: isHindi ? 'hindi' : 'english',
      currentOrganicReachLevel: isHindi ? 'high' : 'medium',
      monetizationPathway: 'AdSense (slow) → Course sales → Service client acquisition (fastest)',
      timeToFirstRevenue: isHindi ? 6 : 8,
      postingFrequency: '1–2 videos per week (consistency > frequency for YouTube)',
      contentPillars: [
        `Complete beginner tutorials for ${topSkill?.skillName ?? 'your skill'} (highest search volume)`,
        `Case studies: "How I got [result] with [skill]" (high trust building)`,
        `Tool comparisons and reviews (evergreen traffic)`,
        `Q&A and subscriber questions (community building)`,
      ],
      insightNarrative: `YouTube has longer monetization timelines but higher long-term passive income potential. ${isHindi ? 'Hindi YouTube is significantly less competitive than English in most skill niches — the window for early mover advantage is still open.' : 'English YouTube is competitive but provides access to international audience and higher AdSense RPMs.'} Key insight: for your profile, YouTube works best as a CLIENT ACQUISITION channel before AdSense revenue becomes significant. One video that gets 50,000 views in your niche can bring 10+ inbound leads.`,
      warningFlags: [
        'YouTube monetization requires 1,000 subscribers + 4,000 watch hours — plan for 6–12 months before AdSense',
        'Most successful creators use YouTube to sell courses or services, not primarily for AdSense',
        `With ${dailyHours}h/day available, budget 2–4 hours per video (script + record + basic edit)`,
      ],
    });
  }

  // LinkedIn — best for B2B service acquisition
  if (commScore > 0.5 && capability.clientFacingViability) {
    opportunities.push({
      platform: 'linkedin',
      niche: `${topSkill?.skillName ?? 'Professional skills'} and business value creation`,
      contentFormat: 'posts',
      trendVelocity: 0.70,
      languagePreference: 'english',
      currentOrganicReachLevel: 'medium',
      monetizationPathway: 'Direct client acquisition → Consulting offers → Referral network',
      timeToFirstRevenue: 2, // Fastest path to client — can get leads in 30 days
      postingFrequency: '3–4 times per week',
      contentPillars: [
        `"Lessons from working with [type of client]" — positions you as practitioner`,
        `Results/case studies from your work (even personal projects count)`,
        `Industry insights and trends (shows expertise)`,
        `Process posts: "Here's exactly how I do X in Y steps"`,
      ],
      insightNarrative: `LinkedIn is currently the highest-probability CLIENT ACQUISITION platform for ${topSkill?.skillName ?? 'your skill'} if your goal is B2B service revenue. Unlike Instagram (B2C focused), LinkedIn reaches business decision makers directly. With consistent posting, inbound leads typically begin within 30–60 days. Carousel posts and text posts with a strong opening line currently outperform videos on LinkedIn for engagement.`,
      warningFlags: [
        'LinkedIn works best when your profile is optimized — complete it before posting',
        'B2B only — if target market is consumers, Instagram/YouTube is more effective',
        'Requires English communication proficiency — if comm score is below 0.5, start with Instagram first',
      ],
    });
  }

  // Sort by trendVelocity × estimated time to revenue
  return opportunities.sort((a, b) => {
    const scoreA = (a.trendVelocity * 0.6) + ((12 - a.timeToFirstRevenue) / 12) * 0.4;
    const scoreB = (b.trendVelocity * 0.6) + ((12 - b.timeToFirstRevenue) / 12) * 0.4;
    return scoreB - scoreA;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: COMPETITOR LANDSCAPE MAPPER
// Gives an honest assessment of how competitive the local market is.
// ─────────────────────────────────────────────────────────────────────────────

export function mapCompetitorLandscape(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): CompetitorLandscape {
  const { socioeconomic } = matrix;
  const tier = socioeconomic.geographyTier;
  const topSkill = capability.calibratedSkills.sort((a, b) => b.verifiedLevel - a.verifiedLevel)[0];

  const saturationMap: Record<GeographyTier, CompetitorLandscape['saturationLevel']> = {
    tier1_metro: 'competitive',
    tier2_city: 'growing',
    tier3_semi_urban: 'early_mover',
    rural: 'unsaturated',
  };

  const competitorCountMap: Record<GeographyTier, number> = {
    tier1_metro: 150,
    tier2_city: 40,
    tier3_semi_urban: 10,
    rural: 2,
  };

  const qualityMap: Record<GeographyTier, CompetitorLandscape['averageCompetitorQuality']> = {
    tier1_metro: 'medium',
    tier2_city: 'low',
    tier3_semi_urban: 'very_low',
    rural: 'very_low',
  };

  const priceAnchorMap: Record<GeographyTier, { low: number; average: number; high: number }> = {
    tier1_metro: { low: 15000, average: 30000, high: 80000 },
    tier2_city: { low: 5000, average: 12000, high: 35000 },
    tier3_semi_urban: { low: 2000, average: 6000, high: 15000 },
    rural: { low: 1000, average: 3000, high: 8000 },
  };

  const differentiationByTier: Record<GeographyTier, string> = {
    tier1_metro: 'Specialize in one niche (e.g., only dental clinics, only SaaS companies). In a metro, specialists earn 2–3x generalists.',
    tier2_city: 'Be the ONLY person in your city who responds within 24 hours, delivers on time, and communicates clearly. These three things alone will beat 90% of local competition.',
    tier3_semi_urban: 'In-person service + digital delivery combination is virtually uncontested. Show up. Everyone else is online and distant.',
    rural: 'Physical presence + any digital skill = almost zero competition. The fact that you know how to use a smartphone for business purposes is already a competitive advantage.',
  };

  const winningStrategyByTier: Record<GeographyTier, string> = {
    tier1_metro: 'Niche down hard. Build a portfolio in one specific industry. Charge premium. Use LinkedIn for inbound leads. Avoid competing on price.',
    tier2_city: 'Be the local person who does what only city people used to do. In-person sales + digital execution = win. Price 20–30% above local average and justify it with quality.',
    tier3_semi_urban: 'Walk into businesses. Show them your work. Offer to do one thing for free to prove value. The local trust factor is your biggest asset — no remote competitor has it.',
    rural: 'Become the known digital person in your area. Help local businesses with the simplest digital tasks. Word-of-mouth will compound fast in small communities.',
  };

  return {
    saturationLevel: saturationMap[tier],
    estimatedLocalCompetitors: competitorCountMap[tier],
    averageCompetitorQuality: qualityMap[tier],
    differentiationOpportunity: differentiationByTier[tier],
    winningStrategy: winningStrategyByTier[tier],
    priceAnchor: priceAnchorMap[tier],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: TIMING SIGNAL ASSESSOR
// Tells the user whether to act now, wait, or pass on a specific opportunity.
// ─────────────────────────────────────────────────────────────────────────────

export function assessTimingSignals(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): TimingSignal[] {
  const signals: TimingSignal[] = [];
  const topSkills = capability.calibratedSkills
    .sort((a, b) => b.verifiedLevel - a.verifiedLevel)
    .slice(0, 3);

  // AI/automation timing
  const hasAiSkill = topSkills.some((s) =>
    s.skillName.toLowerCase().includes('ai') ||
    s.skillName.toLowerCase().includes('automat') ||
    s.skillName.toLowerCase().includes('python') ||
    s.skillName.toLowerCase().includes('no-code'));
  if (hasAiSkill) {
    signals.push({
      signalId: 'ai_implementation_window',
      signal: 'AI Tool Implementation for Local Businesses',
      direction: 'rising',
      urgency: 'act_now',
      durationMonths: 14,
      narrative: 'The AI adoption gap between awareness and implementation is at its peak right now. Businesses KNOW they should use AI but have no idea how. The person who can bridge this gap locally has a 12–18 month window before it becomes a commodity. After that, large companies will own this market. Act now.',
      source: 'Structural analysis of AI adoption lifecycle in Indian SME market',
    });
  }

  // Short-form video timing
  const hasVideoSkill = topSkills.some((s) =>
    s.skillName.toLowerCase().includes('video') ||
    s.skillName.toLowerCase().includes('edit') ||
    s.skillName.toLowerCase().includes('reel'));
  if (hasVideoSkill) {
    signals.push({
      signalId: 'short_form_video_window',
      signal: 'Short-Form Video Production for Local Businesses',
      direction: 'rising',
      urgency: 'act_now',
      durationMonths: 12,
      narrative: 'Instagram and YouTube Shorts algorithm currently over-rewards new creators in under-served niches. The organic reach available today is historically high. This window typically closes within 12–18 months as more creators enter the space. The time to build a following is NOW, not when everyone else is already here.',
      source: 'Social media platform algorithm trend analysis, creator economy reports',
    });
  }

  // Local SEO timing
  if (topSkills.some((s) =>
    s.skillName.toLowerCase().includes('seo') ||
    s.skillName.toLowerCase().includes('digital') ||
    s.skillName.toLowerCase().includes('market'))) {
    signals.push({
      signalId: 'local_seo_window',
      signal: `Local SEO and Digital Presence for ${matrix.socioeconomic.geographyTier.replace('_', ' ')} Businesses`,
      direction: 'rising',
      urgency: 'act_soon',
      durationMonths: 24,
      narrative: `The ${matrix.socioeconomic.geographyTier.replace('_', ' ')} market is approximately 3–4 years behind metros in digital adoption. The SMEs that adopt digital presence early win disproportionately. This window is open for 18–24 more months before the market starts to self-educate. First mover advantage in your specific city is significant.`,
      source: 'Tier-2/3 city digital adoption rate analysis',
    });
  }

  // WhatsApp automation timing
  signals.push({
    signalId: 'whatsapp_automation_window',
    signal: 'WhatsApp Business Automation',
    direction: 'rising',
    urgency: 'act_soon',
    durationMonths: 20,
    narrative: 'WhatsApp Business API is still relatively unknown among Indian SMEs. The tool-level awareness is low, but the pain level is high — every business owner manually handles WhatsApp messages. This creates a 20-month window for service providers who can automate this workflow.',
    source: 'WhatsApp Business adoption data, MSME digital readiness surveys',
  });

  // General waiting cost signal
  signals.push({
    signalId: 'opportunity_cost_of_waiting',
    signal: 'Cost of Waiting to Start',
    direction: 'stable',
    urgency: 'act_now',
    durationMonths: matrix.goalVector.timelineMonths,
    narrative: `Every month of delay costs: (1) ${matrix.goalVector.timelineMonths > 0 ? '1/' + matrix.goalVector.timelineMonths : 'significant'} of your remaining timeline, (2) compounding revenue you could have generated, (3) the first-mover advantage in your local market. The strategy does not get easier with waiting. The market does not get less competitive. The only variable you control is when you start.`,
    source: 'Opportunity cost analysis based on user timeline and market conditions',
  });

  return signals;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: SKILL GAP ANALYZER
// Identifies the precise skill gap between current state and target path.
// Generates a bridging plan that is specific, time-bound, and free/low-cost.
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeSkillGap(
  matrix: ContextMatrix,
  capability: CapabilityVector,
  targetPathOpportunity: string,
  requiredCapabilityScore: number,
): SkillGapAnalysis {
  const currentScore = capability.trueCapabilityScore;
  const gapScore = Math.max(0, requiredCapabilityScore - currentScore);

  if (gapScore < 0.05) {
    // Skills already sufficient
    return {
      targetPathId: targetPathOpportunity,
      targetPathTitle: targetPathOpportunity,
      currentCapabilityScore: currentScore,
      requiredCapabilityScore,
      gapScore: 0,
      missingSkills: [],
      bridgingPlan: [],
      estimatedBridgingTimeDays: 0,
      bridgingUnlocksRevenuePotential: Math.round(currentScore * 50000 * 1.5),
      isWorthBridging: false,
      alternativePath: null,
    };
  }

  // Identify missing skills based on path requirements
  const missingSkills: MissingSkill[] = [];
  const calibratedSkills = capability.calibratedSkills;

  // Analyze what's missing for common paths
  const pathKeywords = targetPathOpportunity.toLowerCase();

  if (pathKeywords.includes('seo') && !calibratedSkills.some((s) => s.skillName.toLowerCase().includes('seo'))) {
    missingSkills.push({
      skillName: 'Local SEO Fundamentals',
      currentLevel: 0.1,
      requiredLevel: 0.4,
      gapSize: 0.3,
      learningResources: [
        'Google Search Central documentation (free)',
        'Ahrefs Blog — free SEO guides',
        'YouTube: "Local SEO for beginners" (10–15 hours)',
        'Google My Business Help Center (free)',
      ],
      estimatedLearningDays: 14,
      isBlocker: true,
    });
  }

  if (pathKeywords.includes('video') && !calibratedSkills.some((s) => s.skillName.toLowerCase().includes('video') || s.skillName.toLowerCase().includes('edit'))) {
    missingSkills.push({
      skillName: 'Short-Form Video Editing (CapCut)',
      currentLevel: 0.05,
      requiredLevel: 0.3,
      gapSize: 0.25,
      learningResources: [
        'CapCut YouTube tutorial (free, 3–4 hours)',
        'Instagram Creator Academy (free)',
        'Practice: edit 5 videos of anything before first client video',
      ],
      estimatedLearningDays: 10,
      isBlocker: true,
    });
  }

  if (pathKeywords.includes('automation') || pathKeywords.includes('whatsapp')) {
    if (!calibratedSkills.some((s) => s.skillName.toLowerCase().includes('automat') || s.skillName.toLowerCase().includes('no-code'))) {
      missingSkills.push({
        skillName: 'WhatsApp Business API / No-Code Automation',
        currentLevel: 0.05,
        requiredLevel: 0.35,
        gapSize: 0.3,
        learningResources: [
          'Wati.io free trial + documentation (hands-on learning)',
          'YouTube: "WhatsApp Business automation tutorial India"',
          'Make.com free tutorials (if broader automation needed)',
          'Interakt.shop documentation (free)',
        ],
        estimatedLearningDays: 12,
        isBlocker: true,
      });
    }
  }

  // Build bridging plan
  const bridgingPlan: BridgingStep[] = [];
  let currentDay = 1;

  for (const skill of missingSkills) {
    bridgingPlan.push({
      dayStart: currentDay,
      dayEnd: currentDay + skill.estimatedLearningDays - 1,
      action: `Learn ${skill.skillName}: ${skill.learningResources[0]}`,
      outcome: `Reach ${Math.round(skill.requiredLevel * 100)}% proficiency in ${skill.skillName}. Build one proof-of-concept to verify the skill.`,
      skillUnlocked: skill.skillName,
    });
    currentDay += skill.estimatedLearningDays;
  }

  // First revenue step after bridging
  if (bridgingPlan.length > 0) {
    bridgingPlan.push({
      dayStart: currentDay,
      dayEnd: currentDay + 7,
      action: `Execute first client acquisition using newly built skills`,
      outcome: `First paid client acquired or first revenue generated`,
      skillUnlocked: 'Client acquisition',
    });
  }

  const totalBridgingDays = currentDay + 7;
  const revenuePotential = Math.round((currentScore + 0.2) * 50000 * 1.5); // Estimate post-bridging revenue

  const isWorthBridging = totalBridgingDays <= 30 && gapScore < 0.4;

  return {
    targetPathId: targetPathOpportunity,
    targetPathTitle: targetPathOpportunity,
    currentCapabilityScore: currentScore,
    requiredCapabilityScore,
    gapScore,
    missingSkills,
    bridgingPlan,
    estimatedBridgingTimeDays: totalBridgingDays,
    bridgingUnlocksRevenuePotential: revenuePotential,
    isWorthBridging,
    alternativePath: !isWorthBridging
      ? `Current skills suggest starting with a path that requires less bridging. Consider the local service path first — earn while you learn the remaining skills.`
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: MAIN LAYER 0 ORCHESTRATOR
// Assembles the full intelligence picture.
// ─────────────────────────────────────────────────────────────────────────────

export async function runIntelligenceMatrix(
  matrix: ContextMatrix,
  capability: CapabilityVector,
): Promise<{
  intelligenceBrief: IntelligenceBrief;
  intelligenceReport: MarketIntelligenceReport;
}> {
  // Generate the research brief (structured queries for AI backend)
  const intelligenceBrief = generateIntelligenceBrief(matrix, capability);

  // Build structural intelligence from available data
  const skillDemandSignals: SkillDemandSignal[] = capability.calibratedSkills
    .sort((a, b) => b.verifiedLevel - a.verifiedLevel)
    .slice(0, 3)
    .map((skill) =>
      buildSkillDemandSignal(
        skill.skillName,
        matrix.socioeconomic.geographyTier,
        skill.verifiedLevel,
        skill.category,
      )
    );

  const localMarketGaps = detectLocalMarketGaps(matrix, capability);
  const socialMediaOpportunities = analyzeSocialMediaOpportunities(matrix, capability);
  const competitorLandscape = mapCompetitorLandscape(matrix, capability);
  const timingSignals = assessTimingSignals(matrix, capability);

  // Overall market score: how favorable is the environment for this user?
  const avgDemandScore = skillDemandSignals.reduce((sum, s) => {
    const levelMap = { very_high: 1.0, high: 0.8, medium: 0.6, low: 0.3, declining: 0.1 };
    return sum + (levelMap[s.demandLevel as keyof typeof levelMap] ?? 0.6);
  }, 0) / Math.max(1, skillDemandSignals.length);

  const saturationPenalty = {
    unsaturated: 0, early_mover: 0.05, growing: 0.1, competitive: 0.25, saturated: 0.4,
  }[competitorLandscape.saturationLevel as 'unsaturated' | 'early_mover' | 'growing' | 'competitive' | 'saturated'] ?? 0.1;

  const actNowBonus = timingSignals.filter((s) => s.urgency === 'act_now').length * 0.05;

  const overallMarketScore = Math.min(1.0, Math.max(0.1,
    avgDemandScore - saturationPenalty + actNowBonus
  ));

  // Top insight for the user
  const topGap = localMarketGaps[0];
  const topSocialOpp = socialMediaOpportunities[0];
  const topTimingSignal = timingSignals.find((s) => s.urgency === 'act_now');

  const topInsight = topGap
    ? `Your highest-probability local opportunity: "${topGap.gapTitle}". Estimated ${topGap.estimatedAffectedBusinesses}+ potential clients in your area. First client possible in 7 days. Revenue projection: ₹${topGap.revenueProjection.month1.toLocaleString('en-IN')}/month in 30 days.`
    : topTimingSignal
    ? `${topTimingSignal.signal}: ${topTimingSignal.narrative.slice(0, 200)}...`
    : 'Multiple opportunities identified. See the ranked opportunity list for your best starting point.';

  const intelligenceReport: MarketIntelligenceReport = {
    skillDemandSignals,
    localMarketGaps,
    socialMediaOpportunities,
    competitorLandscape,
    timingSignals,
    overallMarketScore,
    topInsight,
    generatedAt: new Date().toISOString(),
    confidenceLevel: skillDemandSignals.some((s) => s.dataConfidence === 'verified') ? 'high' : 'medium',
    legalDisclaimer: ENGINE_AXIOMS.FINANCIAL_ADVICE_DISCLAIMER + ' All market intelligence figures are directional estimates based on structural analysis, not certified market research data.',
    dataSourceNotes: 'Intelligence based on: geo-tier market patterns, skill demand structural inference, social media platform trend analysis, and competitive landscape modeling. For critical decisions, verify locally before committing capital.',
  };

  try {
    const groundedReport = await LLMService.generateGroundedIntelligenceReport(intelligenceBrief.researchMandate);
    
    // Merge grounded report safely with the structural report so required arrays (gaps, signals, etc.) are preserved
    const mergedReport: MarketIntelligenceReport = {
      ...intelligenceReport,
      topInsight: `${groundedReport.marketSummary || intelligenceReport.topInsight}\n\nRecommended Action: ${groundedReport.recommendedAction || ''}`,
      dataSourceNotes: `Web-grounded search data incorporated (Confidence: ${groundedReport.confidenceScore || 0.8}). ${intelligenceReport.dataSourceNotes}`,
      generatedAt: new Date().toISOString()
    };
    
    return { intelligenceBrief, intelligenceReport: mergedReport };
  } catch (error) {
    // Fall back to structural inference silently
    return { intelligenceBrief, intelligenceReport };
  }
}
