#!/usr/bin/env python3
"""
Algorithm: merge GWI frequency variants into one signal per platform/base.

Problem (visible in Explore + Analysis)
---------------------------------------
Named Social Media answers are split by usage frequency, e.g.:

  Viber: More than once a day
  Viber: Daily
  Viber: Weekly
  Viber: Monthly

That floods top opportunities (markets.json) and Analysis rankings with
4 near-duplicates of the same channel.

What we merge
-------------
Only answers matching:  "{Base}: {Frequency}"

Frequencies (order = engagement ladder, high → low):
  More than once a day
  Daily
  Weekly
  Monthly
  Less than monthly   (if present)

What we do NOT merge
--------------------
- Attitudes scales:  "…: Important to me" / Neutral / Not Important to me
- Character:         "…: Describes me"
- Sports:            "Basketball: Follow"   (not a frequency)
- Plain answers:     "Board games", "80s music"

Merge rule (pick ONE representative per base)
---------------------------------------------
Preference order (first available in the group wins):

  1. Monthly              → best reach proxy ("uses at least monthly")
  2. Weekly
  3. Daily
  4. More than once a day
  5. any other freq

Rationale: for Mastercard × Erste market sizing, Monthly is the most
actionable single number. Intensity (Daily+) stays available later if
we add an engagement mode.

Metrics of the chosen answer are kept as-is (index, col_pct, universe…).
We do NOT average indices across frequencies (they measure different
things and averaging would be misleading).

Optional metadata on the merged node:
  {
    "index": 43.3,
    "col_pct": 2.3,
    ...
    "_merged_from": ["Viber: Daily", "Viber: Weekly", ...],
    "_frequency": "Monthly"
  }

Usage
-----
  # Dry-run report (no files written)
  python merge_frequency_answers.py

  # Write merged copy
  python merge_frequency_answers.py --write

  # Then rebuild Explore markets from merged file if desired:
  #   python build_markets_from_gwi.py   # point GWI path at merged file
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GWI_IN = ROOT / "data" / "gwi.json"
GWI_OUT = ROOT / "data" / "gwi.merged.json"

# High → low engagement. Monthly preferred for merge pick.
FREQUENCY_RANK = [
    "More than once a day",
    "Daily",
    "Weekly",
    "Monthly",
    "Less than monthly",
]

# Prefer Monthly for the kept representative (reach).
PICK_ORDER = [
    "Monthly",
    "Weekly",
    "Daily",
    "More than once a day",
    "Less than monthly",
]

# Do not treat these colon-suffixes as frequency (attitude / sport scales).
NON_FREQ_SUFFIXES = {
    "follow",
    "important to me",
    "not important to me",
    "neutral",
    "describes me",
}

FREQ_RE = re.compile(
    r"^(?P<base>.+?):\s*(?P<freq>"
    + "|".join(re.escape(f) for f in FREQUENCY_RANK)
    + r")\s*$",
    re.IGNORECASE,
)


def parse_frequency_answer(answer: str) -> tuple[str, str] | None:
    """
    If answer is a frequency variant, return (base, canonical_freq).
    Else return None.
    """
    text = (answer or "").strip()
    if ": " not in text:
        return None

    # Reject known non-frequency scales early
    suffix = text.rsplit(": ", 1)[-1].strip().lower()
    if suffix in NON_FREQ_SUFFIXES:
        return None

    m = FREQ_RE.match(text)
    if not m:
        return None

    base = m.group("base").strip()
    freq_raw = m.group("freq").strip()
    # Canonical casing from FREQUENCY_RANK
    canon = next(f for f in FREQUENCY_RANK if f.lower() == freq_raw.lower())
    return base, canon


def pick_representative(variants: dict[str, dict]) -> tuple[str, str, dict]:
    """
    variants: { original_answer: metrics }
    Returns (kept_answer, frequency, metrics).
    """
    # Map freq → (answer, metrics)
    by_freq: dict[str, tuple[str, dict]] = {}
    for answer, metrics in variants.items():
        parsed = parse_frequency_answer(answer)
        if not parsed:
            continue
        _, freq = parsed
        by_freq[freq] = (answer, metrics)

    for pref in PICK_ORDER:
        if pref in by_freq:
            answer, metrics = by_freq[pref]
            return answer, pref, metrics

    # Fallback: any
    answer, metrics = next(iter(variants.items()))
    parsed = parse_frequency_answer(answer)
    freq = parsed[1] if parsed else "unknown"
    return answer, freq, metrics


def merge_answer_block(answers: dict) -> tuple[dict, dict]:
    """
    Merge one category's answers dict.
    Returns (merged_answers, stats).
    """
    groups: dict[str, dict[str, dict]] = defaultdict(dict)
    passthrough: dict[str, dict] = {}

    for answer, metrics in answers.items():
        parsed = parse_frequency_answer(answer)
        if parsed is None:
            passthrough[answer] = metrics
            continue
        base, _freq = parsed
        groups[base][answer] = metrics

    merged: dict[str, dict] = dict(passthrough)
    collapsed = 0
    kept_as = []

    for base, variants in groups.items():
        if len(variants) == 1:
            # Single frequency only — still rename to base? 
            # Keep original label so we don't invent Monthly when only Daily exists.
            answer, metrics = next(iter(variants.items()))
            merged[answer] = metrics
            continue

        kept_answer, freq, metrics = pick_representative(variants)
        # Display name = platform only (cleaner in Explore / Analysis)
        display = base
        out = dict(metrics)
        out["_frequency"] = freq
        out["_merged_from"] = sorted(variants.keys())
        merged[display] = out
        collapsed += len(variants) - 1
        kept_as.append((base, freq, len(variants)))

    stats = {
        "in": len(answers),
        "out": len(merged),
        "collapsed": collapsed,
        "groups": kept_as,
    }
    return merged, stats


def merge_gwi(gwi: dict) -> tuple[dict, list[dict]]:
    """
    Walk audience → country → category → answers and merge frequencies.
    Returns (new_gwi, report_rows).
    """
    out = deepcopy(gwi)
    report = []

    for audience, countries in out.items():
        if not isinstance(countries, dict):
            continue
        for country, categories in countries.items():
            if not isinstance(categories, dict):
                continue
            for category, answers in list(categories.items()):
                if not isinstance(answers, dict):
                    continue
                # Only social-style freq blocks benefit; algorithm is safe
                # on all categories because NON_FREQ_SUFFIXES are excluded.
                merged, stats = merge_answer_block(answers)
                categories[category] = merged
                if stats["collapsed"]:
                    report.append(
                        {
                            "audience": audience,
                            "country": country,
                            "category": category,
                            **stats,
                        }
                    )

    return out, report


def print_report(report: list[dict], sample_groups: list) -> None:
    total_collapsed = sum(r["collapsed"] for r in report)
    print("=== Frequency merge algorithm (dry-run) ===")
    print(f"Category-country blocks touched: {len(report)}")
    print(f"Answers removed (collapsed):     {total_collapsed}")
    print()
    print("Pick order:", " > ".join(PICK_ORDER))
    print("Never merge suffixes:", ", ".join(sorted(NON_FREQ_SUFFIXES)))
    print()
    if sample_groups:
        print("Example groups (first country block with merges):")
        for base, freq, n in sample_groups[:12]:
            print(f"  {base!r:40s}  keep={freq:22s}  from {n} variants")
    print()
    # Explore impact hint
    social = [r for r in report if "Social" in r["category"]]
    if social:
        r0 = social[0]
        print(
            f"e.g. {r0['audience']} / {r0['country']} / {r0['category']}: "
            f"{r0['in']} → {r0['out']} answers (−{r0['collapsed']})"
        )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", type=Path, default=GWI_IN)
    ap.add_argument("--output", type=Path, default=GWI_OUT)
    ap.add_argument("--write", action="store_true", help="Write merged JSON")
    args = ap.parse_args()

    gwi = json.loads(args.input.read_text(encoding="utf-8"))
    merged, report = merge_gwi(gwi)

    sample_groups = []
    for r in report:
        if r.get("groups"):
            sample_groups = r["groups"]
            break
    # groups are inside merge_answer_block stats — re-run one block for examples
    # Pull from first Affluent/austria Social if present
    try:
        social = gwi["Affluent"]["austria"]["Named Social Media / Messaging Services Used"]
        _, st = merge_answer_block(social)
        sample_groups = st["groups"]
        print_report(report, sample_groups)
        print()
        print("Before → after (Austria Affluent, Viber*):")
        for a in sorted(social):
            if a.startswith("Viber"):
                print(f"  IN   {a}")
        after = merge_answer_block(social)[0]
        for a in sorted(after):
            if a == "Viber" or a.startswith("Viber"):
                m = after[a]
                print(
                    f"  OUT  {a}  index={m.get('index')}  col%={m.get('col_pct')}  "
                    f"freq={m.get('_frequency')}  from={len(m.get('_merged_from') or [])}"
                )
    except (KeyError, TypeError):
        print_report(report, sample_groups)

    if args.write:
        args.output.write_text(
            json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"\nWrote {args.output}")
    else:
        print("\n(No files written. Re-run with --write to save gwi.merged.json)")


if __name__ == "__main__":
    main()
