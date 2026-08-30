import type { Agent } from "../agent.js";
import type { Claim, EvidenceAction } from "../types.js";

const PLANNER_SYSTEM = `You plan evidence gathering for verifying claims about a code change.
You get: a diff, a file list, and claims. For each claim, choose the MINIMAL set of actions
that would let a careful engineer decide if the claim is true.

Action menu (JSON):
{"action":"read_file","path":"src/x.ts"}        read one file in the changed repo
{"action":"search","pattern":"foo","regex":false} search file contents for a string
{"action":"list_tests"}                          list test files
{"action":"run_tests","filter":"path or name"}   run the test suite (node --test), optionally filtered
{"action":"git_log","maxEntries":5}              recent commit history with stats
{"action":"git_diff"}                            the change diff itself
{"action":"run_script","script":"x.js"}          run a script that exists in the repo with node

Rules:
- Static claims (API shape, presence of code) need read_file or search.
- Claims about tests passing or behavior need run_tests.
- Claims you cannot check from the repo at all (performance numbers, external behavior,
  subjective quality) should get actions that at least look for supporting evidence,
  and the verifier will mark them UNVERIFIABLE if evidence cannot decide.
- Prefer 1 to 3 actions per claim. Never invent paths outside the file list.

Reply ONLY with JSON: {"plans":[{"id":"<claim id>","actions":[<action>,...]}]}`;

export interface ClaimPlan {
  id: string;
  actions: EvidenceAction[];
}

export async function planEvidence(
  agent: Agent,
  input: { diff: string; files: string[]; claims: Claim[] },
): Promise<ClaimPlan[]> {
  const reply = await agent.chatJson<{ plans: ClaimPlan[] }>({
    label: "planner",
    system: PLANNER_SYSTEM,
    user: [
      `FILE LIST:\n${input.files.join("\n")}`,
      `DIFF (latest change):\n${clip(input.diff, 8000)}`,
      `CLAIMS:\n${JSON.stringify(input.claims, null, 2)}`,
      "Produce plans for every claim id.",
    ].join("\n\n"),
  });
  const byId = new Map(reply.plans?.map((p) => [p.id, Array.isArray(p.actions) ? p : { ...p, actions: [] }]) ?? []);
  return input.claims.map(
    (c) => byId.get(c.id) ?? { id: c.id, actions: [{ action: "git_diff" } as EvidenceAction] },
  );
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + `\n... truncated at ${max} characters`;
}
