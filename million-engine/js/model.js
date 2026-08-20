/**
 * Normalize whatever JSON shape arrives into a consistent internal model.
 * Supports both the sample schema and a lighter alternate form.
 */
export function normalizeData(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Root must be a JSON object");
  }

  const meta = {
    target: Number(raw.meta?.target ?? raw.target ?? 1_000_000),
    title: raw.meta?.title ?? raw.title ?? "The Million Engine",
    source: raw.meta?.source ?? raw.source ?? "",
  };

  let themes;
  if (Array.isArray(raw.themes) && raw.themes.length) {
    themes = raw.themes.map((t) =>
      typeof t === "string" ? { id: slug(t), label: t } : { id: t.id || slug(t.label), label: t.label || t.id }
    );
  } else {
    throw new Error("themes[] is required");
  }

  const markets = {};

  if (raw.markets && typeof raw.markets === "object") {
    for (const [code, m] of Object.entries(raw.markets)) {
      markets[code.toUpperCase()] = {
        name: m.name || code,
        contribution: Number(m.contribution ?? m.customers ?? 0),
        opportunities: m.opportunities || m.segments || {},
        metrics: m.metrics || null,
      };
    }
  } else if (raw.names && raw.segments) {
    /* compatibility with segmentation-v5 style */
    for (const [code, name] of Object.entries(raw.names)) {
      const opportunities = {};
      for (const th of themes) {
        const key = th.label;
        opportunities[th.id] = (raw.segments[key]?.[code] || []).map((s) => ({ ...s }));
      }
      markets[code] = {
        name,
        contribution: 0,
        opportunities,
      };
    }
  } else {
    throw new Error("markets{} (or names + segments) is required");
  }

  if (!Object.keys(markets).length) throw new Error("No markets found");

  return {
    meta,
    themes,
    markets,
    insights: raw.insights || null,
  };
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function opportunitiesFor(data, code, activeThemeIds) {
  const market = data.markets[code];
  if (!market) return [];
  const out = [];
  for (const th of data.themes) {
    if (!activeThemeIds.has(th.id)) continue;
    const list = market.opportunities?.[th.id] || market.opportunities?.[th.label] || [];
    for (const item of list) {
      out.push({
        n: item.n || item.name,
        s: Number(item.s ?? item.share ?? 0),
        e: Number(item.e ?? item.engagement ?? 0),
        age: item.age ?? null,
        note: item.note || "",
        themeId: th.id,
        themeLabel: th.label,
      });
    }
  }
  return out;
}

export function growthIndex(data, code, activeThemeIds) {
  const opps = opportunitiesFor(data, code, activeThemeIds);
  if (!opps.length) return 0;
  return opps.reduce((a, s) => a + s.s * s.e, 0) / 100;
}

export function totalContribution(data) {
  return Object.values(data.markets).reduce((a, m) => a + (m.contribution || 0), 0);
}
