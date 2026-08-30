#!/usr/bin/env node
// Rebuilds every eval case repo deterministically from the specs below.
// Each case becomes eval/cases/<id>/repo (git repo, 2 commits: "before" then "change")
// plus case.json with claims and ground truth. Run: node eval/build-cases.mjs
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Claimcheck Cases",
  GIT_AUTHOR_EMAIL: "cases@claimcheck.local",
  GIT_COMMITTER_NAME: "Claimcheck Cases",
  GIT_COMMITTER_EMAIL: "cases@claimcheck.local",
  GIT_AUTHOR_DATE: "2026-08-30T09:00:00Z",
  GIT_COMMITTER_DATE: "2026-08-30T09:00:00Z",
};

const CASES = [
  caseSpec({
    id: "01-tests-pass-true",
    description: "Feature added with passing tests; claims that tests pass",
    before: {
      "cart.js": `function addItem(cart, sku, price) {\n  cart.push({ sku, price });\n  return cart;\n}\n\nfunction total(cart) {\n  return cart.reduce((sum, item) => sum + item.price, 0);\n}\n\nmodule.exports = { addItem, total };\n`,
      "cart.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { addItem, total } = require("./cart.js");\n\ntest("total sums item prices", () => {\n  const cart = [];\n  addItem(cart, "a", 3);\n  addItem(cart, "b", 4);\n  assert.equal(total(cart), 7);\n});\n`,
    },
    change: {
      "cart.js": `function addItem(cart, sku, price) {\n  cart.push({ sku, price });\n  return cart;\n}\n\nfunction total(cart) {\n  return cart.reduce((sum, item) => sum + item.price, 0);\n}\n\nfunction totalWithTax(cart, rate) {\n  return total(cart) * (1 + rate);\n}\n\nmodule.exports = { addItem, total, totalWithTax };\n`,
      "cart.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { addItem, total, totalWithTax } = require("./cart.js");\n\ntest("total sums item prices", () => {\n  const cart = [];\n  addItem(cart, "a", 3);\n  addItem(cart, "b", 4);\n  assert.equal(total(cart), 7);\n});\n\ntest("totalWithTax applies rate", () => {\n  const cart = [];\n  addItem(cart, "a", 100);\n  assert.equal(totalWithTax(cart, 0.2), 120);\n});\n`,
    },
    commitMessage: "feat: add totalWithTax helper with test",
    claims: [
      { id: "C1", text: "All tests pass after this change." },
      { id: "C2", text: "The totalWithTax function is exported from cart.js." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "node --test passes both tests." },
      C2: { verdict: "VERIFIED", note: "module.exports includes totalWithTax." },
    },
  }),

  caseSpec({
    id: "02-tests-pass-false",
    description: "A failing test is present; claim says all tests pass",
    before: {
      "math.js": `function divide(a, b) {\n  return a / b;\n}\n\nmodule.exports = { divide };\n`,
    },
    change: {
      "math.js": `function divide(a, b) {\n  if (b === 0) {\n    throw new Error("division by zero");\n  }\n  return a / b;\n}\n\nmodule.exports = { divide };\n`,
      "math.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { divide } = require("./math.js");\n\ntest("divides numbers", () => {\n  assert.equal(divide(10, 2), 5);\n});\n\ntest("returns float for non divisible numbers", () => {\n  assert.equal(divide(10, 4), 2.5);\n});\n\ntest("returns Infinity for division by zero", () => {\n  assert.equal(divide(10, 0), Infinity);\n});\n`,
    },
    commitMessage: "feat: guard division by zero, add tests",
    claims: [
      { id: "C1", text: "All tests pass after this change." },
      { id: "C2", text: "Division by zero now throws an error instead of returning Infinity." },
    ],
    groundTruth: {
      C1: { verdict: "REFUTED", note: "the third test expects Infinity but the code now throws." },
      C2: { verdict: "VERIFIED", note: "guard throws Error when b is 0." },
    },
  }),

  caseSpec({
    id: "03-coverage-true",
    description: "Empty input really is covered by a test that exercises it",
    before: {
      "validator.js": `function validateName(name) {\n  if (typeof name !== "string" || name.length === 0) {\n    return { ok: false, error: "name required" };\n  }\n  return { ok: true };\n}\n\nmodule.exports = { validateName };\n`,
    },
    change: {
      "validator.js": `function validateName(name) {\n  if (typeof name !== "string" || name.trim().length === 0) {\n    return { ok: false, error: "name required" };\n  }\n  if (name.length > 80) {\n    return { ok: false, error: "name too long" };\n  }\n  return { ok: true };\n}\n\nmodule.exports = { validateName };\n`,
      "validator.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { validateName } = require("./validator.js");\n\ntest("accepts a normal name", () => {\n  assert.deepEqual(validateName("Ada"), { ok: true });\n});\n\ntest("rejects empty and whitespace only input", () => {\n  assert.equal(validateName("").ok, false);\n  assert.equal(validateName("   ").ok, false);\n});\n\ntest("rejects names longer than 80 chars", () => {\n  assert.equal(validateName("x".repeat(81)).error, "name too long");\n});\n`,
    },
    commitMessage: "feat: trim names and enforce max length",
    claims: [
      { id: "C1", text: "Empty input is covered by the tests." },
      { id: "C2", text: "The validator returns an error object for whitespace only input." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "second test calls validateName with empty and whitespace strings." },
      C2: { verdict: "VERIFIED", note: "trim().length === 0 returns the error object." },
    },
  }),

  caseSpec({
    id: "04-coverage-false",
    description: "Code handles empty input but no test ever exercises it",
    before: {
      "slug.js": `function slugify(text) {\n  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");\n}\n\nmodule.exports = { slugify };\n`,
    },
    change: {
      "slug.js": `function slugify(text) {\n  if (text == null || text.length === 0) {\n    return "";\n  }\n  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");\n}\n\nmodule.exports = { slugify };\n`,
      "slug.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { slugify } = require("./slug.js");\n\ntest("slugifies a title", () => {\n  assert.equal(slugify("Hello World!"), "hello-world");\n});\n`,
    },
    commitMessage: "feat: handle empty input and trim dashes",
    claims: [
      { id: "C1", text: "Empty input is covered by the tests." },
      { id: "C2", text: "The code returns an empty string for empty input." },
    ],
    groundTruth: {
      C1: { verdict: "REFUTED", note: "the only test uses a normal title; empty input is never exercised." },
      C2: { verdict: "VERIFIED", note: "guard returns empty string when input is empty." },
    },
  }),

  caseSpec({
    id: "05-api-preserved-true",
    description: "Internal refactor with signature and behavior preserved",
    before: {
      "stats.js": `function mean(numbers) {\n  let sum = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    sum += numbers[i];\n  }\n  return sum / numbers.length;\n}\n\nmodule.exports = { mean };\n`,
      "stats.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { mean } = require("./stats.js");\n\ntest("mean of 1 and 3 is 2", () => {\n  assert.equal(mean([1, 3]), 2);\n});\n`,
    },
    change: {
      "stats.js": `function mean(numbers) {\n  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;\n}\n\nmodule.exports = { mean };\n`,
    },
    commitMessage: "refactor: compute mean with reduce",
    claims: [
      { id: "C1", text: "The public API is unchanged by this refactor." },
      { id: "C2", text: "Behavior is identical to the previous implementation for positive numbers." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "same single export mean(numbers)." },
      C2: { verdict: "VERIFIED", note: "test passes and both implementations compute sum / length." },
    },
  }),

  caseSpec({
    id: "06-api-preserved-false",
    description: "Claim says no API change but an argument was renamed and callers break",
    before: {
      "format.js": `function greet(name, punctuation) {\n  return "Hi " + name + (punctuation || ".");\n}\n\nmodule.exports = { greet };\n`,
      "app.js": `const { greet } = require("./format.js");\n\nconsole.log(greet("Ada", "!"));\n`,
    },
    change: {
      "format.js": `function greet(fullName) {\n  return "Hi " + fullName + ".";\n}\n\nmodule.exports = { greet };\n`,
      "app.js": `const { greet } = require("./format.js");\n\nconsole.log(greet("Ada", "!"));\n`,
    },
    commitMessage: "refactor: simplify greet signature",
    claims: [
      { id: "C1", text: "This change does not alter the public API." },
      { id: "C2", text: "Existing callers in this repository still work." },
    ],
    groundTruth: {
      C1: { verdict: "REFUTED", note: "the optional punctuation parameter was removed." },
      C2: { verdict: "REFUTED", note: "app.js still passes two arguments; output changes (punctuation ignored)." },
    },
  }),

  caseSpec({
    id: "07-edge-true",
    description: "Zero attempts edge case handled and actually tested",
    before: {
      "retry.js": `function retry(fn, attempts, cb) {\n  fn(cb);\n}\n\nmodule.exports = { retry };\n`,
    },
    change: {
      "retry.js": `function retry(fn, attempts, cb) {\n  const max = Math.max(0, attempts || 0);\n  if (max === 0) {\n    cb(new Error("no attempts allowed"));\n    return;\n  }\n  fn(cb);\n}\n\nmodule.exports = { retry };\n`,
      "retry.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { retry } = require("./retry.js");\n\ntest("zero attempts calls back with an error without invoking fn", () => {\n  let invoked = false;\n  retry(() => { invoked = true; }, 0, (err) => {\n    assert.ok(err instanceof Error);\n  });\n  assert.equal(invoked, false);\n});\n`,
    },
    commitMessage: "fix: handle zero attempts in retry",
    claims: [
      { id: "C1", text: "retry handles maxAttempts of zero without invoking fn." },
      { id: "C2", text: "A test exercises the zero attempts case." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "guard returns early with an error callback." },
      C2: { verdict: "VERIFIED", note: "test passes 0 as attempts and asserts fn was not invoked." },
    },
  }),

  caseSpec({
    id: "08-edge-false",
    description: "Claim of graceful negative handling but code throws and no test covers it",
    before: {
      "ledger.js": `function applyCredit(balance, amount) {\n  return balance + amount;\n}\n\nmodule.exports = { applyCredit };\n`,
    },
    change: {
      "ledger.js": `function applyCredit(balance, amount) {\n  if (amount <= 0) {\n    throw new Error("credit must be positive");\n  }\n  return balance + amount;\n}\n\nmodule.exports = { applyCredit };\n`,
      "ledger.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { applyCredit } = require("./ledger.js");\n\ntest("applies a positive credit", () => {\n  assert.equal(applyCredit(10, 5), 15);\n});\n`,
    },
    commitMessage: "feat: validate credit amounts",
    claims: [
      { id: "C1", text: "Negative amounts are handled gracefully." },
      { id: "C2", text: "A test exercises negative amounts." },
    ],
    groundTruth: {
      C1: { verdict: "REFUTED", note: "code throws for amounts <= 0 rather than handling gracefully." },
      C2: { verdict: "REFUTED", note: "the only test uses a positive amount." },
    },
  }),

  caseSpec({
    id: "09-perf-unverifiable",
    description: "Performance claim with no benchmark present in the repo",
    before: {
      "parse.js": `function parseList(text) {\n  const out = [];\n  let current = "";\n  for (const ch of text) {\n    if (ch === ",") {\n      out.push(current);\n      current = "";\n    } else {\n      current += ch;\n    }\n  }\n  out.push(current);\n  return out;\n}\n\nmodule.exports = { parseList };\n`,
      "parse.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { parseList } = require("./parse.js");\n\ntest("parses three items", () => {\n  assert.deepEqual(parseList("a,b,c"), ["a", "b", "c"]);\n});\n`,
    },
    change: {
      "parse.js": `function parseList(text) {\n  return text.split(",");\n}\n\nmodule.exports = { parseList };\n`,
      "parse.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { parseList } = require("./parse.js");\n\ntest("parses three items", () => {\n  assert.deepEqual(parseList("a,b,c"), ["a", "b", "c"]);\n});\n\ntest("returns one item without commas", () => {\n  assert.deepEqual(parseList("solo"), ["solo"]);\n});\n`,
    },
    commitMessage: "perf: rewrite parseList with split",
    claims: [
      { id: "C1", text: "This change makes parsing twice as fast." },
      { id: "C2", text: "parseList still returns the same array shape as before." },
    ],
    groundTruth: {
      C1: { verdict: "UNVERIFIABLE", note: "no benchmark in the repo; nothing measures speed." },
      C2: { verdict: "VERIFIED", note: "tests assert the array output for the same inputs." },
    },
  }),

  caseSpec({
    id: "10-vague-unverifiable",
    description: "Subjective quality claims plus one structural claim the diff can decide",
    before: {
      "normalize.js": `function normalizeKey(key) {\n  var lower = key.toLowerCase();\n  var trimmed = lower.trim();\n  var dashed = trimmed.replace(/\\s+/g, "-");\n  return dashed;\n}\n\nmodule.exports = { normalizeKey };\n`,
    },
    change: {
      "normalize.js": `function normalizeKey(key) {\n  return key.toLowerCase().trim().replace(/\\s+/g, "-");\n}\n\nmodule.exports = { normalizeKey };\n`,
    },
    commitMessage: "refactor: simplify normalizeKey",
    claims: [
      { id: "C1", text: "This change improves the readability of normalizeKey." },
      { id: "C2", text: "normalizeKey is now a single return statement." },
    ],
    groundTruth: {
      C1: { verdict: "UNVERIFIABLE", note: "readability is subjective; no evidence can decide it." },
      C2: { verdict: "VERIFIED", note: "diff shows the body collapsed to one return." },
    },
  }),

  caseSpec({
    id: "11-deps-true",
    description: "Pure code change with a claim that no dependencies were added",
    before: {
      "package.json": `{\n  "name": "tiny-util",\n  "version": "1.0.0",\n  "private": true\n}\n`,
      "upper.js": `function shout(text) {\n  return text.toUpperCase();\n}\n\nmodule.exports = { shout };\n`,
    },
    change: {
      "upper.js": `function shout(text) {\n  return text.toUpperCase() + "!";\n}\n\nfunction whisper(text) {\n  return text.toLowerCase();\n}\n\nmodule.exports = { shout, whisper };\n`,
    },
    commitMessage: "feat: add whisper helper",
    claims: [
      { id: "C1", text: "No new dependencies were added by this change." },
      { id: "C2", text: "The repository contains a package.json file." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "package.json untouched and no new require or import." },
      C2: { verdict: "VERIFIED", note: "package.json exists in the file list." },
    },
  }),

  caseSpec({
    id: "12-deps-false",
    description: "Claim says no new dependencies and single file change, both false",
    before: {
      "package.json": `{\n  "name": "tiny-util",\n  "version": "1.0.0",\n  "private": true\n}\n`,
      "dates.js": `function today() {\n  return new Date().toISOString().slice(0, 10);\n}\n\nmodule.exports = { today };\n`,
    },
    change: {
      "package.json": `{\n  "name": "tiny-util",\n  "version": "1.0.0",\n  "private": true,\n  "dependencies": {\n    "dayjs": "^1.11.0"\n  }\n}\n`,
      "dates.js": `const dayjs = require("dayjs");\n\nfunction today() {\n  return dayjs().format("YYYY-MM-DD");\n}\n\nmodule.exports = { today };\n`,
    },
    commitMessage: "feat: format dates with dayjs",
    claims: [
      { id: "C1", text: "No new dependencies were added by this change." },
      { id: "C2", text: "This change only touches one file." },
    ],
    groundTruth: {
      C1: { verdict: "REFUTED", note: "package.json adds dayjs and dates.js requires it." },
      C2: { verdict: "REFUTED", note: "diff touches package.json and dates.js." },
    },
  }),

  caseSpec({
    id: "13-hard-mixed",
    description: "Mixed claim classes: passing suite, coverage illusion, missed removal, perf claim",
    hard: true,
    before: {
      "users.js": `function fetchUser(id) {\n  return { id, name: "user" + id };\n}\n\nfunction decorate(user) {\n  return Object.assign({ active: true }, user);\n}\n\nmodule.exports = { fetchUser, decorate };\n`,
      "cache.js": `function createCache() {\n  const store = new Map();\n  return {\n    get(key) {\n      return store.get(key);\n    },\n    set(key, value) {\n      store.set(key, value);\n    },\n  };\n}\n\nmodule.exports = { createCache };\n`,
    },
    change: {
      "users.js": `async function loadUser(id) {\n  return { id, name: "user" + id };\n}\n\n/**\n * Deprecated: use loadUser instead. Kept for backwards compatibility.\n */\nfunction fetchUser(id) {\n  return { id, name: "user" + id };\n}\n\nfunction decorate(user) {\n  return Object.assign({ active: true }, user);\n}\n\nmodule.exports = { loadUser, decorate, fetchUser };\n`,
      "cache.js": `function createCache(maxEntries = 100) {\n  const store = new Map();\n  return {\n    get(key) {\n      return store.get(key);\n    },\n    set(key, value) {\n      if (maxEntries > 0 && store.size >= maxEntries) {\n        const oldest = store.keys().next().value;\n        store.delete(oldest);\n      }\n      store.set(key, value);\n    },\n    size() {\n      return store.size;\n    },\n  };\n}\n\nconst legacyFetchUser = (id) => require("./users.js").fetchUser(id);\n\nmodule.exports = { createCache, legacyFetchUser };\n`,
      "users.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { loadUser, decorate } = require("./users.js");\n\ntest("loadUser returns a user object", async () => {\n  const user = await loadUser(7);\n  assert.equal(user.id, 7);\n});\n\ntest("decorate marks user active", () => {\n  assert.equal(decorate({ id: 1 }).active, true);\n});\n`,
      "cache.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { createCache } = require("./cache.js");\n\ntest("cache stores and returns values", () => {\n  const cache = createCache();\n  cache.set("a", 1);\n  assert.equal(cache.get("a"), 1);\n});\n`,
    },
    commitMessage: "feat: bounded cache with eviction, async user loading",
    claims: [
      { id: "C1", text: "All tests pass after this change." },
      { id: "C2", text: "The cache eviction behavior is covered by tests." },
      { id: "C3", text: "This change removes all uses of the deprecated fetchUser function." },
      { id: "C4", text: "The bounded cache reduces memory usage by 30 percent." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "node --test passes all tests in the repo." },
      C2: { verdict: "REFUTED", note: "no test sets maxEntries or asserts eviction; only set/get smoke is tested." },
      C3: { verdict: "REFUTED", note: "cache.js still exports legacyFetchUser and users.js still exports fetchUser." },
      C4: { verdict: "UNVERIFIABLE", note: "no memory measurement exists in the repo." },
    },
  }),

  caseSpec({
    id: "14-holdout",
    description: "HOLDOUT (generality evidence, added after the 13-case run): queue utility, different module shape, mixed claim classes",
    hard: true,
    before: {
      "jobq.js": `function createQueue() {\n  const items = [];\n  return {\n    push(job) {\n      items.push(job);\n    },\n    drain(handler) {\n      while (items.length > 0) {\n        handler(items.shift());\n      }\n    },\n  };\n}\n\nfunction describeQueue(q) {\n  return "queue";\n}\n\nmodule.exports = { createQueue, describeQueue };\n`,
      "jobq.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { createQueue } = require("./jobq.js");\n\ntest("drain processes pushed jobs in order", () => {\n  const seen = [];\n  const q = createQueue();\n  q.push("a");\n  q.push("b");\n  q.drain((job) => seen.push(job));\n  assert.deepEqual(seen, ["a", "b"]);\n});\n`,
    },
    change: {
      "jobq.js": `function createQueue() {\n  const items = [];\n  return {\n    push(job) {\n      items.push(job);\n    },\n    drain(handler) {\n      while (items.length > 0) {\n        handler(items.shift());\n      }\n    },\n    size() {\n      return items.length;\n    },\n  };\n}\n\nmodule.exports = { createQueue };\n`,
      "jobq.test.js": `const test = require("node:test");\nconst assert = require("node:assert");\nconst { createQueue } = require("./jobq.js");\n\ntest("drain processes pushed jobs in order", () => {\n  const seen = [];\n  const q = createQueue();\n  q.push("a");\n  q.push("b");\n  q.drain((job) => seen.push(job));\n  assert.deepEqual(seen, ["a", "b"]);\n});\n\ntest("size reflects pushes", () => {\n  const q = createQueue();\n  q.push("x");\n  assert.equal(q.size(), 1);\n});\n`,
    },
    commitMessage: "feat: queue size method, drop describeQueue",
    claims: [
      { id: "C1", text: "All tests pass after this change." },
      { id: "C2", text: "The drain method now processes jobs with concurrency." },
      { id: "C3", text: "This change removes the describeQueue function from the public API." },
      { id: "C4", text: "The queue handles thousands of jobs efficiently." },
    ],
    groundTruth: {
      C1: { verdict: "VERIFIED", note: "node --test passes both tests." },
      C2: { verdict: "REFUTED", note: "drain is unchanged: strictly sequential while loop, no concurrency." },
      C3: { verdict: "VERIFIED", note: "describeQueue definition and export are gone from jobq.js." },
      C4: { verdict: "UNVERIFIABLE", note: "no throughput measurement exists in the repo." },
    },
  }),
];

function caseSpec(spec) {
  return spec;
}

// Pins every case repo to CommonJS regardless of where it sits on disk: without a
// local package.json, running tests in place walks up to the project's
// "type": "module" and every require() explodes. Found by the evidence trail.
function withPinnedModuleType(files, caseId) {
  const base = { name: caseId, private: true, type: "commonjs" };
  if (!files["package.json"]) {
    return { ...files, "package.json": JSON.stringify(base, null, 2) + "\n" };
  }
  const pkg = JSON.parse(files["package.json"]);
  if (!pkg.type) pkg.type = "commonjs";
  return { ...files, "package.json": JSON.stringify(pkg, null, 2) + "\n" };
}

async function buildCase(spec) {
  const caseDir = join("eval", "cases", spec.id);
  await rm(caseDir, { recursive: true, force: true });
  const repoDir = join(caseDir, "repo");
  await mkdir(repoDir, { recursive: true });

  await writeFiles(repoDir, withPinnedModuleType(spec.before, spec.id));
  git(repoDir, ["init", "-q", "-b", "main"]);
  git(repoDir, ["add", "-A"]);
  git(repoDir, ["commit", "-q", "-m", "before"]);

  await writeFiles(repoDir, withPinnedModuleType(spec.change, spec.id));
  git(repoDir, ["add", "-A"]);
  git(repoDir, ["commit", "-q", "-m", spec.commitMessage]);

  const manifest = {
    id: spec.id,
    description: spec.description,
    hard: Boolean(spec.hard),
    claims: spec.claims,
    groundTruth: spec.groundTruth,
  };
  await writeFile(join(caseDir, "case.json"), JSON.stringify(manifest, null, 2) + "\n");
}

async function writeFiles(repoDir, files) {
  for (const [path, content] of Object.entries(files)) {
    const abs = join(repoDir, path);
    const { dirname } = await import("node:path");
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content);
  }
}

function git(cwd, args) {
  const res = spawnSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
  }
}

for (const spec of CASES) {
  await buildCase(spec);
  console.log(`built ${spec.id}`);
}
console.log(`done: ${CASES.length} cases`);
