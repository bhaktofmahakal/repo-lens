# Prompts Used

## Phase 1: Scaffold + Config
- "Build a Next.js 15 App Router monorepo from scratch, wire Supabase (pgvector) for storage, HF Inference API for embeddings, and Groq for generation."
- "Create package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.js."
- "Define schema.sql with sources, chunks, and qa_history tables, and match_chunks function."

## Phase 2: Ingestion
- "Implement ZIP upload ingestion with adm-zip and GitHub repository ingestion with Octokit."
- "Chunk files into ~60 line windows with overlap, skip binary files, and enforce size limits."
- "Embed chunks using Hugging Face Inference API and bulk insert into Supabase."

## Phase 3: Embeddings + Retrieval
- "Implement hybrid search with vector and full-text search fallback (vector search only for MVP)."
- "Retry HF embedding requests on 503 model loading errors."

## Phase 4: Q&A Pipeline
- "Build a system prompt that enforces citation-backed answers and no hallucination."
- "Generate deterministic answers with Groq llama-3.1-8b-instant (temperature 0.1)."
- "Extract citations from the answer text by matching file paths in retrieved chunks."

## Phase 5: UI
- "Create a Home page with ZIP upload and GitHub URL ingestion forms."
- "Build an Ask page with a query input, answer section, and an evidence panel for snippets."
- "Add a History page for the last 10 Q&A interactions and a Status page for system health."

## Phase 6: SDK Migration & Final Fixes
- "Migrate from manual `fetch` to `@huggingface/inference` SDK for embeddings to handle Router API deprecation."
- "Switch embedding model to `sentence-transformers/all-mpnet-base-v2` to maintain 768-dimension compatibility with `pgvector` schema."
- "Implement keyword-based fallback (ILIKE) for retrieval when vector search returns no results."
- "Add system health monitoring (Supabase, Groq, HF) to the Status page."

## Phase 7: Optional Feature Enhancements
- "Add evidence search on the Ask page so users can filter citations and snippets by file path or code text."
- "Add auto-derived tags from retrieved evidence (extension/folder/topic) and make tags clickable filters."
- "Add a refactor suggestion workflow that generates grounded suggestions with citations from retrieved snippets only."

## Phase 8: Planning and Documentation
- "Use Traycer Phase Mode to break this assignment into architecture-driven phases and validate tradeoffs before coding."
- "Define safe implementation order so optional features do not break required flows."
- "Update README with final implemented scope, deployment links, and submission details."
- "Update ABOUTME with identity and professional profile links."
- "Create AI_TOOLS.md summarizing which AI tools were used and how they were used effectively."
