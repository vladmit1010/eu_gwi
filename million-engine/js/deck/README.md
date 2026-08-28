# `js/deck/` — programmer map

| File | Role |
|------|------|
| `main.js` | Entry: calls `initDeck()` |
| `app.js` | UI flow: splash → map → country → offer, import, chart, history |
| `defaults.js` | Empty country/passion DATA skeleton (zeros) |
| `offerings.js` | Loads `data/client/offerings.json`, filters by country |
| `geo-data.js` | Map geometries for live countries |

Globals expected on `window` (non-module scripts in `index.html`):

- `XLSX` — SheetJS (`js/vendor/xlsx.full.min.js`)
- `parseExcelFileToTags` — `js/excel-drop-standalone.js`

Client-editable inputs live in **`data/client/`**.
