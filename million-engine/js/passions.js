/** Global sponsorship passions + discovery of most-liked themes (GWI). */

import { ISO_TO_GWI } from "./gwi.js";

export const CORE_PASSIONS = [
  {
    id: "f1",
    label: "Formula 1",
    short: "F1",
    kind: "global",
    blurb: "Global sponsorship · motor sport",
    note: "Map: Interest in motor sports (e.g. Formula 1) across Erste markets",
    category: "Sports Followed",
    answer: "Motor sports (e.g. Formula 1): Follow",
  },
  {
    id: "running",
    label: "Running & fitness",
    short: "Running",
    kind: "global",
    blurb: "Global sponsorship · running / jogging",
    note: "Map: Interest in fitness & exercise across Erste markets",
    category: "Personal Interests",
    answer: "Fitness & exercise",
  },
  {
    id: "live_music",
    label: "Live music",
    short: "Live music",
    kind: "global",
    blurb: "Global sponsorship · festivals & live events",
    note: "Map: Interest in live events & music festivals across Erste markets",
    category: "Personal Interests",
    answer: "Live events (e.g. music festivals)",
  },
];

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

/** Friendly labels for GWI category keys (Explore drill-down). */
export const CATEGORY_META = {
  "Personal Interests": {
    label: "Interests",
    short: "Interests",
    blurb: "Hobbies & leisure",
  },
  "Sports Followed": {
    label: "Sports followed",
    short: "Sports followed",
    blurb: "Sports followed",
  },
  "Music Genres": {
    label: "Music",
    short: "Music",
    blurb: "Music genres",
  },
  "Attitudes: Values": { label: "Values", short: "Values", blurb: "What matters" },
  "Attitudes: Character": {
    label: "Character",
    short: "Character",
    blurb: "Self-description",
  },
  "Named Social Media / Messaging Services Used": {
    label: "Social Network usage",
    short: "Social Network usage",
    blurb: "Apps & messaging",
  },
};

/** Passion / touchpoint fields shown after picking Affluent or Gen Z (no Values/Character). */
export const EXPLORE_THEME_FIELDS = [
  {
    id: "field:interests",
    category: "Personal Interests",
    pack: null,
    label: "Interests",
  },
  {
    id: "field:sports",
    category: "Sports Followed",
    pack: null,
    label: "Sports followed",
  },
  {
    id: "field:music",
    category: "Music Genres",
    pack: null,
    label: "Music",
  },
  {
    id: "field:social",
    category: "Named Social Media / Messaging Services Used",
    pack: null,
    label: "Social Network usage",
  },
  {
    id: "field:media",
    category: "Personal Interests",
    pack: "media",
    label: "Media Touchpoints",
  },
];

/** Personal Interests answers treated as media touchpoints. */
const MEDIA_TOUCHPOINT_ANSWERS = new Set([
  "Television",
  "Films / cinema",
  "Reality TV",
  "News / current affairs",
  "Celebrity news / gossip",
  "Music",
  "Watching sport",
  "Esports",
  "Gaming",
  "Books / literature",
  "Radio",
  "Podcasts",
]);

const ANSWER_OTHER = /^Other\b/i;

function cleanAnswerLabel(category, answer) {
  if (category === "Sports Followed") {
    return answer.replace(/:\s*Follow\s*$/i, "").trim();
  }
  if (category === "Attitudes: Values") {
    return answer.replace(/:\s*Important to me\s*$/i, "").trim();
  }
  if (category === "Attitudes: Character") {
    return answer.replace(/:\s*Describes me\s*$/i, "").trim();
  }
  return answer;
}

function includeAnswer(category, answer) {
  if (ANSWER_OTHER.test(answer)) return false;
  if (category === "Attitudes: Values" && !answer.endsWith(": Important to me")) return false;
  if (category === "Attitudes: Character" && !answer.endsWith(": Describes me")) return false;
  return true;
}

/**
 * Who split for a country on a lens (Affluent vs Gen Z universe).
 */
export function whoSplitForCountry(gwi, countryKey, lens) {
  const use = lens?.category && lens?.answer ? lens : CORE_PASSIONS[0];
  const rows = ["Affluent", "Gen Z"].map((aud) => {
    const m = gwi?.[aud]?.[countryKey]?.[use.category]?.[use.answer];
    return {
      key: aud,
      label: aud,
      universe: m?.universe ?? 0,
      index: m?.index ?? null,
      share: 0,
    };
  });
  const total = rows.reduce((a, r) => a + r.universe, 0) || 1;
  rows.forEach((r) => {
    r.share = r.universe / total;
  });
  return { lens: use, rows, total };
}

/**
 * Answer bubbles inside a category (or global / media pack).
 */
export function answerBubblesForCategory(
  gwi,
  audienceKey,
  countryKey,
  { category = null, pack = null, limit = 7 } = {}
) {
  if (pack === "global") {
    return coreMetricsForCountry(gwi, audienceKey, countryKey)
      .filter((p) => (p.universe ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        label: p.label,
        short: p.short,
        kind: "global",
        category: p.category,
        answer: p.answer,
        universe: p.universe ?? 0,
        index: p.index,
      }))
      .sort((a, b) => b.universe - a.universe || (b.index || 0) - (a.index || 0))
      .slice(0, limit);
  }

  if (pack === "media") {
    const interests = gwi?.[audienceKey]?.[countryKey]?.["Personal Interests"];
    if (!interests) return [];
    return Object.entries(interests)
      .filter(([answer]) => MEDIA_TOUCHPOINT_ANSWERS.has(answer))
      .map(([answer, m]) => {
        const label = cleanAnswerLabel("Personal Interests", answer);
        return {
          id: `answer:media:${answer}`,
          label,
          short: shortLabel(label, 14),
          kind: "local",
          category: "Personal Interests",
          answer,
          universe: m?.universe ?? 0,
          index: m?.index ?? null,
        };
      })
      .filter((r) => (r.universe ?? 0) > 0)
      .sort((a, b) => b.universe - a.universe || (b.index || 0) - (a.index || 0))
      .slice(0, limit);
  }

  const answers = gwi?.[audienceKey]?.[countryKey]?.[category];
  if (!answers) return [];

  return Object.entries(answers)
    .filter(([answer]) => includeAnswer(category, answer))
    .map(([answer, m]) => {
      const label = cleanAnswerLabel(category, answer);
      return {
        id: `answer:${category}:${answer}`,
        label,
        short: shortLabel(label, 14),
        kind: "local",
        category,
        answer,
        universe: m?.universe ?? 0,
        index: m?.index ?? null,
      };
    })
    .filter((r) => (r.universe ?? 0) > 0)
    .sort((a, b) => b.universe - a.universe || (b.index || 0) - (a.index || 0))
    .slice(0, limit);
}

/** Theme-field buttons for the audience mini-menu (labels only, no numbers). */
export function themeFieldsForMenu() {
  return EXPLORE_THEME_FIELDS.map((f) => ({
    id: f.id,
    kind: "theme-field",
    pack: f.pack,
    category: f.category,
    label: f.label,
    short: f.label,
  }));
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
