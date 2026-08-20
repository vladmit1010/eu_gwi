#!/usr/bin/env python3
"""
Build a clean Europe GeoJSON + invent demo market data for every country.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "europe.source.geojson"
OUT_GEO = ROOT / "data" / "europe.geojson"
OUT_RAW = ROOT / "data" / "raw" / "markets.json"
OUT_SAMPLE = ROOT / "data" / "sample.json"
OUT_SAMPLE_JS = ROOT / "js" / "data" / "sample.js"
SOURCE_URL = "https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson"

# Drop microstates / non-European fringe that clutter a board map
EXCLUDE = {
    "AD", "LI", "MC", "SM", "VA", "FO", "IL", "AZ", "AM", "GE",
}

THEMES = [
    {"id": "audiences", "label": "Audiences"},
    {"id": "behaviours", "label": "Behaviours"},
    {"id": "acquisition", "label": "Acquisition"},
    {"id": "propositions", "label": "Propositions"},
    {"id": "channels", "label": "Channels"},
    {"id": "partnerships", "label": "Partnerships"},
]

# Relative "banking opportunity mass" for inventing the 1M split
WEIGHTS = {
    "DE": 14, "GB": 11, "FR": 11, "IT": 9, "ES": 8, "PL": 6, "NL": 5,
    "RO": 4.5, "SE": 3.5, "BE": 3.2, "AT": 3.0, "CZ": 3.0, "PT": 2.6,
    "HU": 2.5, "CH": 2.4, "GR": 2.3, "DK": 2.1, "NO": 2.0, "FI": 1.9,
    "IE": 1.9, "SK": 1.7, "BG": 1.7, "HR": 1.6, "RS": 1.5, "LT": 1.2,
    "SI": 1.1, "LV": 1.1, "EE": 1.0, "LU": 0.9, "UA": 2.8, "TR": 3.2,
    "RU": 2.2, "BY": 0.9, "MD": 0.8, "BA": 0.9, "AL": 0.8, "MK": 0.7,
    "ME": 0.5, "IS": 0.5, "MT": 0.5, "CY": 0.6, "XK": 0.5,
}

NAME_FIX = {
    "CZ": "Czechia",
    "MK": "North Macedonia",
    "MD": "Moldova",
    "GB": "United Kingdom",
    "BA": "Bosnia and Herzegovina",
    "RU": "Russia (European)",
    "VA": "Vatican City",
}

OPP_BANK = {
    "audiences": [
        ("Affluent Digitals", "Premium affinity"),
        ("Urban Climbers", "City growth corridors"),
        ("Family Anchors", "Multi-product households"),
        ("Rising Middle", "Cash-to-card conversion"),
        ("Youth Wave", "First banking relationship"),
        ("SME Owners", "Business + personal bundle"),
        ("Diaspora Links", "Cross-border money"),
        ("Cautious Savers", "Trust-led conversion"),
    ],
    "behaviours": [
        ("Contactless Heavy", None),
        ("Mobile-first Pay", None),
        ("E-commerce Surge", None),
        ("Travel Spenders", None),
        ("Cash Stickiness", None),
        ("Instalment Users", None),
        ("Remittance Heavy", None),
        ("Branch Loyalists", None),
    ],
    "acquisition": [
        ("Payroll Switch", None),
        ("Student Pipeline", None),
        ("Fintech Switchers", None),
        ("Employer Deals", None),
        ("Retail Onboarding", None),
        ("Mortgage Cross-sell", None),
        ("Campus Capture", None),
        ("Merchant Invite", None),
    ],
    "propositions": [
        ("Premium Lifestyle", None),
        ("Everyday Value", None),
        ("Wealth Gateway", None),
        ("Smart Everyday", None),
        ("Travel Companion", None),
        ("Flex Credit", None),
        ("Simple Digitals", None),
        ("Merchant Grow", None),
    ],
    "channels": [
        ("App-first", None),
        ("Advisor-assisted", None),
        ("Retail POS", None),
        ("Super-app", None),
        ("Social Commerce", None),
        ("Branch Hybrid", None),
        ("Partner Kiosks", None),
        ("Agent Network", None),
    ],
    "partnerships": [
        ("Airline Alliances", None),
        ("Retail Coalitions", None),
        ("Telco Bundles", None),
        ("E-commerce Giants", None),
        ("Grocery Chains", None),
        ("Fuel Networks", None),
        ("Transit Operators", None),
        ("Hotel Groups", None),
    ],
}


def simplify_coords(coords, tol=0.035):
    """Douglas-Peucker-ish thinning without shapely."""
    if not coords or not isinstance(coords[0], (list, tuple)):
        return coords
    if isinstance(coords[0][0], (int, float)):
        return _reduce_ring(coords, tol)
    return [simplify_coords(c, tol) for c in coords]


def _reduce_ring(ring, tol):
    if len(ring) <= 8:
        return [[round(x, 3), round(y, 3)] for x, y in ring]
    keep = [True] * len(ring)
    # iterative skip: keep points that bend enough
    stack = [(0, len(ring) - 1)]
    keep[0] = keep[-1] = True
    marked = {0, len(ring) - 1}
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = ring[a]
        bx, by = ring[b]
        max_d, idx = -1, None
        for i in range(a + 1, b):
            px, py = ring[i]
            d = _perp_dist(px, py, ax, ay, bx, by)
            if d > max_d:
                max_d, idx = d, i
        if max_d > tol and idx is not None:
            marked.add(idx)
            stack.append((a, idx))
            stack.append((idx, b))
    out = [[round(ring[i][0], 3), round(ring[i][1], 3)] for i in range(len(ring)) if i in marked]
    if out[0] != out[-1]:
        out.append(out[0][:])
    return out if len(out) >= 4 else [[round(x, 3), round(y, 3)] for x, y in ring]


def _perp_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify_feature(feat):
    geom = feat["geometry"]
    return {
        "type": "Feature",
        "properties": {
            "ISO2": feat["properties"]["ISO2"],
            "NAME": NAME_FIX.get(
                feat["properties"]["ISO2"],
                feat["properties"].get("NAME") or feat["properties"]["ISO2"],
            ),
        },
        "geometry": {
            "type": geom["type"],
            "coordinates": simplify_coords(geom["coordinates"], tol=0.04),
        },
    }


def invent_opportunities(rng: random.Random, code: str) -> dict:
    out = {}
    for theme in THEMES:
        bank = OPP_BANK[theme["id"]]
        picks = rng.sample(bank, k=3)
        shares = [rng.randint(18, 48) for _ in range(3)]
        total = sum(shares)
        shares = [max(12, round(s * 100 / total)) for s in shares]
        shares[-1] = max(10, 100 - sum(shares[:-1]))
        items = []
        for (name, note), share in zip(picks, shares):
            eng = round(rng.uniform(3.2, 9.1), 1)
            age = rng.randint(21, 56)
            item = {"n": name, "s": int(share), "e": eng, "age": age}
            if note and rng.random() > 0.55:
                item["note"] = note
            items.append(item)
        out[theme["id"]] = items
    return out


def invent_markets(features: list) -> dict:
    rng = random.Random(42)
    codes = [f["properties"]["ISO2"] for f in features]
    weights = {c: WEIGHTS.get(c, 1.0) for c in codes}
    wsum = sum(weights.values())
    target = 1_000_000
    # allocate integers that sum exactly to target
    raw = {c: target * (weights[c] / wsum) for c in codes}
    floors = {c: int(v) for c, v in raw.items()}
    rem = target - sum(floors.values())
    frac = sorted(((raw[c] - floors[c], c) for c in codes), reverse=True)
    for i in range(rem):
        floors[frac[i % len(frac)][1]] += 1

    markets = {}
    for f in features:
        code = f["properties"]["ISO2"]
        markets[code] = {
            "name": f["properties"]["NAME"],
            "contribution": floors[code],
            "opportunities": invent_opportunities(rng, code),
        }
    return markets


def ensure_source() -> Path:
    if SRC.exists() and SRC.stat().st_size > 1000:
        return SRC
    tmp = Path("/tmp/europe_try.geojson")
    if tmp.exists():
        return tmp
    import urllib.request

    print(f"Downloading {SOURCE_URL}")
    SRC.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(SOURCE_URL, SRC)
    return SRC


def main():
    src = ensure_source()
    raw_geo = json.loads(src.read_text(encoding="utf-8"))
    features = []
    for f in raw_geo["features"]:
        code = f["properties"].get("ISO2")
        if not code or code in EXCLUDE:
            continue
        features.append(simplify_feature(f))

    features.sort(key=lambda f: f["properties"]["ISO2"])
    geo = {"type": "FeatureCollection", "features": features}
    OUT_GEO.write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    markets = invent_markets(features)
    payload = {
        "meta": {
            "target": 1_000_000,
            "title": "The Million Engine",
            "source": "Demo intelligence · Europe-wide placeholder (invented for prototype)",
        },
        "themes": THEMES,
        "markets": markets,
    }

    OUT_RAW.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    OUT_RAW.write_text(text, encoding="utf-8")
    OUT_SAMPLE.write_text(text, encoding="utf-8")
    OUT_SAMPLE_JS.write_text(
        "/** Auto-generated by python/build_europe.py — do not edit by hand. */\n"
        f"export const SAMPLE_DATA = {json.dumps(payload, indent=2, ensure_ascii=False)};\n",
        encoding="utf-8",
    )

    print(f"Countries: {len(features)}")
    print(f"GeoJSON:  {OUT_GEO.stat().st_size/1024:.0f} KB")
    print(f"Markets:  {len(markets)} · sum contribution {sum(m['contribution'] for m in markets.values()):,}")


if __name__ == "__main__":
    main()
