import type { ClaimResult, RunReport, Verdict } from "./types.js";

const VERDICT_COLOR: Record<Verdict, string> = {
  VERIFIED: "#22c55e",
  REFUTED: "#ef4444",
  UNVERIFIABLE: "#eab308",
};

export function renderHtmlReport(report: RunReport): string {
  const cards = report.claims.map(card).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claimcheck report</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #0b0f14; color: #dbe4ec;
    font: 15px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  main { max-width: 900px; margin: 0 auto; padding: 40px 20px 80px; }
  header { border-bottom: 1px solid #1d2733; padding-bottom: 20px; margin-bottom: 28px; }
  h1 { font-size: 20px; margin: 0 0 6px; letter-spacing: 0.5px; }
  .meta { color: #7b8da0; font-size: 13px; }
  .meta span { margin-right: 14px; }
  .card {
    border: 1px solid #1d2733; border-radius: 10px; padding: 16px 18px; margin-bottom: 14px;
    background: #0f151c;
  }
  .claim-line { display: flex; gap: 12px; align-items: baseline; }
  .id { color: #7b8da0; flex: 0 0 auto; }
  .badge {
    flex: 0 0 auto; font-size: 12px; font-weight: 700; letter-spacing: 1px;
    padding: 2px 10px; border-radius: 999px; border: 1px solid currentColor;
  }
  .text { flex: 1 1 auto; }
  .rationale { color: #a9b8c7; margin: 10px 0 8px; font-size: 14px; }
  .citation {
    border-left: 3px solid #2a3849; padding: 6px 12px; color: #8fa3b8;
    font-size: 13px; background: #0b1017; border-radius: 0 6px 6px 0;
    overflow-x: auto; white-space: pre-wrap;
  }
  .citation b { color: #cbd7e4; }
  footer { margin-top: 30px; color: #55657a; font-size: 12px; }
</style>
</head>
<body>
<main>
  <header>
    <h1>CLAIMCHECK · ${report.mode} run</h1>
    <div class="meta">
      <span>${escapeHtml(report.model)}</span>
      <span>${report.claims.length} claims</span>
      <span>${(report.durationMs / 1000).toFixed(1)}s</span>
      <span>$${report.usage.costUsd.toFixed(5)}</span>
    </div>
  </header>
${cards}
  <footer>
    Verdicts: VERIFIED · evidence directly proves the claim true. REFUTED · evidence directly
    proves it false. UNVERIFIABLE · evidence cannot decide it. Every verdict cites the evidence
    that decided it.
  </footer>
</main>
</body>
</html>
`;
}

function card(c: ClaimResult): string {
  const color = VERDICT_COLOR[c.verdict] ?? "#7b8da0";
  return `  <section class="card">
    <div class="claim-line">
      <span class="id">${escapeHtml(c.id)}</span>
      <span class="badge" style="color: ${color}">${c.verdict}</span>
      <span class="text">${escapeHtml(c.text)}</span>
    </div>
    <p class="rationale">${escapeHtml(c.rationale)}</p>
    <div class="citation"><b>evidence:</b> ${escapeHtml(c.citation)}</div>
  </section>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
