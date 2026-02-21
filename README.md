# Repo Lens - Option B

Repo Lens is a codebase Q&A web application that provides verifiable, citation-backed answers to your questions about a codebase. It supports both ZIP uploads and public GitHub repository ingestion.

## Core Features

- **Ingestion Pipeline**: 
  - ZIP upload (max 25MB).
  - Public GitHub URL ingestion (max 1000 files).
  - Skips binary files and ignores common directories (e.g., `node_modules`).
- **Chunking & Embeddings**:
  - Chunks files into ~60 line windows with 10-line overlap.
  - Generates 768-dimensional embeddings using Hugging Face's `sentence-transformers/all-mpnet-base-v2` model.
- **RAG Architecture**:
  - Vector search in Supabase using `pgvector` for efficient retrieval.
  - LLM-powered answer generation using Groq's `llama-3.1-8b-instant` model.
- **Verifiable Proof**:
  - Answers include file paths and line ranges.
  - Separate evidence panel displays retrieved code snippets.
  - Clickable source links to original files.
- **Optional Enhancements**:
  - Search within retrieved evidence (file/snippet text filter).
  - Auto-derived evidence tags (file extension, folder, and topic hints).
  - Grounded refactor suggestions generated from retrieved snippets.
- **Interaction History**:
  - Displays the last 10 Q&A interactions for the ingested codebase.
- **System Health**:
  - Dedicated status page monitoring backend, database, and LLM provider health.

## What is Not Implemented (MVP Gaps)

- Private repository authentication (public only).
- Large monorepo optimizations (size limits are enforced).
- Multi-tenant user authentication or team permissions.
- Auto-apply refactor edits (suggestions only).

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Lucide React.
- **Backend**: Next.js API Routes (Route Handlers).
- **Database**: Supabase (PostgreSQL + pgvector).
- **Embeddings**: Hugging Face Inference API.
- **LLM**: Groq (Llama 3.1).

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd repo-lens
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file by copying `.env.example` and filling in the values.
   ```bash
   cp .env.example .env.local
   ```

4. **Initialize the database**:
   Run the SQL provided in `schema.sql` in your Supabase SQL editor.

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open the app**:
   Visit `http://localhost:3000` to start exploring.

## Deployment

Repo Lens is built to be deployed on Vercel or any Next.js-compatible platform. Ensure all environment variables are correctly configured in your hosting environment.

## Optional Feature Notes

- Evidence search is client-side and filters current citations/snippets in the Ask screen.
- Tags are derived from retrieved evidence (extension/folder/topic hints) and work as quick filters.
- Refactor suggestions are generated from retrieved evidence and are citation-grounded.

## Submission Details

- **Selected Option**: Option B
- **Live URL**: https://repo-lens-gamma.vercel.app
- **GitHub URL**: https://github.com/bhaktofmahakal/repo-lens
- **AI Notes**: `AI_NOTES.md`
- **Prompts Log**: `PROMPTS_USED.md`
- **About Me**: `ABOUTME.md`

## Author

- **Name**: Utsav Mishra
- **Email**: utsavmishraa005@gmail.com
- **GitHub**: https://github.com/bhaktofmahakal
- **LinkedIn**: https://linkedin.com/utsav-mishra1
