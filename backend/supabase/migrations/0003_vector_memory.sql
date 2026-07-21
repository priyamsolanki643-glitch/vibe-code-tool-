-- Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_memories table
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    mission_name TEXT NOT NULL,
    locked_path TEXT NOT NULL,
    profile_text TEXT NOT NULL,
    embedding vector(768), -- 768 dimensions for Gemini text-embedding-004
    outcome_summary TEXT NOT NULL,
    success_rate NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS user_memories_embedding_idx ON public.user_memories USING ivfflat (embedding cosine_ops) WITH (lists = 100);

-- Function to match vector similarities
CREATE OR REPLACE FUNCTION match_user_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  mission_name TEXT,
  locked_path TEXT,
  profile_text TEXT,
  outcome_summary TEXT,
  success_rate NUMERIC,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.user_id,
    um.mission_name,
    um.locked_path,
    um.profile_text,
    um.outcome_summary,
    um.success_rate,
    1 - (um.embedding <=> query_embedding) AS similarity
  FROM public.user_memories um
  WHERE 1 - (um.embedding <=> query_embedding) > match_threshold
  ORDER BY um.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
