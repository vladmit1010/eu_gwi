#!/usr/bin/env node
/**
 * Parse GWI Erste/Mastercard Excel export into nested JSON:
 *
 *   audience → country → question category → answer → metrics
 *
 * Usage:
 *   npm run parse-gwi
 *   node scripts/parse-gwi.mjs /path/to/Export.xlsx -o data/gwi.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_XLSX = path.resolve(ROOT, "..", "Erste_Mastercard-Export.xlsx");
const DEFAULT_OUT = path.join(ROOT, "data", "gwi.json");

const AUDIENCE_MAP = {
  "Affluent - Erste Markets": "Affluent",
  "Gen Z - Erste Markets": "Gen Z",
  "All Internet Users (Audience Size)": "All Internet Users",
};

const HEADER_ROW = 14; // 1-based
const DATA_START = 20;
const METRICS_PER_BLOCK = 5; // Universe, Responses, Column %, Row %, Index

function slugCountry(raw) {
  return String(raw)
    .replace(/\s*\(Country\)\s*$/i, "")
    .trim()
    .toLowerCase();
}

function audienceKey(sheetName, baseCell) {
  if (AUDIENCE_MAP[sheetName]) return AUDIENCE_MAP[sheetName];
  for (const [title, key] of Object.entries(AUDIENCE_MAP)) {
    if (sheetName.startsWith(title.slice(0, 20)) || title.startsWith(sheetName.slice(0, 20))) {
      return key;
    }
  }
  if (baseCell && String(baseCell).startsWith("Base:")) {
    const raw = String(baseCell).replace("Base:", "").trim();
    if (raw.includes(" - ")) return raw.split(" - ")[0].trim();
    return raw;
  }
  return sheetName.split("(")[0].trim();
}

function cleanCategory(raw) {
  const text = String(raw || "")
    .trim()
    .replace(/\*+$/, "")
    .trim();
  return text || "Other";
}

function splitAnswer(answerRaw, category) {
  const text = String(answerRaw || "").trim();
  if (!text) return "unknown";
  const m = text.match(/^(.*?)\s*\([^)]*\)\s*$/);
  if (m) return m[1].trim() || text;
  if (text === category) return text;
  return text;
}

function cell(ws, row1, col1) {
  const addr = XLSX.utils.encode_cell({ r: row1 - 1, c: col1 - 1 });
  const c = ws[addr];
  return c == null ? null : c.v;
}

function sheetMax(ws) {
  const ref = ws["!ref"];
  if (!ref) return { maxRow: DATA_START, maxCol: 1 };
  const range = XLSX.utils.decode_range(ref);
  return { maxRow: range.e.r + 1, maxCol: range.e.c + 1 };
}

function readCountries(ws) {
  const { maxCol } = sheetMax(ws);
  const out = [];
  for (let col = 1; col <= maxCol; col++) {
    const val = cell(ws, HEADER_ROW, col);
    if (val == null || val === "") continue;
    const text = String(val).trim();
    if (["name", "metric", "totals", ""].includes(text.toLowerCase())) continue;
    if (text.toLowerCase().includes("(country)")) {
      out.push([col, slugCountry(text)]);
    }
  }
  return out;
}

function parseBlockMetrics(ws, startRow, maxCol) {
  const metrics = {};
  for (let offset = 0; offset < METRICS_PER_BLOCK; offset++) {
    const r = startRow + offset;
    const nameRaw = cell(ws, r, 4);
    if (nameRaw == null || nameRaw === "") continue;
    const name = String(nameRaw).trim();
    const byCol = {};
    for (let col = 5; col <= maxCol; col++) {
      const v = cell(ws, r, col);
      if (typeof v === "number") byCol[col] = v;
    }
    metrics[name] = byCol;
  }
  return metrics;
}

function parseSheet(ws, sheetName) {
  const base = cell(ws, 7, 2);
  const audience = audienceKey(sheetName, base != null ? String(base) : null);
  const countries = readCountries(ws);
  if (!countries.length) throw new Error(`No countries found on sheet: ${sheetName}`);

  const { maxRow, maxCol } = sheetMax(ws);
  const tree = Object.fromEntries(countries.map(([, code]) => [code, {}]));
  let lastCategory = "Other";

  let row = DATA_START;
  while (row <= maxRow) {
    const metric = cell(ws, row, 4);
    const answerCell = cell(ws, row, 3);
    const questionCell = cell(ws, row, 2);

    if (String(metric || "").trim() !== "Universe") {
      row += 1;
      continue;
    }

    if (String(answerCell || "").trim() === "Totals") {
      row += METRICS_PER_BLOCK;
      continue;
    }

    if (questionCell) lastCategory = cleanCategory(String(questionCell));
    const category = lastCategory;
    const answer = splitAnswer(answerCell != null ? String(answerCell) : null, category);

    const metrics = parseBlockMetrics(ws, row, maxCol);
    const indexByCol = metrics.Index || {};
    const colpctByCol = metrics["Column %"] || {};
    const universeByCol = metrics.Universe || {};
    const responsesByCol = metrics.Responses || {};
    const rowpctByCol = metrics["Row %"] || {};

    for (const [col, country] of countries) {
      const colRaw = colpctByCol[col];
      const entry = {
        index: col in indexByCol ? Math.round(indexByCol[col] * 10) / 10 : null,
        col_pct: colRaw != null ? Math.round(colRaw * 1000) / 10 : null,
      };
      if (col in universeByCol) entry.universe = Math.round(universeByCol[col]);
      if (col in responsesByCol) entry.responses = Math.round(responsesByCol[col]);
      if (col in rowpctByCol) entry.row_pct = Math.round(rowpctByCol[col] * 1000) / 10;

      if (entry.index == null && entry.col_pct == null) continue;
      if (!tree[country][category]) tree[country][category] = {};
      tree[country][category][answer] = entry;
    }

    row += METRICS_PER_BLOCK;
  }

  return { [audience]: tree };
}

function parseWorkbook(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath, { cellDates: false });
  const root = {};
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const part = parseSheet(ws, sheetName);
    for (const [audience, countries] of Object.entries(part)) {
      root[audience] = countries;
    }
  }
  return root;
}

function parseArgs(argv) {
  let xlsx = DEFAULT_XLSX;
  let output = DEFAULT_OUT;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--output") {
      output = path.resolve(argv[++i]);
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      rest.push(a);
    }
  }
  if (rest[0]) xlsx = path.resolve(rest[0]);
  return { xlsx, output };
}

function main() {
  const { xlsx, output } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(xlsx)) {
    console.error(`File not found: ${xlsx}`);
    process.exit(1);
  }

  const data = parseWorkbook(xlsx);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`Wrote ${path.relative(ROOT, output)}`);
  for (const [audience, countries] of Object.entries(data)) {
    const sampleCountry = Object.keys(countries)[0];
    const cats = Object.keys(countries[sampleCountry] || {});
    const nAnswers = cats.reduce((n, c) => n + Object.keys(countries[sampleCountry][c]).length, 0);
    console.log(
      `  ${audience}: ${Object.keys(countries).length} countries, ~${cats.length} categories, ~${nAnswers} answers`
    );
    console.log(`       categories: ${cats.slice(0, 6).join(", ")}${cats.length > 6 ? "..." : ""}`);
  }

  try {
    const demo = data["Gen Z"].serbia["Music Genres"]["80s music"];
    console.log("\nDemo path Gen Z → serbia → Music Genres → 80s music:");
    console.log(" ", demo);
    const aff = data.Affluent.serbia["Music Genres"]["80s music"];
    console.log("Compare Affluent serbia same answer:");
    console.log(" ", aff);
  } catch (e) {
    console.log("Demo path missing:", e.message);
  }
}

main();
