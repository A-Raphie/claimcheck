# Claimcheck

An agent that fact-checks claims about a code change against executable evidence.

You give it a repository and a list of claims ("all tests pass", "empty input is covered",
"no new dependencies", "parsing is 2x faster"). For every claim, Claimcheck plans evidence,
executes it in a sandbox (reads files, searches, runs the test suite, inspects git history),
and returns one of three verdicts with a citation:

- `VERIFIED` · evidence directly proves the claim true
- `REFUTED` · evidence directly proves the claim false
- `UNVERIFIABLE` · the evidence cannot decide the claim

## Who has this problem

Maintainers, team leads, and hackathon judges reviewing AI-assisted pull requests. Coding
agents produce convincing descriptions of their own work: "all tests pass", "handles the
edge case", "no breaking changes". CI can tell you the build is green. Nothing tells you
whether the claims about the change are true. Reviewing that by hand means re-deriving
every claim from the diff, which is exactly the work reviewers skip when the queue is long.

## Why solving it is valuable

A verdict table with citations turns "trust the agent" into "check the agent" in under a
minute. False confidence gets caught before merge, and claims that cannot be checked from
the repository (performance numbers, subjective quality) are named as such instead of
slipping through as if they were facts. The same instrument works pointed inward: run it
on your own change before someone else does.

## How it works

```
claims ──▶ planner agent ──▶ sandboxed executor ──▶ verifier agent ──▶ verdict table
             picks minimal      read_file search       verdict + citation
             evidence per        list_tests run_tests   per claim
             claim               git_log git_diff
```

- **Planner agent**: for each claim, chooses 1 to 3 evidence actions from a fixed menu.
- **Executor (deterministic TypeScript)**: runs those actions in a copy of the repository
  under a command allowlist (`node`, `git`) with timeouts, path containment, and output
  caps. The sandbox is a correctness guardrail, not a security boundary.
- **Verifier agent**: reads the collected evidence and applies a strict contract: a claim
  that tests pass is VERIFIED only if a test run in the evidence shows all tests passing;
  a claim that something is "covered" is VERIFIED only if a test actually exercises it;
  absence of evidence is UNVERIFIABLE, never a guess.

The baseline is the reasonable basic way this is done today: one direct prompt with the
diff and the claims, no tools, no execution. The eval measures the distance between the
two on identical cases.

## Evaluation

Primary metric: claim verdict accuracy against planted ground truth.

Eval corpus: 13 generated repository cases (28 claims) mixing true claims, false claims,
and claims that cannot be decided from the repository, plus one hard case with four claim
classes in one change. Every case is regenerated deterministically by
`node eval/build-cases.mjs`.

| Metric | Simple baseline | Agent solution | Change |
|---|---|---|---|
| Claim verdict accuracy | TODO-KEY | TODO-KEY | TODO-KEY |
| Hard case accuracy | TODO-KEY | TODO-KEY | TODO-KEY |
| REFUTED recall (catching false claims) | TODO-KEY | TODO-KEY | TODO-KEY |
| UNVERIFIABLE recall (naming the undecidable) | TODO-KEY | TODO-KEY | TODO-KEY |
| Wall time per case | TODO-KEY | TODO-KEY | TODO-KEY |
| Model cost per case | TODO-KEY | TODO-KEY | TODO-KEY |

The mock-agent run (`CLAIMCHECK_MOCK=1`, no API key, deterministic heuristics instead of
a model) scores 53.6 percent with a VERIFIED-everything bias: it executes the same
planner to executor to verifier loop but cannot actually judge evidence. It exists to
prove the harness and to show what guess-without-evidence looks like on this corpus.
See `eval-results/advanced-harness-check/summary.md`.

## Improvement changelog

| Stage | What we tried and why | Evidence | Decision / learning |
|---|---|---|---|
| Baseline | One prompt, diff plus claims, no tools: the way review works today | TODO-KEY | Established the starting point |
| Harness | Deterministic executor + ground truth corpus + mock agent first, so model quality is the only moving part | `eval-results/advanced-harness-check/` (53.6 percent, VERIFIED bias) | Kept: plumbing proven before spending a token |
| Iteration 1 | TODO-KEY | TODO-KEY | TODO-KEY |
| Iteration 2 | TODO-KEY | TODO-KEY | TODO-KEY |
| Iteration 3 | TODO-KEY | TODO-KEY | TODO-KEY |
| Final | TODO-KEY | TODO-KEY | TODO-KEY |

## Main failure mode

TODO-KEY

## Hot take

TODO-KEY

## Reproduce

See [REPRODUCTION.md](REPRODUCTION.md). Quick path:

```bash
npm install && npm run build
node eval/build-cases.mjs          # regenerates the 13 eval case repos
CLAIMCHECK_MOCK=1 node dist/cli.js eval --label mock --mode advanced   # no key needed
```

Try it on a repo (needs an OpenAI-compatible key in `.env` or the environment):

```bash
node dist/cli.js verify --repo path/to/repo --claims "all tests pass
no new dependencies were added"
```

## Agent disclosure

Built with coding agents (ZCode, powered by GLM) under human direction; all code in this
repository was written during the event window. Claimcheck itself orchestrates two agent
roles (planner, verifier) over a deterministic executor. Representative trajectories are
in [docs/TRAJECTORIES.md](docs/TRAJECTORIES.md).

## Rights

Built for the micro1 Frontier Engineering Challenge 2026. Per the Hackathon Participation
Agreement, micro1 owns this submission and may use it for AI model training and
evaluation. No code from any other project of the author was reused.
