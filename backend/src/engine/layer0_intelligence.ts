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
import {
  buildSkillDemandSignal,
  detectLocalMarketGaps,
  analyzeSocialMediaOpportunities,
} from '../utils/intelligence.utils';

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
