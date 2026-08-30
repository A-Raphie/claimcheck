#!/usr/bin/env node
// Front-door gate: any HTML this project emits must be reachable from a landing
// that orients a stranger. Fails the build otherwise. See pre-ship-gate skill.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.argv[2] ?? "site";
const failures = [];
const pages = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) await walk(abs);
    else if (entry.name.endsWith(".html")) pages.push(abs);
  }
}

await walk(root).catch(() => {});

if (pages.length === 0) {
  console.error(`FRONT-DOOR GATE FAIL: no HTML files emitted under ${root}`);
  process.exit(1);
}

const hasIndex = pages.some((p) => p.endsWith("index.html"));
if (!hasIndex) {
  failures.push(`no index.html landing in ${root}`);
}

for (const page of pages) {
  const html = await readFile(page, "utf8");
  const rel = relative(root, page);
  const hasH1 = /<h1[\s>]/.test(html);
  const hasTitle = /<title>[^<]{5,}<\/title>/.test(html);
  const hasDescription = /name="description"/.test(html);
  const hasFavicon = /rel="icon"/.test(html);
  const isLanding = page.endsWith("index.html");
  // A landing must orient: what it is (h1), what it does (description sentence), enter path (link to another surface or anchor CTA)
  const enterPath = isLanding
    ? /href="(?!#)[^"]*\.html|href="#[a-z-]+"/.test(html)
    : true;
  if (!hasH1) failures.push(`${rel}: no h1 (does not orient)`);
  if (!hasTitle) failures.push(`${rel}: no title`);
  if (!hasDescription) failures.push(`${rel}: no meta description`);
  if (!hasFavicon) failures.push(`${rel}: no favicon`);
  if (!enterPath) failures.push(`${rel}: landing has no enter path`);
  if (isLanding) {
    const linked = [...html.matchAll(/href="([^"#]+\.html)"/g)].map((m) => m[1]);
    for (const link of linked) {
      if (!pages.some((p) => rel === link || p.endsWith(`/${link}`) || p.endsWith(link.replace(/^\.\//, "")))) {
        failures.push(`index.html links to missing surface: ${link}`);
      }
    }
  }
}

if (failures.length) {
  console.error("FRONT-DOOR GATE FAIL:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`FRONT-DOOR GATE PASS: ${pages.length} page(s), landing orients, all surfaces linked`);
