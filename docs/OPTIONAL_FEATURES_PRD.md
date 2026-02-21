# Optional Features Plan

## Scope
- Evidence search filter in Ask UI.
- Evidence tags in Ask UI.
- Refactor suggestion endpoint and UI panel.

## Safety Rules
- Do not break existing ingestion, ask, citations, snippets, history.
- Keep source scoping by `sourceId`.
- Keep evidence grounding for responses.

## Acceptance
- Search filters citations/snippets.
- Tags filter evidence and reset on new question/source change.
- Refactor suggestions include citable references only.
