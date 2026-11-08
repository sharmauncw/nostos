# Nostos

**Find your people. Come home.**

Nostos — Greek for *homecoming* — matches people with roommates by how they actually live — sleep
schedule, cleanliness, guests, smoking, pets, food, work style and budget —
and shows the *reasons* behind every compatibility score. Built for the
people who need it most: anyone landing in a new city with no network and
a lease to sign.

> Name: **Nostos** — chosen Nov 8, 2026 after 60+ candidates were screened
> (see `NAME-DEEP-DIVE.md`). Formal clearance (trademark registers, domain,
> handles) still gates any public launch; the name lives in one config
> value (`CONFIG.BRAND` in `app.js`).

## What it does

- **10-question lifestyle quiz** — one question per screen, city-first with
  local currency budgets (₹, $, £, €, C$, A$, AED, S$ across 10 cities)
- **Weighted compatibility engine** — sleep and cleanliness weigh most;
  food, work, pets and smoking use category-aware similarity, not just
  exact matches
- **Deal-breakers are hard filters** — anyone who clashes never appears,
  and the app tells you how many people were hidden and why
- **"Why you match" on every card** — plus the one difference worth a chat
- **Trust & safety by design** — ID-verified badges, in-app chat,
  video-call and public-meet planning before any move-in talk
- **City waitlist** — demand decides which city opens next

## Run it

Static site — no build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server
```

Live demo: https://sharmauncw.github.io/nostos/

## Files

- `index.html` — app shell and screens (home, quiz, deck, matches, chat, safety)
- `styles.css` — brand system (ink / coral / gold / cream; Fraunces + Inter)
- `app.js` — data, compatibility engine, flows
- `logo.svg` — brand mark
- `BRIEF.md` — product brief and scope
- `NAME-DEEP-DIVE.md` — the naming research (60+ names screened)

Sample profiles are illustrative; no real users or data.
Built by Akanksha Sharma.
