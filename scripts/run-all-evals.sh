#!/usr/bin/env bash
# Runs the full evaluation sequence and records evidence for the README table.
# Requires .env with CLAIMCHECK_API_KEY (or the variables in the environment).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== rebuilding =="
npm run build
node eval/build-cases.mjs >/dev/null

echo "== baseline: one prompt, no tools =="
node dist/cli.js eval --label baseline --mode baseline

echo "== advanced: planner + executor + verifier =="
node dist/cli.js eval --label iter1 --mode advanced

echo "== self-audit demo run =="
node dist/cli.js verify --repo . --claims-file demo/claims.md --out demo-artifacts

echo "== front-door gate =="
node dist/cli.js site --artifacts demo-artifacts/report.json --out site 2>/dev/null || node dist/cli.js site --out site
node scripts/check-front-door.mjs site

echo "done. see eval-results/, demo-artifacts/, and site/"
