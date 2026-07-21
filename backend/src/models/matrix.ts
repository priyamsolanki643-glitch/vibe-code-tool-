import { z } from 'zod';

// Layer 0 - The Constraint Matrix Schema
// This represents the core vectorspace evaluation of the user.

export const SocioEconomicSchema = z.object({
  geography_tier: z.enum(['TIER_1', 'TIER_2', 'TIER_3']),
  liquid_capital: z.number().min(0),
  monthly_burn: z.number().min(0),
  runway_days: z.number().min(0),
  dependency_score: z.number().min(0).max(1),
});

export const HumanCapitalSchema = z.object({
  skills: z.array(z.string()),
  verified_skills: z.array(z.string()),
  communication_score: z.number().min(0).max(1),
  learning_velocity: z.number().min(0).max(1),
  network_score: z.number().min(0).max(1),
});

export const ExecutionInfrastructureSchema = z.object({
  daily_hours: z.number().min(1).max(24),
  device_quality: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  internet_stability: z.enum(['STABLE', 'UNSTABLE']),
  environment_score: z.number().min(0).max(1),
});

export const PsychometricSchema = z.object({
  procrastination_index: z.number().min(0).max(1),
  cognitive_endurance_minutes: z.number().min(10).max(720), // 10 mins to 12 hours
  resilience_score: z.number().min(0).max(1),
  ego_leverage_point: z.string(), // E.g., "Proving family wrong", "Escaping poverty"
});

export const GoalVectorSchema = z.object({
  declared_goal: z.string(),
  timeline_days: z.number().min(1),
  success_definition: z.string(),
  sacrifice_tolerance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'INFINITE']),
  non_negotiables: z.array(z.string()),
});

export const ContextMatrixSchema = z.object({
  socioeconomic: SocioEconomicSchema,
  human_capital: HumanCapitalSchema,
  execution_infrastructure: ExecutionInfrastructureSchema,
  psychometric: PsychometricSchema,
  goal_vector: GoalVectorSchema,
});

export type ContextMatrix = z.infer<typeof ContextMatrixSchema>;
