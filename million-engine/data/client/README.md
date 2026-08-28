# Client data

Put editable deck inputs here:

| File | Purpose |
|------|---------|
| `offerings.json` | Mastercard offering bullets per passion (optional country filter) |
| `masterexcel.xlsx` | Excel model to drop on the start screen |
| `../templates/` | CSV templates if you build without Excel |

Passion ids: `RUN`, `F1`, `MUSLN`, `MUSOT`, `GAMMC`, `GAMOT`.

Country codes: `AT`, `PL`, `RO`, `CZ`, `SK`, `HU`, `HR`, `RS`.

Example offering row:
```json
{ "text": "Hot Laps Experience", "countries": ["AT", "PL", "SK"] }
```
Omit `countries` for all markets.
