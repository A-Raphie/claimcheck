import type { ClaimResult, RunReport, Verdict } from "./types.js";

// Mirror: winsznx/metrx /proof (metrx.pages.dev/proof) — SEEN Aug 30 2026, not just
// curl'd. Same page type as a Claimcheck report: a public proof hub. Grammar observed
// from the live page: warm paper canvas, white hairline cards, near-black ink,
// uppercase mono micro-labels (PROOF HUB, ORDERS, CLAIM LEDGER), big stat numerals,
// tri-state verdict accents (bot green / clay / amber), IBM Plex Mono, claim-ledger
// footer with a re-verify command. Earlier attempt failed because tokens were read
// from CSS without seeing which surface wears them: lazaret's front door is LIGHT
// editorial, metrx's proof hub is warm paper — both mirrors are light. Dark was wrong.
// Sacrifice: no webfont link; IBM Plex Mono used when installed locally, system mono
// otherwise, because the report must render with zero network requests.

const VERDICT = {
  VERIFIED: { text: "#0b6e50", soft: "rgba(20, 199, 154, 0.14)", dot: "#14c79a", glyph: "\u2713" },
  REFUTED: { text: "#9c3b24", soft: "rgba(156, 59, 36, 0.10)", dot: "#9c3b24", glyph: "\u2715" },
  UNVERIFIABLE: { text: "#8a6420", soft: "rgba(215, 160, 74, 0.16)", dot: "#d7a04a", glyph: "?" },
} as const;

export function renderHtmlReport(report: RunReport): string {
  const counts = countVerdicts(report.claims);
  const cards = report.claims.map(card).join("\n");
  const headline = `${counts.VERIFIED} verified. ${counts.REFUTED} refuted. ${counts.UNVERIFIABLE} undecidable.`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claimcheck report</title>
<style>
  /* Token block: the only place raw colors live. Values from metrx.pages.dev
     production CSS (Aug 30 2026), observed on its /proof surface. */
  :root {
    --paper: #f7f1e8;      /* warm canvas */
    --surface: #fffdf9;    /* white-warm card */
    --line: rgba(20, 19, 17, 0.10);
    --line-strong: rgba(20, 19, 17, 0.22);
    --ink: #141311;        /* near-black warm */
    --ink-2: #4b5563;      /* slate body */
    --ink-3: #8a8178;      /* stone, labels on white only */
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --r-card: 16px;
    --r-input: 10px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font: 400 17px/1.55 var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  .shell { max-width: 1120px; margin: 0 auto; padding: 0 24px 72px; }

  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0; border-bottom: 1px solid var(--line);
  }
  .wordmark { font: 600 16px/1 var(--sans); letter-spacing: 0.01em; }
  .wordmark .tick { color: #14c79a; }
  .runmeta { font: 400 12px/1 var(--mono); color: var(--ink-2); }

  .eyebrow {
    font: 500 11px/1 var(--mono); letter-spacing: 0.18em; color: var(--ink-3);
    text-transform: uppercase; margin: 52px 0 14px;
  }
  h1 {
    font: 600 44px/1.15 var(--sans); letter-spacing: -0.02em;
    margin: 0 0 18px; max-width: 21ch;
  }
  .sub { max-width: 62ch; color: var(--ink-2); margin: 0 0 36px; }
  .sub b { color: var(--ink); font-weight: 500; }

  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .stat {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: var(--r-card); padding: 18px 20px;
  }
  .stat .l {
    font: 500 10px/1 var(--mono); letter-spacing: 0.16em; color: var(--ink-3);
    text-transform: uppercase; margin-bottom: 12px;
  }
  .stat .n {
    font: 400 34px/1 var(--sans); letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }
  .stat .u { font: 400 12px/1.5 var(--mono); color: var(--ink-2); margin-top: 10px; }

  .seclabel {
    font: 500 11px/1 var(--mono); letter-spacing: 0.18em; color: var(--ink-3);
    text-transform: uppercase; margin: 46px 0 16px;
  }
  .cards { display: grid; gap: 12px; }
  .card {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: var(--r-card); padding: 20px 22px;
  }
  .card-head { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .cid { font: 400 12px/1 var(--mono); color: var(--ink-3); }
  .verdict {
    display: inline-flex; align-items: center; gap: 7px;
    font: 500 11px/1 var(--mono); letter-spacing: 0.12em;
    border-radius: 999px; padding: 5px 11px;
  }
  .verdict .dot { width: 7px; height: 7px; border-radius: 999px; }
  .claim { font-size: 16px; font-weight: 500; }
  .lbl {
    font: 500 10px/1 var(--mono); letter-spacing: 0.16em; color: var(--ink-3);
    text-transform: uppercase; margin: 14px 0 8px;
  }
  .path {
    display: block; font: 400 13px/1.7 var(--mono); color: var(--ink-2);
    background: var(--paper); border-left: 2px solid var(--line-strong);
    border-radius: 0 var(--r-input) var(--r-input) 0;
    padding: 10px 14px; white-space: pre-wrap; word-break: break-word;
    overflow-x: auto;
  }
  .card.REFUTED .path { border-left-color: #9c3b24; }
  .card.VERIFIED .path { border-left-color: #14c79a; }
  .card.UNVERIFIABLE .path { border-left-color: #d7a04a; }
  .rationale { margin: 10px 0 0; color: var(--ink-2); font-size: 15px; max-width: 72ch; }

  .ledger {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: var(--r-card); padding: 22px 24px; margin-top: 46px;
  }
  .ledger p { margin: 0 0 10px; color: var(--ink-2); font-size: 15px; }
  .ledger p b { color: var(--ink); font-weight: 500; }
  .ledger code {
    display: inline-block; font: 500 13px/1 var(--mono); color: var(--ink);
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 8px; margin: 2px 0 8px;
  }

  @media (max-width: 720px) {
    h1 { font-size: 32px; }
    .stats { grid-template-columns: repeat(2, 1fr); }
    .shell { padding: 0 16px 56px; }
    .card { padding: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="wordmark"><span class="tick">\u2713</span> Claimcheck</div>
    <div class="runmeta">${escapeHtml(report.model)} · ${escapeHtml(report.mode)} run · ${report.startedAt.slice(0, 10)}</div>
  </header>

  <div class="eyebrow">Proof report</div>
  <h1>${escapeHtml(headline)}</h1>
  <p class="sub">Every claim about this code change was checked against <b>executed evidence</b>:
  files read, searches run, and test suites executed inside the repository itself.
  Nothing below is asserted above the evidence behind it.</p>

  <div class="stats">
    <div class="stat"><div class="l">Claims checked</div><div class="n">${counts.total}</div><div class="u">3 verdict classes</div></div>
    <div class="stat"><div class="l">Evidence actions</div><div class="n">${report.claims.reduce((a, c) => a + c.evidence.length, 0)}</div><div class="u">reads · searches · test runs</div></div>
    <div class="stat"><div class="l">Wall time</div><div class="n">${(report.durationMs / 1000).toFixed(1)}<span style="font-size: 20px">s</span></div><div class="u">end to end</div></div>
    <div class="stat"><div class="l">Model cost</div><div class="n">$${report.usage.costUsd.toFixed(5)}</div><div class="u">${report.usage.calls} model calls</div></div>
  </div>

  <div class="seclabel">All claims</div>
  <main class="cards">
${cards}
  </main>

  <section class="ledger">
    <div class="seclabel" style="margin: 0 0 12px">Claim ledger</div>
    <p>Every verdict above cites the evidence that decided it. Nothing on this page is
    asserted above the evidence behind it. Re-check everything by regenerating the report:</p>
    <code>claimcheck verify --repo &lt;path&gt; --claims-file claims.md</code>
    <p style="margin: 6px 0 0"><b>VERIFIED</b>: evidence directly proves the claim true.
    <b>REFUTED</b>: evidence directly proves it false.
    <b>UNVERIFIABLE</b>: the repository cannot decide it, and the report refuses to guess.</p>
  </section>
</div>
</body>
</html>
`;
}

function card(c: ClaimResult): string {
  const v = VERDICT[c.verdict] ?? VERDICT.UNVERIFIABLE;
  return `    <article class="card ${c.verdict}">
      <div class="card-head">
        <span class="cid">${escapeHtml(c.id)}</span>
        <span class="verdict" style="color: ${v.text}; background: ${v.soft}"><span class="dot" style="background: ${v.dot}"></span>${c.verdict}</span>
        <span class="claim">${escapeHtml(c.text)}</span>
      </div>
      <div class="lbl">Evidence</div>
      <code class="path">${escapeHtml(c.citation)}</code>
      <p class="rationale">${escapeHtml(c.rationale)}</p>
    </article>`;
}

function countVerdicts(claims: ClaimResult[]): Record<Verdict | "total", number> {
  const out = { VERIFIED: 0, REFUTED: 0, UNVERIFIABLE: 0, total: claims.length };
  for (const c of claims) out[c.verdict] += 1;
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
