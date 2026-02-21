import assert from "node:assert/strict";
import test from "node:test";
import { Citation } from "../src/types";
import {
  buildFallbackRefactorSuggestions,
  parseRefactorSuggestions,
} from "../src/lib/qa/refactor";

const snippets: Citation[] = [
  {
    filePath: "src/lib/auth.ts",
    startLine: 10,
    endLine: 30,
    snippet: "export async function login() { /* ... */ }",
    sourceUrl: "https://example.com/src/lib/auth.ts#L10-L30",
  },
  {
    filePath: "src/lib/retry.ts",
    startLine: 1,
    endLine: 20,
    snippet: "export const MAX_RETRIES = 3;",
    sourceUrl: "https://example.com/src/lib/retry.ts#L1-L20",
  },
];

test("parseRefactorSuggestions resolves structured JSON suggestions with valid citations", () => {
  const raw = JSON.stringify({
    suggestions: [
      {
        title: "Extract auth session helper",
        rationale: "Auth flow appears mixed with transport concerns.",
        expectedImpact: "Improves readability and testability.",
        citations: [{ filePath: "src/lib/auth.ts", startLine: 10, endLine: 30 }],
      },
    ],
  });

  const parsed = parseRefactorSuggestions(raw, snippets);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, "Extract auth session helper");
  assert.equal(parsed[0].citations.length, 1);
  assert.equal(parsed[0].citations[0].filePath, "src/lib/auth.ts");
});

test("parseRefactorSuggestions drops suggestions with out-of-evidence citations", () => {
  const raw = JSON.stringify({
    suggestions: [
      {
        title: "Consolidate retries",
        rationale: "Retry logic can be centralized.",
        expectedImpact: "Reduces duplication.",
        citations: [{ filePath: "src/unknown.ts", startLine: 1, endLine: 5 }],
      },
    ],
  });

  const parsed = parseRefactorSuggestions(raw, snippets);
  assert.equal(parsed.length, 0);
});

test("buildFallbackRefactorSuggestions returns deterministic cited suggestions", () => {
  const fallback = buildFallbackRefactorSuggestions(snippets, "How do retries work?");
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].citations[0].filePath, "src/lib/retry.ts");
});
