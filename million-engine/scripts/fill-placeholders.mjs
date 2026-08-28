#!/usr/bin/env node
/**
 * Replace TBD placeholders in presentation.json on a firm laptop.
 *
 * replacements.json example:
 * {
 *   "Romania_F1_Potential": "1.2M",
 *   "Romania_F1_MCOffer_Description_1": "Real offer text…"
 * }
 *
 * Matches values like "TBD · Romania_F1_Potential" or exact tag strings.
 *
 * Usage:
 *   node scripts/fill-placeholders.mjs --map replacements.json
 *   node scripts/fill-placeholders.mjs --map replacements.json --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATA = path.join(ROOT, "data", "presentation.json");

function parseArgs(argv) {
  let mapPath = null;
  let dataPath = DEFAULT_DATA;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--map") mapPath = path.resolve(argv[++i]);
    else if (a === "--data") dataPath = path.resolve(argv[++i]);
    else if (a === "--dry-run") dryRun = true;
    else throw new Error(`Unknown flag: ${a}`);
  }
  if (!mapPath) throw new Error("Required: --map replacements.json");
  return { mapPath, dataPath, dryRun };
}

function walkReplace(node, replacements, stats) {
  if (typeof node === "string") {
    for (const [tag, value] of Object.entries(replacements)) {
      if (tag.startsWith("_")) continue;
      if (node === tag || node === `TBD · ${tag}` || node.endsWith(tag)) {
        stats.hits += 1;
        return String(value);
      }
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item) => walkReplace(item, replacements, stats));
  }
  if (node && typeof node === "object") {
    // Chart bar: { label, value, tag } — replace value when tag matches
    if (typeof node.tag === "string" && Object.prototype.hasOwnProperty.call(replacements, node.tag)) {
      stats.hits += 1;
      return {
        ...node,
        value: replacements[node.tag],
        label: walkReplace(node.label, replacements, stats),
      };
    }
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = walkReplace(v, replacements, stats);
    }
    return out;
  }
  return node;
}

function main() {
  const { mapPath, dataPath, dryRun } = parseArgs(process.argv.slice(2));
  const replacements = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const stats = { hits: 0 };
  const next = walkReplace(data, replacements, stats);

  console.log(`Matched ${stats.hits} placeholder value(s)`);
  if (dryRun) {
    console.log("(dry-run — no file written)");
    return;
  }
  fs.writeFileSync(dataPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(ROOT, dataPath)}`);
}

main();
