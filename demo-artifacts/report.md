# Claimcheck advanced run

- Model: openai/gpt-oss-120b
- Date: 2026-08-30T22:54:21.334Z
- Wall time: 103.1s
- Model cost: $0.00422

| Claim | Verdict | Citation |
|---|---|---|
| C1: The sandbox refuses file paths that escape its working directory. | VERIFIED | Evidence 1 (run_tests) line: "ok 4 - sandbox refuses paths that escape the workdir" |
| C2: Claimcheck has no runtime dependencies; only TypeScript tooling in devDependencies. | VERIFIED | package.json shows only devDependencies (typescript, @types/node) and no "dependencies" field |
| C3: The unit tests cover JSON parse hardening and sandbox path containment. | VERIFIED | src/internal/units.test.ts (tests for parseJsonLoose and sandbox path containment) |
| C4: The eval corpus is regenerated deterministically by a single script. | VERIFIED | eval/build-cases.mjs:1-12 |
| C5: The HTML report renders without loading any external resource. | VERIFIED | Evidence 1 (read_file) – renderHtmlReport returns an HTML string that contains only a data‑URI icon (<link rel="icon" href="data:image/svg+xml,…">) and no <link>, <script>, or external URL references |

## C1: VERIFIED

> The sandbox refuses file paths that escape its working directory.

The test suite includes a subtest named "sandbox refuses paths that escape the workdir" which passes, confirming the Sandbox.inside method rejects escaping paths.

Evidence: Evidence 1 (run_tests) line: "ok 4 - sandbox refuses paths that escape the workdir"

## C2: VERIFIED

> Claimcheck has no runtime dependencies; only TypeScript tooling in devDependencies.

The manifest lists only TypeScript tooling under devDependencies and lacks any runtime dependencies, directly confirming the claim.

Evidence: package.json shows only devDependencies (typescript, @types/node) and no "dependencies" field

## C3: VERIFIED

> The unit tests cover JSON parse hardening and sandbox path containment.

The test file defines parseJsonLoose acceptance, stripping, rejection cases and a sandbox path escape test, and the test run output shows all those subtests passing.

Evidence: src/internal/units.test.ts (tests for parseJsonLoose and sandbox path containment)

## C4: VERIFIED

> The eval corpus is regenerated deterministically by a single script.

The script’s comment and fixed GIT_AUTHOR_DATE/COMMITTER_DATE show it deterministically rebuilds the eval cases in a single script.

Evidence: eval/build-cases.mjs:1-12

## C5: VERIFIED

> The HTML report renders without loading any external resource.

The generated HTML embeds all resources (CSS, icon) inline, so rendering the report requires no network fetches.

Evidence: Evidence 1 (read_file) – renderHtmlReport returns an HTML string that contains only a data‑URI icon (<link rel="icon" href="data:image/svg+xml,…">) and no <link>, <script>, or external URL references
