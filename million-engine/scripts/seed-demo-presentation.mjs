#!/usr/bin/env node
/**
 * Seed presentation.json — fictional demo invent (same order of magnitude as
 * a typical CEE card table: ~20M target, ~100M potential, ~0.5M max, ~0.1M expected).
 * Not client figures.
 *
 * Run: node scripts/seed-demo-presentation.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ACQUISITION_RATE = 0.005;
/** Calibrated so Austria expected lands ~14k (demo order of magnitude). */
const EXPECTED_RATE = 14_200 / (2_775_000 / 0.27);

/** Fictional inputs — shares of total sum to 100. */
const COUNTRIES = [
  { code: "AT", name: "Austria", slug: "Austria", target: 2_775_000, shareTotal: 15, marketShare: 27 },
  { code: "PL", name: "Poland", slug: "Poland", target: 5_180_000, shareTotal: 28, marketShare: 15 },
  { code: "RO", name: "Romania", slug: "Romania", target: 2_405_000, shareTotal: 13, marketShare: 19 },
  { code: "CZ", name: "Czechia", slug: "Czechia", target: 3_885_000, shareTotal: 21, marketShare: 22 },
  { code: "SK", name: "Slovakia", slug: "Slovakia", target: 1_480_000, shareTotal: 8, marketShare: 26 },
  { code: "HU", name: "Hungary", slug: "Hungary", target: 1_295_000, shareTotal: 7, marketShare: 14 },
  { code: "HR", name: "Croatia", slug: "Croatia", target: 925_000, shareTotal: 5, marketShare: 16 },
  { code: "RS", name: "Serbia", slug: "Serbia", target: 555_000, shareTotal: 3, marketShare: 10 },
];

const HOBBIES = [
  { id: "running_club", label: "Running Club", weight: 0.14 },
  { id: "mclaren_f1", label: "McLaren Mastercard F1", weight: 0.22 },
  { id: "music_live_nation", label: "Music · Live Nation", weight: 0.18 },
  { id: "music_other", label: "Music · Other", weight: 0.16 },
  { id: "gaming_mc_assets", label: "Gaming · MC assets", weight: 0.15 },
  { id: "gaming_other", label: "Gaming · Other", weight: 0.15 },
];

const YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function n(seed, min, max) {
  return min + (hash(seed) % (max - min + 1));
}

function round(x, d = 1) {
  const m = 10 ** d;
  return Math.round(x * m) / m;
}

function potentialOf(target, marketSharePct) {
  return Math.round(target / Math.max(marketSharePct / 100, 0.0001));
}

function yearSeries(seed, startVolume) {
  const growth_pct = YEARS.map((_, i) => round(n(`${seed}_gp${i}`, 8, 42) / 10, 1));
  let volume = Math.round(startVolume);
  const growth_volume = growth_pct.map((pct, i) => {
    volume = Math.round(volume * (1 + pct / 100));
    volume += n(`${seed}_gv${i}`, 0, 30) - 15;
    return Math.max(0, volume);
  });
  return { growth_pct, growth_volume };
}

function buildRow({ seed, target, shareTotal, marketShare, weight = 1 }) {
  const t = Math.round(target * weight);
  const ms = round(marketShare + (weight < 1 ? n(`${seed}_ms`, -30, 30) / 10 : 0), 1);
  const st = round(shareTotal * weight, 1);
  const pot = potentialOf(t, ms);
  const { growth_pct, growth_volume } = yearSeries(seed, pot * EXPECTED_RATE);
  return {
    target_audience: t,
    share_of_total_target_pct: st,
    market_share_pct: ms,
    // potential / max / expected are derived in the app from rates
    growth_pct,
    growth_volume,
  };
}

function build() {
  const countries = {};
  for (const c of COUNTRIES) {
    const base = buildRow({
      seed: `${c.slug}_base`,
      target: c.target,
      shareTotal: c.shareTotal,
      marketShare: c.marketShare,
    });
    const hobbies = {};
    for (const h of HOBBIES) {
      hobbies[h.id] = buildRow({
        seed: `${c.slug}_${h.id}`,
        target: c.target,
        shareTotal: c.shareTotal,
        marketShare: c.marketShare,
        weight: h.weight,
      });
    }
    const pot = potentialOf(c.target, c.marketShare);
    countries[c.code] = {
      name: c.name,
      slug: c.slug,
      peek: `${(c.target / 1e6).toFixed(1)}M target · demo`,
      teaser: `${c.shareTotal}% of total target · ${c.marketShare}% market share · potential ~${(pot / 1e6).toFixed(1)}M`,
      base,
      hobbies,
    };
  }

  return {
    _comment:
      "Fictional demo invent — same order of magnitude as a CEE card table, not client figures. Inputs only in rows. App derives: market_potential = target / (market_share%/100); max_acquisition = potential * rates.acquisition; expected_acquisition = potential * rates.expected.",
    meta: {
      title: "The Million Engine",
      tagline: "Mastercard × Erste",
      source: "Demo invent · editable acquisition rates",
      rates: {
        acquisition: ACQUISITION_RATE,
        expected: Number(EXPECTED_RATE.toFixed(8)),
      },
    },
    years: YEARS,
    hobbies: HOBBIES.map(({ id, label }) => ({ id, label })),
    countries,
  };
}

const data = build();
fs.writeFileSync(
  path.join(ROOT, "data", "presentation.json"),
  `${JSON.stringify(data, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(ROOT, "js", "data", "presentation.js"),
  `/** Auto-seeded — run: node scripts/seed-demo-presentation.mjs */\nexport const PRESENTATION_DATA = ${JSON.stringify(
    data,
    null,
    2
  )};\n`,
  "utf8"
);

const lines = [];
let tTarget = 0;
let tPot = 0;
let tMax = 0;
let tExp = 0;
for (const c of COUNTRIES) {
  const pot = potentialOf(c.target, c.marketShare);
  const max = Math.round(pot * ACQUISITION_RATE);
  const exp = Math.round(pot * EXPECTED_RATE);
  tTarget += c.target;
  tPot += pot;
  tMax += max;
  tExp += exp;
  lines.push(
    `${c.code}  target ${c.target.toLocaleString("en")}  share ${c.shareTotal}%  ms ${c.marketShare}%  pot ${pot.toLocaleString("en")}  max ${max.toLocaleString("en")}  exp ${exp.toLocaleString("en")}`
  );
}
console.log(lines.join("\n"));
console.log(
  `TOTAL target ${tTarget.toLocaleString("en")}  pot ${tPot.toLocaleString("en")}  max ${tMax.toLocaleString("en")}  exp ${tExp.toLocaleString("en")}`
);
console.log("rates", { acquisition: ACQUISITION_RATE, expected: Number(EXPECTED_RATE.toFixed(8)) });
