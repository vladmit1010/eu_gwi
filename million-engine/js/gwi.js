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

/** Audiences available in Explore Who chips (and Analysis apply). */
export const EXPLORE_THEME_IDS = ["affluent", "genz"];

export const EXPLORE_GWI_AUDIENCES = EXPLORE_THEME_IDS.map((id) => THEME_TO_GWI[id]);

export const GWI_TO_THEME = Object.fromEntries(
  Object.entries(THEME_TO_GWI).map(([id, key]) => [key, id])
);

/** Map any GWI theme id to an Explore Who chip (never `all`). */
export function coerceExploreThemeId(themeId) {
  return EXPLORE_THEME_IDS.includes(themeId) ? themeId : "affluent";
}

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

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function relevanceScore(index, people) {
  return (index - 100) * Math.sqrt(Math.max(people, 0) / 1000);
}

function sortRows(rows, sortBy = "index") {
  if (sortBy === "people" || sortBy === "reach") {
    return rows.sort((a, b) => b.universe - a.universe || b.index - a.index);
  }
  if (sortBy === "balanced") {
    return rows.sort((a, b) => b.score - a.score);
  }
  return rows.sort((a, b) => b.index - a.index || b.universe - a.universe);
}

/**
 * Top signals for an audience across Erste markets.
 * sortBy: "index" | "people" | "balanced"
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
            ? { country: c, index: m.index, universe: m.universe ?? 0 }
            : null;
        })
        .filter(Boolean);

      if (points.length < 2) continue;
      const avgIndex = mean(points.map((p) => p.index));
      const totalPeople = sum(points.map((p) => p.universe));
      if (totalPeople < 1000) continue;
      if (sortBy === "balanced" && avgIndex <= 100) continue;

      const best =
        sortBy === "people" || sortBy === "reach"
          ? points.reduce((a, b) => (b.universe > a.universe ? b : a))
          : points.reduce((a, b) => (b.index > a.index ? b : a));

      rows.push({
        mode: "audience",
        audience: audienceKey,
        category,
        answer,
        score: relevanceScore(avgIndex, totalPeople),
        index: Math.round(avgIndex * 10) / 10,
        universe: Math.round(totalPeople),
        bestCountry: best.country,
        bestIndex: best.index,
      });
    }
  }

  return sortRows(rows, sortBy).slice(0, limit);
}

/**
 * Top signals for a country vs peer Erste markets (all audiences).
 * sortBy: "index" | "people" | "balanced"
 */
export function topSignalsForCountry(gwi, countryKey, limit = 10, sortBy = "index") {
  if (!gwi) return [];
  const rows = [];

  for (const audienceKey of EXPLORE_GWI_AUDIENCES) {
    const block = gwi[audienceKey];
    if (!block?.[countryKey]) continue;
    const peers = Object.keys(block).filter((c) => c !== countryKey);
    const sample = block[countryKey];

    for (const [category, answers] of Object.entries(sample)) {
      for (const [answer, mine] of Object.entries(answers)) {
        if (!mine || (mine.universe ?? 0) < 1000) continue;
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
          score: relevanceScore(100 + Math.max(lift, 0), mine.universe ?? 0),
          index: mine.index,
          universe: mine.universe ?? 0,
          peerMean: Math.round(peerMean * 10) / 10,
          lift: Math.round(lift * 10) / 10,
        });
      }
    }
  }

  return sortRows(rows, sortBy).slice(0, limit);
}
