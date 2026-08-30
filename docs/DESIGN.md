# Design note: report page

## Mirror selection (winsznx-ui Step 0)

Three candidates read from github.com/winsznx, tokens verified from each site's
production CSS on Aug 30 2026:

| Candidate | Routes and role | Verified tokens | Fit |
|---|---|---|---|
| metrx | /proof verdict pages, AI verifier signs PAY/REFUND/SLASH publicly | paper #f7f1e8, surface #fffdf9, ink #141311, bot #14c79a, clay #9c3b24, amber #d7a04a, IBM Plex Mono, card 16px | Tri-state verdict accents built in; warm certificate register |
| conduit | /verify/[id] settlement proof, "SETTLED_FINAL, 18/18" | white cards on #f5f5f5, ink #0a0a0a | Light institutional; least instrument-like |
| lazaret | verdict with evidence path as hero (webpack-cli@7.2.1 -> ... -> debug@4.4.2) | obsidian #09090b, graphite #18181b, zinc ladder to snow #fff, ember #ff5a00, DM Sans + DM Mono, cards 24 to 32px | Same domain as Claimcheck: code verdict plus evidence path |

Choice: mirroring lazaret. Dark instrument with the evidence path as hero matches
Claimcheck's product domain and judged-demo conditions (video, projector).

## Stated sacrifices

- Webfont fidelity: no font links are loaded because the report must render with zero
  network requests (a shipped, testable product claim). DM Sans and DM Mono are used
  when installed locally and degrade to system stacks otherwise.
- The metrx warm-certificate direction was not taken; swapping the :root token block
  is the entire cost of switching mirrors later.

## Derivations

- Verdict colors are derived, not copied: muted green #5ec98c, red #ee6f6f, amber
  #d9a83e on the zinc ladder, each always label-paired (glyph plus text), never color
  alone. Ember stays the brand accent for evidence paths, never a verdict color.
- Raised surface #1f1f23 is graphite one step up; lazaret's iron #3f3f46 is reserved
  for strong borders.

## Audit trail

- Visual audit pass 1: type hierarchy, verdict glyphs, accented facts accepted;
  flagged label contrast (fog on graphite measured about 3.7 to 1, under the 4.5 to 1
  small-text floor). Fixed: labels and claim ids moved to ash. Computed-style check
  now reports rgb(161,161,170) for both.
- Mobile 375px pass: counts reflow, cards full width with reduced padding and radius,
  evidence paths wrap without overflow.
- Network check: zero non-navigation resource entries, confirming the offline claim.
