import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "@/lib/api-docs/openapi";

describe("buildOpenApiDocument", () => {
  it("includes expected v1 paths", () => {
    const doc = buildOpenApiDocument("https://repo-lens.example.com") as {
      paths?: Record<string, unknown>;
    };

    const paths = doc.paths || {};

    expect(paths["/api/v1/repos"]).toBeTruthy();
    expect(paths["/api/v1/repos/{id}/status"]).toBeTruthy();
    expect(paths["/api/v1/repos/{id}/query"]).toBeTruthy();
    expect(paths["/api/v1/repos/{id}/history"]).toBeTruthy();
    expect(paths["/api/v1/repos/{id}"]).toBeTruthy();
    expect(paths["/api/v1/api-keys"]).toBeTruthy();
    expect(paths["/api/v1/api-keys/{keyId}"]).toBeTruthy();
  });

  it("sets server URL from origin", () => {
    const doc = buildOpenApiDocument("https://repo-lens.example.com") as {
      servers?: Array<{ url?: string }>;
    };

    expect(doc.servers?.[0]?.url).toBe("https://repo-lens.example.com");
  });
});