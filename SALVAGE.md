# SALVAGE — reusable machinery from Claimcheck

Extracted while warm, Sep 7 2026. These patterns transfer to the next hackathon project.

## Agent pipeline: plan → execute → verify

**File:** `src/engine/pipeline.ts`

Three-phase loop: a planner LLM picks evidence actions, a sandbox executes them, a verifier LLM judges against collected evidence. Each phase is a pure function with a typed contract — swap any phase independently.

**Portable pieces:**
- `ordered()` utility that re-sorts results back to input claim order (execution order may differ)
- Post-planner behavioral guardrail: a regex forces `run_tests` into any claim mentioning behavior/test/pass keywords, even if the planner omitted it (gpt-oss-120b under-planned without this)
- Action cap of 4 per plan — without it the planner generates 10+ and burns tokens
- Sequential execution (not parallel): avoids rate-limit surprises, replay is trivial

**Gotcha:** `try/finally` with `sandbox.cleanup()` is mandatory — temp repo copies leak otherwise.

## Three-way verdict with settlesWith

**File:** `src/engine/verifier.ts`

VERIFIED / REFUTED / UNVERIFIABLE — the third class is the most interesting output. UNVERIFIABLE includes a `settlesWith` field naming the concrete evidence that would decide it, rather than guessing.

**Portable pieces:**
- The `VERIFIER_SYSTEM` prompt (lines 4-28): three-verdict schema with `settlesWith`
- Evidence formatter: each item labeled `EVIDENCE N (action, FAILED):` — the FAILED tag makes the verifier aware of execution failures
- `clip()` function truncates diff at 6000 chars to prevent context overflow
- Defensive verdict normalization: unexpected string → UNVERIFIABLE (never crashes)

**Why it matters:** Binary yes/no forces models to guess on unverifiable claims. The third class + "what would settle this" turned out to be more actionable than the verdict itself.

## Sandbox executor

**File:** `src/sandbox.ts`

Disposable repo copy in temp dir, safe `execute()` method dispatching evidence actions (read_file, search, run_tests, git_diff) with path-escape checks, output truncation, command timeouts, and a binary allowlist.

**Portable pieces:**
- `Sandbox.fromRepo()`: copies repo to temp dir, preserves git history (skip .git on first pass, copy back separately)
- `inside()` path-escape guard: resolve + check starts with `this.dir`
- Uniform error envelope: every operation returns `{ ok, output, durationMs }` — verifier always gets structured evidence even on failure
- `ALLOWED_BINARIES`: only `node` and `git` — the security boundary
- `RegexSafety()`: try parse as regex, fall back to literal search — prevents LLM-generated regex crashes

**Limits:** 6000-char output cap, 30s command timeout. Low-level by design — no Docker, just `node --test` and `git` in a temp copy.

## OpenAI-compatible client with retry

**File:** `src/agent.ts`

Thin client for any OpenAI-compatible endpoint. Handles 429 (parsed from error body or `retry-after` header, up to 6 retries) and network failures (DNS/connect, 5s backoff, 8 attempts).

**Portable pieces:**
- `chatJson()`: calls `chat()`, parses with `parseJsonLoose()`, retries once with "please return valid JSON" on parse failure
- `parseJsonLoose()`: strips markdown code fences, finds first `{` and last `}`, parses substring — handles the common LLM failure of wrapping JSON in text
- Constructor accepts `process.env` as parameter — trivially mockable in tests
- Price table with env-var overrides (`*_PRICE_IN/OUT`) for cost tracking
- `response_format: { type: "json_object" }` on every call — reduces parse failures on OpenAI/Groq

**Config:** `CLAIMCHECK_BASE_URL`, `CLAIMCHECK_API_KEY`, `CLAIMCHECK_MODEL` — works with OpenAI, Groq, OpenRouter, or any compatible provider.

## Deterministic mock agent

**File:** `src/internal/mock-agent.ts`

Subclasses `Agent`, overrides `chat()` with label-based dispatch returning hardcoded JSON. Runs the identical pipeline (planner → executor → verifier) with zero network calls.

**Portable pieces:**
- `extractClaims()` parses claims from the prompt text by finding the `CLAIMS:` marker
- Label-based dispatch: `call.label` determines mock response (planner, verifier, baseline)
- Keyword regex on claim text to decide evidence actions (test claims → run_tests, deps → read_file package.json)
- `super({ CLAIMCHECK_API_KEY: "mock" })` bypasses the API key requirement

**Use case:** CI tests validate the full flow in under 2 seconds. For integration testing only — mock verdicts are crude by design.

## Eval corpus builder

**File:** `eval/build-cases.mjs`

14 deterministic cases, each a self-contained git repo with 2 commits (before + change) + `case.json` manifest with claims and ground truth. Covers: true/false for tests-pass, coverage illusions, API preservation, performance, vagueness, dependencies, and a holdout case.

**Portable pieces:**
- `caseSpec()` wrapper: TypeScript-like shape validation without a build step
- `withPinnedModuleType()`: injects `"type": "commonjs"` into every case's package.json (parent `type:module` breaks `require()`)
- Deterministic git: fixed author/email/timestamps via env vars → identical hashes on rebuild
- Holdout case added post-hoc (case 14) — reserve 1-2 cases for post-hoc validation in any eval corpus

**The 14-case taxonomy is reusable as a template for any claim-verification system.**

## Cursor choreography runner

**File:** `demo-take/runner.py`

Python script recording demo via AppleScript + `cliclick`. Each scene: `prepare()` (navigate, settle) → `act()` (cursor movement, scroll, type).

**Portable pieces:**
- **Prepare/act split**: prepare parks cursor before recording starts; act runs inside capture. Eliminates gray-frame-at-start (frame 1 is always a loaded page)
- `drift()`: human-like cursor movement — arc travel via `cliclick dm:`, overshoot + settle, endpoint jitter (+/-9px), alternating arc direction. Never looks robotic
- `wiggle()`: micro-drift during narration holds so cursor never freezes
- `glide_scroll()`: arrow-key scrolling in small steps (7 key presses per click, 45ms intervals). Smooth on camera, unlike `scrollWheel` jumps
- `SCENES` list: declarative `(name, duration, prep_fn, act_fn)` tuples. Scene durations from VO beat windows
- Demo window management: ONE dedicated Chrome window, exact pixel bounds, flag file to avoid duplicates

**Gotcha:** `drift()` is defined twice — second shadows first (dead code). Terminal scene hardcodes absolute repo path. Flag file never cleaned up.

## Video pipeline config

**File:** `demo-take/pipeline-config.json`

JSON config for ffmpeg muxing. Scene boundary time ranges with `lo`/`hi` windows, per-scene `accurate_frame` (key visual timestamp) and `head_hold` (opening frame duration).

**Portable pieces:**
- Boundary ranges give the muxer flexibility to find cleanest cut point (between keystrokes, during pauses)
- `accurate_frame` essential for terminal scenes where CLI output takes seconds to appear
- Entire video reconstructible from one JSON + raw segments — no hardcoded timestamps

**Gotcha:** Paths are absolute/machine-specific. Scene durations must match runner.py or video drifts out of sync.

## HTML report generator

**File:** `src/report.ts`

Self-contained HTML from a JSON report object. Zero network dependencies — inline CSS, SVG, JS. Warm paper design (`--paper: #f7f1e8`) with hairline cards.

**Portable pieces:**
- `renderHtmlReport()`: takes JSON, returns complete HTML string. No template engine
- `VERDICT` color map: tri-state palette (green/red/amber) for any verification UI
- `diffStatsOf()`: parses unified diff to extract per-file add/delete counts
- `runId()`: 5-char hex ID from timestamp + model name via DJB2 hash
- Inline JS for filtering (toggle `.is-hidden`), progressive disclosure (`<details>`), clipboard copy
- `escapeHtml()`: minimal escaping to prevent XSS from LLM-generated content

**Pattern:** Any project producing JSON reports can use this as a single-file HTML template.

## Types contract

**File:** `src/types.ts`

`Claim`, `ClaimResult`, `EvidenceAction`, `EvidenceItem`, `RunReport`, `EvalCaseManifest`. The discriminated union on `EvidenceAction` (7 action types) defines a safe, typed action menu that any executor can dispatch on.

## Eval harness

**File:** `src/eval.ts`

`runEval()` iterates case directories, runs pipeline, scores against ground truth, produces summary with per-verdict precision/recall. `renderMarkdown()` renders the summary. Directly reusable for any eval system with verdict-class metrics.

## The big portable ideas

1. **Three-way verdict** (VERIFIED/REFUTED/UNVERIFIABLE + settlesWith) — applies to any claim-verification or fact-checking system
2. **Prepare/act split** for demo recording — eliminates gray frames, makes retakes cheap
3. **Proof-gated scrolling** (arrow keys + screenshot diff) — smooth on camera, verifiable
4. **Human cursor choreography** (arc + overshoot + wiggle) — makes screen recordings look natural
5. **Deterministic eval corpus** with holdout — validates generalizability, not just training cases
6. **Single-file HTML report** from JSON — zero dependencies, works from disk or CDN
