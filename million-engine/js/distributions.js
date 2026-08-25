/** Build sponsorship / social share mixes from GWI for map pies. */

import { ISO_TO_GWI } from "./gwi.js";
import { CORE_PASSIONS } from "./passions.js";

const SOCIAL_CAT = "Named Social Media / Messaging Services Used";

/** How many platforms to show in the pie (rest are omitted — multi-select overlap). */
const SOCIAL_TOP_N = 6;

const SOCIAL_BRAND = {
  Facebook: { short: "Facebook", color: "#1877f2" },
  "Facebook Messenger": { short: "Messenger", color: "#0084ff" },
  Instagram: { short: "Instagram", color: "#e1306c" },
  TikTok: { short: "TikTok", color: "#25f4ee" },
  "Telegram Messenger": { short: "Telegram", color: "#2aabee" },
  WhatsApp: { short: "WhatsApp", color: "#25d366" },
  Snapchat: { short: "Snapchat", color: "#fffc00" },
  Pinterest: { short: "Pinterest", color: "#e60023" },
  LinkedIn: { short: "LinkedIn", color: "#0a66c2" },
  X: { short: "X", color: "#e7e9ea" },
  Reddit: { short: "Reddit", color: "#ff4500" },
  Discord: { short: "Discord", color: "#5865f2" },
  Viber: { short: "Viber", color: "#7360f2" },
  Threads: { short: "Threads", color: "#c8c8c8" },
  "Apple iMessage": { short: "iMessage", color: "#34c759" },
  "Signal (Select Markets Only)": { short: "Signal", color: "#3a76f0" },
  "XING (Austria and Germany Only)": { short: "XING", color: "#006567" },
  "VK (Czech Republic Only)": { short: "VK", color: "#0077ff" },
};

const FALLBACK_COLORS = [
  "#ff5f00",
  "#5b8def",
  "#e8c547",
  "#9b6bff",
  "#2dd4bf",
  "#f472b6",
  "#94a3b8",
  "#fb923c",
];

const SPONSOR_COLORS = {
  f1: "#ff5f00",
  running: "#5b8def",
  live_music: "#e8c547",
};

export const MAP_AUDIENCES = [
  { id: "all", label: "All", gwi: "All Internet Users" },
  { id: "affluent", label: "Affluent", gwi: "Affluent" },
  { id: "genz", label: "Gen Z", gwi: "Gen Z" },
];

export const MAP_LENSES = [
  { id: "sponsors", label: "Global sponsorships" },
  { id: "social", label: "Social media" },
];

function pack(parts) {
  const sum = parts.reduce((a, p) => a + (p.universe || 0), 0);
  parts.forEach((p) => {
    p.share = sum > 0 ? (p.universe || 0) / sum : 1 / Math.max(parts.length, 1);
  });
  return parts;
}

function shortLabel(answer) {
  if (SOCIAL_BRAND[answer]?.short) return SOCIAL_BRAND[answer].short;
  return String(answer)
    .replace(/\s*\([^)]*Only\)\s*$/i, "")
    .replace(/\s*\(Select Markets Only\)\s*$/i, "")
    .trim();
}

function colorFor(answer, rank) {
  return SOCIAL_BRAND[answer]?.color || FALLBACK_COLORS[rank % FALLBACK_COLORS.length];
}

function sponsorsFor(gwi, gwiAud, countryKey) {
  return pack(
    CORE_PASSIONS.map((p) => {
      const m = gwi?.[gwiAud]?.[countryKey]?.[p.category]?.[p.answer];
      return {
        id: p.id,
        label: p.label,
        short: p.short,
        color: SPONSOR_COLORS[p.id] || "#ff5f00",
        index: m?.index ?? null,
        universe: m?.universe ?? 0,
      };
    })
  );
}

/** Rank named social/messaging answers by Erste-wide universe for one audience. */
function topSocialAnswers(gwi, gwiAud, countryKeys, n = SOCIAL_TOP_N) {
  const totals = new Map();
  for (const countryKey of countryKeys) {
    const block = gwi?.[gwiAud]?.[countryKey]?.[SOCIAL_CAT] || {};
    for (const [answer, metric] of Object.entries(block)) {
      const u = metric?.universe || 0;
      if (u <= 0) continue;
      totals.set(answer, (totals.get(answer) || 0) + u);
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([answer], i) => ({
      id: `social:${answer}`,
      answer,
      label: shortLabel(answer),
      short: shortLabel(answer),
      color: colorFor(answer, i),
    }));
}

function socialFor(gwi, gwiAud, countryKey, defs) {
  return pack(
    defs.map((s) => {
      const m = gwi?.[gwiAud]?.[countryKey]?.[SOCIAL_CAT]?.[s.answer];
      return {
        id: s.id,
        label: s.label,
        short: s.short,
        color: s.color,
        index: m?.index ?? null,
        universe: m?.universe ?? 0,
      };
    })
  );
}

/** @returns catalog with per-audience social top-N (Erste-wide rank). */
export function buildDistributionCatalog(gwi, markets) {
  const out = {
    audiences: {},
    modes: {
      sponsors: {
        id: "sponsors",
        label: "Global sponsorships",
        tipTitle: "sponsorship mix",
        legend: CORE_PASSIONS.map((p) => ({
          id: p.id,
          label: p.label,
          short: p.short,
          color: SPONSOR_COLORS[p.id] || "#ff5f00",
        })),
      },
      social: {
        id: "social",
        label: "Social media",
        tipTitle: `top ${SOCIAL_TOP_N} social mix`,
        note: `Top ${SOCIAL_TOP_N} by reach across Erste · pie = relative mix (platforms overlap)`,
        legend: [],
      },
    },
  };

  const countryKeys = Object.keys(markets || {})
    .map((code) => ISO_TO_GWI[code])
    .filter(Boolean);

  for (const aud of MAP_AUDIENCES) {
    const socialDefs = topSocialAnswers(gwi, aud.gwi, countryKeys, SOCIAL_TOP_N);
    const marketsOut = {};
    const heat = {};
    for (const code of Object.keys(markets || {})) {
      const countryKey = ISO_TO_GWI[code];
      if (!countryKey) continue;
      const sponsors = sponsorsFor(gwi, aud.gwi, countryKey);
      const social = socialFor(gwi, aud.gwi, countryKey, socialDefs);
      marketsOut[code] = {
        name: markets[code]?.name || code,
        sponsors,
        social,
      };
      heat[code] = sponsors.find((s) => s.id === "f1")?.index ?? null;
    }
    out.audiences[aud.id] = {
      id: aud.id,
      label: aud.label,
      gwi: aud.gwi,
      markets: marketsOut,
      heat,
      socialLegend: socialDefs.map(({ id, label, short, color }) => ({
        id,
        label,
        short,
        color,
      })),
    };
  }

  // Default legend = All audience top-N
  out.modes.social.legend = out.audiences.all?.socialLegend || [];
  return out;
}

export function slicesFor(catalog, audienceId, lensId, code) {
  const m = catalog?.audiences?.[audienceId]?.markets?.[code];
  if (!m) return [];
  return lensId === "social" ? m.social : m.sponsors;
}

export function legendFor(catalog, audienceId, lensId) {
  if (lensId === "social") {
    return (
      catalog?.audiences?.[audienceId]?.socialLegend ||
      catalog?.modes?.social?.legend ||
      []
    );
  }
  return catalog?.modes?.sponsors?.legend || [];
}

export function gwiKeyForMapAudience(audienceId) {
  return MAP_AUDIENCES.find((a) => a.id === audienceId)?.gwi || "Affluent";
}
