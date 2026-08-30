import type { ClaimResult, RunReport, Verdict } from "./types.js";

// Mirror: winsznx/metrx /proof (metrx.pages.dev/proof), SEEN Aug 30 2026. Warm paper,
// white hairline cards, uppercase mono micro-labels, big stat numerals, tri-state
// verdict accents (bot green / clay / amber), claim-ledger footer.
// Built through the adopted ui-skills stack: create-design-md evidence doc
// (docs/DESIGN.md), playbook computed-detail rules, fixing-accessibility pass,
// fixing-metadata pass. Zero network requests: no webfonts, inline SVG favicon,
// no external resources of any kind.

const VERDICT = {
  VERIFIED: { text: "#0b6e50", soft: "rgba(20, 199, 154, 0.14)", dot: "#14c79a" },
  REFUTED: { text: "#9c3b24", soft: "rgba(156, 59, 36, 0.10)", dot: "#9c3b24" },
  UNVERIFIABLE: { text: "#8a6420", soft: "rgba(215, 160, 74, 0.16)", dot: "#d7a04a" },
} as const;

export function renderHtmlReport(report: RunReport): string {
  const counts = countVerdicts(report.claims);
  const cards = report.claims.map(card).join("\n");
  const headline = `${counts.VERIFIED} verified. ${counts.REFUTED} refuted. ${counts.UNVERIFIABLE} undecidable.`;
  const evidenceActions = report.claims.reduce((a, c) => a + c.evidence.length, 0);
  const title = `Claimcheck · ${counts.total} claims checked`;
  const description = `Every claim about this code change was checked against executed evidence. ${headline} Nothing is asserted above the evidence behind it.`;

  const claimsBody =
    counts.total === 0
      ? `    <article class="card">
      <div class="card-head"><span class="claim">No claims were checked.</span></div>
      <p class="rationale">Pass a claims file to verify a change: <code class="cmd">claimcheck verify --repo . --claims-file claims.md</code></p>
    </article>`
      : cards;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="theme-color" content="#f7f1e8">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23141311'/%3E%3Cpath d='M9 16.5l5 5 9-11' stroke='%2314c79a' stroke-width='3.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<style>
  /* Token block: the only place raw colors live. Values from metrx.pages.dev
     production CSS (Aug 30 2026). stone-strong darkened from metrx stone #8a8178
     for the 4.5:1 small-text floor on white. */
  :root {
    --paper: #f7f1e8;      /* warm canvas */
    --surface: #fffdf9;    /* white-warm card */
    --line: rgba(20, 19, 17, 0.10);
    --line-strong: rgba(20, 19, 17, 0.22);
    --ink: #141311;        /* near-black warm */
    --ink-2: #4b5563;      /* slate body */
    --ink-3: #6f675e;      /* stone-strong: labels, 5.2:1 on white */
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --r-card: 16px;
    --r-inner: 4px;        /* playbook: nested radii <= outer minus inset, floored */
    --ok: #14c79a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font: 400 17px/1.55 var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  .shell { max-width: 1120px; margin: 0 auto; padding: 0 24px 72px; }

  .topbar {
    display: flex; align-items: baseline; justify-content: space-between;
    flex-wrap: wrap; gap: 6px 16px;
    padding: 20px 0; border-bottom: 1px solid var(--line);
  }
  .wordmark { font: 600 16px/1 var(--sans); letter-spacing: 0.01em; }
  .wordmark .tick { color: var(--ok); }
  .runmeta { font: 400 12px/1 var(--mono); color: var(--ink-2); }

  .eyebrow {
    font: 500 11px/1 var(--mono); letter-spacing: 0.18em; color: var(--ink-3);
    text-transform: uppercase; margin: 52px 0 14px;
  }
  h1 {
    font: 600 44px/1.15 var(--sans); letter-spacing: -0.02em;
    margin: 0 0 18px; max-width: 21ch;
    text-wrap: balance;
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
    animation: rise 0.18s ease-out both;
  }
  .card:nth-child(2) { animation-delay: 0.04s; }
  .card:nth-child(3) { animation-delay: 0.08s; }
  .card:nth-child(n+4) { animation-delay: 0.12s; }
  @keyframes rise {
    from { opacity: 0; transform: translateY(6px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card { animation: none; }
  }
  .card-head { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .cid { font: 400 12px/1 var(--mono); color: var(--ink-3); }
  .verdict {
    display: inline-flex; align-items: center; gap: 7px;
    font: 500 11px/1 var(--mono); letter-spacing: 0.12em;
    border-radius: 999px; padding: 5px 11px;
  }
  .verdict .dot { width: 7px; height: 7px; border-radius: 999px; }
  .claim { font-size: 16px; font-weight: 500; text-wrap: pretty; }
  .lbl {
    font: 500 10px/1 var(--mono); letter-spacing: 0.16em; color: var(--ink-3);
    text-transform: uppercase; margin: 14px 0 8px;
  }
  .path {
    display: block; font: 400 13px/1.7 var(--mono); color: var(--ink-2);
    background: var(--paper); border-left: 2px solid var(--line-strong);
    border-radius: 0 var(--r-inner) var(--r-inner) 0;
    padding: 10px 14px; white-space: pre-wrap; word-break: break-word;
    overflow-x: auto;
  }
  .card.REFUTED .path { border-left-color: #9c3b24; }
  .card.VERIFIED .path { border-left-color: var(--ok); }
  .card.UNVERIFIABLE .path { border-left-color: #d7a04a; }
  .rationale { margin: 10px 0 0; color: var(--ink-2); font-size: 15px; max-width: 72ch; }
  .cmd {
    font: 500 13px/1 var(--mono); color: var(--ink);
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 6px; padding: 2px 6px;
  }

  .ledger {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: var(--r-card); padding: 22px 24px; margin-top: 46px;
  }
  .ledger p { margin: 0 0 10px; color: var(--ink-2); font-size: 15px; max-width: 70ch; }
  .ledger p b { color: var(--ink); font-weight: 500; }
  .ledger code {
    display: inline-block; font: 500 13px/1 var(--mono); color: var(--ink);
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 8px; margin: 2px 0 8px;
  }

  @media (max-width: 720px) {
    .topbar { flex-direction: column; align-items: flex-start; }
    h1 { font-size: 32px; }
    .stats { grid-template-columns: repeat(2, 1fr); }
    .shell { padding: 0 16px 56px; }
    .card { padding: 16px; }
  }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="wordmark"><span class="tick" aria-hidden="true">\u2713</span> Claimcheck</div>
    <div class="runmeta">${escapeHtml(report.model)} · ${escapeHtml(report.mode)} run · ${report.startedAt.slice(0, 10)}</div>
  </header>

  <div class="eyebrow" id="main">Proof report</div>
  <h1>${escapeHtml(headline)}</h1>
  <p class="sub">Every claim about this code change was checked against <b>executed evidence</b>:
  files read, searches run, and test suites executed inside the repository itself.
  Nothing below is asserted above the evidence behind it.</p>

  <div class="stats" role="group" aria-label="Run facts">
    <div class="stat"><div class="l">Claims checked</div><div class="n">${counts.total}</div><div class="u">3 verdict classes</div></div>
    <div class="stat"><div class="l">Evidence actions</div><div class="n">${evidenceActions}</div><div class="u">reads · searches · test runs</div></div>
    <div class="stat"><div class="l">Wall time</div><div class="n">${(report.durationMs / 1000).toFixed(1)}<span style="font-size: 20px">s</span></div><div class="u">end to end</div></div>
    <div class="stat"><div class="l">Model cost</div><div class="n">$${report.usage.costUsd.toFixed(5)}</div><div class="u">${report.usage.calls} model calls</div></div>
  </div>

  <h2 class="seclabel">All claims</h2>
  <main class="cards">
${claimsBody}
  </main>

  <section class="ledger" aria-labelledby="ledger-h">
    <h2 class="seclabel" id="ledger-h" style="margin: 0 0 12px">Claim ledger</h2>
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
