const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("extension entrypoint parses", () => {
  const entry = path.join(root, "extension.js");
  const result = spawnSync(process.execPath, ["--check", entry], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout || "syntax check failed");
});

test("manifest contributes required RepoLens commands and view", () => {
  const pkg = readJson(path.join(root, "package.json"));
  const commands = pkg?.contributes?.commands || [];
  const commandIds = new Set(commands.map((item) => item.command));

  assert.ok(commandIds.has("repolens.askQuestion"));
  assert.ok(commandIds.has("repolens.ingestRepo"));
  assert.ok(commandIds.has("repolens.setApiKey"));
  assert.ok(commandIds.has("repolens.setRepoId"));

  const explorerViews = pkg?.contributes?.views?.explorer || [];
  assert.ok(explorerViews.some((view) => view.id === "repolens.sidebar"));
});
