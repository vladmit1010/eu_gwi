# The Million Engine

Mastercard × Erste acquisition deck.

## Develop

```bash
cd million-engine
npm install
npm start
```

→ http://127.0.0.1:8766/

## Layout

```
index.html                 UI shell
css/deck-app.css           styles
js/deck/                   app modules (see js/deck/README.md)
js/excel-drop-standalone.js
js/vendor/xlsx.full.min.js
data/client/               offerings.json + Excel structure docs
data/geo/                  map geometries
scripts/serve.mjs
scripts/build-standalone.mjs
scripts/check_offerings.py
Million-Engine.html        single-file build (npm run build-standalone)
```

## Client data

See **`data/client/README.md`** — Excel sheet layout and formula logic live there.  
Do **not** ship `masterexcel.xlsx` or `formeln.txt` (gitignored local samples).

Ship / edit: `data/client/offerings.json`.

## Build for sharing

```bash
npm run build-standalone
```

Creates `Million-Engine.html` (one file, no server). Gitignored — regenerate when needed.

## Local smoke (optional)

`tests/` is gitignored. With the server running: `npm test`.
