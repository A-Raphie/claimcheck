import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { Agent } from "./agent.js";
import { runBaseline } from "./baseline.js";
import { runAdvanced } from "./engine/pipeline.js";
import { runEval } from "./eval.js";
import { renderTable } from "./internal/table.js";
import { renderHtmlReport } from "./report.js";
import type { Claim, RunReport } from "./types.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? "help";
  const args = parseCommandArgs(command, argv.slice(1));

  switch (command) {
    case "verify": {
      const repoPath = requireString(args, "repo");
      const agent = new Agent();
      const claims = await loadClaims(args);
      const diff = args.values.diffFile
        ? await readFile(String(args.values.diffFile), "utf8")
        : await diffHead(repoPath);
      const mode = (args.values.mode as "baseline" | "advanced") ?? "advanced";
      const outDir = args.values.out ? String(args.values.out) : null;
      const files = await listFiles(repoPath);
      const report =
        mode === "baseline"
          ? await runBaseline(agent, { repoPath, diff, files, claims })
          : await runAdvanced(agent, { repoPath, diff, claims });
      console.log(renderTable(report));
      if (outDir) {
        await mkdir(outDir, { recursive: true });
        await writeArtifacts(outDir, report);
        console.log(`artifacts written to ${outDir}`);
      }
      break;
    }
    case "eval": {
      const agent = new Agent();
      const mode = (args.values.mode as "baseline" | "advanced") ?? "advanced";
      const label = requireString(args, "label");
      const casesRoot = (args.values.cases as string) ?? "eval/cases";
      const outRoot = (args.values.out as string) ?? "eval-results";
      const outDir = `${outRoot}/${mode}-${label}`;
      const only = args.values.only ? String(args.values.only).split(",") : undefined;
      await runEval(agent, { casesRoot, mode, outDir, label, only });
      break;
    }
    case "report": {
      const artifacts = requireString(args, "artifacts");
      const out = args.values.out ? String(args.values.out) : artifacts.replace(/\.json$/, ".html");
      const report: RunReport = JSON.parse(await readFile(artifacts, "utf8"));
      await writeFile(out, renderHtmlReport(report));
      console.log(`report written to ${out}`);
      break;
    }
    default:
      usage();
  }
}

function parseCommandArgs(command: string, rest: string[]) {
  void command;
  return parseArgs({
    args: rest,
    options: {
      repo: { type: "string" },
      claims: { type: "string" },
      claimsFile: { type: "string" },
      diffFile: { type: "string" },
      mode: { type: "string" },
      out: { type: "string" },
      label: { type: "string" },
      cases: { type: "string" },
      only: { type: "string" },
      artifacts: { type: "string" },
    },
    allowPositionals: false,
    strict: false,
  });
}

function requireString(args: ReturnType<typeof parseCommandArgs>, name: string): string {
  const v = args.values[name];
  if (typeof v !== "string" || !v) {
    usage();
    process.exit(1);
  }
  return v;
}

async function loadClaims(args: ReturnType<typeof parseCommandArgs>): Promise<Claim[]> {
  if (args.values.claimsFile) {
    const raw = JSON.parse(await readFile(String(args.values.claimsFile), "utf8"));
    const list = Array.isArray(raw) ? raw : raw.claims;
    return list.map((c: any, i: number) => ({ id: c.id ?? `C${i + 1}`, text: c.text ?? String(c) }));
  }
  if (args.values.claims) {
    const text = String(args.values.claims);
    const lines = text.split(/\n+/).map((l) => l.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
    return lines.map((l, i) => ({ id: `C${i + 1}`, text: l }));
  }
  usage();
  process.exit(1);
}

async function writeArtifacts(outDir: string, report: RunReport): Promise<void> {
  const { writeFile: wf } = await import("node:fs/promises");
  await wf(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  await wf(`${outDir}/report.md`, renderMarkdownArtifacts(report));
  await wf(`${outDir}/report.html`, renderHtmlReport(report));
}

function renderMarkdownArtifacts(report: RunReport): string {
  const lines = [
    `# Claimcheck ${report.mode} run`,
    "",
    `- Model: ${report.model}`,
    `- Date: ${report.startedAt}`,
    `- Wall time: ${(report.durationMs / 1000).toFixed(1)}s`,
    `- Model cost: $${report.usage.costUsd.toFixed(5)}`,
    "",
    "| Claim | Verdict | Citation |",
    "|---|---|---|",
    ...report.claims.map((c) => `| ${c.id}: ${c.text.replace(/\|/g, "\\|")} | ${c.verdict} | ${c.citation.replace(/\|/g, "\\|")} |`),
    "",
    ...report.claims.map((c) => `## ${c.id}: ${c.verdict}\n\n> ${c.text}\n\n${c.rationale}\n\nEvidence: ${c.citation}\n`),
  ];
  return lines.join("\n");
}

async function diffHead(repoPath: string): Promise<string> {
  const { $ } = await import("./internal/shell.js");
  try {
    return await $("git", ["diff", "HEAD~1", "HEAD"], repoPath);
  } catch {
    return "(no previous commit: showing untracked diff is not supported, pass --diff-file)";
  }
}

async function listFiles(repoPath: string): Promise<string[]> {
  const { $ } = await import("./internal/shell.js");
  try {
    return (await $("git", ["ls-files"], repoPath)).split("\n").filter(Boolean).sort();
  } catch {
    return [];
  }
}

function usage(): void {
  console.log(`claimcheck: verifies claims about a code change against executable evidence

Environment:
  CLAIMCHECK_API_KEY    required: any OpenAI-compatible API key
  CLAIMCHECK_BASE_URL   default https://api.openai.com/v1 (Groq: https://api.groq.com/openai/v1)
  CLAIMCHECK_MODEL      default gpt-4o-mini (Groq example: llama-3.3-70b-versatile)

Commands:
  verify --repo <path> --claims "<line per claim>" [--claims-file file.json]
         [--diff-file d.diff] [--mode baseline|advanced] [--out dir]
  eval --label <name> --mode baseline|advanced [--cases eval/cases] [--only id1,id2] [--out eval-results]
  report --artifacts <report.json> [--out report.html]`);
}

main().catch((err: Error) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
