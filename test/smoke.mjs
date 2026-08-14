// Smoke test: verify the published entry loads and exports the plugin contract.
// No network calls, no API key required.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const mod = await import("../lib/index.js");

assert.equal(typeof mod.apply, "function", "apply must be a function");
assert.equal(typeof mod.name, "string", "name must be a string");
assert.ok(Array.isArray(mod.inject) && mod.inject.includes("web"), "inject must include 'web'");
assert.equal(mod.TAVILY_PROVIDER_ID, "tavily", "provider id must be 'tavily'");

const provider = new mod.TavilySearchProvider(() => ({
  apiKey: void 0,
  resolveApiKey: async () => "test-key",
  apiKeyEnv: "TAVILY_API_KEY",
  baseURL: "https://api.tavily.com"
}));
assert.equal(provider.available(), true, "provider must be available with a resolvable key");
assert.equal(provider.id, "tavily");

const req = createRequire(import.meta.url);
const pkg = req("../package.json");
assert.equal(pkg.dsh?.bundle?.patch, "./cordis.patch.yml", "package.json must declare dsh.bundle.patch");
assert.ok(pkg.files?.includes("lib/index.js") && pkg.files?.includes("cordis.patch.yml"), "files must include the runtime entry and the patch");

console.log("smoke OK: exports =", Object.keys(mod).join(","));
