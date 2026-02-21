import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { rankRetrievedChunks } from "../src/lib/retrieval/search";
import { Chunk } from "../src/types";

function makeChunk(filePath: string, content: string): Chunk {
  return {
    id: randomUUID(),
    source_id: randomUUID(),
    file_path: filePath,
    start_line: 1,
    end_line: 20,
    content,
  };
}

test("rankRetrievedChunks prefers implementation files over documentation for code questions", () => {
  const docChunk = makeChunk(
    "docs/TRD.md",
    "Authentication is configured in src/lib/auth.ts and uses better-auth.",
  );
  const codeChunk = makeChunk(
    "src/lib/auth.ts",
    "export const auth = betterAuth({ emailAndPassword: { enabled: true } });",
  );

  const ranked = rankRetrievedChunks([docChunk, codeChunk], "Where is auth handled?", 2);
  assert.equal(ranked[0]?.file_path, "src/lib/auth.ts");
});

test("rankRetrievedChunks prefers api routes for data-flow questions", () => {
  const pageChunk = makeChunk(
    "src/app/page.tsx",
    "<h3>How accurate are recommendations?</h3><p>We analyze historical data...</p>",
  );
  const routeChunk = makeChunk(
    "src/app/api/universities/route.ts",
    "const response = await fetch('/api/universities?rag=true'); const data = await prisma.university.findMany();",
  );

  const ranked = rankRetrievedChunks([pageChunk, routeChunk], "how university data is coming ?", 2);
  assert.equal(ranked[0]?.file_path, "src/app/api/universities/route.ts");
});
