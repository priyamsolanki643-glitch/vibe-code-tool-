-- Migration: Vault & Core Execution Tables
-- Enables tracking locked missions, consistency scores, and market analyst cache per user.

-- 1. MISSIONS Table
CREATE TABLE IF NOT EXISTS public.missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    "missionName" TEXT NOT NULL,
    "lockedPath" TEXT NOT NULL,
    "probabilityLow" NUMERIC NOT NULL,
    "probabilityHigh" NUMERIC NOT NULL,
    "dayNumber" INTEGER NOT NULL DEFAULT 1,
    "totalDays" INTEGER NOT NULL,
    "consistencyScore" INTEGER NOT NULL DEFAULT 100,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "mindsetBrief" TEXT NOT NULL,
    "strategyContent" TEXT NOT NULL,
    "chatThreadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS missions_user_id_idx ON public.missions (user_id);

-- 2. CONSISTENCY LOG Table
CREATE TABLE IF NOT EXISTS public.consistency_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    logged_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS consistency_log_user_id_idx ON public.consistency_log (user_id);

-- 3. MARKET REPORTS Table
CREATE TABLE IF NOT EXISTS public.market_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    report_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS market_reports_user_id_idx ON public.market_reports (user_id);
