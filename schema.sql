CREATE EXTENSION IF NOT EXISTS vector;

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

-- Resets existing vectors after dimension changes.
DROP INDEX IF EXISTS chunks_embedding_idx;
ALTER TABLE chunks
  ALTER COLUMN embedding TYPE VECTOR(768)
  USING NULL;

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
