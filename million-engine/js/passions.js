/** Global sponsorship passions + discovery of most-liked themes (GWI). */

import { ISO_TO_GWI } from "./gwi.js";

export const CORE_PASSIONS = [
  {
    id: "f1",
    label: "Formula 1",
    short: "F1",
    kind: "global",
    blurb: "Global sponsorship · motor sport",
    category: "Sports Followed",
    answer: "Motor sports (e.g. Formula 1): Follow",
  },
  {
    id: "running",
    label: "Running & fitness",
    short: "Running",
    kind: "global",
    blurb: "Global sponsorship · running / jogging",
    category: "Personal Interests",
    answer: "Fitness & exercise",
  },
  {
    id: "live_music",
    label: "Live music",
    short: "Live music",
    kind: "global",
    blurb: "Global sponsorship · festivals & live events",
    category: "Personal Interests",
    answer: "Live events (e.g. music festivals)",
  },
];

/** Interests treated as local activation ideas (not global must-haves). */
const LOCAL_INTEREST_BLOCKLIST = new Set([
  "Live events (e.g. music festivals)",
  "Fitness & exercise",
  "Other arts/culture interests",
  "Other health/fitness/beauty interests",
  "Other home/lifestyle interests",
  "Other pop culture/leisure interests",
  "Other science/tech/nature interests",
  "Other societal/business interests",
]);

const CORE_ANSWER_KEYS = new Set(CORE_PASSIONS.map((p) => p.answer));

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function shortLabel(text, max = 18) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function passionById(id) {
  return CORE_PASSIONS.find((p) => p.id === id) || null;
}

/** Resolve core id or dynamic `interest:Answer` lens. */
export function resolvePassion(id) {
  if (!id) return null;
  const core = passionById(id);
  if (core) return core;
  if (id.startsWith("interest:")) {
    const answer = id.slice("interest:".length);
    return {
      id,
      label: answer,
      short: shortLabel(answer),
      kind: "liked",
      blurb: "Most liked · Personal Interests",
      category: "Personal Interests",
      answer,
    };
  }
  return null;
}

/**
 * Themes people like most for an audience (across Erste markets).
 * sortBy: "people" (universe sum) | "index"
 */
export function mostLikedInterests(
  gwi,
  audienceKey,
  { limit = 6, sortBy = "people" } = {}
) {
  if (!gwi?.[audienceKey]) return [];
  const countries = Object.keys(gwi[audienceKey]);
  const sample = gwi[audienceKey][countries[0]]?.["Personal Interests"];
  if (!sample) return [];

  const rows = [];
  for (const answer of Object.keys(sample)) {
    if (LOCAL_INTEREST_BLOCKLIST.has(answer)) continue;
    if (CORE_ANSWER_KEYS.has(answer)) continue;

    const points = countries
      .map((c) => gwi[audienceKey][c]?.["Personal Interests"]?.[answer])
      .filter(Boolean);
    if (points.length < 2) continue;

    const avgIndex = mean(points.map((p) => p.index));
    const totalPeople = sum(points.map((p) => p.universe ?? 0));
    if (totalPeople < 1000) continue;

    rows.push({
      id: `interest:${answer}`,
      label: answer,
      short: shortLabel(answer),
      kind: "liked",
      blurb: "Most liked across Erste markets",
      category: "Personal Interests",
      answer,
      index: Math.round(avgIndex * 10) / 10,
      universe: Math.round(totalPeople),
    });
  }

  if (sortBy === "index") {
    rows.sort((a, b) => b.index - a.index || b.universe - a.universe);
  } else {
    rows.sort((a, b) => b.universe - a.universe || b.index - a.index);
  }
  return rows.slice(0, limit);
}

export function coreMetricsForCountry(gwi, audienceKey, countryKey) {
  if (!gwi || !audienceKey || !countryKey) return [];
  return CORE_PASSIONS.map((p) => {
    const m = gwi[audienceKey]?.[countryKey]?.[p.category]?.[p.answer];
    return {
      ...p,
      index: m?.index ?? null,
      universe: m?.universe ?? null,
      col_pct: m?.col_pct ?? null,
    };
  });
}

export function localPassionsForCountry(
  gwi,
  audienceKey,
  countryKey,
  { limit = 5, sortBy = "index" } = {}
) {
  const interests = gwi?.[audienceKey]?.[countryKey]?.["Personal Interests"];
  if (!interests) return [];
  const rows = Object.entries(interests)
    .filter(([answer]) => !LOCAL_INTEREST_BLOCKLIST.has(answer))
    .map(([answer, m]) => ({
      answer,
      category: "Personal Interests",
      kind: "local",
      index: m?.index ?? 0,
      universe: m?.universe ?? 0,
    }))
    .filter((r) => r.universe >= 500);

  if (sortBy === "people" || sortBy === "reach") {
    rows.sort((a, b) => b.universe - a.universe || b.index - a.index);
  } else {
    rows.sort((a, b) => b.index - a.index || b.universe - a.universe);
  }
  return rows.slice(0, limit);
}

function topScaled(answers, { suffix, limit = 3, sortBy = "index" }) {
  if (!answers) return [];
  const rows = Object.entries(answers)
    .filter(([k]) => (suffix ? k.endsWith(suffix) : true))
    .map(([answer, m]) => ({
      answer: suffix ? answer.replace(suffix, "").replace(/:\s*$/, "").trim() : answer,
      raw: answer,
      index: m?.index ?? 0,
      universe: m?.universe ?? 0,
    }))
    .filter((r) => r.universe >= 500);

  if (sortBy === "people" || sortBy === "reach") {
    rows.sort((a, b) => b.universe - a.universe || b.index - a.index);
  } else {
    rows.sort((a, b) => b.index - a.index || b.universe - a.universe);
  }
  return rows.slice(0, limit);
}

/** Audience snapshot for a country: values, character, channels. */
export function audienceSnapshot(gwi, audienceKey, countryKey) {
  const block = gwi?.[audienceKey]?.[countryKey];
  if (!block) {
    return { values: [], character: [], channels: [] };
  }
  return {
    values: topScaled(block["Attitudes: Values"], {
      suffix: ": Important to me",
      limit: 4,
      sortBy: "index",
    }),
    character: topScaled(block["Attitudes: Character"], {
      suffix: ": Describes me",
      limit: 3,
      sortBy: "index",
    }),
    channels: topScaled(block["Named Social Media / Messaging Services Used"], {
      suffix: null,
      limit: 4,
      sortBy: "people",
    }),
  };
}

/**
 * Bubbles for a country: 3 global sponsorships + top local by Universe.
 * @returns {{ id, label, short, kind, category, answer, universe, index }[]}
 */
export function passionBubblesForCountry(
  gwi,
  audienceKey,
  countryKey,
  { localLimit = 5 } = {}
) {
  const core = coreMetricsForCountry(gwi, audienceKey, countryKey).map((p) => ({
    id: p.id,
    label: p.label,
    short: p.short,
    kind: "global",
    category: p.category,
    answer: p.answer,
    universe: p.universe ?? 0,
    index: p.index,
  }));

  const local = localPassionsForCountry(gwi, audienceKey, countryKey, {
    limit: localLimit,
    sortBy: "people",
  }).map((r) => ({
    id: `interest:${r.answer}`,
    label: r.answer,
    short: shortLabel(r.answer, 16),
    kind: "local",
    category: r.category,
    answer: r.answer,
    universe: r.universe ?? 0,
    index: r.index,
  }));

  return [...core, ...local].filter((b) => (b.universe ?? 0) > 0);
}

/**
 * Country bubbles for an audience + lens (category/answer).
 * Share = universe / total across markets.
 * @returns {{ code, name, universe, index, share }[]}
 */
export function countryBubblesForAudience(
  gwi,
  audienceKey,
  lens,
  markets,
  { fallbackPassion = CORE_PASSIONS[0] } = {}
) {
  if (!gwi || !audienceKey || !markets) return [];
  const use = lens?.category && lens?.answer ? lens : fallbackPassion;
  const rows = [];

  for (const [code, market] of Object.entries(markets)) {
    const countryKey = ISO_TO_GWI[code];
    if (!countryKey) continue;
    const m = gwi[audienceKey]?.[countryKey]?.[use.category]?.[use.answer];
    rows.push({
      code,
      name: market.name || code,
      universe: m?.universe ?? 0,
      index: m?.index ?? null,
      share: 0,
    });
  }

  const total = rows.reduce((a, r) => a + (r.universe || 0), 0) || 1;
  rows.forEach((r) => {
    r.share = r.universe / total;
  });
  rows.sort((a, b) => b.universe - a.universe);
  return rows;
}
