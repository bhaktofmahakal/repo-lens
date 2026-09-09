import { describe, expect, it } from "vitest";
import { cleanModelResponse, FALLBACK_GROQ_MODELS, PRIMARY_GROQ_MODEL } from "@/lib/qa/groq";

describe("groq qa module", () => {
  it("cleans <think> tags from reasoning models", () => {
    const raw = "<think>Analyzing code patterns...</think>The auth guard is in `src/middleware.ts` [src/middleware.ts:L1-L20].";
    const cleaned = cleanModelResponse(raw);
    expect(cleaned).toBe("The auth guard is in `src/middleware.ts` [src/middleware.ts:L1-L20].");
  });

  it("handles responses without <think> tags", () => {
    const raw = "The database model is defined in `schema.sql:L10-L30`.";
    expect(cleanModelResponse(raw)).toBe(raw);
  });

  it("includes active modern models in fallback chain", () => {
    expect(FALLBACK_GROQ_MODELS).toContain("qwen/qwen3.8-27b");
    expect(FALLBACK_GROQ_MODELS).toContain("groq/compound-mini");
  });
});
