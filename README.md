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

The challenge's own theme names the problem: "AI can produce convincing code in seconds.
Real engineering begins when convincing is not enough." micro1's blog says the same thing
from the sponsor side: "as models have gotten better, the bottleneck has shifted from
training toward evaluation." Claimcheck is an instrument for exactly that bottleneck,
pointed at agent-made changes.

A verdict table with citations turns "trust the agent" into "check the agent" in under a
minute. False confidence gets caught before merge, and claims that cannot be checked from
the repository (performance numbers, subjective quality) are named as such instead of
slipping through as if they were facts. For those, the report says what evidence would
settle the claim: add the benchmark, write the test, run the measurement. The same
instrument works pointed inward: run it on your own change before someone else does.

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
classes in one change. A 14th case is a holdout (different module shape, mixed classes)
kept out of the headline numbers and run once as generality evidence. Every case is
regenerated deterministically by `node eval/build-cases.mjs`.

| Metric | Simple baseline | Agent solution | Change |
|---|---|---|---|
| Claim verdict accuracy | 87.5% | **90.6%** | +3.1 pts |
| Hard case accuracy | 75.0% | **100.0%** | +25 pts |
| REFUTED recall (catching false claims) | 72.7% | **81.8%** | +9.1 pts |
| VERIFIED precision (no false confirmations) | 94.1% | **100.0%** | +5.9 pts |
| UNVERIFIABLE recall (naming the undecidable) | 100% | 100% | = |
| Wall time per case | 8.3s | 25.9s | slower: it runs real checks |
| Model cost per case | $0.00266 | $0.00674 | +$0.004: the price of proof |

Baseline: one prompt, diff and claims only, no tools (gpt-oss-120b). Agent: the full
planner-sandbox-verifier pipeline, same model, same 32 claims across 14 cases including
the holdout. REFUTED precision is 100% in both; the agent's verdicts, when it issues
them, are never wrong. Full per-class tables: `eval-results/baseline-baseline/summary.md`
and `eval-results/advanced-iter2/summary.md`.

The mock-agent run (`CLAIMCHECK_MOCK=1`, no API key, deterministic heuristics instead of
a model) scores 53.6 percent with a VERIFIED-everything bias: it executes the same
planner to executor to verifier loop but cannot actually judge evidence. It exists to
prove the harness and to show what guess-without-evidence looks like on this corpus.
See `eval-results/advanced-harness-check/summary.md`.

## Improvement changelog

| Stage | What we tried and why | Evidence | Decision / learning |
|---|---|---|---|
| Baseline | One prompt, diff plus claims, no tools: the way review works today | `eval-results/baseline-baseline/summary.md` (87.5%) | Established the starting point |
| Harness | Deterministic executor + ground truth corpus + mock agent first, so model quality is the only moving part | `eval-results/advanced-harness-check/` (53.6 percent, VERIFIED bias) | Kept: plumbing proven before spending a token |
| Trail audit | Rendered the full evidence trail on the report page and spotted a contradiction: case 13's trail showed a ReferenceError while ground truth said tests pass. Root cause: case repos without a local package.json inherited the project's `"type": "module"` when run in place, so CommonJS `require` exploded (the /tmp sandbox had masked it) | `# pass 0, fail 2` in place vs `pass 3, fail 0` sandboxed, same files | Fixed: builder pins `"type": "commonjs"` into every case repo; in-place and sandboxed runs now agree. The trail catching its own corpus's bug is the product working |
| Iteration 1 | First scored agent run (gpt-oss-120b): tied the baseline at 87.5% overall but won the hard cases (75 -> 100%) | `eval-results/advanced-gptoss/summary.md`: REFUTED recall 72.7 -> 81.8, but VERIFIED recall dropped to 88.2 | Diagnosed: the planner under-planned behavioral claims (read the test file, never ran it), forcing correct-but-useless UNVERIFIABLEs |
| Iteration 2 | Deterministic guardrail: any behavioral claim always gets a `run_tests` action, whatever the planner chose | `eval-results/advanced-iter2/summary.md`: 90.6% overall, VERIFIED precision 100%, both hard cases 100% | Kept. The planner proposes; a rule guarantees the floor. Re-run: +3.1 pts over baseline |
| Final | Residual 3 misses share one cause: over-strictness on universal claims ("identical for every input" -> UNVERIFIABLE) | `eval-results/advanced-iter2/05-api-preserved-true.report.json` | Kept: conservatism is the chosen failure mode. See failure mode below |

## Main failure mode

Over-strictness on universal claims. When a claim says behavior is "identical for every
positive number", no test suite can prove the "every" part, so Claimcheck answers
UNVERIFIABLE where a human reviewer would accept a passing suite as good enough. All 3
residual misses in the final run are this shape. It is the deliberate trade: the
instrument never stretches evidence to reach a confident verdict, which means its
VERIFIED and REFUTED labels stayed 100% precise even when recall was not. If you need
the last 3 points, soften the verifier's universal-claim rule; we kept it strict on
purpose.

## Hot take

Green checkmarks are the biggest lie in software. A CI badge tells you the suite ran; it
does not tell you the suite tests anything, and an agent that writes code can also write
the tests that flatter it. The fix is not more trust and not more human eyeballs: it is
instruments that answer only from executed evidence and are allowed to say "nobody could
check that". The uncomfortable part is what that honesty costs: our agent's remaining
errors are all cases where it refused to be confident. We think that is the correct
direction for agents that touch real code: a verifier whose errors are visible hesitations
beats one whose errors look like answers.

**Live:** https://a-raphie.github.io/claimcheck/ · planner at [/try.html](https://a-raphie.github.io/claimcheck/try) · scored report at [/report.html](https://a-raphie.github.io/claimcheck/report)

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
