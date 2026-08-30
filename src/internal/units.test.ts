import test from "node:test";
import assert from "node:assert";
import { parseJsonLoose } from "../agent.js";
import { Sandbox } from "../sandbox.js";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("parseJsonLoose accepts plain json", () => {
  assert.deepEqual(parseJsonLoose('{"a":1}'), { a: 1 });
});

test("parseJsonLoose strips code fences and prose", () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a": [2]}\n```'), { a: [2] });
  assert.deepEqual(parseJsonLoose('Sure! {"a": 1} hope this helps'), { a: 1 });
});

test("parseJsonLoose rejects text without an object", () => {
  assert.throws(() => parseJsonLoose("no json here"));
});

test("sandbox refuses paths that escape the workdir", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cc-unit-"));
  await writeFile(join(dir, "a.txt"), "x");
  const sb = new Sandbox(dir);
  assert.equal(sb.inside("a.txt"), join(dir, "a.txt"));
  assert.throws(() => sb.inside("../outside.txt"));
  assert.throws(() => sb.inside("sub/../../up.txt"));
});
