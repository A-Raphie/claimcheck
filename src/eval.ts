import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Agent } from "./agent.js";
import { runBaseline } from "./baseline.js";
import { runAdvanced } from "./engine/pipeline.js";
import type { Claim, EvalCaseManifest, GroundTruthEntry, RunReport, Verdict } from "./types.js";

export interface EvalOptions {
  casesRoot: string;
  mode: "baseline" | "advanced";
  outDir: string;
  label: string;
  only?: string[];
}

interface CaseScore {
  caseId: string;
  hard: boolean;
  perClaim: Array<{ id: string; text: string; expected: Verdict; got: Verdict; correct: boolean }>;
  accuracy: number;
  durationMs: number;
  costUsd: number;
}

export async function runEval(agent: Agent, opts: EvalOptions): Promise<void> {
  const caseIds = (await readdir(opts.casesRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((id) => !opts.only || opts.only.includes(id))
    .sort();

  if (caseIds.length === 0) throw new Error(`no eval cases found in ${opts.casesRoot}`);

  await mkdir(opts.outDir, { recursive: true });
  const scores: CaseScore[] = [];

  for (const caseId of caseIds) {
    const caseDir = join(opts.casesRoot, caseId);
    const manifest: EvalCaseManifest = JSON.parse(
      await readFile(join(caseDir, "case.json"), "utf8"),
    );
    const repoPath = join(caseDir, "repo");
    const diff = await diffOf(repoPath);
    const files = await listFiles(repoPath);

    const report: RunReport =
      opts.mode === "baseline"
        ? await runBaseline(agent, { repoPath, diff, files, claims: manifest.claims })
        : await runAdvanced(agent, { repoPath, diff, claims: manifest.claims });

    await writeFile(
      join(opts.outDir, `${caseId}.report.json`),
      JSON.stringify(report, null, 2),
    );

    const perClaim = report.claims.map((r) => {
      const gt: GroundTruthEntry | undefined = manifest.groundTruth[r.id];
      const expected = gt?.verdict ?? "UNVERIFIABLE";
      return {
        id: r.id,
        text: r.text,
        expected,
        got: r.verdict,
        correct: expected === r.verdict,
      };
    });
    const accuracy = perClaim.length
      ? perClaim.filter((p) => p.correct).length / perClaim.length
      : 0;
    scores.push({
      caseId,
      hard: Boolean(manifest.hard),
      perClaim,
      accuracy,
      durationMs: report.durationMs,
      costUsd: report.usage.costUsd,
    });
    console.log(`${caseId}: accuracy ${(accuracy * 100).toFixed(0)}% (${report.durationMs}ms, $${report.usage.costUsd.toFixed(5)})`);
  }

  const summary = summarize(scores);
  await writeFile(join(opts.outDir, "summary.json"), JSON.stringify(summary, null, 2));
  await writeFile(join(opts.outDir, "summary.md"), renderMarkdown(summary, opts.label, agent.model));
  console.log(renderMarkdown(summary, opts.label, agent.model));
}

export interface Summary {
  label: string;
  mode: string;
  model: string;
  cases: number;
  claims: number;
  accuracy: number;
  byVerdict: Record<Verdict, { actual: number; predicted: number; correct: number; precision: number; recall: number }>;
  hardCaseAccuracy: number | null;
  avgDurationMs: number;
  totalCostUsd: number;
  perCase: Array<{ caseId: string; hard: boolean; accuracy: number }>;
}

function summarize(scores: CaseScore[]): Summary {
  const all = scores.flatMap((s) => s.perClaim);
  const verdicts: Verdict[] = ["VERIFIED", "REFUTED", "UNVERIFIABLE"];
  const byVerdict = Object.fromEntries(
    verdicts.map((v) => {
      const actual = all.filter((p) => p.expected === v).length;
      const predicted = all.filter((p) => p.got === v).length;
      const correct = all.filter((p) => p.expected === v && p.got === v).length;
      return [
        v,
        {
          actual,
          predicted,
          correct,
          precision: predicted ? correct / predicted : 0,
          recall: actual ? correct / actual : 0,
        },
      ];
    }),
  ) as Summary["byVerdict"];
  const hard = scores.filter((s) => s.hard);
  return {
    label: "",
    mode: "",
    model: "",
    cases: scores.length,
    claims: all.length,
    accuracy: all.length ? all.filter((p) => p.correct).length / all.length : 0,
    byVerdict,
    hardCaseAccuracy: hard.length
      ? hard.flatMap((s) => s.perClaim).filter((p) => p.correct).length /
        Math.max(hard.flatMap((s) => s.perClaim).length, 1)
      : null,
    avgDurationMs: scores.length
      ? Math.round(scores.reduce((a, s) => a + s.durationMs, 0) / scores.length)
      : 0,
    totalCostUsd: scores.reduce((a, s) => a + s.costUsd, 0),
    perCase: scores.map((s) => ({ caseId: s.caseId, hard: s.hard, accuracy: s.accuracy })),
  };
}

function renderMarkdown(s: Summary, label: string, model: string): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `# Eval run: ${label}`,
    "",
    `- Mode: ${s.mode}`,
    `- Model: ${model}`,
    `- Cases: ${s.cases} (${s.claims} claims)`,
    `- Overall verdict accuracy: ${pct(s.accuracy)}`,
    s.hardCaseAccuracy !== null ? `- Hard case accuracy: ${pct(s.hardCaseAccuracy)}` : "",
    `- Average wall time per case: ${(s.avgDurationMs / 1000).toFixed(1)}s`,
    `- Total model cost: $${s.totalCostUsd.toFixed(5)} ($${(s.totalCostUsd / Math.max(s.cases, 1)).toFixed(5)} per case)`,
    "",
    "## By verdict class",
    "",
    "| Verdict | Actual | Predicted | Correct | Precision | Recall |",
    "|---|---|---|---|---|---|",
    ...(["VERIFIED", "REFUTED", "UNVERIFIABLE"] as Verdict[]).map(
      (v) =>
        `| ${v} | ${s.byVerdict[v].actual} | ${s.byVerdict[v].predicted} | ${s.byVerdict[v].correct} | ${pct(s.byVerdict[v].precision)} | ${pct(s.byVerdict[v].recall)} |`,
    ),
    "",
    "## Per case",
    "",
    "| Case | Accuracy |",
    "|---|---|",
    ...s.perCase.map((c) => `| ${c.caseId}${c.hard ? " (hard)" : ""} | ${pct(c.accuracy)} |`),
  ];
  return lines.filter((l) => l !== "").join("\n") + "\n";
}

export async function diffOf(repoPath: string): Promise<string> {
  const { $ } = await import("./internal/shell.js");
  return $(
    "git",
    ["diff", "HEAD~1", "HEAD"],
    repoPath,
  );
}

export async function listFiles(repoPath: string): Promise<string[]> {
  const { $ } = await import("./internal/shell.js");
  const out = await $("git", ["ls-files"], repoPath);
  return out.split("\n").filter(Boolean).sort();
}

export function claimsFromManifest(manifest: EvalCaseManifest): Claim[] {
  return manifest.claims;
}
