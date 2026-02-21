-- utsav
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  github_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1024),
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QA History table
CREATE TABLE IF NOT EXISTS qa_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  citations_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create an IVFFlat index on chunks.embedding for cosine similarity search
-- Note: 'match_chunks' function will be used for search.
-- The number of lists (lists = 100) should be tuned based on the number of chunks.
-- For a small codebase, IVFFlat or HNSW is fine.
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Match chunks function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1024),
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
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
