import type { ClaimResult, RunReport, Verdict } from "./types.js";

const VERDICT_STYLE: Record<Verdict, { color: string; glyph: string }> = {
  VERIFIED: { color: "#34d399", glyph: "\u2713" },
  REFUTED: { color: "#f87171", glyph: "\u2715" },
  UNVERIFIABLE: { color: "#facc15", glyph: "?" },
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
    margin: 0; background: #0b0f14; color: #e4ecf3;
    font: 15px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  main { max-width: 900px; margin: 0 auto; padding: 40px 20px 80px; }
  header { border-bottom: 1px solid #1d2733; padding-bottom: 20px; margin-bottom: 28px; }
  h1 {
    font-size: 19px; margin: 0 0 12px; letter-spacing: 1.5px; color: #f3f7fb;
    text-transform: uppercase;
  }
  h1 .run { color: #7b8da0; font-weight: 400; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 13px; color: #93a5b7; }
  .meta b { color: #dbe4ec; font-weight: 600; }
  .meta .accent { color: #6ee7b7; }
  .card {
    border: 1px solid #1d2733; border-radius: 10px; padding: 16px 18px; margin-bottom: 14px;
    background: #0f151c;
  }
  .claim-line { display: flex; gap: 12px; align-items: baseline; }
  .id { color: #64778b; flex: 0 0 auto; font-size: 13px; }
  .badge {
    flex: 0 0 auto; font-size: 12px; font-weight: 700; letter-spacing: 1px;
    padding: 2px 10px; border-radius: 999px; border: 1px solid currentColor;
  }
  .text { flex: 1 1 auto; font-size: 15px; color: #eef4f9; }
  .label {
    color: #748899; font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase;
    margin: 12px 0 4px;
  }
  .rationale { color: #b6c3d1; margin: 0 0 8px; font-size: 14px; }
  .citation {
    border-left: 3px solid #2a3849; padding: 8px 12px; color: #9fb0c0;
    font-size: 13px; background: #0b1017; border-radius: 0 6px 6px 0;
    overflow-x: auto; white-space: pre-wrap; word-break: break-word;
  }
  .citation b { color: #cbd7e4; }
  footer { margin-top: 30px; color: #66788c; font-size: 12px; line-height: 1.8; }
  footer b { color: #8fa3b8; }
</style>
</head>
<body>
<main>
  <header>
    <h1>Claimcheck <span class="run">· ${escapeHtml(report.mode)} run</span></h1>
    <div class="meta">
      <span>model <b>${escapeHtml(report.model)}</b></span>
      <span>claims <b>${report.claims.length}</b></span>
      <span>wall time <b class="accent">${(report.durationMs / 1000).toFixed(1)}s</b></span>
      <span>model cost <b class="accent">$${report.usage.costUsd.toFixed(5)}</b></span>
    </div>
  </header>
${cards}
  <footer>
    <b>VERIFIED</b>: evidence directly proves the claim true.
    <b>REFUTED</b>: evidence directly proves it false.
    <b>UNVERIFIABLE</b>: evidence cannot decide it.
    Every verdict cites the evidence that decided it.
  </footer>
</main>
</body>
</html>
`;
}

function card(c: ClaimResult): string {
  const style = VERDICT_STYLE[c.verdict] ?? { color: "#7b8da0", glyph: "·" };
  return `  <section class="card">
    <div class="claim-line">
      <span class="id">${escapeHtml(c.id)}</span>
      <span class="badge" style="color: ${style.color}">${style.glyph} ${c.verdict}</span>
      <span class="text">${escapeHtml(c.text)}</span>
    </div>
    <div class="label">rationale</div>
    <p class="rationale">${escapeHtml(c.rationale)}</p>
    <div class="label">evidence</div>
    <div class="citation">${escapeHtml(c.citation)}</div>
  </section>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
