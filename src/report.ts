import type { ClaimResult, EvidenceAction, EvidenceItem, RunReport, Verdict } from "./types.js";

// Mirror: winsznx/metrx /proof (metrx.pages.dev/proof), SEEN Aug 30 2026. Warm paper,
// white hairline cards, uppercase mono micro-labels, big stat numerals, tri-state
// verdict accents (bot green / clay / amber), claim-ledger footer. v5 authored layer:
// the change under review (real diff with file chips), verdict-weighted cards,
// run receipt serial, decisive-evidence emphasis, canvas texture. Zero network.

const VERDICT = {
  VERIFIED: { text: "#0b6e50", soft: "rgba(20, 199, 154, 0.14)", dot: "#14c79a" },
  REFUTED: { text: "#9c3b24", soft: "rgba(156, 59, 36, 0.10)", dot: "#9c3b24" },
  UNVERIFIABLE: { text: "#8a6420", soft: "rgba(215, 160, 74, 0.16)", dot: "#d7a04a" },
} as const;

export function renderHtmlReport(report: RunReport): string {
  const counts = countVerdicts(report.claims);
  const cards = report.claims.map((c, i) => card(c, i)).join("\n");
  const headline = `${counts.VERIFIED} verified. ${counts.REFUTED} refuted. ${counts.UNVERIFIABLE} undecidable.`;
  const diffStats = diffStatsOf(report.diff);
  const evidenceActions = report.claims.reduce((a, c) => a + c.evidence.length, 0);
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
<title>Claimcheck report · run ${runId(report)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="theme-color" content="#f7f1e8">
<meta property="og:type" content="website">
<meta property="og:title" content="Claimcheck report · run ${runId(report)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23141311'/%3E%3Cpath d='M9 16.5l5 5 9-11' stroke='%2314c79a' stroke-width='3.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<style>
  :root {
    --paper: #f7f1e8;
    --surface: #fffdf9;
    --line: rgba(20, 19, 17, 0.10);
    --line-strong: rgba(20, 19, 17, 0.22);
    --ink: #141311;
    --ink-2: #4b5563;
    --ink-3: #6f675e;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --r-card: 16px;
    --r-inner: 4px;
    --ok: #14c79a;
    --ok-text: #0b6e50;
    --bad-text: #9c3b24;
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
    flex-wrap: wrap; gap: 6px 16px;
    padding: 20px 0; border-bottom: 1px solid var(--line);
  }
  .wordmark { font: 600 16px/1 var(--sans); }
  .wordmark .tick { color: var(--ok); }
  .runmeta { font: 400 12px/1 var(--mono); color: var(--ink-2); }

  .herozone {
    background-image: repeating-linear-gradient(135deg, rgba(20,19,17,0.028) 0 1px, transparent 1px 9px);
    margin: 0 -24px; padding: 0 24px 26px;
  }
  .eyebrow {
    font: 500 11px/1 var(--mono); letter-spacing: 0.18em; color: var(--ink-3);
    text-transform: uppercase; margin: 52px 0 14px;
  }
  h1 {
    font: 600 44px/1.15 var(--sans); letter-spacing: -0.02em;
    margin: 0 0 18px; max-width: 21ch;
    text-wrap: balance;
  }
  .sub { max-width: 62ch; color: var(--ink-2); margin: 0 0 26px; }
  .sub b { color: var(--ink); font-weight: 500; }
  .receipt {
    display: flex; gap: 8px 18px; flex-wrap: wrap; align-items: baseline;
    font: 400 11px/1.6 var(--mono); letter-spacing: 0.08em; color: var(--ink-3);
    border: 1px solid var(--line); border-radius: var(--r-inner);
    background: var(--surface); padding: 9px 14px;
  }
  .receipt b { color: var(--ink); font-weight: 500; }

  .seclabel {
    font: 500 11px/1 var(--mono); letter-spacing: 0.18em; color: var(--ink-3);
    text-transform: uppercase; margin: 46px 0 16px;
  }
  .diffbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .filechip {
    display: inline-flex; align-items: center; gap: 8px;
    font: 400 12px/1 var(--mono); color: var(--ink);
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 12px;
  }
  .filechip .adds { color: var(--ok-text); }
  .filechip .dels { color: var(--bad-text); }
  details.diffbar > summary {
    list-style: none; cursor: pointer; user-select: none;
    font: 500 12px/1 var(--mono); color: var(--ink-2);
    border: 1px solid var(--line); border-radius: 999px; padding: 7px 12px;
    transition: background-color 0.15s ease-out;
  }
  details.diffbar > summary::-webkit-details-marker { display: none; }
  details.diffbar > summary:hover { background: var(--surface); border-color: var(--line-strong); }
  .diffbody {
    margin-top: 10px; border: 1px solid var(--line); border-radius: var(--r-card);
    background: var(--surface); padding: 14px 16px; overflow-x: auto;
  }
  .diffbody pre {
    margin: 0; font: 400 12px/1.7 var(--mono); color: var(--ink-2);
    white-space: pre; max-height: 340px; overflow-y: auto;
  }
  .diffbody .add { color: var(--ok-text); background: rgba(20,199,154,0.08); display: inline-block; width: 100%; }
  .diffbody .del { color: var(--bad-text); background: rgba(156,59,36,0.07); display: inline-block; width: 100%; }
  .diffbody .hunk { color: var(--ink-3); }

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
    font: 600 44px/1 var(--sans); letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .stat .u { font: 400 12px/1.5 var(--mono); color: var(--ink-2); margin-top: 10px; }

  .dist { display: flex; height: 6px; border-radius: 999px; overflow: hidden; background: var(--surface); border: 1px solid var(--line); margin-top: 14px; }
  .dist .seg { height: 100%; }
  .dist .seg.ok { background: var(--ok); }
  .dist .seg.bad { background: #9c3b24; }
  .dist .seg.warn { background: #d7a04a; }

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
  .card.VERIFIED { border-left: 3px solid var(--ok); }
  .card.REFUTED { border-left: 3px solid #9c3b24; background: linear-gradient(0deg, rgba(156,59,36,0.05), rgba(156,59,36,0.05)), var(--surface); }
  .card.UNVERIFIABLE { border: 1px dashed rgba(215,160,74,0.55); border-left: 3px solid #d7a04a; }
  .card-head { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .cid { font: 500 12px/1 var(--mono); color: var(--ink-3); letter-spacing: 0.06em; }
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
  .path b { color: var(--ink); font-weight: 600; }
  .card.REFUTED .path { border-left-color: #9c3b24; }
  .card.VERIFIED .path { border-left-color: var(--ok); }
  .card.UNVERIFIABLE .path { border-left-color: #d7a04a; }
  .rationale { margin: 10px 0 0; color: var(--ink-2); font-size: 15px; max-width: 72ch; }
  .cmd {
    font: 500 13px/1 var(--mono); color: var(--ink);
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 6px; padding: 2px 6px;
  }

  details.trail { margin-top: 14px; }
  details.trail summary {
    list-style: none; cursor: pointer; user-select: none;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font: 500 12px/1 var(--mono); color: var(--ink-2);
    border: 1px solid var(--line); border-radius: 999px;
    padding: 8px 14px; width: fit-content;
    transition: background-color 0.15s ease-out, border-color 0.15s ease-out;
  }
  details.trail summary::-webkit-details-marker { display: none; }
  details.trail summary:hover { background: var(--paper); border-color: var(--line-strong); }
  details.trail summary .chev { transition: transform 0.15s ease-out; color: var(--ink-3); }
  details.trail[open] summary .chev { transform: rotate(90deg); }
  details.trail summary b { color: var(--ink); font-weight: 500; }
  .trail-body { margin-top: 10px; display: grid; gap: 10px; }
  .ev { border: 1px solid var(--line); border-radius: var(--r-inner); background: var(--paper); }
  .ev-head {
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    font: 500 11px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase;
    padding: 9px 12px; color: var(--ink-3);
  }
  .ev-head .act { color: var(--ink); }
  .ev-head .state-ok { color: var(--ok-text); }
  .ev-head .state-fail { color: var(--bad-text); }
  .ev pre {
    margin: 0; padding: 10px 12px; border-top: 1px solid var(--line);
    font: 400 12px/1.65 var(--mono); color: var(--ink-2);
    white-space: pre-wrap; word-break: break-word;
    max-height: 260px; overflow-y: auto;
  }
  .settle {
    margin: 10px 0 0; font-size: 14px; color: var(--ink-2);
    border: 1px dashed rgba(215,160,74,0.55); border-radius: var(--r-inner);
    padding: 8px 12px; background: rgba(215,160,74,0.06); max-width: 72ch;
  }
  .settle .settle-l {
    font: 500 10px/1 var(--mono); letter-spacing: 0.14em; text-transform: uppercase;
    color: #8a6420; margin-right: 8px;
  }
  .ev-none { font: 400 13px/1.6 var(--mono); color: var(--ink-3); margin: 14px 0 0; }

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
    h1 { font-size: 32px; }
    .stats { grid-template-columns: repeat(2, 1fr); }
    .shell { padding: 0 16px 56px; }
    .card { padding: 16px; }
    .herozone { margin: 0 -16px; padding: 0 16px 22px; }
  }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <div class="wordmark"><span class="tick" aria-hidden="true">\u2713</span> Claimcheck</div>
    <div class="runmeta">${escapeHtml(report.mode)} run · ${report.startedAt.slice(0, 10)}</div>
  </header>

  <div class="herozone">
    <div class="eyebrow" id="main">Proof report</div>
    <h1>${escapeHtml(headline)}</h1>
    <p class="sub">Every claim about this code change was checked against <b>executed evidence</b>:
    files read, searches run, and test suites executed inside the repository itself.
    Nothing below is asserted above the evidence behind it.</p>
    <div class="receipt">
      <span>RUN <b>${runId(report)}</b></span>
      <span>MODEL <b>${escapeHtml(report.model)}</b></span>
      <span>TOOL CALLS <b>${evidenceActions}</b></span>
      <span>WALL <b>${(report.durationMs / 1000).toFixed(1)}s</b></span>
      <span>${report.startedAt.slice(0, 10)}</span>
    </div>
  </div>

  <div class="seclabel">The change under review</div>
  <details class="diffbar">
    <summary>Read the full diff (${diffStats.files} files, +${diffStats.adds} \u2212${diffStats.dels})</summary>
    <div class="diffbody"><pre>${diffPre(report.diff)}</pre></div>
  </details>
  <div class="diffbar" style="margin: 10px 0 26px">
${diffStats.perFile
    .map(
      (f) =>
        `    <span class="filechip">${escapeHtml(f.name)}<span class="adds">+${f.adds}</span><span class="dels">\u2212${f.dels}</span></span>`,
    )
    .join("\n")}
  </div>

  <div class="stats" role="group" aria-label="Run facts">
    <div class="stat"><div class="l">Claims checked</div><div class="n">${counts.total}</div><div class="u">3 verdict classes</div></div>
    <div class="stat"><div class="l">Evidence actions</div><div class="n">${evidenceActions}</div><div class="u">reads · searches · test runs</div></div>
    <div class="stat"><div class="l">Wall time</div><div class="n">${(report.durationMs / 1000).toFixed(1)}<span style="font-size: 20px">s</span></div><div class="u">end to end</div></div>
    <div class="stat"><div class="l">Model cost</div><div class="n">$${report.usage.costUsd.toFixed(5)}</div><div class="u">${report.usage.calls} model calls</div></div>
  </div>

  <div class="dist" role="img" aria-label="${counts.VERIFIED} verified, ${counts.REFUTED} refuted, ${counts.UNVERIFIABLE} unverifiable">
    <div class="seg ok" style="width: ${pct(counts.VERIFIED, counts.total)}%" title="${counts.VERIFIED} verified"></div>
    <div class="seg bad" style="width: ${pct(counts.REFUTED, counts.total)}%" title="${counts.REFUTED} refuted"></div>
    <div class="seg warn" style="width: ${pct(counts.UNVERIFIABLE, counts.total)}%" title="${counts.UNVERIFIABLE} unverifiable"></div>
  </div>

  <div class="seclabel">All claims</div>
  <main class="cards">
${claimsBody}
  </main>

  <section class="ledger" aria-labelledby="ledger-h">
    <div class="seclabel" id="ledger-h" style="margin: 0 0 12px">Claim ledger</div>
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

function card(c: ClaimResult, index: number): string {
  const v = VERDICT[c.verdict] ?? VERDICT.UNVERIFIABLE;
  const num = String(index + 1).padStart(2, "0");
  const ok = c.evidence.filter((e) => e.ok).length;
  const trail = c.evidence.length
    ? `      <details class="trail">
        <summary><span class="chev">\u25b8</span>Full evidence trail <b>${c.evidence.length} action${c.evidence.length === 1 ? "" : "s"}</b> · ${ok} succeeded</summary>
        <div class="trail-body">
${c.evidence.map(evBlock).join("\n")}
        </div>
      </details>`
    : `      <p class="ev-none">No evidence actions were run for this claim, so the verdict above rests on the citation alone.</p>`;
  return `    <article class="card ${c.verdict}" id="${escapeHtml(c.id)}">
      <div class="card-head">
        <span class="cid">${num} · ${escapeHtml(c.id)}</span>
        <span class="verdict" style="color: ${v.text}; background: ${v.soft}"><span class="dot" style="background: ${v.dot}"></span>${c.verdict}</span>
        <span class="claim">${escapeHtml(c.text)}</span>
      </div>
      <div class="lbl">Evidence</div>
      <code class="path">${emphasize(escapeHtml(c.citation))}</code>
      <p class="rationale">${escapeHtml(c.rationale)}</p>
      ${c.verdict === "UNVERIFIABLE" && c.settlesWith ? `<p class="settle"><span class="settle-l">would be settled by</span> ${escapeHtml(c.settlesWith)}</p>` : ""}
${trail}
    </article>`;
}

function evBlock(e: EvidenceItem): string {
  const action = describeAction(e.action);
  const state = e.ok ? `<span class="state-ok">ok</span>` : `<span class="state-fail">failed</span>`;
  return `          <div class="ev">
            <div class="ev-head"><span class="act">${escapeHtml(action)}</span><span>${state}</span><span>${e.durationMs}ms</span></div>
            <pre>${escapeHtml(e.output.trim() || "(empty output)")}</pre>
          </div>`;
}

function describeAction(a: EvidenceAction): string {
  switch (a.action) {
    case "read_file": return `read_file ${a.path}`;
    case "search": return `search ${JSON.stringify(a.pattern)}`;
    case "run_tests": return a.filter ? `run_tests ${a.filter}` : "run_tests";
    case "list_tests": return "list_tests";
    case "git_log": return "git_log";
    case "git_diff": return "git_diff";
    case "run_script": return `run_script ${a.script}`;
    default: return String((a as EvidenceAction).action);
  }
}

function countVerdicts(claims: ClaimResult[]): Record<Verdict | "total", number> {
  const out = { VERIFIED: 0, REFUTED: 0, UNVERIFIABLE: 0, total: claims.length };
  for (const c of claims) out[c.verdict] += 1;
  return out;
}

function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

function runId(report: RunReport): string {
  let h = 5381;
  const s = report.startedAt + report.model;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).slice(0, 5).toUpperCase().padStart(5, "0");
}

function diffStatsOf(diff: string): { files: number; adds: number; dels: number; perFile: Array<{ name: string; adds: number; dels: number }> } {
  const perFile: Array<{ name: string; adds: number; dels: number }> = [];
  let current: { name: string; adds: number; dels: number } | null = null;
  let adds = 0;
  let dels = 0;
  for (const line of diff.split("\n")) {
    const m = line.match(/^diff --git a\/(\S+) b\//);
    if (m) {
      current = { name: m[1], adds: 0, dels: 0 };
      perFile.push(current);
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) { adds += 1; if (current) current.adds += 1; }
    else if (line.startsWith("-") && !line.startsWith("---")) { dels += 1; if (current) current.dels += 1; }
  }
  return { files: perFile.length, adds, dels, perFile };
}

function diffPre(diff: string): string {
  const max = 220;
  const lines = diff.split("\n");
  const shown = lines.length <= max ? lines : lines.slice(0, max);
  const body = shown
    .map((l) => {
      const e = escapeHtml(l);
      if (l.startsWith("+") && !l.startsWith("+++")) return `<span class="add">${e}</span>`;
      if (l.startsWith("-") && !l.startsWith("---")) return `<span class="del">${e}</span>`;
      if (l.startsWith("@@")) return `<span class="hunk">${e}</span>`;
      return e;
    })
    .join("\n");
  return lines.length <= max ? body : body + `\n... ${lines.length - max} more lines (full diff in the repository)`;
}

function emphasize(citation: string): string {
  return citation.replace(/&quot;([^&]+)&quot;/g, '&quot;<b>$1</b>');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
