import type { Agent } from "./agent.js";
import type { Claim, ClaimResult, RunReport, Verdict } from "./types.js";

const BASELINE_SYSTEM = `You review a code change. Judge each claim about it from the diff and
the file tree alone. Reply with a verdict per claim.

Verdicts: VERIFIED (the diff itself clearly proves it true), REFUTED (the diff clearly proves
it false), UNVERIFIABLE (cannot be decided from the diff alone).

Reply ONLY with JSON:
{"results":[{"id":"<claim id>","verdict":"...","citation":"...","rationale":"..."}]}`;

const VERDICTS: Verdict[] = ["VERIFIED", "REFUTED", "UNVERIFIABLE"];

/**
 * Baseline: one direct prompt, no tools, no execution. This is the "reasonable basic way"
 * the challenge describes: ask a model to review the diff and opine on each claim.
 */
export async function runBaseline(
  agent: Agent,
  input: { repoPath: string; diff: string; files: string[]; claims: Claim[] },
): Promise<RunReport> {
  const started = performance.now();
  const reply = await agent.chatJson<{ results: Array<{ id: string; verdict: string; citation?: string; rationale?: string }> }>({
    label: "baseline",
    system: BASELINE_SYSTEM,
    user: [
      `FILE TREE:\n${input.files.join("\n")}`,
      `DIFF (latest change):\n${clip(input.diff, 12000)}`,
      `CLAIMS:\n${JSON.stringify(input.claims, null, 2)}`,
      "Judge every claim id.",
    ].join("\n\n"),
    maxTokens: 4096,
  });
  const byId = new Map(reply.results?.map((r) => [r.id, r]) ?? []);
  const results: ClaimResult[] = input.claims.map((c) => {
    const r = byId.get(c.id);
    const verdict = VERDICTS.includes(r?.verdict as Verdict) ? (r!.verdict as Verdict) : "UNVERIFIABLE";
    return {
      id: c.id,
      text: c.text,
      verdict,
      citation: (r?.citation || "(none)").slice(0, 300),
      rationale: (r?.rationale || "(none)").slice(0, 600),
      evidence: [],
    };
  });
  return {
    mode: "baseline",
    model: agent.model,
    startedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    claims: results,
    usage: { ...agent.usage },
    repoPath: input.repoPath,
    diff: input.diff,
  };
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + `\n... truncated at ${max} characters`;
}
