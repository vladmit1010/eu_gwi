/**
 * Parse Erste RFP Excel (sheet "Acquisition Potential") → presentation + Fable tags.
 * Browser: global XLSX. Node: pass workbook from `xlsx`.
 *
 * Layout (masterexcel.xlsx):
 *  - Row “Market Potential and Growth” table: Countries…PP10 acq
 *  - Variable: Acquisition potential
 *  - Blocks “Acquisition Potential: <hobby>” with PP1…PP10 per country
 */

export const COUNTRY_ALIAS = {
  austria: "AT",
  poland: "PL",
  romania: "RO",
  czechia: "CZ",
  "czech republic": "CZ",
  slovakia: "SK",
  hungary: "HU",
  croatia: "HR",
  serbia: "RS",
  at: "AT",
  pl: "PL",
  ro: "RO",
  cz: "CZ",
  sk: "SK",
  hu: "HU",
  hr: "HR",
  rs: "RS",
};

export const PASSION_IDS = [
  { id: "RUN", hobby: "running_club", label: "Running Club", match: /running/i },
  { id: "F1", hobby: "mclaren_f1", label: "McLaren Mastercard F1", match: /mclaren|f1/i },
  { id: "MUSLN", hobby: "music_live_nation", label: "Music · Live Nation", match: /live\s*nation/i },
  { id: "MUSOT", hobby: "music_other", label: "Music · Other", match: /music.*other|other.*music/i },
  { id: "GAMMC", hobby: "gaming_mc_assets", label: "Gaming · MC assets", match: /gaming.*mc|mc\s*assets/i },
  { id: "GAMOT", hobby: "gaming_other", label: "Gaming · Other", match: /gaming.*other|other.*gaming/i },
];

function normHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/[''′]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function num(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s || /^yes|no|partially$/i.test(s)) return NaN;
  const pct = /%$/.test(s);
  s = s.replace(/%/g, "").replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^\d+,\d+$/.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  if (pct) return n;
  return n;
}

/** Excel % cells are often 0.29 → display as 29 */
function asPctPoints(v) {
  const n = num(v);
  if (!Number.isFinite(n)) return NaN;
  if (n > 0 && n <= 1) return Math.round(n * 10000) / 100; // 0.29 → 29, 0.005 → 0.5
  return n;
}

function countryCode(name) {
  const key = String(name || "")
    .trim()
    .toLowerCase();
  return COUNTRY_ALIAS[key] || null;
}

function fmtVol(v) {
  if (!Number.isFinite(v)) return 0;
  if (Math.abs(v) >= 10) return Math.round(v);
  if (Math.abs(v) >= 1) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "—";
  const x = Math.round(n * 100) / 100;
  return `${x % 1 ? x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : x}%`;
}

function findCol(headers, predicates) {
  for (let i = 0; i < headers.length; i++) {
    const h = normHeader(headers[i]);
    if (predicates.some((fn) => fn(h))) return i;
  }
  return -1;
}

function isAcqHeader(h) {
  return (
    h.includes("incl") ||
    h.includes("acquistion") || // Excel typo
    h.includes("acquisition") ||
    (h.includes("pp") && h.includes("acq"))
  );
}

function detectMasterHeaderRow(matrix) {
  for (let r = 0; r < Math.min(matrix.length, 40); r++) {
    const headers = matrix[r].map(normHeader);
    const hasCountry = headers.some((h) => h === "countries" || h === "country");
    const hasTarget = headers.some((h) => h.includes("target"));
    const hasMs = headers.some((h) => h.includes("market share"));
    if (hasCountry && hasTarget && hasMs) return r;
  }
  return -1;
}

function readAcquisitionRate(matrix, fallback = 0.005) {
  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const a = String(matrix[r]?.[1] || "").toLowerCase();
    if (a.includes("acquisition potential") && !a.includes("expected") && !a.includes(":")) {
      const v = num(matrix[r][2]);
      if (!Number.isFinite(v)) continue;
      // 0.005 or 0.5(%) or scrubbed 1
      if (v > 0 && v <= 1) return v; // 0.005 or 50% as 0.5
      if (v > 1 && v <= 100) return v / 100; // 0.5 written as 0.5% cell sometimes as 0.5
      return fallback;
    }
  }
  return fallback;
}

function parseCountryBlock(matrix, titleRegex) {
  let titleRow = -1;
  for (let r = 0; r < matrix.length; r++) {
    const label = String(matrix[r]?.[1] || matrix[r]?.[0] || "");
    if (titleRegex.test(label)) {
      titleRow = r;
      break;
    }
  }
  if (titleRow < 0) return null;

  let headerRow = -1;
  for (let r = titleRow + 1; r < Math.min(titleRow + 6, matrix.length); r++) {
    const headers = (matrix[r] || []).map(normHeader);
    if (headers.some((h) => h === "countries" || h === "country") && headers.some((h) => h === "pp1")) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return null;

  const headers = matrix[headerRow];
  const iCountry = findCol(headers, [(h) => h === "countries" || h === "country"]);
  const ppIdx = [];
  for (let p = 1; p <= 10; p++) {
    const idx = findCol(headers, [(h) => h === `pp${p}` || h === `pp ${p}`]);
    if (idx >= 0) ppIdx.push(idx);
  }
  if (iCountry < 0 || ppIdx.length < 10) return null;

  const out = {};
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const name = line[iCountry];
    if (String(name).trim().toLowerCase() === "total") break;
    const code = countryCode(name);
    if (!code) {
      // stop at next section title
      if (String(name || line[1] || "").trim() && !countryCode(name)) break;
      continue;
    }
    out[code] = ppIdx.map((i) => {
      const v = num(line[i]);
      return Number.isFinite(v) ? v : 0;
    });
  }
  return out;
}

function parseMasterTable(matrix, rate) {
  const headerRow = detectMasterHeaderRow(matrix);
  if (headerRow < 0) return null;
  const headers = matrix[headerRow];
  const iCountry = findCol(headers, [(h) => h === "countries" || h === "country"]);
  const iTarget = findCol(headers, [
    (h) => h.includes("target cards"),
    (h) => h.includes("target") && h.includes("27"),
    (h) => h === "target",
  ]);
  const iShare = findCol(headers, [(h) => h.includes("share of total")]);
  const iMs = findCol(headers, [(h) => h === "market share" || h.startsWith("market share")]);
  const iPot = findCol(headers, [(h) => h.includes("market potential")]);
  const iMax = findCol(headers, [(h) => h.includes("max") && h.includes("acq")]);
  const iExp = findCol(headers, [
    (h) => h.includes("expected") && h.includes("acq"),
    (h) => h === "expected acquisition",
  ]);

  const growthIdx = [];
  for (let p = 1; p <= 10; p++) {
    const idx = findCol(headers, [
      (h) => h === `pp${p}`,
      (h) => h === `pp ${p}`,
      (h) => h.startsWith(`pp${p}`) && !isAcqHeader(h),
    ]);
    if (idx >= 0) growthIdx.push(idx);
  }

  const acqIdx = [];
  for (let p = 1; p <= 10; p++) {
    const idx = findCol(headers, [
      (h) => isAcqHeader(h) && (h.includes(`pp${p}`) || h.includes(`pp ${p}`)),
    ]);
    // fallback: columns after growth block in order
    if (idx >= 0) acqIdx.push(idx);
  }
  // If typed headers failed, take 10 cols after last growth col
  if (acqIdx.length < 10 && growthIdx.length) {
    const start = Math.max(...growthIdx) + 1;
    for (let i = 0; i < 10; i++) acqIdx[i] = start + i;
  }

  const rows = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const rawName = line[iCountry];
    if (String(rawName).trim().toLowerCase() === "total") break;
    const code = countryCode(rawName);
    if (!code) continue;

    const target = num(line[iTarget]);
    const marketShare = asPctPoints(line[iMs]);
    if (!Number.isFinite(target) || !Number.isFinite(marketShare)) continue;

    const shareTotal =
      iShare >= 0 && Number.isFinite(asPctPoints(line[iShare]))
        ? asPctPoints(line[iShare])
        : NaN;
    const potExcel = iPot >= 0 ? num(line[iPot]) : NaN;
    const maxExcel = iMax >= 0 ? num(line[iMax]) : NaN;
    const expExcel = iExp >= 0 ? num(line[iExp]) : NaN;

    const growth_pct = growthIdx
      .map((i) => asPctPoints(line[i]))
      .filter((n) => Number.isFinite(n))
      .slice(0, 9);

    let growth_volume = acqIdx.slice(0, 10).map((i) => {
      const v = num(line[i]);
      return Number.isFinite(v) ? v : 0;
    });
    if (growth_volume.every((v) => v === 0)) growth_volume = null;

    rows.push({
      code,
      name: String(rawName).trim(),
      target,
      marketShare,
      shareTotal,
      potExcel,
      maxExcel,
      expExcel,
      growth_pct,
      growth_volume,
    });
  }
  return rows.length ? { rows, rate } : null;
}

function buildPresentation(master, hobbyMaps, rate) {
  const sumTarget = master.rows.reduce((s, r) => s + r.target, 0);
  const countries = {};
  const tags = {};

  for (const r of master.rows) {
    const shareTotal = Number.isFinite(r.shareTotal)
      ? r.shareTotal
      : sumTarget > 0
        ? Math.round((10000 * r.target) / sumTarget) / 100
        : 0;

    const pot = Number.isFinite(r.potExcel)
      ? Math.round(r.potExcel)
      : Math.round(r.target / Math.max(r.marketShare / 100, 0.0001));
    const max = Number.isFinite(r.maxExcel)
      ? Math.round(r.maxExcel)
      : Math.round(pot * rate);
    const exp = Number.isFinite(r.expExcel)
      ? Math.round(r.expExcel)
      : Math.round(max * (r.marketShare / 100));

    const vols =
      r.growth_volume ||
      (() => {
        const out = [exp];
        let v = exp;
        for (const g of r.growth_pct) {
          v = Math.round(v * (1 + g / 100));
          out.push(v);
        }
        while (out.length < 10) out.push(out[out.length - 1] || 0);
        return out.slice(0, 10);
      })();

    tags[`${r.code}_TARGET`] = fmtInt(r.target);
    tags[`${r.code}_CARDSHARE`] = fmtPct(shareTotal);
    tags[`${r.code}_MSHARE`] = fmtPct(r.marketShare);
    tags[`${r.code}_MPOT`] = fmtInt(pot);
    tags[`${r.code}_MAXACQ`] = fmtInt(max);
    tags[`${r.code}_EXPACQ`] = fmtInt(exp);

    const hobbies = {};
    for (const p of PASSION_IDS) {
      const raw = hobbyMaps[p.id]?.[r.code];
      const hVols = (raw || vols.map((v) => v / PASSION_IDS.length)).map((v) => fmtVol(Number(v) || 0));
      while (hVols.length < 10) hVols.push(0);
      for (let i = 0; i < 10; i++) {
        tags[`${r.code}_${p.id}_PP${i + 1}`] = String(hVols[i]);
      }
      tags[`${r.code}_${p.id}_HEADLINE`] = `${p.label} in ${r.name}`;
      // leave bullets empty-ish so Fable hides unchanged? Use short defaults
      tags[`${r.code}_${p.id}_BULLET1`] = "Mastercard offering — to be defined";
      for (let b = 2; b <= 5; b++) tags[`${r.code}_${p.id}_BULLET${b}`] = "";

      const hTarget = Math.round(r.target / PASSION_IDS.length);
      hobbies[p.hobby] = {
        target_audience: hTarget,
        share_of_total_target_pct: Math.round((shareTotal / PASSION_IDS.length) * 100) / 100,
        market_share_pct: r.marketShare,
        growth_pct: r.growth_pct,
        growth_volume: hVols.slice(0, 10),
        pp_locked: true,
      };
    }

    countries[r.code] = {
      name: r.name,
      slug: r.name,
      peek: `${fmtInt(r.target)} target · expected ${fmtInt(exp)}`,
      teaser: `${fmtPct(shareTotal)} of total · ${fmtPct(r.marketShare)} market share · potential ${fmtInt(pot)}`,
      base: {
        target_audience: Math.round(r.target),
        share_of_total_target_pct: shareTotal,
        market_share_pct: r.marketShare,
        growth_pct: r.growth_pct,
        growth_volume: vols.map((v) => fmtVol(v)),
        pp_locked: true,
        _excel: { pot, max, exp },
      },
      hobbies,
    };
  }

  return {
    presentation: {
      _comment: "Imported from masterexcel / Acquisition Potential sheet",
      meta: {
        title: "The Million Engine",
        tagline: "Mastercard × Erste",
        source: "Excel · Acquisition Potential",
        rates: { acquisition: rate },
      },
      years: [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036],
      hobbies: PASSION_IDS.map((p) => ({ id: p.hobby, label: p.label })),
      countries,
    },
    tags,
    rows: master.rows,
  };
}

export function sheetToMatrix(sheet, XLSX) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
}

export function parseAcquisitionSheet(matrix, { rate: rateOpt } = {}) {
  const rate = rateOpt ?? readAcquisitionRate(matrix, 0.005);
  const master = parseMasterTable(matrix, rate);
  if (!master) return null;

  const hobbyMaps = {};
  for (const p of PASSION_IDS) {
    const block = parseCountryBlock(
      matrix,
      new RegExp(`acquisition\\s+potential\\s*:\\s*.*${p.match.source}`, "i")
    );
    if (block) hobbyMaps[p.id] = block;
  }

  // Fallback titles without regex quirks
  if (!hobbyMaps.RUN) {
    hobbyMaps.RUN = parseCountryBlock(matrix, /acquisition potential:\s*running/i) || {};
  }
  if (!hobbyMaps.F1) {
    hobbyMaps.F1 = parseCountryBlock(matrix, /acquisition potential:.*f1|mclaren/i) || {};
  }
  if (!hobbyMaps.MUSLN) {
    hobbyMaps.MUSLN = parseCountryBlock(matrix, /live\s*nation/i) || {};
  }
  if (!hobbyMaps.MUSOT) {
    hobbyMaps.MUSOT = parseCountryBlock(matrix, /music\s*-\s*other|music\s+other/i) || {};
  }
  if (!hobbyMaps.GAMMC) {
    hobbyMaps.GAMMC = parseCountryBlock(matrix, /gaming.*mc\s*assets|mc\s*assets/i) || {};
  }
  if (!hobbyMaps.GAMOT) {
    hobbyMaps.GAMOT = parseCountryBlock(matrix, /gaming\s*-\s*other|gaming\s+other/i) || {};
  }

  return buildPresentation(master, hobbyMaps, rate);
}

/** @deprecated name kept — routes to full sheet parser */
function parseMasterSheet(matrix, acquisitionRate = 0.005) {
  return parseAcquisitionSheet(matrix, { rate: acquisitionRate });
}

export function parseWorkbook(workbook, XLSX, { rate } = {}) {
  const names = workbook.SheetNames || [];
  let best = null;
  for (const name of names) {
    const matrix = sheetToMatrix(workbook.Sheets[name], XLSX);
    const parsed = parseAcquisitionSheet(matrix, { rate });
    if (parsed && (!best || parsed.rows.length >= best.rows.length)) {
      best = { ...parsed, sheet: name };
    }
  }
  if (!best) {
    throw new Error(
      'No “Acquisition Potential” / master table found. Need Countries + Target + Market Share.'
    );
  }
  return best;
}

export function fillPlaceholderHtml(html, tags) {
  let out = html;
  let hits = 0;
  const keys = Object.keys(tags).sort((a, b) => b.length - a.length);
  for (const tag of keys) {
    const val = tags[tag];
    if (val === "" || val == null) continue; // leave empty bullets as placeholders
    const quoted = `"${tag}"`;
    const count = out.split(quoted).length - 1;
    if (!count) continue;
    const safe = JSON.stringify(String(val)).slice(1, -1);
    out = out.split(quoted).join(`"${safe}"`);
    hits += count;
  }
  return { html: out, hits };
}

export async function parseImportFile(file, XLSX, opts = {}) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".json")) {
    const text = await file.text();
    const json = JSON.parse(text);
    if (!json.countries) throw new Error("Invalid presentation JSON");
    return { presentation: json, tags: null, kind: "json" };
  }

  if (name.endsWith(".csv") || name.endsWith(".tsv")) {
    const text = await file.text();
    const wb = XLSX.read(text, { type: "string", FS: name.endsWith(".tsv") ? "\t" : "," });
    const parsed = parseWorkbook(wb, XLSX, opts);
    return { ...parsed, kind: "csv" };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const parsed = parseWorkbook(wb, XLSX, opts);
    return { ...parsed, kind: "excel" };
  }

  throw new Error("Supported: .xlsx, .xlsm, .xls, .csv, .json");
}

// keep for older imports
export { parseMasterSheet };
