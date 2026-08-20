/** GWI helpers — audience → country → category → answer → metrics */

export const ISO_TO_GWI = {
  AT: "austria",
  HR: "croatia",
  CZ: "czech republic",
  HU: "hungary",
  RO: "romania",
  RS: "serbia",
};

export const GWI_TO_ISO = Object.fromEntries(
  Object.entries(ISO_TO_GWI).map(([iso, name]) => [name, iso])
);

export const COUNTRY_LABELS = {
  austria: "Austria",
  croatia: "Croatia",
  "czech republic": "Czechia",
  hungary: "Hungary",
  romania: "Romania",
  serbia: "Serbia",
};

export const THEME_TO_GWI = {
  affluent: "Affluent",
  genz: "Gen Z",
  all: "All Internet Users",
};

export const GWI_TO_THEME = Object.fromEntries(
  Object.entries(THEME_TO_GWI).map(([id, key]) => [key, id])
);

export const AUDIENCE_LABELS = {
  Affluent: "Affluent",
  "Gen Z": "Gen Z",
  "All Internet Users": "All users",
};

export async function loadGwi() {
  const res = await fetch("./data/gwi.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load gwi.json");
  return res.json();
}

export function audiencesIn(gwi) {
  return gwi ? Object.keys(gwi) : [];
}

export function countriesIn(gwi) {
  if (!gwi) return [];
  const first = Object.values(gwi)[0];
  return first ? Object.keys(first) : [];
}

export function categoriesFor(gwi, audienceKey) {
  if (!gwi || !audienceKey) return [];
  const block = gwi[audienceKey];
  if (!block) return [];
  const firstCountry = Object.values(block)[0];
  return firstCountry ? Object.keys(firstCountry) : [];
}

export function answersFor(gwi, audienceKey, category) {
  if (!gwi || !audienceKey || !category) return [];
  const block = gwi[audienceKey];
  if (!block) return [];
  const firstCountry = Object.values(block)[0];
  const answers = firstCountry?.[category];
  return answers ? Object.keys(answers).sort((a, b) => a.localeCompare(b)) : [];
}

export function metricAt(gwi, audienceKey, iso, category, answer) {
  const country = ISO_TO_GWI[iso];
  if (!country) return null;
  return gwi?.[audienceKey]?.[country]?.[category]?.[answer] || null;
}

/** Build { ISO: index } for map heat. Missing → null */
export function indexByMarket(gwi, audienceKey, category, answer, isos) {
  const out = {};
  for (const iso of isos) {
    const m = metricAt(gwi, audienceKey, iso, category, answer);
    out[iso] = m?.index ?? null;
  }
  return out;
}

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function relevanceScore(index, colPct) {
  return (index - 100) * Math.sqrt(Math.max(colPct, 0));
}

function sortRows(rows, sortBy = "index") {
  if (sortBy === "reach") {
    return rows.sort((a, b) => b.col_pct - a.col_pct || b.index - a.index);
  }
  if (sortBy === "balanced") {
    return rows.sort((a, b) => b.score - a.score);
  }
  // index (default)
  return rows.sort((a, b) => b.index - a.index || b.col_pct - a.col_pct);
}

/**
 * Top signals for an audience across Erste markets.
 * sortBy: "index" | "reach" | "balanced"
 */
export function topSignalsForAudience(gwi, audienceKey, limit = 10, sortBy = "index") {
  if (!gwi?.[audienceKey]) return [];
  const countries = Object.keys(gwi[audienceKey]);
  const sample = gwi[audienceKey][countries[0]] || {};
  const rows = [];

  for (const [category, answers] of Object.entries(sample)) {
    for (const answer of Object.keys(answers)) {
      const points = countries
        .map((c) => {
          const m = gwi[audienceKey][c]?.[category]?.[answer];
          return m
            ? { country: c, index: m.index, col_pct: m.col_pct, universe: m.universe }
            : null;
        })
        .filter(Boolean);

      if (points.length < 2) continue;
      const avgIndex = mean(points.map((p) => p.index));
      const avgCol = mean(points.map((p) => p.col_pct));
      if (avgCol < 1) continue;
      // Balanced mode only cares about over-index; index/reach show full top
      if (sortBy === "balanced" && avgIndex <= 100) continue;

      const best =
        sortBy === "reach"
          ? points.reduce((a, b) => (b.col_pct > a.col_pct ? b : a))
          : points.reduce((a, b) => (b.index > a.index ? b : a));

      rows.push({
        mode: "audience",
        audience: audienceKey,
        category,
        answer,
        score: relevanceScore(avgIndex, avgCol),
        index: Math.round(avgIndex * 10) / 10,
        col_pct: Math.round(avgCol * 10) / 10,
        bestCountry: best.country,
        bestIndex: best.index,
      });
    }
  }

  return sortRows(rows, sortBy).slice(0, limit);
}

/**
 * Top signals for a country vs peer Erste markets (all audiences).
 * sortBy: "index" | "reach" | "balanced"
 */
export function topSignalsForCountry(gwi, countryKey, limit = 10, sortBy = "index") {
  if (!gwi) return [];
  const rows = [];

  for (const audienceKey of Object.keys(gwi)) {
    const block = gwi[audienceKey];
    if (!block?.[countryKey]) continue;
    const peers = Object.keys(block).filter((c) => c !== countryKey);
    const sample = block[countryKey];

    for (const [category, answers] of Object.entries(sample)) {
      for (const [answer, mine] of Object.entries(answers)) {
        if (!mine || mine.col_pct < 1) continue;
        const peerIdx = peers
          .map((c) => block[c]?.[category]?.[answer]?.index)
          .filter((v) => v != null);
        if (!peerIdx.length) continue;
        const peerMean = mean(peerIdx);
        const lift = mine.index - peerMean;
        if (sortBy === "balanced" && lift <= 0) continue;

        rows.push({
          mode: "country",
          audience: audienceKey,
          country: countryKey,
          category,
          answer,
          score: relevanceScore(100 + Math.max(lift, 0), mine.col_pct),
          index: mine.index,
          col_pct: mine.col_pct,
          peerMean: Math.round(peerMean * 10) / 10,
          lift: Math.round(lift * 10) / 10,
        });
      }
    }
  }

  return sortRows(rows, sortBy).slice(0, limit);
}

/**
 * Signals for one audience in one country (country panel explorer).
 * sortBy: "index" | "reach"
 */
export function signalsForCountryAudience(
  gwi,
  audienceKey,
  countryKey,
  { sortBy = "index", category = null, limit = 12 } = {}
) {
  const block = gwi?.[audienceKey]?.[countryKey];
  if (!block) return [];
  const rows = [];

  for (const [cat, answers] of Object.entries(block)) {
    if (category && cat !== category) continue;
    if (!answers || typeof answers !== "object") continue;
    for (const [answer, m] of Object.entries(answers)) {
      if (!m || m.index == null) continue;
      if ((m.col_pct ?? 0) < 0.5) continue;
      rows.push({
        category: cat,
        answer,
        index: m.index,
        col_pct: m.col_pct ?? 0,
        universe: m.universe ?? 0,
      });
    }
  }

  if (sortBy === "reach") {
    rows.sort((a, b) => b.col_pct - a.col_pct || b.index - a.index);
  } else {
    rows.sort((a, b) => b.index - a.index || b.col_pct - a.col_pct);
  }
  return rows.slice(0, limit);
}
