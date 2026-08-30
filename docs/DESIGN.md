# Design note: report page

## Mirror history, including the failure

First attempt (commit 180a4e3): picked "lazaret" as mirror from `curl`-verified CSS
tokens and built a dark zinc page. REJECTED by Raphie, and the rejection was correct at
a deeper level than contrast ratios: **tokens were verified without ever seeing the
site.** The visual pass then showed lazaret's front door is a LIGHT editorial page
(paper canvas, huge black display type, ember data graphics); the dark tokens live in
its stylesheet but not on the surface that defines its look. "Nothing on winsznx that
looks like what you built" was literally true.

Rule now enforced: **a mirror is verified by seeing it rendered, tokens are the second
step, never the first.** CSS values are not a design.

## Current mirror: metrx /proof (seen Aug 30 2026)

metrx.pages.dev/proof is the same page type as a Claimcheck report: a public proof hub.
Observed grammar, now reproduced:

- warm paper canvas (#f7f1e8), white-warm cards (#fffdf9), hairline borders
- near-black warm ink (#141311), slate body (#4b5563), stone micro-labels (#8a8178)
- uppercase mono eyebrows and section labels (PROOF HUB, ALL ORDERS, CLAIM LEDGER)
- display headline as a sentence ("Read the settlements. No wallet needed.")
- stat cards: uppercase label, big numeral, small mono unit line
- tri-state verdict accents from metrx's own palette: bot #14c79a / clay #9c3b24 /
  amber #d7a04a, always dot + text label, text variants darkened for contrast on white
  (#0b6e50 / #9c3b24 / #8a6420)
- claim-ledger footer: "nothing asserted above the evidence" + re-verify command

## Sacrifices and derivations

- No webfont link: IBM Plex Mono when installed locally, system stacks otherwise,
  because the report must render with zero network requests (shipped claim, tested).
- Headline counts ("2 verified. 2 refuted. 1 undecidable.") are a derivation: metrx's
  headline sentence pattern applied to Claimcheck's verdict data.
- Distribution bar from the dark attempt was dropped; the metrx grammar carries
  magnitude in stat cards, not bars.

## Audit trail

- Visual pass over every inspiration link Aug 30: beautifului (numbered index, live
  demos), beui (big display + CLI block), rareui, transitions.dev (preview-stage card
  grid), shadcn registry, reui (rail + counts + preview cards), ui-skills.com (skill
  catalog), coss.com/ui (Base UI particles), designsystemchecklist.com, lazaret,
  metrx /proof.
- Contrast: verdict text colors darkened from raw metrx accents for 4.5:1 on white
  cards; stone used only on white surfaces.
- Mobile 720px: stats collapse to 2 columns, headline scales to 32px.
- Zero network requests: verified again on this build.
