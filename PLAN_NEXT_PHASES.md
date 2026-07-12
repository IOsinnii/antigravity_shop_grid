# PLAN_NEXT_PHASES.md — implementation plan for Phases 1–4

Audience: an implementing LLM agent (or a developer) continuing this project.
Written to be executable without access to the conversation that produced it.
Work through phases in order; each phase is shippable on its own.

## Progress (updated 2026-07-12, end of session)

- **Phase 0 — DONE**: themes (Графит/Бумага), font-size control, PT Serif reading
  typography, print styles. Backported to web-dev-antigravity.
- **Leftover quick wins — DONE**: mobile header controls, error message split,
  theme backport.
- **Phase 1 — MOSTLY DONE**: pipeline scripts 5–7 written and proven; site shows
  two-tier texts (curated / auto with draft banner). Auto transcripts fetched for
  part of the catalog; a full-catalog fetch may still be running or partial —
  check `../python-json-transformation/output/transcripts_report.json`, rerun
  script 5 until the report has no `error` statuses (it retries those), then
  scripts 6 + 7, verify one page, commit `data/texts/` + `texts-index.js`.
  Fetching needs yt-dlp compatible with the machine's Python (see script 5 note).
- **Phase 2 — SITE SIDE DONE, DATA BLOCKED**: audio card renders when `audio_url`
  exists; scripts 8 (extract+loudnorm) and 9 (podcast RSS) written, py_compile
  checked. Blocked on human: original videos + R2 bucket (decision points below).
- **Phase 3 — SKELETON DONE**: Eleventy installed (`npm install`), 194 crawlable
  pages build to `_site/lectures/<order>/` with OG + JSON-LD (`npx @11ty/eleventy`).
  Remaining: pick the deployment target for `_site` output (decision point 4),
  point catalog action links at `/lectures/<order>/`, add `?id=` redirect shims,
  then rerun script 10 with `PRETTY_URLS = True`. Node was installed as a
  standalone tarball in the session scratchpad — a permanent machine needs
  `brew install node` (or nvm) first.
- **Phase 4 — PARTIAL**: WCAG contrast audit done, two accent colors fixed
  (see PLAN.md). Site-level OpenGraph tags added to index.html; per-lecture OG +
  JSON-LD ship with the Phase 3 pages. Script 10 (sitemap+robots) written, blocked
  on the public SITE_URL. Pagefind now unblocked: run it over `_site` after the
  Eleventy build.

## Context you must load first

- Read `PLAN.md` (this repo) — merge rationale, architecture, accepted tradeoffs.
- Read `../web_lib_tutorial/SKILL.md` — the working conventions for this family of
  repos. The non-negotiables repeated here:
  - One improvement per commit; append a dated entry to `PLAN.md` (files touched +
    **why**) in the same commit. Imperative commit messages. **Local git only, never push.**
  - Verify over HTTP before committing: `python3 -m http.server 8901` from the
    parent folder (`libsb_webdev/`), open `http://127.0.0.1:8901/antigravity_shop_grid/`,
    check the browser console for errors. `file://` and HTTP behave differently
    (lecture texts are fetched); test the mode your change affects.
  - `data/lectures_full_metadata.json` is canonical; `assets/js/data.js` is generated
    from it (`const categories = <json>;\n\nconst lectures = <json>;`). Regenerate the
    JS after ANY data change — never hand-edit `data.js`.
  - UI text in Russian, code comments in English, vanilla JS idiom of this repo
    (top-level functions + `appState`), CSS through the theme variables only.
- The user's Python pipeline lives in `../python-json-transformation/` (Apify YouTube
  export → cleaned catalog JSON; pandas; numbered scripts `1_`, `2_`, `3a_`…). New
  pipeline steps belong there, continuing the numbering convention (`5_`, `6_`…),
  each with a module docstring explaining inputs/outputs. Its input JSON has fields:
  `duration, url, order, id (YouTube video id), date, text (description), title,
  thumbnailUrl`.

## Leftover small tasks (do first, quick wins)

1. **Header controls overlap content on narrow screens.** `.header-controls` is
   `position: absolute` inside `.app-header`; at ≤768px the three control groups
   (Тема/Шрифт/Размер) can cover the banner text and, when the page is scrolled,
   look detached. Fix inside the existing `@media (max-width: 768px)` block: make
   `.header-controls` static (in-flow, `flex-direction: row; flex-wrap: wrap`) below
   the logo. Verify at 375px and 768px widths.
2. **`console.error` on missing `?id=`** — `page.js` `pageShowError` is silent in
   console; fine. But `getLectureFromQuery` returns null also when `data.js` failed
   to load; distinguish the two messages (record not found vs data not loaded).
3. Optional courtesy: port the Графит/Бумага theme definitions back to
   `../web-dev-antigravity/assets/css/style.css` (палитры identical; that repo's
   `THEME_COLORS` in `app.js` and swatch CSS must be extended the same way as here —
   see Phase 0 commit `496bef1` as the reference diff).

## Phase 1 — Transcript pipeline (auto-subtitles as placeholder texts)

Goal: every lecture page shows *some* text — curated where it exists, otherwise the
YouTube auto-transcript under a clearly visible banner, otherwise the current
"text pending" card.

### 1a. Fetch transcripts (new pipeline step, run by the human once)

Create `../python-json-transformation/python-scripts/5_fetch_transcripts.py`:

- Input: `data/lectures_full_metadata.json` (this repo) — iterate `download_url`,
  extract the YouTube video id (regex on `watch?v=` / `youtu.be/`).
- Fetch Russian auto-subtitles per video. Two options, in order of preference:
  1. `yt-dlp --write-auto-subs --sub-langs ru --skip-download --output "subs/%(id)s"`
     (add `yt-dlp` to `requirements.txt`; run in batches of ~20 with a few seconds'
     sleep between videos to be polite).
  2. If yt-dlp is blocked: YouTube Data API `captions.list` + `captions.download`
     with the channel owner's OAuth (the user owns the channel — ask them to run the
     auth flow; do not attempt OAuth yourself).
- Output per lecture: `subs/<video_id>.ru.vtt`. Expect some videos to have no
  captions at all — record them in a `transcripts_report.json` (order, video_id,
  status: ok | no_captions | error) so the human sees coverage.

### 1b. VTT → paragraphed placeholder text

Create `6_vtt_to_text.py`:

- Parse VTT cues (strip timestamps, positioning tags, and the rolling-duplicate
  lines YouTube VTTs contain — consecutive cues often repeat the previous line;
  deduplicate by comparing against the tail of the accumulated text).
- Russian auto-captions have **no punctuation**. Minimum viable paragraphing:
  start a new paragraph when the gap between cues exceeds ~2.5 seconds; join cues
  inside a paragraph with spaces. Do NOT attempt punctuation restoration in this
  phase — ship the honest raw transcript; punctuation is a possible later pass and
  needs the user's sign-off (cost/quality decision).
- Output: `data/texts/transcript_<order>.json` in this repo, schema:

```json
{
  "order": 105,
  "title": "…",
  "source": "youtube-auto",
  "fetched": "2026-07-12",
  "text": "…\n\n…"
}
```

  Note the filename prefix `transcript_` — curated texts keep `lecture_<order>.json`.
  Both schemas share the `text` field.

### 1c. Wire into the site

- Regenerate `assets/js/texts-index.js` — make script `7_generate_texts_index.py`
  scan `data/texts/` and emit BOTH lists:

```js
const lectureTextOrders = [192, 219, 220, 221];        // curated
const lectureTranscriptOrders = [3, 5, 8, /* … */];    // auto placeholders
```

- `page.js` `loadLectureText(order)`: try `lecture_<order>.json` (curated), then
  `transcript_<order>.json`; return `{text, kind: 'curated'|'auto'}`. When
  `kind === 'auto'`, show a banner ABOVE the text (new element, reuse
  `.text-unavailable` styling): «Автоматическая расшифровка видео. Отредактированный
  текст готовится — в расшифровке возможны ошибки распознавания.»
- Catalog (`app.js`): "Читать" renders when the order is in either list; append
  ` (черновик)` to the link title attribute for transcript-only lectures. Keep the
  visible label plain «Читать» — don't clutter the card.
- Acceptance: a lecture with only a transcript shows banner + text; №192/220/221
  still show curated text without a banner; a lecture with neither still shows the
  "text pending" card; console clean; PLAN.md entry written.

## Phase 2 — Audio formats + podcast feed

Preconditions the human must provide (ASK, do not improvise):
- The original video files (or confirmation to extract audio from YouTube copies
  of their own content as a stopgap).
- A Cloudflare R2 bucket (or S3-compatible equivalent) + credentials, and the
  public base URL. R2 chosen for zero egress fees; ~194 lectures ≈ 6–9 GB at
  64–96 kbps mono.

### 2a. Extraction (script `8_extract_audio.py` or a documented shell script)

Per lecture: `ffmpeg -i <original> -vn -ac 1 -c:a libmp3lame -q:a 6 <order>.mp3`
plus loudness normalization `-af loudnorm=I=-19:TP=-1.5:LRA=11` (recordings span
1995–2025; levels vary wildly). MP3 not Opus: podcast-app compatibility. Record
`{order, filename, bytes, duration_sec}` into `data/audio-manifest.json`.

### 2b. Site integration

- Schema: add to each record in `lectures_full_metadata.json` (and regenerate
  `data.js`): `"audio_url": "https://<r2-public>/<order>.mp3"` (null when absent).
- Video page: add an «Аудио» card — native `<audio controls preload="none" src=…>`
  styled with theme variables, plus a download link («Скачать MP3, 34 МБ»).
- Catalog: nothing changes (avoid a third button; audio lives on the lecture's page).

### 2c. Podcast RSS (script `9_generate_feed.py`)

Generate `feed.xml` into this repo's root: RSS 2.0 + iTunes namespace; channel
metadata (title «Сергей Бугаев — Библиотека лекций», language `ru`, image = logo);
one `<item>` per lecture with audio: `title`, `pubDate` from `date_standard`,
`enclosure url/length/type="audio/mpeg"`, `guid` = audio URL, `itunes:duration`,
description = first 2–3 sentences of the cleaned description. Sort newest first.
Validate with https://validator.w3.org/feed/ (paste, or curl the check). Link the
feed in the sidebar («Подкаст» with the RSS icon) and via
`<link rel="alternate" type="application/rss+xml">` in `index.html`.

## Phase 3 — Static site generation (Eleventy)

Goal: one REAL pre-rendered HTML page per lecture (`/lectures/221/`) for SEO and
shareability, while the catalog keeps its current client-side interactivity.

- `npm init -y && npm i @11ty/eleventy` (first npm dependency in the family — add
  `node_modules/` to `.gitignore`; commit `package-lock.json`).
- Data cascade: symlink/copy `data/lectures_full_metadata.json` +
  `data/categories.json` into `_data/`; lectures become a paginated template
  (`pagination: data: lectures, size: 1`) with
  `permalink: "lectures/{{ lecture.order }}/index.html"`.
- Templates: convert `pages/video.html` + `pages/lecture.html` into ONE
  `lecture.njk` layout (tabs Видео | Аудио | Текст — the format switcher; state in
  the URL hash). The existing `page.js` loaders mostly disappear — data is baked in
  at build; keep only the appearance bootstrap and the audio/text lazy loads.
- The catalog `index.html` stays as-is (copy through as a passthrough + change
  action links to `/lectures/<order>/`).
- Keep `?id=` URLs working: emit a tiny redirect page at `pages/lecture.html` and
  `pages/video.html` that reads `?id=` and `location.replace`s to the new URL.
- OpenGraph per lecture page: `og:title`, `og:description` (first sentences),
  `og:image` = thumbnail_url, `og:type video.other`, plus
  `schema.org/VideoObject` JSON-LD (name, description, thumbnailUrl, uploadDate,
  duration in ISO 8601, embedUrl).
- GitHub Pages deploy: build output to `docs/` or a `gh-pages` action — ASK the
  user which they prefer before wiring CI; do not enable any workflow silently.
- Acceptance: `npx @11ty/eleventy --serve` renders 194 lecture pages; catalog
  unchanged; old `?id=` links redirect; Lighthouse SEO score ≥ 95 on a lecture page.

## Phase 4 — Search & final polish

- **Pagefind** after the 11ty build (`npx pagefind --site _site`): full-text search
  across lecture pages INCLUDING transcripts — this is the payoff of Phase 1; add a
  search page wired to Pagefind's UI bundle, styled with theme variables.
- `sitemap.xml` (11ty plugin or a 20-line template) + `robots.txt`.
- Fluid type scale with `clamp()` across templates; audit all six themes with a
  contrast checker (target AA 4.5:1 for body text; Paper/Graphite were designed to
  it — verify the four older themes and adjust `--text-secondary` where they fail).
- Optional (ask first): analytics — if wanted, use a cookieless counter
  (e.g. GoatCounter), never Google Analytics on a site for this audience.

## Standing decision points for the human (never decide silently)

1. R2/S3 account, bucket name, public domain for audio (Phase 2).
2. OAuth for the captions API if yt-dlp fails (Phase 1).
3. Punctuation-restoration pass over transcripts: yes/no + budget (post-Phase 1).
4. GitHub Pages deployment mechanism for the 11ty build (Phase 3).
5. Self-hosted video (Bunny/Cloudflare Stream) — only if the user raises YouTube
   dependence again; store decision in PLAN.md.
