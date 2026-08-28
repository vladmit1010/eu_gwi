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
data/client/               ← client-editable (Excel + offerings)
data/geo/                  map geometries
formeln.txt                Excel formula reference
scripts/serve.mjs
scripts/build-standalone.mjs
scripts/check_offerings.py
Million-Engine.html        single-file build (npm run build-standalone)
```

## Client data

Edit `data/client/` — see `data/client/README.md`.

## Build for sharing

```bash
npm run build-standalone
```

Creates `Million-Engine.html` (one file, no server). Gitignored — regenerate when needed.

## Local smoke (optional)

`tests/` is gitignored. With the server running: `npm test`.
