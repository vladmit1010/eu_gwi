#!/usr/bin/env node
/**
 * Seed demo presentation.json + js/data/presentation.js with invented
 * (non-client) numbers and schematic chart series. Replace via Import later.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TOPICS = [
  { id: "F1", label: "Formula 1" },
  { id: "Running", label: "Running" },
  { id: "LiveMusic", label: "Live music" },
];

const COUNTRIES = [
  { code: "AT", name: "Austria", slug: "Austria" },
  { code: "HR", name: "Croatia", slug: "Croatia" },
  { code: "CZ", name: "Czechia", slug: "Czechia" },
  { code: "HU", name: "Hungary", slug: "Hungary" },
  { code: "RO", name: "Romania", slug: "Romania" },
  { code: "RS", name: "Serbia", slug: "Serbia" },
  { code: "SI", name: "Slovenia", slug: "Slovenia" },
  { code: "SK", name: "Slovakia", slug: "Slovakia" },
];

/** Deterministic fake ints from a string seed */
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

function people(seed) {
  const k = n(seed, 180, 2400);
  if (k >= 1000) return `${(k / 1000).toFixed(1)}M`;
  return `${k}k`;
}

function pct(seed) {
  return `${n(seed, 12, 48)}%`;
}

function index(seed) {
  return String(n(seed, 88, 132));
}

function topicOffer(country, topic) {
  const base = `${country.slug}_${topic.id}`;
  const potential = people(`${base}_pot`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return {
    potential,
    offer: {
      title: `${topic.label} opportunity in ${country.name}`,
      description_1: `Demo narrative for ${country.name} × ${topic.label}: partner touchpoints and card propositions for all users (replace via Import).`,
      description_2: `Schematic only — ${base}_MCOffer_Description_2. Swap this JSON on a firm laptop before the client deck.`,
      statistic_1: `${index(`${base}_i`)} Interest`,
      statistic_2: `${pct(`${base}_p`)} of all users`,
      chart: {
        title: `${topic.label} · All users over time`,
        caption: `Demo time series · tags ${base}_Chart_* · replace via Import`,
        bars: months.map((label, i) => ({
          label,
          value: n(`${base}_t${i}`, 72, 128),
          tag: `${base}_Chart_Bar_${label}`,
        })),
      },
    },
  };
}

function build() {
  const countries = {};
  for (const c of COUNTRIES) {
    const topics = {};
    for (const t of TOPICS) topics[t.id] = topicOffer(c, t);
    countries[c.code] = {
      name: c.name,
      slug: c.slug,
      peek: `${people(`${c.slug}_peek`)} addressable · demo`,
      teaser: `3 sponsorship themes ready · ${c.name} (demo data)`,
      topics,
    };
  }

  return {
    _comment:
      "Demo invent data for layout. Replace entire file via Import or fill-placeholders. Tags remain on chart.bars[].tag. Countries: AT HR CZ HU RO RS SI SK. Topics: F1 Running LiveMusic.",
    meta: {
      title: "The Million Engine",
      tagline: "Mastercard × Erste",
      source: "Demo schematic data · replace via Import before client use",
    },
    topics: TOPICS,
    countries,
  };
}

const data = build();
const jsonPath = path.join(ROOT, "data", "presentation.json");
const jsPath = path.join(ROOT, "js", "data", "presentation.js");
fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
fs.writeFileSync(
  jsPath,
  `/** Auto-seeded demo fallback — run: node scripts/seed-demo-presentation.mjs */\nexport const PRESENTATION_DATA = ${JSON.stringify(
    data,
    null,
    2
  )};\n`,
  "utf8"
);
console.log(`Wrote ${path.relative(ROOT, jsonPath)}`);
console.log(`Wrote ${path.relative(ROOT, jsPath)}`);
console.log(`Countries: ${Object.keys(data.countries).join(", ")}`);
