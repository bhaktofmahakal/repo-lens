import assert from "node:assert/strict";
import test from "node:test";
import { buildFallbackOrFilter } from "../src/lib/retrieval/search";

test("buildFallbackOrFilter builds a combined OR filter once", () => {
  const filter = buildFallbackOrFilter("auth retry");

  assert.ok(filter.includes("content.ilike.%auth%"));
  assert.ok(filter.includes("file_path.ilike.%retry%"));
  assert.equal(filter.split(",").length, 4);
});

test("buildFallbackOrFilter sanitizes dangerous characters", () => {
  const filter = buildFallbackOrFilter("auth,%foo'bar");

  assert.equal(filter.includes("'"), false);
});

test("buildFallbackOrFilter drops common stopwords for broad questions", () => {
  const filter = buildFallbackOrFilter("how university data is coming");

  assert.equal(filter.includes("%how%"), false);
  assert.equal(filter.includes("%is%"), false);
  assert.ok(filter.includes("%university%"));
  assert.ok(filter.includes("%data%"));
});
