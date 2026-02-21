# AI Notes

## How AI was used

### GPT-5
- Used for boilerplate acceleration and structured implementation support.
- Used to draft and refine repetitive code patterns for API handlers, UI wiring, and type updates.

### Traycer (Phase Mode)
- Used during planning to break the assignment into execution phases.
- Used to evaluate architecture tradeoffs before implementation, especially for ingestion, retrieval, evidence grounding, and deployment readiness.

### Codex
- Used for repository-level execution:
  - implementing features
  - fixing issues
  - writing and updating tests
  - updating and validating documentation
  - deployment and post-deploy checks

### CodeRabbit
- Used for additional review after commits.

## What I verified manually
- Tested ZIP and GitHub ingestion flows.
- Validated question-answer behavior and citation visibility in the UI.
- Checked retrieved evidence panels and source links.
- Checked invalid input scenarios and error messages.
- Verified status page indicators (backend, database, and LLM).
- Reviewed fallback behavior for insufficient evidence.
- Reviewed documentation quality and submission completeness.

## Architecture and decision ownership
- Final architecture and tradeoffs were reviewed with human judgment.
- AI was used as an assistant, not for blind copy-paste.
- Final implementation decisions, acceptance checks, and submission-readiness validation were done with manual oversight.
