# Claimcheck design language

Evidence-based design system doc (create-design-md shape): what governs the UI, where
every value comes from, and the rules future surfaces must follow. Maintained by hand;
regenerating surfaces without this doc is how drift starts.

## Product register

A proof instrument. The page type is a public proof hub (metrx /proof): calm, warm,
evidence-first. Nothing is asserted above the evidence behind it. Verdicts are
label-paired (dot + text), never color alone; undecidable claims are reported as
undecidable, never guessed.

## Primary mirror

metrx.pages.dev/proof, seen rendered Aug 30 2026 (see ui-see-before-mirror rule in
memory: SEE first, then curl tokens, cross-check both). Secondary reference: lazaret's
light editorial typography.

## Tokens

| Token | Value | Source / why |
|---|---|---|
| --paper | #f7f1e8 | metrx production CSS, its /proof canvas |
| --surface | #fffdf9 | metrx surface, cards |
| --line | rgba(20,19,17,.10) | hairlines; --line-strong .22 for emphasis rails |
| --ink | #141311 | metrx ink |
| --ink-2 | #4b5563 | metrx slate, body text |
| --ink-3 | #6f675e | metrx stone #8a8178 darkened; 5.2:1 on white for small labels |
| --ok / bad / warn | #14c79a / #9c3b24 / #d7a04a | metrx bot/clay/amber; text variants #0b6e50 / #9c3b24 / #8a6420 for 4.5:1 on white |
| --r-card | 16px | metrx radius-card |
| --r-inner | 4px | playbook: nested radii <= outer minus inset, floored at 4 |
| --mono | IBM Plex Mono local, system fallback | metrx font; no webfont link by rule below |

Type: system sans for claims and display (600 weight, -0.02em tracking, text-wrap
balance), mono for labels, evidence paths, and run metadata. Uppercase mono
micro-labels at 10 to 11px, 0.16 to 0.18em tracking are the section voice.

## Rules every surface inherits

1. Zero network requests: no webfonts, no CDN assets, inline SVG favicon. Verified
   mechanically after every change (13-gate script pattern in git history).
2. Playbook computed-detail rules apply in full: tabular-nums on data, 60 to 75ch
   measure, :active feedback, entrances from ~98% scale with ease-out and first-load
   stagger only, prefers-reduced-motion honored, skeletons over spinners, one clear
   action in empty states, spacing over dividers.
3. Verdict semantics are product law: VERIFIED / REFUTED / UNVERIFIABLE, dot + label,
   per-verdict colored evidence rails. A surface that guesses is a bug.
4. Contrast floors: 4.5:1 small text on white; stone-strong, never raw stone, on
   white surfaces.
5. Metadata: title, description, OG tags, theme-color, favicon on every page
   (fixing-metadata pass).

## Authored layer (v5, the de-generic pass)

- The change under review: the report renders the actual diff (file chips with
  +adds/minus-dels, expandable tinted hunks). The product's subject was absent from
  its own report; now it is the first section.
- Verdict-weighted cards: REFUTED tinted clay with 3px rail, VERIFIED calm green rail,
  UNVERIFIABLE dashed amber border (hesitant, matching "cannot decide"). Claims carry
  01/02 numbered indexes.
- Run receipt: mono serial strip (RUN hash from startedAt+model, model, tool calls,
  wall, date). Diagonal-stripe canvas texture behind the hero (beautifului move).
- Decisive-evidence emphasis: quoted fragments inside citations render bold.

## History

- v1 freehand dark: rejected (no skill anatomy).
- v2 lazaret-mirror via curl'd tokens only: rejected (tokens without eyes; both real
  mirrors are light). Full post-mortem led to the see-before-mirror rule.
- v3 metrx /proof grammar, seen and reproduced: current. Hardened through
  fixing-accessibility (label contrast, heading order, focus cleanup, empty state),
  fixing-metadata (favicon, OG, description, theme-color), and playbook rules
  (text-balance, tabular-nums, entrance system, nested radii).
