# Claimcheck video script (2:40 target, limit 5:00)

Setup: Chrome 1280x800 centered, localhost:8791 serving site/, Terminal with claimcheck
repo, cursor overlay, recorded per desktop-demo method (silent takes, beat audio in join).

One message: "Claimcheck turns an agent's confident claims into verdicts with receipts."

### Scene 1: Hook (0:00-0:10) · Problem (15 pts)
Show: landing hero, headline "Your coding agent says it works. Claimcheck asks for the
evidence." + stat cards (free / ~30min / 53.6%).
Say: "Your coding agent just said: all tests pass, no breaking changes, edge cases
covered. Who checks? Not the CI badge. Not the diff. Claimcheck does: it runs the real
checks and answers with receipts."
Action: slow scroll hero -> stats.

### Scene 2: Input beat (0:10-0:40) · Engineering (30 pts)
Show: try.html, type two claims ("All tests pass after this change." / "The bounded cache
reduces memory usage by 30 percent."), click Plan the evidence.
Say: "Here is the planner's static layer, live. I paste claims, one per line. Run. Each
claim gets a class: this one is test-status, so it gets a suite run. This one is
performance: nothing in the repo can decide it, so it is flagged and told what would
settle it: a committed benchmark."
Action: type, click, hover both result rows.

### Scene 3: Scored run (0:40-1:15) · Engineering + Improvement (30+15)
Show: Terminal. `claimcheck verify` on a corpus repo runs live (~40s, real model, verdict
prints). Then `eval-results/` summary: baseline 87.5% vs agent 90.6%.
Say: "Now the scored half. Claimcheck copies the repo, runs the suite, reads the files,
and the verifier issues verdicts from what actually happened. Across fourteen benchmark
cases: the one-prompt baseline scores 87.5 percent. The agent pipeline scores 90.6,
with both hard cases at 100. When it is wrong, it is wrong in the safe direction: it
hesitates instead of guessing."
Action: run command, show verdict output, open summary.md.

### Scene 4: The report (1:15-2:05) · End-to-End (20 pts)
Show: report.html: headline counts, receipt strip, open the diff, REFUTED card tint, click
an evidence trail (raw test output), settle line on the UNVERIFIABLE card, filter chips.
Say: "Every run produces this report. The change under review, with its real diff. Each
claim weighted by verdict: red means refuted, and here is the receipt: the test run that
failed, exactly as the sandbox printed it. This claim nobody could check, so it says so,
and names the benchmark that would settle it. Filter to just the refuted ones when you
are triaging."
Action: open diff, click trail, scroll settle line, click filter chip.

### Scene 5: Self-audit + close (2:05-2:40) · Hot take (5 pts) + links
Show: claimcheck run on Claimcheck's own repo (5 claims verified with citations), then
the landing page (site only, no GitHub on camera).
Say: "The last claim we checked is our own submission: five claims about Claimcheck,
verified by Claimcheck. Agents will keep telling you things are done. Ask for the
receipts. Repo and live report are on screen."
Action: show self-audit verdicts, then landing with site URL. Hold 5s.
