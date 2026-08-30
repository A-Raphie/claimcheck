import type { ClaimResult, RunReport, Verdict } from "./types.js";

// Mirror: winsznx/lazaret (verified from lazaret.pages.dev production CSS, Aug 30 2026).
// Choice recorded: mirroring lazaret over metrx (warm certificate) and conduit (light
// institutional); dark instrument with the evidence path as hero matches Claimcheck's
// domain and judged-demo conditions. Swap the :root block to change mirrors.
// Sacrifice: no webfont links, local stacks only, because the report must render with
// zero network requests (a shipped, tested product claim). DM Sans and DM Mono are
// used when installed locally and degrade to system stacks otherwise.

const VERDICT_CLASS: Record<Verdict, string> = {
  VERIFIED: "ok",
  REFUTED: "bad",
  UNVERIFIABLE: "warn",
};
const VERDICT_GLYPH: Record<Verdict, string> = {
  VERIFIED: "\u2713",
  REFUTED: "\u2715",
  UNVERIFIABLE: "?",
};

export function renderHtmlReport(report: RunReport): string {
  const counts = countVerdicts(report.claims);
  const cards = report.claims.map(card).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claimcheck report</title>
<style>
  /* Token block: the only place raw colors live. Ladder from lazaret's verified
     zinc scale; verdict colors derived muted and always label-paired, never
     color alone. */
  :root {
    --canvas: #09090b;        /* obsidian page */
    --surface: #18181b;       /* graphite card */
    --surface-2: #1f1f23;     /* raised card: graphite one step up */
    --line: #27272a;          /* slate hairline */
    --line-strong: #3f3f46;   /* iron, hover and emphasis borders */
    --ink: #f4f4f5;           /* paper: primary text */
    --ink-2: #a1a1aa;         /* ash: secondary text */
    --ink-3: #71717a;         /* fog: labels, only on surface where contrast holds */
    --ember: #ff5a00;         /* brand accent: evidence paths, never a verdict */
    --ember-tint: rgba(255, 90, 0, 0.1);
    --ok: #5ec98c;            /* VERIFIED, muted green */
    --ok-tint: rgba(94, 201, 140, 0.12);
    --bad: #ee6f6f;           /* REFUTED, muted red */
    --bad-tint: rgba(238, 111, 111, 0.12);
    --warn: #d9a83e;          /* UNVERIFIABLE, muted amber */
    --warn-tint: rgba(217, 168, 62, 0.12);
    --r-card: 24px;
    --r-ctrl: 14px;
    --r-pill: 999px;
    --pad-card: 24px;
    --sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --mono: "DM Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html { scrollbar-gutter: stable; }
  body {
    margin: 0; background: var(--canvas); color: var(--ink);
    font: 400 15px/1.6 var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  .shell { max-width: 880px; margin: 0 auto; padding: 28px 20px 72px; }

  .topbar {
    display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
    padding-bottom: 18px; border-bottom: 1px solid var(--line);
  }
  .wordmark {
    font: 700 15px/1 var(--sans); letter-spacing: 0.22em; color: var(--ink);
  }
  .wordmark .tick { color: var(--ember); }
  .runmeta { font: 400 13px/1 var(--mono); color: var(--ink-2); }
  .runmeta b { color: var(--ink); font-weight: 500; }

  .hero { padding: 30px 0 26px; }
  .orient { margin: 0 0 22px; color: var(--ink-2); font-size: 15px; max-width: 60ch; }
  .orient b { color: var(--ink); font-weight: 500; }
  .counts { display: flex; gap: 28px; flex-wrap: wrap; align-items: flex-end; }
  .count { min-width: 96px; }
  .count .n {
    font: 500 32px/1 var(--sans); font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .count .l {
    font: 400 12px/1.4 var(--mono); letter-spacing: 0.08em; color: var(--ink-2);
    margin-top: 6px;
  }
  .count.ok .n { color: var(--ok); }
  .count.bad .n { color: var(--bad); }
  .count.warn .n { color: var(--warn); }
  .dist { display: flex; height: 6px; border-radius: var(--r-pill); overflow: hidden; background: var(--surface-2); margin-top: 20px; }
  .dist .seg-ok { background: var(--ok); }
  .dist .seg-bad { background: var(--bad); }
  .dist .seg-warn { background: var(--warn); }
  .facts {
    display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;
    font: 400 12px/1 var(--mono); color: var(--ink-2);
  }
  .fact {
    border: 1px solid var(--line); border-radius: var(--r-pill);
    padding: 7px 12px; background: var(--surface);
  }
  .fact b { color: var(--ink); font-weight: 500; }

  .cards { display: grid; gap: 14px; }
  .card {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: var(--r-card); padding: var(--pad-card);
    transition: border-color 0.15s ease-out, background-color 0.15s ease-out;
  }
  .card:hover, .card:focus-visible { background: var(--surface-2); border-color: var(--line-strong); }
  .card:focus-visible { outline: 3px solid var(--ember); outline-offset: 3px; }
  .card-head { display: flex; gap: 12px; align-items: baseline; }
  .cid { font: 500 13px/1 var(--mono); color: var(--ink-2); flex: 0 0 auto; }
  .verdict {
    flex: 0 0 auto; font: 500 12px/1 var(--mono); letter-spacing: 0.08em;
    border-radius: var(--r-pill); padding: 5px 11px;
  }
  .verdict.ok { color: var(--ok); background: var(--ok-tint); }
  .verdict.bad { color: var(--bad); background: var(--bad-tint); }
  .verdict.warn { color: var(--warn); background: var(--warn-tint); }
  .claim { font-size: 15px; color: var(--ink); }
  .lbl {
    font: 400 11px/1 var(--mono); letter-spacing: 0.14em; color: var(--ink-2);
    text-transform: uppercase; margin: 16px 0 8px;
  }
  .path {
    display: block; font: 400 13px/1.7 var(--mono); color: var(--ink-2);
    background: var(--canvas); border-left: 2px solid var(--ember);
    border-radius: 0 var(--r-ctrl) var(--r-ctrl) 0;
    padding: 12px 16px; white-space: pre-wrap; word-break: break-word;
    overflow-x: auto;
  }
  .rationale { margin: 12px 0 0; color: var(--ink-2); font-size: 14px; max-width: 68ch; }

  footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid var(--line); }
  .legend { font: 400 13px/1.8 var(--mono); color: var(--ink-2); }
  .legend b { color: var(--ink); font-weight: 500; }

  @media (max-width: 560px) {
    .shell { padding: 20px 14px 56px; }
    .counts { gap: 18px; }
    .count .n { font-size: 26px; }
    .card { padding: 18px; border-radius: 18px; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="wordmark">CLAIM<span class="tick">CHECK</span></div>
    <div class="runmeta">${escapeHtml(report.mode)} run · <b>${escapeHtml(report.model)}</b> · ${report.startedAt.slice(0, 10)}</div>
  </header>

  <section class="hero">
    <p class="orient"><b>Every claim about this code change was checked against executed evidence.</b>
    ${counts.total} claims, each judged from what the repository actually contains and runs, not from how the change reads.</p>
    <div class="counts">
      <div class="count ok"><div class="n">${counts.VERIFIED}</div><div class="l">VERIFIED</div></div>
      <div class="count bad"><div class="n">${counts.REFUTED}</div><div class="l">REFUTED</div></div>
      <div class="count warn"><div class="n">${counts.UNVERIFIABLE}</div><div class="l">UNVERIFIABLE</div></div>
    </div>
    <div class="dist" role="img" aria-label="${counts.VERIFIED} verified, ${counts.REFUTED} refuted, ${counts.UNVERIFIABLE} unverifiable">
      <div class="seg-ok" style="width: ${pct(counts.VERIFIED, counts.total)}%"></div>
      <div class="seg-bad" style="width: ${pct(counts.REFUTED, counts.total)}%"></div>
      <div class="seg-warn" style="width: ${pct(counts.UNVERIFIABLE, counts.total)}%"></div>
    </div>
    <div class="facts">
      <span class="fact">wall time <b>${(report.durationMs / 1000).toFixed(1)}s</b></span>
      <span class="fact">model cost <b>$${report.usage.costUsd.toFixed(5)}</b></span>
      <span class="fact">model calls <b>${report.usage.calls}</b></span>
      <span class="fact">evidence actions <b>${report.claims.reduce((a, c) => a + c.evidence.length, 0)}</b></span>
    </div>
  </section>

  <main class="cards">
${cards}
  </main>

  <footer>
    <p class="legend"><b>VERIFIED</b>: evidence directly proves the claim true.
    <b>REFUTED</b>: evidence directly proves it false.
    <b>UNVERIFIABLE</b>: the repository cannot decide it.
    Every verdict cites the evidence that decided it. Regenerate this report with
    <b>claimcheck report</b>.</p>
  </footer>
</div>
</body>
</html>
`;
}

function card(c: ClaimResult): string {
  const cls = VERDICT_CLASS[c.verdict] ?? "warn";
  const glyph = VERDICT_GLYPH[c.verdict] ?? "?";
  return `    <article class="card" tabindex="0">
      <div class="card-head">
        <span class="cid">${escapeHtml(c.id)}</span>
        <span class="verdict ${cls}">${glyph} ${c.verdict}</span>
        <span class="claim">${escapeHtml(c.text)}</span>
      </div>
      <div class="lbl">evidence</div>
      <code class="path">${escapeHtml(c.citation)}</code>
      <p class="rationale">${escapeHtml(c.rationale)}</p>
    </article>`;
}

function countVerdicts(claims: ClaimResult[]): Record<Verdict | "total", number> {
  const out = { VERIFIED: 0, REFUTED: 0, UNVERIFIABLE: 0, total: claims.length };
  for (const c of claims) out[c.verdict] += 1;
  return out;
}

function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
