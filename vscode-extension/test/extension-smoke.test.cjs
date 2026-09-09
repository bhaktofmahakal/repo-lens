const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("extension entrypoint parses without syntax errors", () => {
  const entry = path.join(root, "extension.js");
  const result = spawnSync(process.execPath, ["--check", entry], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout || "syntax check failed");
});

test("manifest contributes modern RepoLens commands, keybindings, and views", () => {
  const pkg = readJson(path.join(root, "package.json"));
  const commands = pkg?.contributes?.commands || [];
  const commandIds = new Set(commands.map((item) => item.command));

  assert.ok(commandIds.has("repolens.askQuestion"));
  assert.ok(commandIds.has("repolens.askSelection"));
  assert.ok(commandIds.has("repolens.explainSelection"));
  assert.ok(commandIds.has("repolens.refactorSelection"));
  assert.ok(commandIds.has("repolens.autoDetectRepo"));
  assert.ok(commandIds.has("repolens.ingestRepo"));
  assert.ok(commandIds.has("repolens.setApiKey"));
  assert.ok(commandIds.has("repolens.setRepoId"));

  const keybindings = pkg?.contributes?.keybindings || [];
  assert.ok(keybindings.some((kb) => kb.command === "repolens.askQuestion"));
  assert.ok(keybindings.some((kb) => kb.command === "repolens.refactorSelection"));

  const explorerViews = pkg?.contributes?.views?.explorer || [];
  assert.ok(explorerViews.some((view) => view.id === "repolens.sidebar"));

  const contextMenus = pkg?.contributes?.menus?.["editor/context"] || [];
  assert.ok(contextMenus.some((m) => m.command === "repolens.askSelection"));
  assert.ok(contextMenus.some((m) => m.command === "repolens.explainSelection"));
  assert.ok(contextMenus.some((m) => m.command === "repolens.refactorSelection"));
});
