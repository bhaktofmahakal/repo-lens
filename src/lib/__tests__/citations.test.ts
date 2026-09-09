import { describe, expect, it } from "vitest";
import { linkifyCitations } from "@/lib/qa/citations";

describe("linkifyCitations", () => {
  it("converts raw bracket citations into clickable markdown links", () => {
    const text = "Database models are defined in [src/schema.ts:L10-L45].";
    const result = linkifyCitations(text, "repo-123");
    expect(result).toBe(
      "Database models are defined in [[src/schema.ts:L10-L45]](/source?sourceId=repo-123&path=src%2Fschema.ts#L10-L45).",
    );
  });

  it("preserves already linked citations", () => {
    const text = "See [[src/schema.ts:L10-L45]](/custom-url) for info.";
    const result = linkifyCitations(text, "repo-123");
    expect(result).toBe("See [[src/schema.ts:L10-L45]](/custom-url) for info.");
  });

  it("handles empty or citation-free text", () => {
    expect(linkifyCitations("", "repo-123")).toBe("");
    expect(linkifyCitations("Regular text without code.", "repo-123")).toBe(
      "Regular text without code.",
    );
  });
});
