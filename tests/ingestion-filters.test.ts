import assert from "node:assert/strict";
import test from "node:test";
import { isProbablyBinaryContent, isSupportedTextFile, sanitizeForDatabase } from "../src/lib/ingestion/filters";

test("sanitizeForDatabase removes null and unsafe control chars", () => {
  const input = "abc\u0000def\u0007ghi\n\tjkl";
  const output = sanitizeForDatabase(input);

  assert.equal(output, "abcdefghi\n\tjkl");
});

test("isProbablyBinaryContent detects null bytes", () => {
  assert.equal(isProbablyBinaryContent("hello\u0000world"), true);
  assert.equal(isProbablyBinaryContent("plain text\nwith new lines"), false);
});

test("isSupportedTextFile allows known code/text files and blocks unknown extensions", () => {
  assert.equal(isSupportedTextFile("src/index.ts"), true);
  assert.equal(isSupportedTextFile("README"), true);
  assert.equal(isSupportedTextFile("lang/file.xyz"), false);
});
