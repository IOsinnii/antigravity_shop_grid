# Библиотека лекций Сергея Бугаева — merged prototype

Best-of-both merge of the `web-dev-antigravity` and `library_shop_grid` prototypes:
antigravity's catalog engine (themes, views, search/sort/filter, persistence,
accessibility, cleaned 194-record database) plus shop_grid's per-lecture **video** and
**full-text** pages.

## Run

Static site, no build step. Serve the folder over HTTP (lecture texts are fetched):

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

Opening `index.html` over `file://` also works for the catalog and video pages;
only the full-text loading requires HTTP.

## Data

- `data/lectures_full_metadata.json` — canonical database (mirrors the
  web-dev-antigravity reference copy).
- `assets/js/data.js` — generated from the JSON; regenerate after any data change.
- `data/texts/lecture_<order>.json|md` — full lecture texts; register new ones in
  `assets/js/texts-index.js`.

See `PLAN.md` for the merge rationale and the change log.
