#!/usr/bin/env python3
"""Validate data/client/offerings.json for the deck."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data" / "client" / "offerings.json"

PASSIONS = {"RUN", "F1", "MUSLN", "MUSOT", "GAMMC", "GAMOT"}
COUNTRIES = {"AT", "PL", "RO", "CZ", "SK", "HU", "HR", "RS"}


def main() -> int:
    if not PATH.exists():
        print(f"Missing {PATH}", file=sys.stderr)
        return 1
    data = json.loads(PATH.read_text(encoding="utf-8"))
    errors = 0
    for key, rows in data.items():
        if key not in PASSIONS:
            print(f"Unknown passion id: {key}")
            errors += 1
        if not isinstance(rows, list):
            print(f"{key}: expected list")
            errors += 1
            continue
        for i, row in enumerate(rows):
            if not isinstance(row, dict) or "text" not in row:
                print(f"{key}[{i}]: need object with text")
                errors += 1
                continue
            countries = row.get("countries")
            if countries is not None:
                if not isinstance(countries, list):
                    print(f"{key}[{i}].countries: need list")
                    errors += 1
                else:
                    for c in countries:
                        if c not in COUNTRIES:
                            print(f"{key}[{i}].countries: unknown {c}")
                            errors += 1
    if errors:
        print(f"{errors} problem(s)")
        return 1
    print(f"OK · {PATH.relative_to(ROOT)} · {len(data)} passions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
