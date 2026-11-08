# FlatMatch — "Tinder for Flatmates" (working title)

Started: Sun Nov 8, 2026, at Akanksha's direction.
Spark: Instagram reel by Utkarsh (@uvichar_, 746K followers) — "PLEASE, someone build
this in India!" Pitch: flatmate matching by lifestyle compatibility, not random
Facebook groups. Reel stats at capture: ~18.8K likes, 221 comments.

## What he asked for (from the reel)
- Profiles: budget (₹15–20K), location (e.g. Koramangala), sleep schedule,
  cleaning habits, smoking, pets
- Compatibility score (his example: 94%) from lifestyle answers
- Chat in-app, ID verification, meet before moving in
- Core insight: a lease locks you in ~11 months; people research a phone for
  3 months but pick a flatmate after one WhatsApp call

## Our scope (updated Nov 8, her direction: GLOBAL, production-level
company quality, no POC; she owns the CPT call — exit framed as acquisition)
- Global product: multi-city, multi-currency (₹, $, £, €, C$, A$, AED, S$).
  Wedge = people who just landed somewhere new (students, immigrants,
  relocators) — density city by city, waitlist captures demand per city.
- The compatibility score is the product: weighted engine, deal-breaker
  hard filters, "why you match" breakdown on every card.
- Trust & safety is core: ID verification flow, meet-first guidance,
  in-app chat before any contact exchange.
- Brand: **Nostos** — DECIDED Nov 8, 2026 on her delegation ("U decide").
  Tagline: "Find your people. Come home." AmigoNest was the runner-up.
  Name lives in ONE config value (app.js CONFIG) + <title>. NOTHING
  public beyond the portfolio demo until formal clearance
  (USPTO/EUIPO/India IPO + .com + handles). See NAME-DEEP-DIVE.md.
- Brand system: ink #23203B · coral #FF6B4A · gold #F2B134 · cream
  #FFF8F1 · display type Fraunces, body Inter.
- Build: static multi-file app (index.html / styles.css / app.js) in this
  folder → GitHub repo `nostos` → live at
  sharmauncw.github.io/nostos. Sample profiles are illustrative; the
  front-end is production-grade (real engine, real flows).

## Files
- index.html — demo v1 (single file, runs anywhere)
