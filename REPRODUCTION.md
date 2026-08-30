# Reproduction guide

Written for a judge starting from a clean environment. Every command below was run on
macOS (darwin, arm64) with Node 22.23.1 and npm 10.9.8; any Node 20+ should behave the
same. Total runtime without an API key: about 1 minute. With a key: TODO-KEY.

## What you need

- Node.js 20 or newer (`node --version`)
- git
- Optional: any OpenAI-compatible API key (OpenAI, Groq free tier, OpenRouter). Needed
  only for model-driven runs. The mock run and all tests need no key and no network.

## Setup

```bash
git clone <repository url> claimcheck
cd claimcheck
npm install        # installs typescript + @types/node only, no runtime deps
npm run build      # compiles src/ to dist/
npm test           # 4 unit tests: JSON parse hardening, sandbox path containment
```

## Regenerate the eval corpus

The 13 case repositories (28 claims with planted ground truth) are generated, not stored:

```bash
node eval/build-cases.mjs
```

This creates `eval/cases/<id>/repo` (a git repository with two commits: the state before
the change, then the change itself) and `eval/cases/<id>/case.json` (claims and ground
truth). Deterministic: git identities and dates are fixed, so regeneration produces
byte-identical cases.

## Run the evaluation without a key (harness proof)

```bash
CLAIMCHECK_MOCK=1 node dist/cli.js eval --label mock --mode advanced
```

Expected: 13 case lines, then a summary starting `# Eval run: mock` showing 53.6 percent
accuracy for the deterministic mock (VERIFIED-heavy bias by design), artifacts written to
`eval-results/advanced-mock/`.

## Run the evaluation with a key

Create `.env` in the repository root (it is gitignored):

```
CLAIMCHECK_API_KEY=your-key
# only if not using OpenAI:
# CLAIMCHECK_BASE_URL=https://api.groq.com/openai/v1
# CLAIMCHECK_MODEL=llama-3.3-70b-versatile
```

```bash
node dist/cli.js eval --label baseline --mode baseline    # one-prompt baseline
node dist/cli.js eval --label final --mode advanced       # agent pipeline
```

Each run writes per-case reports and a `summary.md` to `eval-results/<mode>-<label>/`.
Expected numbers: TODO-KEY (fills after final runs; see README evaluation table).
Approximate cost per full 13-case run: TODO-KEY.

Recorded artifacts from the runs reported in the README are committed under
`eval-results/` so results can be inspected without re-running.

## Verify a repository of your choice

```bash
node dist/cli.js verify --repo path/to/repo --claims "all tests pass
the cache eviction path is covered by tests" --out run-artifacts
```

The repo needs at least two commits (the diff under review is `HEAD~1..HEAD`). Output:
terminal verdict table plus `run-artifacts/report.{json,md,html}`. Open the HTML file in
any browser for the report view.

## What to expect in outputs

- Verdicts are exactly `VERIFIED`, `REFUTED`, or `UNVERIFIABLE`.
- Every verdict carries a citation pointing at the evidence that decided it (a file with
  line numbers, or a command plus its key output line).
- `run_tests` evidence shows the node:test summary block (`# pass`, `# fail`).

## Versions

- Node 22.23.1, npm 10.9.8, TypeScript 5.6, git 2.x
- No runtime dependencies; two dev dependencies (typescript, @types/node)
- Model used for reported results: TODO-KEY
