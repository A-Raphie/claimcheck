# Agent trajectories

Representative trajectories for every agent role in Claimcheck, in the format the
challenge asks for: easy to follow from the agent instructions through to the final
result, showing what the agent did, how its tools responded, the feedback that shaped
the next step, and retries or human checkpoints.

## How these were captured

Claimcheck was built by a human directing a coding agent (ZCode, powered by GLM) across
one continuous session. The build trajectory below is curated from that session log.
The product trajectories (planner, verifier) are captured by the tool itself: every run
writes the exact prompts, planned actions, tool outputs, and verdict JSON to
`eval-results/<run>/<case>.report.json`.

## Build trajectory (coding agent)

| Phase | Agent instructions (summary) | What happened | Human checkpoint |
|---|---|---|---|
| Scaffold | Build a TypeScript CLI that verifies claims about a code change with a sandboxed executor; eval harness and corpus first | Repo, engine, 13-case deterministic corpus, 4 unit tests; smoke run caught a planted failing test on case 02 | Human approved the Claimcheck idea after a 3-candidate battery |
| Harness proof | Validate the full loop without spending tokens | Mock agent mode; full 13-case run scored 53.6 percent with VERIFIED-everything bias | Kept as permanent no-key mode for judges |
| Report face | Make the HTML verdict page sharp, not generic | Type hierarchy, verdict glyphs, accented cost and latency; visual audit pass | Human UI bar applied (see audit notes in session log) |
| Scored runs | Baseline, then agent run, then diagnose + guardrail + re-run on gpt-oss-120b via Groq | `eval-results/baseline-baseline/`, `advanced-gptoss/`, `advanced-iter2/`: 87.5% -> 87.5% (tie, hard cases won) -> 90.6% after the guardrail | Human reviewed every diagnosis before the fix |

## Product trajectories (Claimcheck's own agents)

Run any eval and open the per-case report JSON:

```bash
CLAIMCHECK_MOCK=1 node dist/cli.js eval --label demo --mode advanced
cat eval-results/advanced-demo/13-hard-mixed.report.json
```

Each claim entry contains: the planner's chosen actions, the executor's raw outputs
(including test runner summaries and exit codes), and the verifier's verdict JSON with
citation and rationale. A retry is visible whenever a report shows a parse-recovery
entry. In the final scored run, one parse-recovery retry occurred; it is visible in the affected claim's evidence and did not change the verdict.

## Self-audit demo

The demo video closes by pointing Claimcheck at its own repository
(`demo/claims.md`), turning the instrument on the submission itself.
