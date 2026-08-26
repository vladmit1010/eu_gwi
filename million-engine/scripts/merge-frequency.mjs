#!/usr/bin/env node
/**
 * Merge GWI frequency variants into one signal per platform/base.
 *
 * Only answers matching: "{Base}: {Frequency}"
 * Prefer Monthly as the kept representative (reach proxy).
 *
 * Usage:
 *   npm run merge-gwi              # dry-run
 *   npm run merge-gwi -- --write   # write output
 *   node scripts/merge-frequency.mjs --input data/gwi.before-merge.json --write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GWI_IN = path.join(ROOT, "data", "gwi.json");
const GWI_OUT = path.join(ROOT, "data", "gwi.json");

const FREQUENCY_RANK = [
  "More than once a day",
  "Daily",
  "Weekly",
  "Monthly",
  "Less than monthly",
];

const PICK_ORDER = [
  "Monthly",
  "Weekly",
  "Daily",
  "More than once a day",
  "Less than monthly",
];

const NON_FREQ_SUFFIXES = new Set([
  "follow",
  "important to me",
  "not important to me",
  "neutral",
  "describes me",
]);

const FREQ_RE = new RegExp(
  `^(?<base>.+?):\\s*(?<freq>${FREQUENCY_RANK.map(escapeRe).join("|")})\\s*$`,
  "i"
);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseFrequencyAnswer(answer) {
  const text = String(answer || "").trim();
  if (!text.includes(": ")) return null;

  const suffix = text.split(": ").pop().trim().toLowerCase();
  if (NON_FREQ_SUFFIXES.has(suffix)) return null;

  const m = text.match(FREQ_RE);
  if (!m) return null;

  const base = m.groups.base.trim();
  const freqRaw = m.groups.freq.trim();
  const canon = FREQUENCY_RANK.find((f) => f.toLowerCase() === freqRaw.toLowerCase());
  return [base, canon];
}

function pickRepresentative(variants) {
  const byFreq = {};
  for (const [answer, metrics] of Object.entries(variants)) {
    const parsed = parseFrequencyAnswer(answer);
    if (!parsed) continue;
    byFreq[parsed[1]] = [answer, metrics];
  }

  for (const pref of PICK_ORDER) {
    if (byFreq[pref]) {
      const [answer, metrics] = byFreq[pref];
      return [answer, pref, metrics];
    }
  }

  const [answer, metrics] = Object.entries(variants)[0];
  const parsed = parseFrequencyAnswer(answer);
  return [answer, parsed ? parsed[1] : "unknown", metrics];
}

export function mergeAnswerBlock(answers) {
  const groups = new Map();
  const passthrough = {};

  for (const [answer, metrics] of Object.entries(answers)) {
    const parsed = parseFrequencyAnswer(answer);
    if (!parsed) {
      passthrough[answer] = metrics;
      continue;
    }
    const [base] = parsed;
    if (!groups.has(base)) groups.set(base, {});
    groups.get(base)[answer] = metrics;
  }

  const merged = { ...passthrough };
  let collapsed = 0;
  const keptAs = [];

  for (const [base, variants] of groups) {
    const keys = Object.keys(variants);
    if (keys.length === 1) {
      const answer = keys[0];
      merged[answer] = variants[answer];
      continue;
    }

    const [, freq, metrics] = pickRepresentative(variants);
    const out = { ...metrics };
    out._frequency = freq;
    out._merged_from = Object.keys(variants).sort();
    merged[base] = out;
    collapsed += keys.length - 1;
    keptAs.push([base, freq, keys.length]);
  }

  return [
    merged,
    {
      in: Object.keys(answers).length,
      out: Object.keys(merged).length,
      collapsed,
      groups: keptAs,
    },
  ];
}

export function mergeGwi(gwi) {
  const out = structuredClone(gwi);
  const report = [];

  for (const [audience, countries] of Object.entries(out)) {
    if (!countries || typeof countries !== "object") continue;
    for (const [country, categories] of Object.entries(countries)) {
      if (!categories || typeof categories !== "object") continue;
      for (const [category, answers] of Object.entries(categories)) {
        if (!answers || typeof answers !== "object") continue;
        const [merged, stats] = mergeAnswerBlock(answers);
        categories[category] = merged;
        if (stats.collapsed) {
          report.push({ audience, country, category, ...stats });
        }
      }
    }
  }

  return [out, report];
}

function printReport(report, sampleGroups) {
  const totalCollapsed = report.reduce((n, r) => n + r.collapsed, 0);
  console.log("=== Frequency merge (dry-run) ===");
  console.log(`Category-country blocks touched: ${report.length}`);
  console.log(`Answers removed (collapsed):     ${totalCollapsed}`);
  console.log();
  console.log("Pick order:", PICK_ORDER.join(" > "));
  console.log("Never merge suffixes:", [...NON_FREQ_SUFFIXES].sort().join(", "));
  console.log();
  if (sampleGroups?.length) {
    console.log("Example groups:");
    for (const [base, freq, n] of sampleGroups.slice(0, 12)) {
      console.log(`  ${JSON.stringify(base).padEnd(40)}  keep=${freq.padEnd(22)}  from ${n} variants`);
    }
  }
  const social = report.find((r) => r.category.includes("Social"));
  if (social) {
    console.log(
      `\ne.g. ${social.audience} / ${social.country} / ${social.category}: ` +
        `${social.in} → ${social.out} answers (−${social.collapsed})`
    );
  }
}

function parseArgs(argv) {
  let input = GWI_IN;
  let output = GWI_OUT;
  let write = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") write = true;
    else if (a === "--input") input = path.resolve(argv[++i]);
    else if (a === "--output" || a === "-o") output = path.resolve(argv[++i]);
    else throw new Error(`Unknown flag: ${a}`);
  }
  return { input, output, write };
}

function main() {
  const { input, output, write } = parseArgs(process.argv.slice(2));
  const gwi = JSON.parse(fs.readFileSync(input, "utf8"));
  const [merged, report] = mergeGwi(gwi);

  let sampleGroups = [];
  try {
    const social =
      gwi.Affluent.austria["Named Social Media / Messaging Services Used"];
    sampleGroups = mergeAnswerBlock(social)[1].groups;
    printReport(report, sampleGroups);
    console.log("\nBefore → after (Austria Affluent, Viber*):");
    for (const a of Object.keys(social).sort()) {
      if (a.startsWith("Viber")) console.log(`  IN   ${a}`);
    }
    const after = mergeAnswerBlock(social)[0];
    for (const a of Object.keys(after).sort()) {
      if (a === "Viber" || a.startsWith("Viber")) {
        const m = after[a];
        console.log(
          `  OUT  ${a}  index=${m.index}  col%=${m.col_pct}  ` +
            `freq=${m._frequency}  from=${(m._merged_from || []).length}`
        );
      }
    }
  } catch {
    printReport(report, sampleGroups);
  }

  if (write) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${path.relative(ROOT, output)}`);
  } else {
    console.log("\n(No files written. Re-run with --write to save.)");
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
