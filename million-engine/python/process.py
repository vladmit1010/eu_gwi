#!/usr/bin/env python3
"""
The Million Engine — data processing pipeline.

Reads raw market intelligence JSON, scores opportunities,
ranks markets toward the 1,000,000 target, and writes:
  - ../data/processed.json   (app feed + insight metrics)
  - ../data/charts.json      (Plotly figures for the Insights view)

Run from repo root or this folder:
  pip install -r requirements.txt
  python process.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.utils import PlotlyJSONEncoder

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data" / "raw" / "markets.json"
FALLBACK_SAMPLE = ROOT / "data" / "sample.json"
OUT_PROCESSED = ROOT / "data" / "processed.json"
OUT_CHARTS = ROOT / "data" / "charts.json"

# Mastercard-leaning palette for Plotly
RED = "#EB001B"
YELLOW = "#F79E1B"
ORANGE = "#FF5F00"
INK = "#F4F5F7"
MUTED = "#6B7280"
GRID = "rgba(255,255,255,0.06)"
PAPER = "#14161B"
PLOT = "#0B0C0E"


def load_raw() -> dict:
    path = RAW_PATH if RAW_PATH.exists() else FALLBACK_SAMPLE
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def opportunities_frame(raw: dict) -> pd.DataFrame:
    rows = []
    themes = raw.get("themes", [])
    theme_labels = {
        (t["id"] if isinstance(t, dict) else t): (t["label"] if isinstance(t, dict) else t)
        for t in themes
    }

    for code, market in raw.get("markets", {}).items():
        contrib = float(market.get("contribution") or market.get("customers") or 0)
        opps = market.get("opportunities") or market.get("segments") or {}
        for theme_id, items in opps.items():
            label = theme_labels.get(theme_id, theme_id)
            for item in items or []:
                share = float(item.get("s") or item.get("share") or 0)
                eng = float(item.get("e") or item.get("engagement") or 0)
                rows.append(
                    {
                        "market": code.upper(),
                        "market_name": market.get("name") or code,
                        "contribution": contrib,
                        "theme_id": theme_id,
                        "theme": label,
                        "opportunity": item.get("n") or item.get("name") or "—",
                        "share": share,
                        "engagement": eng,
                        "age": item.get("age"),
                        "note": item.get("note") or "",
                        "score": share * eng / 100.0,
                    }
                )
    if not rows:
        raise SystemExit("No opportunities found in raw data")
    return pd.DataFrame(rows)


def score_markets(df: pd.DataFrame, target: float) -> pd.DataFrame:
    market = (
        df.groupby(["market", "market_name", "contribution"], as_index=False)
        .agg(
            growth_index=("score", "sum"),
            opp_count=("opportunity", "count"),
            avg_engagement=("engagement", "mean"),
            top_share=("share", "max"),
        )
        .sort_values("contribution", ascending=False)
    )
    market["share_of_target"] = market["contribution"] / target
    market["gap_to_target"] = target - market["contribution"].sum()
    market["rank_contribution"] = market["contribution"].rank(ascending=False).astype(int)
    market["rank_growth"] = market["growth_index"].rank(ascending=False).astype(int)
    # composite: how we blend volume + intensity for the board narrative
    vol = market["contribution"] / market["contribution"].max()
    inten = market["growth_index"] / market["growth_index"].max()
    market["priority_score"] = (0.55 * vol + 0.45 * inten).round(3)
    market["rank_priority"] = market["priority_score"].rank(ascending=False).astype(int)
    return market


def theme_heatmap(df: pd.DataFrame) -> pd.DataFrame:
    return (
        df.groupby(["market_name", "theme"], as_index=False)["score"]
        .sum()
        .pivot(index="market_name", columns="theme", values="score")
        .fillna(0)
    )


def plot_layout(title: str, height: int = 320, **extra) -> dict:
    base = dict(
        title=dict(text=title, font=dict(size=14, color=INK, family="Avenir Next, Helvetica, sans-serif"), x=0, xanchor="left"),
        paper_bgcolor=PAPER,
        plot_bgcolor=PLOT,
        font=dict(color=INK, family="Avenir Next, Helvetica, sans-serif", size=11),
        margin=dict(l=48, r=24, t=48, b=40),
        height=height,
        hoverlabel=dict(bgcolor="#1A1D24", font_size=12, font_family="Avenir Next, Helvetica, sans-serif"),
    )
    base.update(extra)
    return base


def chart_contribution(market: pd.DataFrame, target: float) -> dict:
    m = market.sort_values("contribution", ascending=True)
    height = max(320, 18 * len(m) + 80)
    fig = go.Figure(
        go.Bar(
            x=m["contribution"],
            y=m["market_name"],
            orientation="h",
            marker=dict(
                color=m["contribution"],
                colorscale=[[0, "#2A2E38"], [0.45, ORANGE], [0.75, RED], [1, YELLOW]],
                line=dict(width=0),
            ),
            text=[f"{int(v):,}" for v in m["contribution"]],
            textposition="outside",
            textfont=dict(color=MUTED, size=9),
            hovertemplate="<b>%{y}</b><br>%{x:,.0f} customers toward 1M<extra></extra>",
            cliponaxis=False,
        )
    )
    fig.add_vline(x=target / max(len(m), 1), line_dash="dot", line_color=MUTED, opacity=0.5)
    fig.update_layout(
        **plot_layout(
            "Contribution toward 1,000,000",
            height,
            margin=dict(l=120, r=48, t=48, b=40),
        ),
        xaxis=dict(showgrid=True, gridcolor=GRID, zeroline=False, title="Customers", color=MUTED),
        yaxis=dict(showgrid=False, color=MUTED, tickfont=dict(size=10)),
        showlegend=False,
    )
    return fig.to_plotly_json()


def chart_priority(market: pd.DataFrame) -> dict:
    m = market.sort_values("priority_score", ascending=True)
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=m["contribution"],
            y=m["growth_index"],
            mode="markers+text",
            text=m["market"],
            textposition="top center",
            textfont=dict(size=11, color=INK),
            marker=dict(
                size=14 + m["priority_score"] * 22,
                color=m["priority_score"],
                colorscale=[[0, "#2A2E38"], [0.5, RED], [1, YELLOW]],
                line=dict(width=1, color="rgba(255,255,255,0.2)"),
            ),
            customdata=np.stack([m["market_name"], m["priority_score"], m["rank_priority"]], axis=-1),
            hovertemplate=(
                "<b>%{customdata[0]}</b><br>"
                "Contribution %{x:,.0f}<br>"
                "Growth index %{y:.2f}<br>"
                "Priority %{customdata[1]:.2f} (rank %{customdata[2]})<extra></extra>"
            ),
        )
    )
    fig.update_layout(
        **plot_layout("Where volume meets intensity", 320),
        xaxis=dict(title="Contribution", showgrid=True, gridcolor=GRID, color=MUTED, zeroline=False),
        yaxis=dict(title="Growth index", showgrid=True, gridcolor=GRID, color=MUTED, zeroline=False),
        showlegend=False,
    )
    return fig.to_plotly_json()


def chart_heatmap(heat: pd.DataFrame) -> dict:
    height = max(360, 16 * len(heat.index) + 100)
    fig = go.Figure(
        go.Heatmap(
            z=heat.values,
            x=list(heat.columns),
            y=list(heat.index),
            colorscale=[[0, "#14161B"], [0.35, "#3A3532"], [0.65, RED], [1, YELLOW]],
            hovertemplate="<b>%{y}</b> · %{x}<br>Score %{z:.2f}<extra></extra>",
            colorbar=dict(thickness=10, len=0.7, tickfont=dict(color=MUTED, size=10)),
        )
    )
    fig.update_layout(
        **plot_layout(
            "Opportunity intensity by lens",
            height,
            margin=dict(l=120, r=24, t=64, b=24),
        ),
        xaxis=dict(side="top", tickangle=-25, color=MUTED),
        yaxis=dict(autorange="reversed", color=MUTED, tickfont=dict(size=10)),
    )
    return fig.to_plotly_json()


def chart_funnel(market: pd.DataFrame, target: float) -> dict:
    total = float(market["contribution"].sum())
    gap = max(target - total, 0)
    stages = [
        ("Target", target),
        ("Mapped markets", total),
        ("Priority tier (top 3)", float(market.nlargest(3, "priority_score")["contribution"].sum())),
        ("Still to find", gap),
    ]
    fig = go.Figure(
        go.Funnel(
            y=[s[0] for s in stages],
            x=[s[1] for s in stages],
            textinfo="value+percent initial",
            marker=dict(color=[MUTED, ORANGE, RED, YELLOW]),
            connector=dict(line=dict(color=GRID, width=1)),
            hovertemplate="<b>%{y}</b><br>%{x:,.0f}<extra></extra>",
        )
    )
    fig.update_layout(**plot_layout("From promise to mapped opportunity", 300))
    return fig.to_plotly_json()


def chart_pipeline() -> dict:
    """Visual metaphor of the processing steps — for the client narrative."""
    steps = ["Ingest", "Normalize", "Score", "Rank", "Narrate"]
    values = [100, 92, 88, 85, 85]
    fig = go.Figure(
        go.Scatter(
            x=steps,
            y=values,
            mode="lines+markers",
            line=dict(color=ORANGE, width=3, shape="spline"),
            marker=dict(size=12, color=[MUTED, MUTED, RED, RED, YELLOW], line=dict(width=0)),
            fill="tozeroy",
            fillcolor="rgba(255,95,0,0.12)",
            hovertemplate="<b>%{x}</b><br>Pipeline confidence %{y}%<extra></extra>",
        )
    )
    fig.update_layout(
        **plot_layout("How we process the signal", 260),
        xaxis=dict(showgrid=False, color=MUTED),
        yaxis=dict(range=[60, 110], showgrid=True, gridcolor=GRID, ticksuffix="%", color=MUTED),
        showlegend=False,
    )
    return fig.to_plotly_json()


def build_insights(df: pd.DataFrame, market: pd.DataFrame, target: float) -> dict:
    total = float(market["contribution"].sum())
    top = market.iloc[0]
    best_growth = market.sort_values("growth_index", ascending=False).iloc[0]
    best_opp = df.sort_values("score", ascending=False).iloc[0]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target": target,
        "mapped_customers": int(total),
        "coverage_pct": round(100 * total / target, 1),
        "gap": int(max(target - total, 0)),
        "market_count": int(len(market)),
        "opportunity_count": int(len(df)),
        "headline": (
            f"{int(total):,} customers mapped across {len(market)} markets — "
            f"{round(100 * total / target, 1)}% of the million already in view."
        ),
        "highlights": [
            {
                "label": "Largest mapped pool",
                "value": f"{top['market_name']} · {int(top['contribution']):,}",
            },
            {
                "label": "Highest growth index",
                "value": f"{best_growth['market_name']} · {best_growth['growth_index']:.1f}",
            },
            {
                "label": "Sharpest opportunity",
                "value": f"{best_opp['opportunity']} ({best_opp['market_name']})",
            },
        ],
        "pipeline": [
            {
                "id": "ingest",
                "title": "Ingest",
                "detail": "Market intelligence, behavioural signals and partnership inputs land as structured JSON.",
            },
            {
                "id": "normalize",
                "title": "Normalize",
                "detail": "Themes, shares and engagement scores are aligned to a common schema per market.",
            },
            {
                "id": "score",
                "title": "Score",
                "detail": "Growth index = Σ(share × engagement) / 100 — intensity of addressable opportunity.",
            },
            {
                "id": "rank",
                "title": "Rank",
                "detail": "Priority blends contribution volume (55%) with growth intensity (45%).",
            },
            {
                "id": "narrate",
                "title": "Narrate",
                "detail": "Map, charts and story mode turn the ranked view into a board-ready conversation.",
            },
        ],
        "markets": [
            {
                "code": row.market,
                "name": row.market_name,
                "contribution": int(row.contribution),
                "growth_index": round(float(row.growth_index), 2),
                "priority_score": float(row.priority_score),
                "rank_priority": int(row.rank_priority),
                "share_of_target": round(float(row.share_of_target), 4),
                "avg_engagement": round(float(row.avg_engagement), 2),
                "opp_count": int(row.opp_count),
            }
            for row in market.itertuples()
        ],
    }


def rebuild_app_payload(raw: dict, market: pd.DataFrame, insights: dict) -> dict:
    """Keep full market opportunity trees for the map UI, attach processed meta."""
    rankings = {r.market: r for r in market.itertuples()}
    markets_out = {}
    for code, m in raw.get("markets", {}).items():
        code = code.upper()
        rank = rankings.get(code)
        markets_out[code] = {
            **m,
            "name": m.get("name") or code,
            "contribution": int(m.get("contribution") or 0),
            "metrics": {
                "growth_index": round(float(rank.growth_index), 2) if rank else 0,
                "priority_score": float(rank.priority_score) if rank else 0,
                "rank_priority": int(rank.rank_priority) if rank else None,
            },
        }

    return {
        "meta": {
            **(raw.get("meta") or {}),
            "target": int((raw.get("meta") or {}).get("target") or raw.get("target") or 1_000_000),
            "title": (raw.get("meta") or {}).get("title") or "The Million Engine",
            "source": (
                f"Processed {insights['generated_at'][:19]}Z · "
                f"{insights['coverage_pct']}% of target mapped"
            ),
            "processed": True,
        },
        "themes": raw.get("themes"),
        "markets": markets_out,
        "insights": insights,
    }


def main() -> None:
    raw = load_raw()
    target = float((raw.get("meta") or {}).get("target") or raw.get("target") or 1_000_000)

    # Ensure raw snapshot exists for the client story ("before")
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not RAW_PATH.exists():
        RAW_PATH.write_text(json.dumps(raw, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    df = opportunities_frame(raw)
    market = score_markets(df, target)
    heat = theme_heatmap(df)
    insights = build_insights(df, market, target)
    payload = rebuild_app_payload(raw, market, insights)

    charts = {
        "contribution": chart_contribution(market, target),
        "priority": chart_priority(market),
        "heatmap": chart_heatmap(heat),
        "funnel": chart_funnel(market, target),
        "pipeline": chart_pipeline(),
    }

    OUT_PROCESSED.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUT_CHARTS.write_text(
        json.dumps(charts, indent=2, cls=PlotlyJSONEncoder) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUT_PROCESSED.relative_to(ROOT)}")
    print(f"Wrote {OUT_CHARTS.relative_to(ROOT)}")
    print(f"Mapped {insights['mapped_customers']:,} / {int(target):,} ({insights['coverage_pct']}%)")
    print(f"Top priority: {market.sort_values('priority_score', ascending=False).iloc[0]['market_name']}")


if __name__ == "__main__":
    main()
