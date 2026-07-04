import {
  ContextMatrix,
  CapabilityVector,
  SkillDemandSignal,
  LocalMarketGap,
  SocialMediaOpportunity,
  GeographyTier,
} from '../engine/types';

export function buildSkillDemandSignal(
  skill: string,
  geographyTier: GeographyTier,
  skillVerifiedLevel: number,
  skillCategory: string,
): SkillDemandSignal {
  const tierDemandMultipliers: Record<GeographyTier, number> = {
    tier1_metro: 0.85,
    tier2_city: 0.90,
    tier3_semi_urban: 0.80,
    rural: 0.50,
  };

  const skillKeywords = skill.toLowerCase();
  let baseDemand: SkillDemandSignal['demandLevel'] = 'medium';
  let trendDirection: SkillDemandSignal['trendDirection'] = 'stable';
  let rateRangeLow = 5000;
  let rateRangeHigh = 15000;
  let adjacentSkills: string[] = [];

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

  const geoMultiplier = tierDemandMultipliers[geographyTier] || 0.90;
  const tierRateMultiplier = geographyTier === 'tier1_metro' ? 1.4 : geographyTier === 'tier2_city' ? 1.0 : 0.7;

  const adjustedRateLow = Math.floor(rateRangeLow * tierRateMultiplier);
  const adjustedRateHigh = Math.floor(rateRangeHigh * tierRateMultiplier);

  const localVsNational: SkillDemandSignal['localDemandVsNational'] =
    geographyTier === 'tier2_city' || geographyTier === 'tier3_semi_urban'
      ? 'above_average'
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
    dataConfidence: 'estimated',
  };
}

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

  const canHandleDailyPosting = psychometric.procrastinationScore < 0.5;
  const recommendedFrequency = canHandleDailyPosting ? '3–5 times per week' : '2 times per week (quality over quantity)';

  if (commScore > 0.3 || (topSkill && topSkill.category === 'creative')) {
    opportunities.push({
      platform: 'instagram',
      niche: `${topSkill?.skillName ?? 'skills'} tips, tutorials, and behind-the-scenes`,
      contentFormat: 'reels',
      trendVelocity: isHindi ? 0.92 : 0.78,
      languagePreference: isHindi ? 'hinglish' : 'english',
      currentOrganicReachLevel: isHindi ? 'very_high' : 'high',
      monetizationPathway: 'Brand collaborations → Course/service sales → Instagram Badges (Live)',
      timeToFirstRevenue: 4,
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

  if (commScore > 0.5 && capability.clientFacingViability) {
    opportunities.push({
      platform: 'linkedin',
      niche: `${topSkill?.skillName ?? 'Professional skills'} and business value creation`,
      contentFormat: 'posts',
      trendVelocity: 0.70,
      languagePreference: 'english',
      currentOrganicReachLevel: 'medium',
      monetizationPathway: 'Direct client acquisition → Consulting offers → Referral network',
      timeToFirstRevenue: 2,
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

  return opportunities.sort((a, b) => {
    const scoreA = (a.trendVelocity * 0.6) + ((12 - a.timeToFirstRevenue) / 12) * 0.4;
    const scoreB = (b.trendVelocity * 0.6) + ((12 - b.timeToFirstRevenue) / 12) * 0.4;
    return scoreB - scoreA;
  });
}
