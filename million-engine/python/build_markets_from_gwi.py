#!/usr/bin/env python3
"""Build data/markets.json for Erste GWI countries from data/gwi.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GWI = ROOT / "data" / "gwi.json"
OUT = ROOT / "data" / "markets.json"
JS_OUT = ROOT / "js" / "data" / "markets.js"

COUNTRY = {
    "austria": ("AT", "Austria"),
    "croatia": ("HR", "Croatia"),
    "czech republic": ("CZ", "Czechia"),
    "hungary": ("HU", "Hungary"),
    "romania": ("RO", "Romania"),
    "serbia": ("RS", "Serbia"),
}

TARGET = 1_000_000


def iter_answers(country_block: dict):
    """Yield (category, answer, metrics) from nested gwi country node."""
    for category, answers in country_block.items():
        if not isinstance(answers, dict):
            continue
        for answer, metrics in answers.items():
            if isinstance(metrics, dict) and (
                "index" in metrics or "col_pct" in metrics or "universe" in metrics
            ):
                yield category, answer, metrics


def country_pool(gwi: dict, audience: str, country_key: str) -> int:
    universes = sorted(
        (m.get("universe") or 0) for _, _, m in iter_answers(gwi[audience][country_key])
    )
    if not universes:
        return 0
    return universes[int(len(universes) * 0.9)]


def top_opps(gwi: dict, audience: str, country_key: str, n: int = 3) -> list:
    ranked = sorted(
        iter_answers(gwi[audience][country_key]),
        key=lambda t: (t[2].get("index") or 0),
        reverse=True,
    )
    out = []
    for category, answer, m in ranked[:n]:
        col = m.get("col_pct") or 0
        idx = m.get("index") or 0
        out.append(
            {
                "n": answer[:48],
                "s": max(1, min(99, round(col))),
                "e": round(min(10, max(0.5, idx / 10)), 1),
                "note": f"{category} · Index {idx}",
            }
        )
    return out


def main() -> None:
    gwi = json.loads(GWI.read_text(encoding="utf-8"))
    pools = {
        code: country_pool(gwi, "Affluent", ck) for ck, (code, _) in COUNTRY.items()
    }
    total = sum(pools.values()) or 1

    markets = {}
    for ck, (code, name) in COUNTRY.items():
        markets[code] = {
            "name": name,
            "contribution": int(round(TARGET * pools[code] / total)),
            "opportunities": {
                "affluent": top_opps(gwi, "Affluent", ck),
                "genz": top_opps(gwi, "Gen Z", ck),
                "all": top_opps(gwi, "All Internet Users", ck),
            },
        }

    diff = TARGET - sum(m["contribution"] for m in markets.values())
    markets["RO"]["contribution"] += diff

    payload = {
        "meta": {
            "target": TARGET,
            "title": "The Million Engine",
            "source": "GWI Core · Erste markets (AT, HR, CZ, HU, RO, RS)",
        },
        "themes": [
            {"id": "affluent", "label": "Affluent"},
            {"id": "genz", "label": "Gen Z"},
            {"id": "all", "label": "All users"},
        ],
        "markets": markets,
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    JS_OUT.write_text(
        "/** Built from GWI — run: python build_markets_from_gwi.py */\n"
        f"export const SAMPLE_DATA = {json.dumps(payload, indent=2, ensure_ascii=False)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"Wrote {JS_OUT.relative_to(ROOT)}")
    print({c: markets[c]["contribution"] for c in markets})


if __name__ == "__main__":
    main()
