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

### 2026-07-12 — Phase 1 (site side): two-tier texts — curated + auto transcripts
`assets/js/{page.js,app.js,texts-index.js}`, `pages/lecture.html`, `assets/css/style.css`:
- `texts-index.js` is now GENERATED (pipeline script 7) and carries two lists:
  curated `lectureTextOrders` and `lectureTranscriptOrders` (auto placeholders).
- Text loading priority: `lecture_<order>.json` (curated) → `transcript_<order>.json`
  (auto) → `lecture_<order>.md` (curated md). Auto texts render under a visible note:
  «Автоматическая расшифровка… отредактированный текст готовится».
- Catalog and video page show «Читать» for either tier; transcript-only links carry a
  "Черновик: автоматическая расшифровка" tooltip.
- Pipeline scripts live in ../python-json-transformation/python-scripts/:
  `5_fetch_transcripts.py` (yt-dlp; plain HTTP is blocked by YouTube's proof-of-origin
  token — verified empirically: timedtext returns empty 200), `6_subs_to_text.py`
  (json3/VTT → pause-based paragraphs, no invented punctuation), `7_generate_texts_index.py`.

### 2026-07-12 — Phase 2 (site side): audio card on the video page
`pages/video.html`, `assets/js/page.js`:
- «Аудиозапись» card with a native <audio controls preload="none"> player and an
  MP3 download link; renders only when the lecture record carries `audio_url`.
  No data change yet — the field appears when pipeline step 8 runs (blocked on the
  original video files and an R2 bucket; see PLAN_NEXT_PHASES.md decision points).
- Pipeline steps 8 (ffmpeg extraction, -19 LUFS loudnorm, manifest, --write-urls
  mode) and 9 (podcast RSS with iTunes tags) written and py_compile-checked in
  ../python-json-transformation/.

### 2026-07-12 — WCAG contrast audit + --accent-text token
`assets/css/style.css` (both here and backported to web-dev-antigravity):
- Audited all 6 themes (WCAG 2.1 relative-luminance math, AA = 4.5:1 body text).
  Text and secondary-text passed everywhere. Two accents failed as link/label color:
  Sage `#84A98C` → 2.42:1 (real failure) and Paper `#8a6d3b` → 4.30:1 (marginal).
  Replaced with same-hue darker values: Sage `#476c52`, Paper `#7a5f33` — both ≥4.5:1
  on every background of their theme.
- Darker accents flip which text is readable ON the accent, so hardcoded `#000`/`#fff`
  on active buttons became wrong per-theme. Introduced a `--accent-text` design token
  (white on light themes' dark accents; near-black on dark themes' light accents) and
  replaced every hardcoded on-accent text color with it. This is the first proper
  design token beyond the palette — the Phase-3 templates should continue the pattern.

### 2026-07-12 — Phase 1 (data): first 9 auto transcripts live
Pipeline proven end to end on lectures 1–12: 9 transcripts fetched (yt-dlp zipapp;
brew was too slow through the sandbox proxy), 1 video genuinely has no captions (№9),
2 transient DNS errors queued for retry. YouTube's Russian ASR now includes
punctuation — better source quality than planned. Full-catalog fetch running in the
background; transcripts land as `data/texts/transcript_<order>.json` + regenerated
manifest. Verified in browser: №1 («Путь воина», 1995) renders 28 paragraphs under
the draft banner.

### 2026-07-12 — Phase 4 (partial): WCAG contrast audit of all six themes
Computed AA ratios for text/secondary/accent against both backgrounds in every theme.
Body and secondary text pass 4.5:1 everywhere (Paper 5.27+, Graphite 5.53+ — by
design). Two accent failures fixed: Sage `#84A98C` → `#476c52` (2.42 → 5.55; also
fixes white-on-accent buttons) and Paper `#8a6d3b` → `#7a5f33` (4.3 → 5.3).
Same fix applied to web-dev-antigravity.
