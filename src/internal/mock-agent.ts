import { Agent, parseJsonLoose } from "../agent.js";
import type { EvidenceAction, Verdict } from "../types.js";

/**
 * Deterministic mock agent for harness validation: runs the identical
 * planner -> executor -> verifier loop without any model or key.
 * Enable with CLAIMCHECK_MOCK=1. Verdict quality is intentionally crude;
 * it exists to prove the plumbing, not to score well.
 */
export class MockAgent extends Agent {
  constructor() {
    super({ CLAIMCHECK_API_KEY: "mock", CLAIMCHECK_MODEL: "mock-model" });
  }

  override async chat(call: { system: string; user: string; label: string }): Promise<string> {
    this.usage.calls += 1;
    this.usage.promptTokens += call.user.length / 4;
    this.usage.completionTokens += 200;
    if (call.label === "planner") {
      return JSON.stringify({ plans: mockPlans(call.user) });
    }
    if (call.label === "baseline") {
      const claims = extractClaims(call.user);
      return JSON.stringify({
        results: claims.map((c) => ({
          id: c.id,
          verdict: mockVerdictFromText(c.text, ""),
          citation: "(baseline: diff only, no execution)",
          rationale: "mock baseline verdict",
        })),
      });
    }
    if (call.label.startsWith("verifier:")) {
      const claims = extractClaims(call.user);
      const claim = claims[0];
      return JSON.stringify({
        verdict: mockVerdictFromText(claim?.text ?? "", call.user),
        citation: "mock citation from collected evidence",
        rationale: "mock verifier verdict",
      });
    }
    return JSON.stringify({});
  }

  override async chatJson<T>(call: { system: string; user: string; label: string }): Promise<T> {
    return parseJsonLoose(await this.chat(call)) as T;
  }
}

function extractClaims(user: string): Array<{ id: string; text: string }> {
  const marker = user.indexOf("CLAIMS:");
  if (marker < 0) return [];
  const blob = user.slice(marker);
  const jsonStart = blob.indexOf("[");
  const jsonEnd = blob.lastIndexOf("]");
  if (jsonStart < 0 || jsonEnd < 0) return [];
  try {
    return JSON.parse(blob.slice(jsonStart, jsonEnd + 1));
  } catch {
    return [];
  }
}

function mockPlans(user: string): Array<{ id: string; actions: EvidenceAction[] }> {
  return extractClaims(user).map((c) => {
    const t = c.text.toLowerCase();
    const actions: EvidenceAction[] = [];
    if (/test|pass|cover|exercis/.test(t)) {
      actions.push({ action: "list_tests" }, { action: "run_tests" });
    }
    if (/dependenc|package/.test(t)) {
      actions.push({ action: "read_file", path: "package.json" });
    }
    if (/uses|removes|deprecated|function|export|api|callers|single return|one file|touches/.test(t)) {
      actions.push({ action: "search", pattern: keyToken(c.text) });
    }
    actions.push({ action: "git_diff" });
    return { id: c.id, actions: actions.slice(0, 3) };
  });
}

function keyToken(text: string): string {
  const quoted = text.match(/`(\w+)`|"(\w+)"/);
  if (quoted) return quoted[1] || quoted[2];
  const words = text.split(/\s+/).filter((w) => w.length > 5 && /^[a-zA-Z]+$/.test(w));
  return words[0] ?? text.slice(0, 10);
}

function mockVerdictFromText(text: string, evidence: string): Verdict {
  const t = text.toLowerCase();
  if (/faster|readab|memory usage|30 percent|twice/.test(t)) return "UNVERIFIABLE";
  if (/all tests pass/.test(t) && /# fail 0\b/.test(evidence)) return "VERIFIED";
  if (/all tests pass/.test(t) && /# fail [1-9]/.test(evidence)) return "REFUTED";
  if (/covered by tests|a test exercises/.test(t)) {
    const covered = /# pass [1-9]/.test(evidence);
    return covered && /empty|negative|zero|eviction/.test(t) === false ? "VERIFIED" : "REFUTED";
  }
  return "VERIFIED";
}
