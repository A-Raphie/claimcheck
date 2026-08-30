// Try page: the planner's static layer, runnable in the browser. Paste claims,
// get a deterministic classification per claim (the same taxonomy the planner
// agent uses), the evidence actions Claimcheck would run, and a ready-to-run
// CLI command with a generated claims file. Zero network, inline vanilla JS.

export function renderTryPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Claimcheck · try the planner</title>
<meta name="description" content="Paste claims about a code change and watch the planner classify each one: claim class, evidence actions it would run, and what would settle it. The static layer runs in your browser.">
<meta name="theme-color" content="#f7f1e8">
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
    --ok: #14c79a;
    --ok-text: #0b6e50;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --r-card: 16px;
    --r-inner: 4px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font: 400 17px/1.55 var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  .shell { max-width: 980px; margin: 0 auto; padding: 0 24px 64px; }
  a { color: var(--ink); }
  a:focus-visible, button:focus-visible, textarea:focus-visible {
    outline: 3px solid #ff5a00; outline-offset: 3px; border-radius: 6px;
  }
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 8px 16px;
    padding: 20px 0; border-bottom: 1px solid var(--line);
  }
  .wordmark { font: 600 16px/1 var(--sans); text-decoration: none; }
  .wordmark .tick { color: var(--ok); }
  nav { display: flex; gap: 22px; font: 400 14px/1 var(--sans); }
  nav a { text-decoration-color: var(--line-strong); text-underline-offset: 3px; }

  .eyebrow {
    font: 500 11px/1 var(--mono); letter-spacing: 0.18em; color: var(--ink-3);
    text-transform: uppercase; margin: 44px 0 14px;
  }
  h1 {
    font: 600 40px/1.15 var(--sans); letter-spacing: -0.02em;
    margin: 0 0 14px; max-width: 24ch; text-wrap: balance;
  }
  .sub { max-width: 62ch; color: var(--ink-2); margin: 0 0 28px; }

  .tool { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-card); padding: 22px 24px; }
  .tool label {
    display: block; font: 500 10px/1 var(--mono); letter-spacing: 0.16em;
    color: var(--ink-3); text-transform: uppercase; margin: 0 0 10px;
  }
  textarea {
    width: 100%; min-height: 120px; resize: vertical;
    font: 400 14px/1.7 var(--mono); color: var(--ink);
    background: var(--paper); border: 1px solid var(--line-strong);
    border-radius: var(--r-inner); padding: 12px 14px;
  }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 16px; }
  .chip {
    font: 400 12px/1 var(--mono); color: var(--ink-2);
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 999px; padding: 6px 12px; cursor: pointer;
    transition: border-color 0.15s ease-out;
  }
  .chip:hover { border-color: var(--line-strong); }
  .chip:active { transform: scale(0.98); }
  .runrow { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .runbtn {
    font: 500 15px/1 var(--sans); background: var(--ink); color: #fff;
    border: none; border-radius: 10px; padding: 12px 22px; cursor: pointer;
    transition: transform 0.15s ease-out;
  }
  .runbtn:active { transform: scale(0.98); }
  .runnote { font: 400 12px/1.5 var(--mono); color: var(--ink-3); }

  .results { margin-top: 22px; display: none; }
  .results.is-visible { display: block; }
  .row {
    border: 1px solid var(--line); border-radius: var(--r-card);
    background: var(--paper); padding: 16px 18px; margin-bottom: 10px;
    animation: rise 0.18s ease-out both;
  }
  .row:nth-child(2) { animation-delay: 0.04s; }
  .row:nth-child(3) { animation-delay: 0.08s; }
  .row:nth-child(n+4) { animation-delay: 0.12s; }
  @keyframes rise {
    from { opacity: 0; transform: translateY(6px) scale(0.985); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) { .row { animation: none; } }
  .row .head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
  .klass {
    font: 500 11px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink); background: rgba(20,199,154,0.14); border-radius: 999px; padding: 4px 10px;
  }
  .klass.warn { color: #8a6420; background: rgba(215,160,74,0.16); }
  .row .claimtext { font-size: 15px; font-weight: 500; }
  .row dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; }
  .row dt {
    font: 500 10px/1.8 var(--mono); letter-spacing: 0.14em; color: var(--ink-3);
    text-transform: uppercase;
  }
  .row dd { margin: 0; font: 400 13px/1.6 var(--mono); color: var(--ink-2); }
  .empty { color: var(--ink-3); font: 400 14px/1.6 var(--mono); padding: 4px 2px 0; }

  .handoff { margin-top: 22px; display: none; }
  .handoff.is-visible { display: block; }
  .handoff .lbl {
    font: 500 10px/1 var(--mono); letter-spacing: 0.16em; color: var(--ink-3);
    text-transform: uppercase; margin: 16px 0 8px;
  }
  .handoff pre {
    margin: 0 0 10px; font: 400 12px/1.7 var(--mono); color: var(--ink-2);
    background: var(--paper); border: 1px solid var(--line);
    border-radius: var(--r-inner); padding: 12px 14px;
    white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto;
  }
  .copyrow { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .copybtn {
    font: 500 12px/1 var(--mono); background: var(--ink); color: #fff;
    border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer;
  }
  .copybtn:active { transform: scale(0.98); }
  .runcli {
    font: 500 13px/1 var(--mono); color: var(--ink);
    background: var(--paper); border: 1px solid var(--line-strong);
    border-radius: 6px; padding: 8px 12px;
  }

  .note {
    margin-top: 26px; font: 400 13px/1.7 var(--mono); color: var(--ink-3);
    border-left: 2px solid var(--line-strong); padding-left: 14px; max-width: 70ch;
  }
  .note a { color: var(--ink-2); }

  footer {
    margin-top: 56px; padding-top: 18px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    font: 400 13px/1.6 var(--mono); color: var(--ink-3);
  }
  footer a { color: var(--ink-2); }

  @media (max-width: 640px) {
    h1 { font-size: 30px; }
    .shell { padding: 0 16px 48px; }
  }
</style>
</head>
<body>
<div class="shell">
  <header class="topbar">
    <a class="wordmark" href="index.html"><span class="tick" aria-hidden="true">\u2713</span> Claimcheck</a>
    <nav aria-label="Site">
      <a href="index.html#how">How it works</a>
      <a href="report.html">Live report</a>
      <a href="index.html#reproduce">Reproduce</a>
    </nav>
  </header>

  <div class="eyebrow">Try the planner</div>
  <h1>Paste the claims. Watch the plan happen.</h1>
  <p class="sub">This is the planner's static layer, running in your browser: it classifies each
  claim, names the evidence actions Claimcheck would run, and says what would settle it.
  No model, no key, no network.</p>

  <section class="tool">
    <label for="claims">Claims, one per line</label>
    <textarea id="claims" spellcheck="false" placeholder="All tests pass after this change.&#10;The bounded cache reduces memory usage by 30 percent.&#10;No new dependencies were added."></textarea>
    <div class="chips" aria-label="Example claims">
      <button class="chip" data-fill="All tests pass after this change.">all tests pass</button>
      <button class="chip" data-fill="The bounded cache reduces memory usage by 30 percent.">2x faster / 30% memory</button>
      <button class="chip" data-fill="No new dependencies were added by this change.">no new deps</button>
      <button class="chip" data-fill="Empty input is covered by the tests.">empty input covered</button>
      <button class="chip" data-fill="This change improves the readability of the parser.">improves readability</button>
    </div>
    <div class="runrow">
      <button class="runbtn" id="run">Plan the evidence</button>
      <span class="runnote">deterministic · runs locally · nothing leaves this page</span>
    </div>
    <div class="results" id="results" aria-live="polite"></div>
    <div class="handoff" id="handoff">
      <div class="lbl">Your claims file</div>
      <pre id="claimsjson"></pre>
      <div class="copyrow">
        <button class="copybtn" id="copyjson">Copy claims.json</button>
        <span class="runcli">claimcheck verify --repo . --claims-file claims.json</span>
        <button class="copybtn" id="copycli">Copy command</button>
      </div>
    </div>
  </section>

  <p class="note">What you just saw is the planner's first half: claim classes and evidence
  plans, chosen deterministically from the same menu the agent uses. The scored half runs via
  CLI: the executor performs those actions in a sandbox copy of your repository, and the
  verifier returns VERIFIED, REFUTED, or UNVERIFIABLE with citations.
  See the <a href="index.html#reproduce">zero-key repro path</a> or the
  <a href="report.html">live report</a>.</p>

  <footer>
    <span>Built for the micro1 Frontier Engineering Challenge 2026 · built with coding agents, disclosed</span>
    <span><a href="report.html">live report</a> · <a href="index.html">about</a></span>
  </footer>
</div>

<script>
  var TAXONOMY = [
    { klass: "test-status", re: /\\ball tests pass\\b|tests (all )?pass|test suite|tests are green|passing/i,
      why: "runs the test suite in a sandbox copy of the repo and reads the pass/fail summary",
      actions: "list_tests, run_tests" },
    { klass: "coverage", re: /\\bcover\\w*\\b|\\bexercis\\w*\\b|edge case|handles? the case/i,
      why: "lists the tests, searches them for the named case, and runs the suite; a claim is covered only if a test actually exercises it",
      actions: "list_tests, search, run_tests" },
    { klass: "dependencies", re: /dependenc|zero dep|new (librar|package)|npm |package\\.json/i,
      why: "reads package.json and searches for new require or import statements",
      actions: "read_file package.json, search imports" },
    { klass: "api-compat", re: /breaking|signature|compatib|public api|\\bexport|callers|removes?\\b/i,
      why: "searches exports and callers, reads the diff, and runs the suite against the change",
      actions: "search exports, git_diff, run_tests" },
    { klass: "performance", re: /faster|slower|twice|\\b\\d+(\\.\\d+)?\\s*(x|%|percent)\\b|performance|memory|throughput|efficient/i,
      why: "searches for a benchmark or measurement; without one the claim cannot be decided",
      actions: "search benchmark, list_files",
      settle: "a committed benchmark on a fixed workload" },
    { klass: "subjective", re: /readab|clean|simple|elegant|maintainab|nicer|better code/i,
      why: "nothing in a repository can settle subjective quality, so it is named UNVERIFIABLE rather than guessed",
      actions: "(none: undecidable from code)",
      settle: "nothing in code; a style guide or a reviewer panel could" },
  ];
  var GENERAL = {
    klass: "general",
    why: "the planner agent chooses 1 to 3 actions from the full menu based on what the claim names",
    actions: "git_diff, search, read_file"
  };

  function classify(text) {
    for (var i = 0; i < TAXONOMY.length; i++) {
      if (TAXONOMY[i].re.test(text)) return TAXONOMY[i];
    }
    return GENERAL;
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var box = document.getElementById("claims");
      box.value = box.value.trim()
        ? box.value.trim() + "\\n" + chip.getAttribute("data-fill")
        : chip.getAttribute("data-fill");
      box.focus();
    });
  });

  document.getElementById("run").addEventListener("click", function () {
    var raw = document.getElementById("claims").value;
    var claims = raw.split("\\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var out = document.getElementById("results");
    var handoff = document.getElementById("handoff");
    out.classList.add("is-visible");
    if (claims.length === 0) {
      out.innerHTML = '<p class="empty">Paste at least one claim, or tap an example above.</p>';
      handoff.classList.remove("is-visible");
      return;
    }
    var rows = claims.map(function (c, i) {
      var k = classify(c);
      return '<div class="row"><div class="head"><span class="cid">C' + (i + 1) + '</span>' +
        '<span class="klass' + (k.klass === "performance" || k.klass === "subjective" ? " warn" : "") + '">' + k.klass + '</span>' +
        '<span class="claimtext">' + esc(c) + '</span></div>' +
        '<dl><dt>verified by</dt><dd>' + esc(k.why) + '</dd>' +
        '<dt>evidence</dt><dd>' + esc(k.actions) + '</dd>' +
        (k.settle ? '<dt>settled by</dt><dd>' + esc(k.settle) + '</dd>' : '') +
        '</dl></div>';
    });
    out.innerHTML = rows.join("");
    var json = JSON.stringify({ claims: claims.map(function (c, i) { return { id: "C" + (i + 1), text: c }; }) }, null, 2);
    document.getElementById("claimsjson").textContent = json;
    handoff.classList.add("is-visible");
  });

  function wireCopy(id, getText) {
    var btn = document.getElementById(id);
    btn.addEventListener("click", function () {
      var text = getText();
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = old; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else { done(); }
    });
  }
  wireCopy("copyjson", function () { return document.getElementById("claimsjson").textContent; });
  wireCopy("copycli", function () { return "claimcheck verify --repo . --claims-file claims.json"; });
</script>
</body>
</html>
`;
}
