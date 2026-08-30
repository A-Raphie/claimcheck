# Demo video skeleton (demo-script shape)

Time limit: 5:00 max (challenge spec). Target cut: 2:45. Judging weights map to the
official rubric: Engineering 30, End-to-End 20, Problem 15, Improvement 15,
Reproducibility 15, Hot Take 5. One-message rule: "Claimcheck turns an agent's
confident claims into verdicts with receipts."

Every number on screen must trace to `eval-results/` (real-data rule). The mock run is
labeled as the mock; scored runs replace it once the key lands.

## Scenes

| # | Beat | Show | Criterion | Notes |
|---|---|---|---|---|
| 1 | Hook (0:00-0:10) | Landing hero: "Your coding agent says it works. Claimcheck asks for the evidence." + stat cards | Problem 15 | Danger-first opener, no product-name-first line |
| 2 | Input beat (0:10-0:40) | try.html: type claims live, hit Plan the evidence, classifications render (test-status, performance, subjective) | Engineering 30 | THE input-output moment; narrate present tense |
| 3 | Scored run (0:40-1:20) | Terminal: `run-all-evals.sh` on a corpus case; verdict lines printing per case | Engineering 30 + Measured Improvement 15 | Real model run, real numbers |
| 4 | The report (1:20-2:10) | site/report.html: headline counts, receipt, diff open, verdict-weighted cards, expand an evidence trail (raw TAP output), settle line on the UNVERIFIABLE card | End-to-End 20 | Filters demo: click Refuted, back to All |
| 5 | The benchmark (2:10-2:35) | summary.md of baseline vs agent + holdout case line | Measured Improvement 15 + Reproducibility 15 | Speak the numbers on screen |
| 6 | Self-audit + close (2:35-2:45) | claimcheck run on Claimcheck's own repo; hold on repo + site links | Hot Take 5 | Links on screen 5s |

## Checklist

- [ ] Opens on landing (never cold in app), hook in first 5 seconds
- [ ] Every scene tagged to a criterion, time proportional to weights
- [ ] Real data only; mock labeled as mock
- [ ] Links on screen at close: repo, live site
- [ ] Cursor overlay on clicks; no context-switch flashes
- [ ] Scene 1 question ("says it works: who checks?") answered by scene 4 verdicts
