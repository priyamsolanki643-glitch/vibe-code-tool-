/**
 * FP-OS :: Environment Configuration
 * Reads directly from process.env with safe fallbacks.
 * Server starts regardless of missing vars.
 */

export const env = {
  PORT: process.env.PORT || '8080',
  AI_PROVIDER_KEY: process.env.AI_PROVIDER_KEY || '',
  SYSTEM_REALISM_MODE: (process.env.SYSTEM_REALISM_MODE as 'BRUTAL_EXPLICIT' | 'SAFE') || 'BRUTAL_EXPLICIT',
  JWT_SECRET: process.env.JWT_SECRET || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  GEMINI_KEYS: process.env.GEMINI_KEYS || '',
  GROQ_KEY: process.env.GROQ_KEY || '',
  COHERE_KEY: process.env.COHERE_KEY || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};
