CREATE EXTENSION IF NOT EXISTS vector;

-- App users (NextAuth credentials)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  github_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resets existing vectors after dimension changes (only runs if column exists with different type).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chunks' AND column_name = 'embedding'
  ) THEN
    DROP INDEX IF EXISTS chunks_embedding_idx;
    ALTER TABLE chunks ALTER COLUMN embedding TYPE VECTOR(768) USING NULL;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS qa_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  citations_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

DROP FUNCTION IF EXISTS match_chunks(VECTOR(1024), FLOAT, INT, UUID);
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT,
  p_source_id UUID
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  start_line INTEGER,
  end_line INTEGER,
  content TEXT,
  source_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.file_path,
    chunks.start_line,
    chunks.end_line,
    chunks.content,
    chunks.source_url,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE chunks.source_id = p_source_id
    AND chunks.embedding IS NOT NULL
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =========================
-- Phase 0 + Phase 1 schema
-- =========================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Align users table with Supabase Auth profile needs.
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Auto-create user profile row from auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS github_installation_id BIGINT;
ALTER TABLE public.qa_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.chunks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sources_user_id_created_at ON public.sources (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_user_id_created_at ON public.qa_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON public.chunks (user_id);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own sources" ON public.sources;
CREATE POLICY "Users can read own sources" ON public.sources FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own sources" ON public.sources;
CREATE POLICY "Users can insert own sources" ON public.sources FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE public.qa_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own history" ON public.qa_history;
CREATE POLICY "Users can read own history" ON public.qa_history FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own history" ON public.qa_history;
CREATE POLICY "Users can insert own history" ON public.qa_history FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own chunks" ON public.chunks;
CREATE POLICY "Users can read own chunks" ON public.chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sources s
    WHERE s.id = chunks.source_id
      AND s.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can insert own chunks" ON public.chunks;
CREATE POLICY "Users can insert own chunks" ON public.chunks FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.answer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.answer_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.answer_feedback;
CREATE POLICY "Users can insert own feedback" ON public.answer_feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sources s
      WHERE s.id = answer_feedback.session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.github_tokens (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'default',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.github_app_installations (
  installation_id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_app_installations_user_id
  ON public.github_app_installations (user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_created_at
  ON public.api_keys (user_id, created_at DESC);

ALTER TABLE public.github_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own github token" ON public.github_tokens;
CREATE POLICY "Users can read own github token" ON public.github_tokens FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own github token" ON public.github_tokens;
CREATE POLICY "Users can insert own github token" ON public.github_tokens FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own github token" ON public.github_tokens;
CREATE POLICY "Users can update own github token" ON public.github_tokens FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own github token" ON public.github_tokens;
CREATE POLICY "Users can delete own github token" ON public.github_tokens FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own api keys" ON public.api_keys;
CREATE POLICY "Users can read own api keys" ON public.api_keys FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own api keys" ON public.api_keys;
CREATE POLICY "Users can insert own api keys" ON public.api_keys FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
CREATE POLICY "Users can update own api keys" ON public.api_keys FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;
CREATE POLICY "Users can delete own api keys" ON public.api_keys FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.github_app_installations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own github app installations" ON public.github_app_installations;
CREATE POLICY "Users can read own github app installations"
  ON public.github_app_installations
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own github app installations" ON public.github_app_installations;
CREATE POLICY "Users can insert own github app installations"
  ON public.github_app_installations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own github app installations" ON public.github_app_installations;
CREATE POLICY "Users can update own github app installations"
  ON public.github_app_installations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =========================
-- Phase 2 schema
-- =========================

CREATE TABLE IF NOT EXISTS public.shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shared_sessions_owner_source_unique UNIQUE (owner_user_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_sessions_share_uuid ON public.shared_sessions (share_uuid);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_source_id ON public.shared_sessions (source_id);

ALTER TABLE public.shared_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage shared sessions" ON public.shared_sessions;
CREATE POLICY "Owners can manage shared sessions" ON public.shared_sessions
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Public can read active public shares" ON public.shared_sessions;
CREATE POLICY "Public can read active public shares" ON public.shared_sessions
  FOR SELECT
  USING (
    is_public = TRUE
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  installation_id BIGINT REFERENCES public.github_app_installations(installation_id) ON DELETE SET NULL,
  github_delivery_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'push',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  files_added INTEGER NOT NULL DEFAULT 0,
  files_modified INTEGER NOT NULL DEFAULT 0,
  files_removed INTEGER NOT NULL DEFAULT 0,
  repo_size_bytes BIGINT,
  error_msg TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sync_jobs_source_delivery_unique UNIQUE (source_id, github_delivery_id)
);

ALTER TABLE public.sync_jobs ADD COLUMN IF NOT EXISTS installation_id BIGINT REFERENCES public.github_app_installations(installation_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_created_at ON public.sync_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_source_created_at ON public.sync_jobs (source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_created_at ON public.sync_jobs (status, created_at DESC);

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sync jobs" ON public.sync_jobs;
CREATE POLICY "Users can read own sync jobs" ON public.sync_jobs
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own sync jobs" ON public.sync_jobs;
CREATE POLICY "Users can insert own sync jobs" ON public.sync_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
