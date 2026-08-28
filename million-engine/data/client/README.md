# Client data

## What we ship vs local-only

| Path | Ship? | Purpose |
|------|-------|---------|
| `offerings.json` | yes | Mastercard offering bullets per passion |
| `masterexcel.xlsx` | **no** (gitignored) | Local sample Excel for drop-testing |
| `../../formeln.txt` | **no** (gitignored) | Raw Excel formula dump — logic summarized below |

The deck does **not** bundle Excel. At splash the user drops their workbook (`file://` / Start).  
`offerings.json` is loaded by the modular app (and inlined into `Million-Engine.html` on build).

---

## `offerings.json`

Passion ids: `RUN`, `F1`, `MUSLN`, `MUSOT`, `GAMMC`, `GAMOT`.  
Country codes: `AT`, `PL`, `RO`, `CZ`, `SK`, `HU`, `HR`, `RS`.

```json
{ "text": "Hot Laps Experience", "countries": ["AT", "PL", "SK"] }
```

Omit `countries` → all markets.

---

## Excel structure (remember this — do not commit sample xlsx)

**Sheet:** `Acquisition Potential` (name can vary; parser finds the table by headers).

### 1) Market Potential and Growth (main table)

Header row contains: `Countries`, target cards, market share, then `PP1`…`PP10` growth and `PP1 - acquistion…` … acquisition columns.

One data row per market: Austria, Poland, Romania, Czechia, Slovakia, Hungary, Croatia, Serbia → then `Total`.

Deck tags: `{ISO}_TARGET`, `_CARDSHARE`, `_MSHARE`, `_MPOT`, `_MAXACQ`, `_EXPACQ`, and year volumes from acquisition columns.

### 2) Variable / Input

Row like `Acquisition potential` → overall rate (e.g. `0.005` or `1` in scrubbed demos).

### 3) Readiness to issue MC cards

Per country × `PP1`…`PP10`: `Yes` / `No` / `Partially`.

### 4) Potentially acquired cards

Per country × `PP1`…`PP10` + `Total`.  
Deck uses **`Total`** as map / country **10y grand total** (`{ISO}_TOTAL10`).

Logic (from real model): if readiness cell is Yes → take that year’s acquisition; Partially → half; else 0.

### 5) Proposition suitability per country ← “sponsors” / passions on/off

Columns: Running Club | McLaren Mastercard F1 | Music - Live Nation | Music - other | Gaming - MC assets | Gaming - other | **Country Strength**

Values: `Yes` / `No`. Country Strength ≈ count of Yes (when each proposition strength = 1).

Maps to passion ids: `RUN`, `F1`, `MUSLN`, `MUSOT`, `GAMMC`, `GAMOT`.

### 6) Proposition strength (global) + per country

Global weights (usually all `1`). Per country: Yes → `weight / CountryStrength`, else `0`. Row totals to `1`.

### 7) Acquisition Potential: {passion}

Six blocks (Running, McLaren…, Live Nation, Music-other, Gaming-MC, Gaming-other).  
Same shape: Countries × PP1…PP10 + Total.

Values ≈ (potentially acquired PP) × (that country’s passion strength share).  
`No` suitability → zeros for that passion.

Deck tags: `{ISO}_{PASSION}_PP1`…`_PP10`.

### 8) Final check

Per country × PP: Yes if sum of six passion PPs equals potentially acquired PP.

---

## Formula cheat-sheet (instead of shipping `formeln.txt`)

- Year cascade: `S = Expected Acq`, `T = S*(1+PP1 growth)`, … through PP10.
- Potentially acquired: readiness gate on those year volumes.
- Country Strength: sum of proposition strengths for Yes cells.
- Passion share: `strength_i / CountryStrength` if Yes else 0.
- Passion acquisition: `potentially_acquired_PPn * passion_share`.

Parser: `js/excel-drop-standalone.js`.
