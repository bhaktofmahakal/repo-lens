# RepoLens VS Code Extension

RepoLens helps you ask questions about your indexed repositories and navigate directly to cited lines in your workspace.

## Features

- Sidebar in Explorer (`RepoLens`) for quick ingest and Q&A.
- Command palette actions for API key, repo ID, ingest, and ask flows.
- Citation links open files directly at the referenced line range.

## Setup

1. Open VS Code settings and set `repolens.baseUrl`.
2. Run command: `RepoLens: Set API Key`.
3. Run command: `RepoLens: Set Default Repo ID` (or ingest from sidebar first).

## Commands

- `RepoLens: Ask a Question`
- `RepoLens: Ingest Repository URL`
- `RepoLens: Set API Key`
- `RepoLens: Set Default Repo ID`
- `RepoLens: Refresh Sidebar`

## Notes

- API key is stored using VS Code SecretStorage.
- The extension uses your configured RepoLens backend under `repolens.baseUrl`.
