#!/usr/bin/env node
/**
 * Seed presentation.json — fictional demo invent (CEE order of magnitude).
 * Excel formulas:
 *   ShareTotal = Target / Σ Target
 *   Potential  = Target / MarketShare
 *   Max        = Potential × AcquisitionPotential (0.50%)
 *   Expected   = Max × MarketShare (= Target × rate)
 *
 * Run: node scripts/seed-demo-presentation.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ACQUISITION_RATE = 0.005;

/** Fictional inputs — shares of total recomputed from targets. */
const COUNTRIES = [
  { code: "AT", name: "Austria", slug: "Austria", target: 2_775_000, marketShare: 27 },
  { code: "PL", name: "Poland", slug: "Poland", target: 5_180_000, marketShare: 15 },
  { code: "RO", name: "Romania", slug: "Romania", target: 2_405_000, marketShare: 19 },
  { code: "CZ", name: "Czechia", slug: "Czechia", target: 3_885_000, marketShare: 22 },
  { code: "SK", name: "Slovakia", slug: "Slovakia", target: 1_480_000, marketShare: 26 },
  { code: "HU", name: "Hungary", slug: "Hungary", target: 1_295_000, marketShare: 14 },
  { code: "HR", name: "Croatia", slug: "Croatia", target: 925_000, marketShare: 16 },
  { code: "RS", name: "Serbia", slug: "Serbia", target: 555_000, marketShare: 10 },
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

function excelRow(target, marketSharePct, acquisitionRate = ACQUISITION_RATE) {
  const pot = potentialOf(target, marketSharePct);
  const max = Math.round(pot * acquisitionRate);
  const exp = Math.round(max * (marketSharePct / 100));
  return { pot, max, exp };
}

function yearSeries(seed, expected) {
  // Excel J…R: nine growth rates between ten PP acquisition years
  const growth_pct = Array.from({ length: 9 }, (_, i) => round(n(`${seed}_gp${i}`, 8, 42) / 10, 1));
  const growth_volume = (() => {
    const out = [Math.round(expected)];
    let v = out[0];
    for (const pct of growth_pct) {
      v = Math.round(v * (1 + pct / 100));
      out.push(v);
    }
    return out;
  })();
  return { growth_pct, growth_volume };
}

function buildRow({ seed, target, marketShare, shareTotal, weight = 1 }) {
  const t = Math.round(target * weight);
  const ms = round(marketShare + (weight < 1 ? n(`${seed}_ms`, -30, 30) / 10 : 0), 1);
  const st = round(shareTotal * weight, 1);
  const { exp } = excelRow(t, ms);
  const { growth_pct, growth_volume } = yearSeries(seed, exp);
  return {
    target_audience: t,
    share_of_total_target_pct: st,
    market_share_pct: ms,
    growth_pct,
    growth_volume,
  };
}

function build() {
  const sumTarget = COUNTRIES.reduce((s, c) => s + c.target, 0);
  const countries = {};
  for (const c of COUNTRIES) {
    const shareTotal = round((100 * c.target) / sumTarget, 1);
    const base = buildRow({
      seed: `${c.slug}_base`,
      target: c.target,
      marketShare: c.marketShare,
      shareTotal,
    });
    const hobbies = {};
    for (const h of HOBBIES) {
      hobbies[h.id] = buildRow({
        seed: `${c.slug}_${h.id}`,
        target: c.target,
        marketShare: c.marketShare,
        shareTotal,
        weight: h.weight,
      });
    }
    const { pot, max, exp } = excelRow(c.target, c.marketShare);
    countries[c.code] = {
      name: c.name,
      slug: c.slug,
      peek: `${(c.target / 1e6).toFixed(1)}M target · demo`,
      teaser: `${shareTotal}% of total · ${c.marketShare}% market share · potential ~${(pot / 1e6).toFixed(1)}M · expected ${Math.round(exp / 1000)}k`,
      base,
      hobbies,
    };
  }

  return {
    _comment:
      "Fictional demo invent. Excel: Potential=Target/MarketShare; Max=Potential×acquisition; Expected=Max×MarketShare. Only Target + MarketShare + acquisition rate are inputs.",
    meta: {
      title: "The Million Engine",
      tagline: "Mastercard × Erste",
      source: "Demo invent · Excel acquisition formulas",
      rates: { acquisition: ACQUISITION_RATE },
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

const sumT = COUNTRIES.reduce((s, c) => s + c.target, 0);
let tPot = 0;
let tMax = 0;
let tExp = 0;
for (const c of COUNTRIES) {
  const { pot, max, exp } = excelRow(c.target, c.marketShare);
  tPot += pot;
  tMax += max;
  tExp += exp;
  const share = round((100 * c.target) / sumT, 1);
  console.log(
    `${c.code}  target ${c.target.toLocaleString("en")}  share ${share}%  ms ${c.marketShare}%  pot ${pot.toLocaleString("en")}  max ${max.toLocaleString("en")}  exp ${exp.toLocaleString("en")}`
  );
}
console.log(
  `TOTAL target ${sumT.toLocaleString("en")}  pot ${tPot.toLocaleString("en")}  max ${tMax.toLocaleString("en")}  exp ${tExp.toLocaleString("en")}`
);
console.log("rates", { acquisition: ACQUISITION_RATE });
