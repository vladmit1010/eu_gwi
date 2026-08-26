#!/usr/bin/env node
/**
 * Build slim data/markets.json + js/data/markets.js from gwi.json.
 * Names + 1M contribution share only (signal data stays in gwi.json).
 *
 * Usage:
 *   npm run build-markets
 *   node scripts/build-markets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GWI = path.join(ROOT, "data", "gwi.json");
const OUT = path.join(ROOT, "data", "markets.json");
const JS_OUT = path.join(ROOT, "js", "data", "markets.js");

const COUNTRY = {
  austria: ["AT", "Austria"],
  croatia: ["HR", "Croatia"],
  "czech republic": ["CZ", "Czechia"],
  hungary: ["HU", "Hungary"],
  romania: ["RO", "Romania"],
  serbia: ["RS", "Serbia"],
};

const TARGET = 1_000_000;

function* iterAnswers(countryBlock) {
  for (const answers of Object.values(countryBlock || {})) {
    if (!answers || typeof answers !== "object") continue;
    for (const metrics of Object.values(answers)) {
      if (
        metrics &&
        typeof metrics === "object" &&
        ("index" in metrics || "col_pct" in metrics || "universe" in metrics)
      ) {
        yield metrics;
      }
    }
  }
}

function countryPool(gwi, audience, countryKey) {
  const universes = [...iterAnswers(gwi[audience][countryKey])]
    .map((m) => m.universe || 0)
    .sort((a, b) => a - b);
  if (!universes.length) return 0;
  return universes[Math.floor(universes.length * 0.9)];
}

function main() {
  const gwi = JSON.parse(fs.readFileSync(GWI, "utf8"));
  const pools = {};
  for (const [ck, [code]] of Object.entries(COUNTRY)) {
    pools[code] = countryPool(gwi, "Affluent", ck);
  }
  const total = Object.values(pools).reduce((a, b) => a + b, 0) || 1;

  const markets = {};
  for (const [ck, [code, name]] of Object.entries(COUNTRY)) {
    markets[code] = {
      name,
      contribution: Math.round((TARGET * pools[code]) / total),
    };
  }

  const diff = TARGET - Object.values(markets).reduce((a, m) => a + m.contribution, 0);
  markets.RO.contribution += diff;

  const payload = {
    meta: {
      target: TARGET,
      title: "The Million Engine",
      source: "GWI Core · Erste markets (AT, HR, CZ, HU, RO, RS)",
    },
    themes: [
      { id: "affluent", label: "Affluent" },
      { id: "genz", label: "Gen Z" },
    ],
    markets,
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(OUT, json, "utf8");
  fs.writeFileSync(
    JS_OUT,
    `/** Built from GWI — run: npm run build-markets */\nexport const SAMPLE_DATA = ${JSON.stringify(
      payload,
      null,
      2
    )};\n`,
    "utf8"
  );

  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log(`Wrote ${path.relative(ROOT, JS_OUT)}`);
  console.log(
    Object.fromEntries(Object.entries(markets).map(([c, m]) => [c, m.contribution]))
  );
}

main();
