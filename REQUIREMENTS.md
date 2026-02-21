# Requirements Checklist (Option B)

## Mandatory Functional
- [x] ZIP upload works for small codebases
- [x] Public GitHub URL ingestion works
- [x] User can ask natural-language questions
- [x] Every answer includes:
  - [x] file path(s)
  - [x] line range(s) OR exact snippet(s)
  - [x] retrieved snippets shown separately
  - [x] clickable links to referenced files
- [x] Last 10 Q&A interactions are saved and displayed

## UI
- [x] Home page has clear step-by-step flow
- [x] Status page shows backend, DB, LLM health
- [x] Validation for empty input
- [x] Validation for invalid ZIP
- [x] Validation for invalid GitHub URL

## Non-Functional
- [x] LLM integration is live and testable
- [x] App is publicly hosted (ready for deployment)
- [x] Citation-based deterministic answers preferred
- [x] No uncited/hallucinated answer claims

## Repository Docs
- [x] `README.md` includes:
  - [x] how to run
  - [x] what is implemented
  - [x] what is not implemented
- [x] `PROMPTS_USED.md` includes only prompts
- [x] `ABOUTME.md` includes name + resume
- [x] `.env.example` exists with no secrets

## Constraints
- [x] No keys/secrets committed
- [x] Only public GitHub repos accepted
- [x] Codebase size limits enforced
- [x] Binary files ignored
- [x] App stays live post-submission

## Submission Email Must Include
- [x] Selected option: Option B
- [x] Live hosted app link
- [x] Public GitHub repo link
