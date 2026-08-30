import { Agent } from "../agent.js";
import { Sandbox } from "../sandbox.js";
import { planEvidence } from "./planner.js";
import { verifyClaim } from "./verifier.js";
import type { Claim, ClaimResult, RunReport } from "../types.js";

export async function runAdvanced(
  agent: Agent,
  input: { repoPath: string; diff: string; claims: Claim[] },
): Promise<RunReport> {
  const started = performance.now();
  const sandbox = await Sandbox.fromRepo(input.repoPath);
  try {
    const files = await sandbox.walkFiles();
    const plans = await planEvidence(agent, {
      diff: input.diff,
      files,
      claims: input.claims,
    });

    // Execute every plan's actions, then verify claims. Verification calls run
    // sequentially for deterministic, rate-limit-friendly behavior.
    const results: ClaimResult[] = [];
    for (const plan of plans) {
      const claim = input.claims.find((c) => c.id === plan.id);
      if (!claim) continue;
      const evidence = [];
      for (const action of plan.actions.slice(0, 4)) {
        evidence.push(await sandbox.execute(action));
      }
      results.push(await verifyClaim(agent, { claim, diff: input.diff, evidence }));
    }

    return {
      mode: "advanced",
      model: agent.model,
      startedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
      claims: ordered(input.claims, results),
      usage: { ...agent.usage },
      repoPath: input.repoPath,
      diff: input.diff,
    };
  } finally {
    await sandbox.cleanup();
  }
}

function ordered(claims: Claim[], results: ClaimResult[]): ClaimResult[] {
  const byId = new Map(results.map((r) => [r.id, r]));
  return claims.map((c) => byId.get(c.id)).filter((r): r is ClaimResult => Boolean(r));
}
