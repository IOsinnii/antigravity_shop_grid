# PLAN.md — antigravity_shop_grid

The merged prototype: web-dev-antigravity's engine + library_shop_grid's product
surface, with the redundancies of both removed. Intended as the successor that can
eventually replace the two parents.

## Merge rationale (2026-07-12)

The two parents had complementary strengths and non-overlapping weaknesses:

| | antigravity (kept) | shop_grid (kept) |
|---|---|---|
| Engine | themes ×4, fonts, table/grid views, search/sort/filter, full localStorage persistence, keyboard-accessible sidebar, category counts | — |
| Data | cleaned 194-record `lectures_full_metadata.json` (canonical), `data.js` mirror for zero-fetch startup | lecture texts (`lecture_192/220/221.json`, `lecture_219.md`) — the only unique content in the family |
| Pages | — | per-lecture video page, full-text page, teacher / middle-path / meditation-centers info pages |

What was deliberately **not** carried over:
- shop_grid's dual static/JSON code paths and `enrichStaticContent()` keyword-guessing —
  the engine renders exclusively from data.
- The legacy 221-record `lectures.json` (incompatible id ordering), `texts.json`,
  `.backup` files, `pages/old/` — already purged from shop_grid itself.
- The four-guess fetch path loops — subpages read metadata from the `data.js` global
  (no fetch at all); only lecture texts are fetched, with a graceful banner fallback.
- Font Awesome on subpages, emoji icons, the 15px white sidebar frame, fixed-size
  card images.

Gaps patched during the merge (present in neither parent):
- **"Читать" appears only where a text exists.** shop_grid showed a text button on all
  194 cards; 191 of them led to an "unavailable" banner. A tiny manifest
  (`assets/js/texts-index.js`) lists the orders that have texts, so the catalog and the
  video page can link honestly. One line to update per new text.
- **"Смотреть" keeps the user in the library** (internal video page with embedded
  player + metadata + link to the text) instead of bouncing to YouTube; the external
  YouTube link is still offered on the video page.
- **Subpages inherit the theme.** `page.js` applies the theme/font persisted by the
  main page (or the OS preference on first visit), so navigation no longer flashes
  from Обсидиан to a white page.
- **Lecture text rendering is injection-safe**: paragraphs are built with
  `textContent`, not `innerHTML`.

## Architecture

```
index.html               catalog SPA (antigravity engine, unmodified except actions)
pages/video.html         embedded player + metadata     (?id=<order>)
pages/lecture.html       full text, JSON→md fallback    (?id=<order>)
pages/{teacher,middle-path,meditation-centers}.html     static info pages
assets/js/data.js        generated from data/*.json — the JSON is canonical
assets/js/texts-index.js manifest of orders that have a full text
assets/js/page.js        subpage bootstrap: theme + video/lecture loaders
data/lectures_full_metadata.json, categories.json       canonical database
data/texts/lecture_<order>.{json,md}                    full lecture texts
```

Known tradeoffs, accepted deliberately:
- Subpages load the ~500KB `data.js` to find one record. It is cached after the first
  catalog visit and keeps subpages working over `file://`; revisit if the dataset grows
  ~5×, then switch subpages to a fetch of the canonical JSON.
- `lecture_219.md` has no metadata record (no order 219 in the database) — kept as the
  only copy of that text; it lights up automatically once a 219 record is added.
- Content pages are placeholders, as in both parents.

## Change log

### 2026-07-12 — Phase 0: reading comfort (themes, font size, reading typography)
`assets/css/style.css`, `index.html`, `assets/js/app.js`, `assets/js/page.js`,
`pages/lecture.html`:
- Two new themes designed for the older part of the audience: **Графит** (warm dark
  gray `#1e2126` / off-white `#d3d7de` — capped contrast avoids the halation that makes
  pure white-on-black Obsidian hard on astigmatic/older eyes) and **Бумага** (cream
  `#f5f1e8` / warm ink `#2e2a24`, sepia accent — the "printed book" register).
  Obsidian remains available as an explicit choice; the system-dark default is now
  Graphite (main page and subpages agree).
- **Font size control (А− / А / А+)** in the header: 4 steps (90/100/115/130%) applied
  to the root font size so every rem-based size scales together; persisted as
  `fontScale` in localStorage, validated on restore, applied on subpages via page.js;
  stepper buttons disable at the ends of the range.
- **Reading typography** for lecture texts: PT Serif (full Cyrillic; loaded only on
  lecture.html), 1.125rem, line-height 1.75, measure capped at 70ch and centered.
  UI stays sans — only long-form text switches register.
- **Print stylesheet**: lecture pages print like a book chapter (chrome hidden,
  black-on-white forced over any theme, 12pt serif) — this audience prints.
Verified over HTTP: Paper theme + 130% on catalog and lecture page, controls persist,
А+ disables at max, zero console errors.

### 2026-07-12 — Import antigravity engine as merge base
`index.html`, `assets/{css,js}`, `data/`, `images/`, `.gitignore` copied verbatim from
web-dev-antigravity at its post-cleanup state (cleaned database, deferred scripts,
targeted transitions, persistence, a11y). Starting from the stronger engine and adding
pages onto it is strictly less work than untangling shop_grid's dual render paths.

### 2026-07-12 — Add video/text/info pages, wire them into the catalog
- `pages/video.html` + `pages/lecture.html` rebuilt on the antigravity shell and theme
  variables; logic lives in shared `assets/js/page.js` (`data-page` attribute selects
  the loader). Metadata comes from the `data.js` global — zero fetch; lecture texts are
  fetched from `data/texts/` (JSON first, markdown fallback, banner if absent).
- Catalog actions: table rows and grid cards link to the internal video page; a
  "Читать" link renders only for orders in `texts-index.js`.
- Info pages (teacher / middle-path / meditation-centers) ported onto the same shell;
  sidebar got a "Страницы" block linking to them.
- Styles: one appended CSS section (`page-*`, `btn-action`, sidebar links, action
  columns) reusing the existing theme variables, so all four themes cover the new
  pages with no extra palette work.
Verified over HTTP: catalog renders 194 records with correct dual actions; video page
embeds and falls back; text page renders №192/220/221 and shows the banner for others;
zero console errors.

### 2026-07-12 — Leftover quick wins from PLAN_NEXT_PHASES.md
- Mobile: header controls join the flow under the logo at ≤768px (they floated over
  the banner title and catalog content on narrow screens).
- `page.js` distinguishes "database failed to load" from "record not found" so the
  error message is actionable.
- Графит/Бумага themes + graphite-as-dark-default backported to web-dev-antigravity
  (committed there separately).
