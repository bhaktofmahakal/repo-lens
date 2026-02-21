import assert from "node:assert/strict";
import test from "node:test";
import { extractCitations } from "../src/lib/qa/citations";
import { Chunk } from "../src/types";

const chunks: Chunk[] = [
  {
    id: "1",
    source_id: "source-1",
    file_path: "src/auth.ts",
    start_line: 10,
    end_line: 25,
    content: "export function login() {}",
    source_url: "https://example.com/src/auth.ts#L10-L25",
  },
  {
    id: "2",
    source_id: "source-1",
    file_path: "src/retry.ts",
    start_line: 1,
    end_line: 20,
    content: "export const MAX_RETRIES = 3;",
    source_url: "https://example.com/src/retry.ts#L1-L20",
  },
];

test("extractCitations falls back to retrieved chunks when answer has no explicit paths", () => {
  const citations = extractCitations("Retries are handled by a constant value.", chunks);

  assert.ok(citations.length > 0);
  assert.equal(citations[0].filePath, "src/auth.ts");
});

test("extractCitations captures direct file path mentions", () => {
  const citations = extractCitations("Check src/retry.ts for retry logic.", chunks);

  assert.ok(citations.some((citation) => citation.filePath === "src/retry.ts"));
});
