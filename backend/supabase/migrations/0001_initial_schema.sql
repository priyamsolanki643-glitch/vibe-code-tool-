-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (The core user table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    geography TEXT,
    financial_baseline NUMERIC DEFAULT 0.0,
    cognitive_endurance INTEGER DEFAULT 60,
    consistency_score INTEGER DEFAULT 100,
    active_trajectory TEXT,
    strategy_locked BOOLEAN DEFAULT FALSE,
    survivability_band TEXT DEFAULT 'UNKNOWN',
    context_matrix JSONB DEFAULT '{}'::jsonb
);

-- 2. ONBOARDING SESSIONS
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_state TEXT NOT NULL,
    collected_data JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. STRATEGY DECISIONS
CREATE TABLE IF NOT EXISTS public.strategy_decisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    presented_paths JSONB NOT NULL,
    selected_path TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. CONSISTENCY EVENTS
CREATE TABLE IF NOT EXISTS public.consistency_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score_change INTEGER NOT NULL,
    reason_code TEXT NOT NULL,
    new_score INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. FAILURE DIAGNOSTICS LOG
CREATE TABLE IF NOT EXISTS public.failure_diagnostics_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID, -- Will link to a tasks table later
    diagnostic_tree_outcome TEXT NOT NULL,
    response_type_generated TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. OUTPUT VALIDATION LOG
CREATE TABLE IF NOT EXISTS public.output_validation_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rejected_output TEXT NOT NULL,
    rejection_reason TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. CONTEXT MATRIX HISTORY
CREATE TABLE IF NOT EXISTS public.context_matrix_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    context_matrix JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. TASK SPRINTS (Execution layer)
CREATE TABLE IF NOT EXISTS public.task_sprints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_description TEXT NOT NULL,
    time_compression_factor NUMERIC DEFAULT 0.5,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);
