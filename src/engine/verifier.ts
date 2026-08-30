import type { Agent } from "../agent.js";
import type { Claim, ClaimResult, EvidenceItem, Verdict } from "../types.js";

const VERIFIER_SYSTEM = `You are a verification judge. For one claim about a code change, read the
collected evidence and reply with a strict verdict.

Verdicts:
- VERIFIED: the evidence directly proves the claim is true.
- REFUTED: the evidence directly proves the claim is false.
- UNVERIFIABLE: the evidence cannot decide the claim (opinions, performance numbers
  without measurements, behavior the repo cannot demonstrate).

Strictness rules:
- A claim that tests pass is VERIFIED only if a test run in the evidence shows all tests passing.
- A claim that code "covers" or "handles" a case is VERIFIED only if evidence shows the case
  being exercised (a test that actually triggers it), not merely code that looks like it handles it.
- Absence of evidence is not refutation. If nothing in the evidence addresses the claim,
  answer UNVERIFIABLE, never guess.
- citation must quote or reference the decisive evidence: a file path with line numbers,
  a command plus its key output line, or a diff hunk. Keep it under 240 characters.
- rationale must be one or two sentences a reviewer can re-check against the evidence.

Reply ONLY with JSON:
{"verdict":"VERIFIED|REFUTED|UNVERIFIABLE","citation":"...","rationale":"..."}`;

const VERDICTS: Verdict[] = ["VERIFIED", "REFUTED", "UNVERIFIABLE"];

export async function verifyClaim(
  agent: Agent,
  input: { claim: Claim; diff: string; evidence: EvidenceItem[] },
): Promise<ClaimResult> {
  const evidenceText = input.evidence.length
    ? input.evidence
        .map(
          (e, i) =>
            `EVIDENCE ${i + 1} (${e.action.action}${e.ok ? "" : ", FAILED"}):\n${e.output}`,
        )
        .join("\n\n")
    : "(no evidence was collected)";
  const reply = await agent.chatJson<{ verdict: string; citation?: string; rationale?: string }>({
    label: `verifier:${input.claim.id}`,
    system: VERIFIER_SYSTEM,
    user: [
      `CLAIM ${input.claim.id}: ${input.claim.text}`,
      `DIFF (latest change):\n${clip(input.diff, 6000)}`,
      evidenceText,
    ].join("\n\n"),
  });
  const verdict = VERDICTS.includes(reply.verdict as Verdict)
    ? (reply.verdict as Verdict)
    : "UNVERIFIABLE";
  return {
    id: input.claim.id,
    text: input.claim.text,
    verdict,
    citation: (reply.citation || "(no citation provided)").slice(0, 300),
    rationale: (reply.rationale || "(no rationale provided)").slice(0, 600),
    evidence: input.evidence,
  };
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + `\n... truncated at ${max} characters`;
}
