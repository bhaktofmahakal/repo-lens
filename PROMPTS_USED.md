# Prompts Used

- "Given Option B requirements, break the work into safe implementation phases with clear acceptance criteria."
- "Review this existing Next.js codebase and propose architecture decisions for ingestion, retrieval, and citation grounding without major rewrites."
- "Suggest a step-by-step implementation order that minimizes regression risk while adding optional enhancements."

- "Implement ZIP ingestion validations for wrong file type, empty payload, and size limits; keep existing route contracts unchanged."
- "Implement public GitHub URL validation and return clear errors for invalid/private/inaccessible repositories."
- "Implement retrieval that stays scoped by `sourceId` and returns citable chunks only."
- "Build a Q&A API response shape with `answer`, `citations`, and `retrievedSnippets`, and persist history entries."
- "Add a refactor-suggestions API that is grounded strictly in retrieved snippets and cited references."

- "Define chunking strategy with line ranges so each citation can link back to exact source lines."
- "Integrate Hugging Face embeddings and enforce vector dimension consistency with pgvector schema."
- "Add fallback retrieval paths when vector retrieval is weak, but keep outputs evidence-grounded."

- "Create a simple home page with clear steps for ZIP upload and GitHub URL ingestion."
- "Build an Ask page with a question input, answer panel, citations section, and a separate retrieved-evidence panel."
- "Ensure citation links are clickable and line ranges are visible in the UI."
- "Add optional enhancements: evidence search, tag filters, and refactor suggestions panel."
- "Create a status page showing backend, database, and LLM health states."
- "Create a history page that displays only the latest 10 Q&A interactions for a selected source."

- "Write focused tests for retrieval ranking, citation extraction, and ingestion filters."
- "Review edge cases where evidence is weak and ensure fallback responses avoid uncited claims."
- "Check for cross-source leakage and ensure all retrieval/history queries are scoped to `sourceId`."

## Documentation prompts
- "Update README with run instructions, implemented scope, known gaps, live link, and repository link."

