/**
 * Deck application logic (map → country → offer).
 * Data: ../deck/defaults.js, ../../data/client/offerings.json, ./geo-data.js
 */
import { GEO } from "./geo-data.js";
import { createDefaultData } from "./defaults.js";
import { loadOfferings, offeringsFor } from "./offerings.js";

const DATA = createDefaultData();



/* ---------------- helpers ---------------- */
function $(id) { return document.getElementById(id); }
const RAD = Math.PI / 180;

function fmtFull(n) { return Math.round(n).toLocaleString("en-US"); }
function fmtCompact(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return fmtFull(n);
}

/* ------------- data normalization ------------- */
const ISSUES = [];
function notePPIssue(kind, tag, value) { ISSUES.push({ kind, tag, value }); }

function parsePP(v, tag) {
  if (typeof v === "number" && isFinite(v)) return v;
  const s = String(v).trim();
  if (s === tag) { notePPIssue("missing", tag); return 0; }
  const clean = s.replace(/[\s'\u2019]/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(clean)) { notePPIssue("format", tag, s); return 0; }
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);
  notePPIssue("invalid", tag, s);
  return 0;
}

function displayVal(v, tag) {
  const s = String(v).trim();
  if (s === tag) { notePPIssue("missing", tag); return null; }
  return s;
}

const MODEL = { countries: {} };
function normalizeData() {
  ISSUES.length = 0;
  for (const k of Object.keys(MODEL.countries)) delete MODEL.countries[k];
  for (const [code, c] of Object.entries(DATA.countries)) {
    const master = [];
    for (const [key, label] of DATA.masterLabels) {
      master.push({ key, label, value: displayVal(c.master[key], code + "_" + key) });
    }
    const passions = {};
    for (const p of DATA.passions) {
      const raw = c.passions[p.id];
      if (!raw) continue;
      const pp = raw.pp.map((v, i) => parsePP(v, code + "_" + p.id + "_PP" + (i + 1)));
      const cum = [];
      let run = 0;
      for (const v of pp) { run += v; cum.push(run); }
      const headline = displayVal(raw.headline, code + "_" + p.id + "_HEADLINE");
      const bullets = raw.bullets
        .map((v, i) => displayVal(v, code + "_" + p.id + "_BULLET" + (i + 1)))
        .filter(Boolean);
      passions[p.id] = { pp, cum, total: run, headline, bullets };
    }
    MODEL.countries[code] = { name: c.name, master, passions };
  }
}
normalizeData();

/* ---------------- map ---------------- */
const NS = "http://www.w3.org/2000/svg";
const VW = 176, VH = 82;
const CENTER = [19, 47]; /* azimuthal equal-area, wie die Vorlage */

function projectRaw(lon, lat) {
  const l = (lon - CENTER[0]) * RAD;
  const f = lat * RAD;
  const f0 = CENTER[1] * RAD;
  const s0 = Math.sin(f0), c0 = Math.cos(f0);
  const sf = Math.sin(f), cf = Math.cos(f), cl = Math.cos(l);
  const denom = 1 + s0 * sf + c0 * cf * cl;
  if (denom <= 1e-9) return null;
  const k = Math.sqrt(2 / denom);
  return [k * cf * Math.sin(l), k * (c0 * sf - s0 * cf * cl)];
}

function createMap(svg, { onSelect, onPeek, onHidePeek } = {}) {
  svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML =
    '<radialGradient id="oceanGlow' + svg.id + '" cx="50%" cy="42%" r="55%">' +
    '<stop offset="0%" stop-color="rgba(91,163,224,0.16)"/>' +
    '<stop offset="55%" stop-color="rgba(244,247,251,0.5)"/>' +
    '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>' +
    "</radialGradient>" +
    '<clipPath id="clip' + svg.id + '"><rect x="0" y="0" width="' + VW + '" height="' + VH + '"/></clipPath>';
  const gRoot = document.createElementNS(NS, "g");
  gRoot.setAttribute("clip-path", "url(#clip" + svg.id + ")");
  const ocean = document.createElementNS(NS, "rect");
  ocean.setAttribute("x", "0"); ocean.setAttribute("y", "0");
  ocean.setAttribute("width", String(VW)); ocean.setAttribute("height", String(VH));
  ocean.setAttribute("fill", "url(#oceanGlow" + svg.id + ")");
  ocean.setAttribute("pointer-events", "none");
  const gLand = document.createElementNS(NS, "g");
  const gCode = document.createElementNS(NS, "g");
  svg.replaceChildren();
  svg.append(defs, gRoot);
  gRoot.append(ocean, gLand, gCode);

  const featureByCode = {};
  for (const f of GEO.features) featureByCode[f.properties.ISO2] = f;
  const liveCodes = Object.keys(DATA.countries).filter((c) => featureByCode[c]);

  let fit = { s: 1, tx: VW / 2, ty: VH / 2 };
  const lands = {}, labels = {};

  function rings(feature) {
    const g = feature.geometry;
    if (g.type === "Polygon") return g.coordinates;
    const out = [];
    for (const poly of g.coordinates) for (const ring of poly) out.push(ring);
    return out;
  }
  function polys(feature) {
    const g = feature.geometry;
    return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  }

  function computeFit(features) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of features) {
      for (const ring of rings(f)) {
        for (const pt of ring) {
          const p = projectRaw(pt[0], pt[1]);
          if (!p) continue;
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        }
      }
    }
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const s = Math.min((VW - 12) / w, (VH - 8) / h);
    fit = {
      s,
      tx: VW / 2 - s * (minX + maxX) / 2,
      ty: VH / 2 + s * (minY + maxY) / 2,
    };
  }

  function toScreen(lon, lat) {
    const p = projectRaw(lon, lat);
    if (!p) return null;
    return [fit.tx + fit.s * p[0], fit.ty - fit.s * p[1]];
  }

  function pathOf(feature) {
    let d = "";
    for (const poly of polys(feature)) {
      for (const ring of poly) {
        let first = true;
        for (const pt of ring) {
          const s = toScreen(pt[0], pt[1]);
          if (!s) continue;
          d += (first ? "M" : "L") + s[0].toFixed(2) + "," + s[1].toFixed(2);
          first = false;
        }
        if (!first) d += "Z";
      }
    }
    return d;
  }

  function biggestRing(feature) {
    let best = null, bestA = -1;
    for (const poly of polys(feature)) {
      const ring = poly[0];
      let a = 0;
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i], q = ring[(i + 1) % ring.length];
        a += p[0] * q[1] - q[0] * p[1];
      }
      a = Math.abs(a);
      if (a > bestA) { bestA = a; best = ring; }
    }
    return { ring: best, area: bestA };
  }

  function centroidOf(code) {
    const { ring } = biggestRing(featureByCode[code]);
    let a = 0, cx = 0, cy = 0;
    const pts = ring.map((pt) => toScreen(pt[0], pt[1])).filter(Boolean);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const cr = p[0] * q[1] - q[0] * p[1];
      a += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
    }
    if (Math.abs(a) < 1e-6) return pts[0] || [VW / 2, VH / 2];
    return [cx / (3 * a), cy / (3 * a)];
  }

  function build(intro) {
    computeFit(liveCodes.map((c) => featureByCode[c]));
    gLand.replaceChildren();
    gCode.replaceChildren();
    for (const k of Object.keys(lands)) delete lands[k];
    for (const k of Object.keys(labels)) delete labels[k];

    const liveSet = new Set(liveCodes);
    const ordered = GEO.features
      .map((f) => f.properties.ISO2)
      .sort((a, b) => biggestRing(featureByCode[b]).area - biggestRing(featureByCode[a]).area);

    ordered.forEach((code, i) => {
      const feature = featureByCode[code];
      const d = pathOf(feature);
      if (!d) return;
      const isLive = liveSet.has(code);
      const group = document.createElementNS(NS, "g");
      group.setAttribute("class", "land-group" + (isLive ? "" : " inactive"));
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "land" + (isLive ? " live" : " cold"));
      path.dataset.code = code;
      path.style.animationDelay = (intro ? Math.min(i * 28, 500) : 0) + "ms";
      if (isLive) {
        path.addEventListener("click", (e) => { e.stopPropagation(); if (onSelect) onSelect(code); });
        path.addEventListener("mouseenter", (e) => { if (onPeek) onPeek(code, e); });
        path.addEventListener("mousemove", (e) => { if (onPeek) onPeek(code, e, true); });
        path.addEventListener("mouseleave", () => { if (onHidePeek) onHidePeek(); });
      }
      group.appendChild(path);
      gLand.appendChild(group);
      lands[code] = path;
      requestAnimationFrame(() => path.classList.add("drawn"));
      if (isLive) {
        const c = centroidOf(code);
        const stack = document.createElementNS(NS, "g");
        stack.setAttribute("class", "code-stack");
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", c[0]); t.setAttribute("y", c[1] - 1.35);
        t.setAttribute("class", "code");
        t.textContent = code;
        const v = document.createElementNS(NS, "text");
        // Center value when ISO is hidden (country detail map)
        const valueOnly = svg.id === "countryMap";
        v.setAttribute("x", c[0]);
        v.setAttribute("y", valueOnly ? c[1] : c[1] + 2.2);
        v.setAttribute("class", "code code-value");
        const exp = countryTenYear(code);
        v.textContent = fmtCompact(exp);
        stack.append(t, v);
        gCode.appendChild(stack);
        labels[code] = { iso: t, value: v, stack: stack };
      }
    });
    paint();
    /* syncMapTotals owned by openMap / boot (odometer) */
  }

  function paint() {
    const vals = liveCodes.map((c) => countryTenYear(c)).filter((v) => v != null);
    const lo = vals.length ? Math.min.apply(null, vals) : 0;
    const hi = vals.length ? Math.max.apply(null, vals) : 1;
    for (const c of Object.keys(lands)) {
      const path = lands[c];
      const live = liveCodes.indexOf(c) >= 0;
      if (!live) continue;
      const raw = countryTenYear(c);
      if (raw == null || hi === lo) path.style.fill = "";
      else {
        const t = (raw - lo) / (hi - lo || 1);
        // light → deep blue
        const r = Math.round(215 - t * 180);
        const g = Math.round(228 - t * 160);
        const b = Math.round(252 - t * 100);
        path.style.fill = "rgb(" + r + "," + g + "," + b + ")";
      }
      if (labels[c]) {
        labels[c].value.textContent = fmtCompact(countryTenYear(c));
      }
    }
  }

  function setActive(code) {
    for (const c of Object.keys(lands)) {
      const isOn = c === code;
      const isMute = code !== null && !isOn && lands[c].classList.contains("live");
      lands[c].classList.toggle("on", isOn);
      const grp = lands[c].parentNode;
      if (grp) grp.classList.toggle("mute", isMute);
      if (labels[c]) {
        labels[c].iso.classList.toggle("mute", isMute);
        labels[c].value.classList.toggle("mute", isMute);
      }
    }
  }

  let fitAnim = null;
  function applyFitPaths() {
    for (const c of Object.keys(lands)) {
      const d = pathOf(featureByCode[c]);
      if (d) lands[c].setAttribute("d", d);
      if (labels[c]) {
        const ct = centroidOf(c);
        labels[c].iso.setAttribute("x", ct[0]);
        labels[c].iso.setAttribute("y", ct[1] - 1.35);
        labels[c].value.setAttribute("x", ct[0]);
        labels[c].value.setAttribute("y", svg.id === "countryMap" ? ct[1] : ct[1] + 2.2);
      }
    }
  }
  function focusCountry(code, opts) {
    const feats = code && featureByCode[code]
      ? [featureByCode[code]]
      : liveCodes.map((c) => featureByCode[c]);
    const from = { s: fit.s, tx: fit.tx, ty: fit.ty };
    computeFit(feats);
    const to = { s: fit.s, tx: fit.tx, ty: fit.ty };
    const animate = opts && opts.animate;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) {
      if (fitAnim) cancelAnimationFrame(fitAnim);
      fit = to;
      applyFitPaths();
      return Promise.resolve();
    }
    if (fitAnim) cancelAnimationFrame(fitAnim);
    const dur = (opts && opts.ms) || 700;
    const t0 = performance.now();
    return new Promise((resolve) => {
      function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        fit = {
          s: from.s + (to.s - from.s) * e,
          tx: from.tx + (to.tx - from.tx) * e,
          ty: from.ty + (to.ty - from.ty) * e,
        };
        applyFitPaths();
        if (t < 1) fitAnim = requestAnimationFrame(frame);
        else { fit = to; applyFitPaths(); fitAnim = null; resolve(); }
      }
      fitAnim = requestAnimationFrame(frame);
    });
  }

  function hasShape(code) { return Boolean(lands[code]); }

  return { build, setActive, focusCountry, hasShape, paint };
}

/* ---------------- app state / flow ---------------- */
const state = { level: "cover", country: null, passion: null, offerBullets: [], offerBulletIdx: 0, dataLoaded: false };
let applyingHistory = false;

function setLevel(level) {
  state.level = level;
  const root = document.documentElement;
  root.classList.toggle("level-map", level === "map");
  root.classList.toggle("level-country", level === "country");
  root.classList.toggle("level-offer", level === "offer");
  $("countryLayer").setAttribute("aria-hidden", level === "country" ? "false" : "true");
  $("offerLayer").setAttribute("aria-hidden", level === "offer" ? "false" : "true");
  $("restartBtn").hidden = level === "map" || level === "cover";
}

function masterValue(code, key) {
  const c = MODEL.countries[code];
  if (!c) return null;
  for (const m of c.master) if (m.key === key) return m.value;
  return null;
}

/** Excel column Total (≈ M) — 10-year expected; fallback = sum of passion PP. */
function countryTenYear(code) {
  const direct = parsePeople(masterValue(code, "TOTAL10"));
  if (direct != null) return direct;
  const c = MODEL.countries[code];
  if (!c) return 0;
  let sum = 0;
  for (const p of Object.values(c.passions || {})) sum += Number(p.total) || 0;
  return sum;
}

function parsePeople(v) {
  if (v == null || v === "" || v === "—") return null;
  if (typeof v === "number" && isFinite(v)) return v;
  const s = String(v).trim().replace(/,/g, "");
  const m = s.match(/^(-?[\d.]+)\s*([kKmM])?$/);
  if (!m) {
    const n = Number(s.replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }
  let n = Number(m[1]);
  if (!isFinite(n)) return null;
  const u = (m[2] || "").toLowerCase();
  if (u === "k") n *= 1000;
  if (u === "m") n *= 1_000_000;
  return n;
}

let mapTotalAnim = null;
let mapTotalShown = 0;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/** Odometer-style count for map grand total (Moment 1). */
function animateMapTotal(to, { from, ms } = {}) {
  const el = $("mapTotalValue");
  if (!el) return;
  const target = Number(to) || 0;
  const start = from != null ? Number(from) : mapTotalShown;
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = reduce ? 0 : (ms != null ? ms : 1200);
  if (mapTotalAnim) cancelAnimationFrame(mapTotalAnim);
  if (dur <= 0 || start === target) {
    mapTotalShown = target;
    el.textContent = fmtFull(target);
    return;
  }
  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / dur);
    const v = Math.round(start + (target - start) * easeOutCubic(t));
    mapTotalShown = v;
    el.textContent = fmtFull(v);
    if (t < 1) mapTotalAnim = requestAnimationFrame(frame);
    else { mapTotalShown = target; el.textContent = fmtFull(target); mapTotalAnim = null; }
  }
  mapTotalAnim = requestAnimationFrame(frame);
}

function mapGrandTotal() {
  let sum = 0, n = 0;
  for (const code of Object.keys(MODEL.countries)) {
    const v = countryTenYear(code);
    if (v != null) { sum += v; n += 1; }
  }
  return n ? sum : 0;
}

function syncMapTotals(opts) {
  const sum = mapGrandTotal();
  const el = $("mapTotalValue");
  if (!el) return;
  const fromZero = opts && opts.fromZero;
  const morph = opts && opts.morph;
  if (fromZero) animateMapTotal(sum, { from: 0, ms: 1200 });
  else if (morph) animateMapTotal(sum, { from: mapTotalShown, ms: 700 });
  else {
    mapTotalShown = sum;
    el.textContent = fmtFull(sum);
  }
}

function showImportToast(msg) {
  const el = $("importToast");
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(showImportToast._t);
  showImportToast._t = setTimeout(() => el.classList.remove("on"), 3200);
}


function passionMeta(id) {
  for (const p of DATA.passions) if (p.id === id) return p;
  return { id: id, label: id };
}

/* ---- hover peek: master table ---- */
function showPeek(code, e) {
  if (state.level !== "map") return;
  const c = MODEL.countries[code];
  if (!c) return;
  let rows = "";
  for (const m of c.master) {
    rows += "<span>" + m.label + "</span><i>" + (m.value == null ? "–" : m.value) + "</i>";
  }
  const p = $("peek");
  p.innerHTML = "<b>" + c.name + "</b><div class=\"peek-table\">" + rows + "</div>" +
    "<span class=\"peek-cta\">Click to explore</span>";
  p.classList.add("on");
  movePeek(e);
}
function movePeek(e) {
  const wrap = $("mapwrap").getBoundingClientRect();
  const p = $("peek");
  const px = e.clientX - wrap.left;
  const py = e.clientY - wrap.top;
  p.style.left = Math.min(px, Math.max(0, wrap.width - 340)) + "px";
  p.style.top = Math.min(py, Math.max(0, wrap.height - 240)) + "px";
}
function hidePeek() { $("peek").classList.remove("on"); }

const map = createMap($("map"), {
  onSelect: (code) => openCountry(code),
  onPeek: (code, e, moveOnly) => { if (moveOnly) movePeek(e); else showPeek(code, e); },
  onHidePeek: hidePeek,
});
const countryMap = createMap($("countryMap"), {});

/* ---- history ---- */
function syncHistory(mode) {
  if (applyingHistory) return;
  const snap = { deck: true, level: state.level, country: state.country, passion: state.passion };
  try {
    if (mode === "replace") history.replaceState(snap, "");
    else history.pushState(snap, "");
  } catch (err) { /* file:// restrictions */ }
}
function goBack() {
  if (state.level === "offer" || state.level === "country") {
    try { history.back(); return; } catch (err) { /* fall through */ }
  }
  if (state.level === "offer" && state.country) openCountry(state.country, false);
  else if (state.level === "country") openMap(false);
}

/* ---- levels ---- */
function showCover(mode) {
  hidePeek();
  state.country = null; state.passion = null;
  map.setActive(null); map.focusCountry(null);
  setLevel("cover");
  document.documentElement.classList.remove("level-map", "level-country", "level-offer");
  splashShow();
  const startBtn = $("splashStart");
  if (startBtn) startBtn.disabled = !state.dataLoaded;
  if (state.dataLoaded) {
    const st = $("splashImportStatus");
    if (st && !st.textContent) st.textContent = "Data ready · Start the engine";
  }
  syncHistory(mode || "replace");
}

function openMap(push, opts) {
  hidePeek();
  state.country = null; state.passion = null;
  state.offerBulletIdx = 0;
  map.setActive(null);
  map.focusCountry(null, { animate: !(opts && opts.instant) });
  setLevel("map");
  const first = opts && opts.fromSplash;
  syncMapTotals(first ? { fromZero: true } : (opts && opts.morph ? { morph: true } : null));
  syncHistory(push === false ? null : (push === "replace" ? "replace" : "push"));
}

function openCountry(code, push) {
  const c = MODEL.countries[code];
  if (!c || !map.hasShape(code)) return;
  hidePeek();
  state.country = code; state.passion = null;
  state.offerBulletIdx = 0;

  $("countryTitle").textContent = c.name;

  const grid = $("passionGrid");
  grid.replaceChildren();
  let cardI = 0;
  for (const p of DATA.passions) {
    const block = c.passions[p.id];
    if (!block || !(block.total > 0)) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "passion-card enter";
    btn.style.animationDelay = (cardI * 60) + "ms";
    cardI += 1;
    btn.innerHTML =
      '<span class="passion-card-label">' + p.label + "</span>" +
      '<span class="passion-card-value">' + fmtFull(block.total) + "</span>" +
      '<span class="passion-card-meta">10-year potential</span>';
    btn.addEventListener("click", () => openOffer(p.id));
    grid.appendChild(btn);
  }
  if (!grid.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "acq-empty";
    empty.style.padding = "12px 0";
    empty.textContent = "No passions available for this country.";
    grid.appendChild(empty);
  }

  const filled = c.master.filter((m) => m.value != null);
  $("masterNote").hidden = filled.length === 0;
  const mg = $("masterGrid");
  mg.replaceChildren();
  for (const m of filled) {
    const cell = document.createElement("div");
    cell.className = "master-cell";
    cell.innerHTML = "<span>" + m.label + "</span><i>" + m.value + "</i>";
    mg.appendChild(cell);
  }

  // Moment 2 (safe): dive on overview map, then open L2; country panel zooms in parallel
  map.setActive(code);
  const dive = map.focusCountry(code, { animate: true, ms: 720 });
  countryMap.setActive(code);
  countryMap.focusCountry(code, { animate: true, ms: 720 });

  const go = () => {
    setLevel("country");
    syncHistory(push === false ? null : (push === "replace" ? "replace" : "push"));
  };
  if (dive && typeof dive.then === "function") {
    // reveal panel mid-dive so it feels continuous
    setTimeout(go, 280);
  } else {
    go();
  }
}

/* ---- stacked 10-year chart ---- */
function renderChart(block) {
  const wrap = $("acqChart");
  wrap.replaceChildren();
  const startYear = Number(DATA.meta.startYear) || 2027;
  const maxCum = Math.max.apply(null, block.cum);
  if (!(maxCum > 0)) {
    const div = document.createElement("div");
    div.className = "acq-empty";
    div.textContent = "Data pending for this passion.";
    wrap.appendChild(div);
    $("acqLegend").style.visibility = "hidden";
    return null;
  }
  $("acqLegend").style.visibility = "visible";
  const H = 172; /* px available for tallest bar */
  const targets = [];
  block.pp.forEach((add, i) => {
    const cum = block.cum[i];
    const base = cum - add;
    const hNew = Math.max(add > 0 ? 2 : 0, Math.round((add / maxCum) * H));
    const hBase = Math.max(base > 0 ? 2 : 0, Math.round((base / maxCum) * H));
    const col = document.createElement("div");
    col.className = "acq-col";
    col.title = startYear + i + " · +" + fmtFull(add) + " new · " + fmtFull(cum) + " total";
    col.innerHTML =
      '<span class="acq-cum">' + fmtFull(cum) + "</span>" +
      '<div class="acq-stack">' +
      '<div class="acq-new"></div>' +
      '<div class="acq-base"></div>' +
      "</div>" +
      '<span class="acq-year">' + (startYear + i) + "</span>" +
      '<span class="acq-add">+' + fmtFull(add) + "</span>";
    wrap.appendChild(col);
    targets.push({
      newEl: col.querySelector(".acq-new"),
      baseEl: col.querySelector(".acq-base"),
      hNew, hBase, delay: i * 45,
    });
  });
  const lastDelay = targets.length ? targets[targets.length - 1].delay : 0;
  const barMs = 600;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const t of targets) {
      t.newEl.style.transitionDelay = t.delay + "ms";
      t.baseEl.style.transitionDelay = t.delay + "ms";
      t.newEl.style.height = t.hNew + "px";
      t.baseEl.style.height = t.hBase + "px";
    }
  }));
  return { duration: lastDelay + barMs, total: maxCum };
}

let offerHeroAnim = null;

function animateOfferHero(to, ms) {
  const el = $("offerTotal");
  if (!el) return;
  if (offerHeroAnim) cancelAnimationFrame(offerHeroAnim);
  const target = Number(to) || 0;
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !(target > 0) || !(ms > 0)) {
    el.innerHTML = target > 0 ? fmtFull(target) + "<em>cards</em>" : "—";
    return;
  }
  el.innerHTML = "0<em>cards</em>";
  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / ms);
    const v = Math.round(target * easeOutCubic(t));
    el.innerHTML = fmtFull(v) + "<em>cards</em>";
    if (t < 1) offerHeroAnim = requestAnimationFrame(frame);
    else { el.innerHTML = fmtFull(target) + "<em>cards</em>"; offerHeroAnim = null; }
  }
  offerHeroAnim = requestAnimationFrame(frame);
}

function setupOfferBullets(passionId) {
  const ul = $("offerBullets");
  const kick = $("offeringKicker");
  const meta = passionMeta(passionId);
  if (kick) kick.textContent = meta.label + " · Mastercard offering";
  ul.replaceChildren();
  const bullets = offeringsFor(passionId, state.country);
  state.offerBullets = bullets;
  state.offerBulletIdx = bullets.length;
  bullets.forEach((b, i) => {
    const li = document.createElement("li");
    li.textContent = b;
    li.style.animationDelay = (120 + i * 70) + "ms";
    ul.appendChild(li);
  });
}

function openOffer(passionId, push) {
  const c = MODEL.countries[state.country];
  if (!c) return;
  const block = c.passions[passionId];
  if (!block) return;
  state.passion = passionId;
  const meta = passionMeta(passionId);

  $("offerKicker").textContent = c.name + " · " + meta.label;
  $("offerTitle").textContent = block.headline || (meta.label + " in " + c.name);

  const chart = renderChart(block);
  animateOfferHero(block.total, chart && chart.duration ? chart.duration : 900);
  setupOfferBullets(passionId);

  setLevel("offer");
  syncHistory(push === false ? null : (push === "replace" ? "replace" : "push"));
}

function restart() { showCover("push"); }

function applyHistorySnapshot(snap) {
  applyingHistory = true;
  try {
    const level = (snap && snap.level) || "cover";
    if (level === "cover") { showCover(null); return; }
    if (level === "map") { openMap(false); return; }
    if (level === "country" && snap.country && MODEL.countries[snap.country]) {
      openCountry(snap.country, false); return;
    }
    if (level === "offer" && snap.country && snap.passion && MODEL.countries[snap.country]) {
      openCountry(snap.country, false);
      openOffer(snap.passion, false);
      return;
    }
    openMap(false);
  } finally { applyingHistory = false; }
}

/* ---------------- splash ---------------- */
const REDUCE = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
let splashBusy = false;
function splashShow() {
  splashBusy = false;
  document.documentElement.classList.add("splash-on");
  document.documentElement.classList.remove("splash-leaving", "splash-reveal");
  $("splash").setAttribute("aria-hidden", "false");
}
function splashEnter() {
  if (splashBusy) return;
  if (!state.dataLoaded) {
    showImportToast("Load Excel first");
    return;
  }
  splashBusy = true;
  // Keep splash-on so the blurred map is the animation "from" state
  document.documentElement.classList.add("splash-leaving", "splash-reveal");
  setTimeout(() => {
    document.documentElement.classList.remove("splash-on", "splash-leaving", "splash-reveal");
    $("splash").setAttribute("aria-hidden", "true");
    splashBusy = false;
    openMap("push", { fromSplash: true });
  }, REDUCE ? 40 : 1000);
}

/* ---------------- data checker (Shift+D) ---------------- */
function renderChecker() {
  const body = $("checkerBody");
  const missing = ISSUES.filter((i) => i.kind === "missing");
  const format = ISSUES.filter((i) => i.kind === "format");
  const invalid = ISSUES.filter((i) => i.kind === "invalid");
  if (!ISSUES.length) {
    body.innerHTML = '<p class="checker-ok">Alle Platzhalter sind befüllt. Bereit für den Pitch.</p>';
    return;
  }
  let html = "<p><b>" + ISSUES.length + "</b> offene Punkte. In der HTML per Suchen&nbsp;&amp;&nbsp;Ersetzen befüllen, dann neu laden.</p>";
  if (format.length) {
    html += "<h4 class=\"checker-warn\">Formatproblem — Tausendertrennzeichen entfernen (" + format.length + ")</h4><ul>";
    for (const i of format) html += "<li><code>" + i.tag + "</code> = \u201E" + i.value + "\u201C</li>";
    html += "</ul>";
  }
  if (invalid.length) {
    html += "<h4 class=\"checker-warn\">Keine Zahl erkennbar (" + invalid.length + ")</h4><ul>";
    for (const i of invalid) html += "<li><code>" + i.tag + "</code> = \u201E" + i.value + "\u201C</li>";
    html += "</ul>";
  }
  if (missing.length) {
    html += "<h4>Noch nicht ersetzt (" + missing.length + ")</h4><ul>";
    for (const i of missing) html += "<li><code>" + i.tag + "</code></li>";
    html += "</ul>";
  }
  body.innerHTML = html;
}
function toggleChecker(force) {
  const el = $("checker");
  const show = force != null ? force : el.hidden;
  if (show) renderChecker();
  el.hidden = !show;
}

/* ---------------- boot ---------------- */
function applyCopy() {
  if (DATA.meta.title) { $("wordmark").textContent = DATA.meta.title; document.title = DATA.meta.title; }
  if (DATA.meta.tagline) $("splashKicker").textContent = DATA.meta.tagline;
  $("source").textContent = DATA.meta.source || "";
}

function applyTagsToData(tags) {
  for (const [code, c] of Object.entries(DATA.countries)) {
    for (const key of Object.keys(c.master)) {
      const tag = code + "_" + key;
      if (tags[tag] != null && tags[tag] !== "") c.master[key] = String(tags[tag]);
    }
    for (const p of DATA.passions) {
      const raw = c.passions[p.id];
      if (!raw) continue;
      raw.pp = raw.pp.map((v, i) => {
        const tag = code + "_" + p.id + "_PP" + (i + 1);
        return tags[tag] != null && tags[tag] !== "" ? String(tags[tag]) : v;
      });
      const ht = code + "_" + p.id + "_HEADLINE";
      if (tags[ht]) raw.headline = String(tags[ht]);
      raw.bullets = raw.bullets.map((v, i) => {
        const tag = code + "_" + p.id + "_BULLET" + (i + 1);
        return tags[tag] != null && tags[tag] !== "" ? String(tags[tag]) : v;
      });
    }
  }
}

function setSplashReady(fileName, nCountries) {
  state.dataLoaded = true;
  const btn = $("splashStart");
  if (btn) btn.disabled = false;
  const label = $("splashImportBtn");
  if (label) label.classList.add("has-file");
  const lab = $("splashImportLabel");
  if (lab) lab.textContent = "Excel loaded · click to replace";
  const st = $("splashImportStatus");
  if (st) st.textContent = fileName + " · " + nCountries + " countries ready";
}

async function importExcelFile(file) {
  if (!file) return;
  // Import only on cover / splash
  if (!document.documentElement.classList.contains("splash-on") && state.level !== "cover") {
    showImportToast("Load Excel on the start screen only");
    return;
  }
  if (typeof XLSX === "undefined") {
    throw new Error("Excel library failed to load.");
  }
  if (typeof parseExcelFileToTags !== "function") {
    throw new Error("Excel helper missing.");
  }
  showImportToast("Loading " + file.name + "…");
  const tags = await parseExcelFileToTags(file);
  applyTagsToData(tags);
  normalizeData();
  DATA.meta.source = file.name + (tags._sheet ? " · " + tags._sheet : "");
  applyCopy();
  map.build(false);
  countryMap.build(false);
  const n = Object.keys(DATA.countries).length;
  $("source").textContent = DATA.meta.source + " · " + n + " countries";
  setSplashReady(file.name, n);
  syncMapTotals(); // prepare number; odometer runs on Start
  showImportToast("Ready · " + n + " countries · Start the engine");
}

function bindChrome() {
  $("splashStart").addEventListener("click", (e) => { e.preventDefault(); splashEnter(); });
  $("countryBack").addEventListener("click", goBack);
  $("offerBack").addEventListener("click", goBack);
  $("offerRestart").addEventListener("click", restart);
  $("restartBtn").addEventListener("click", restart);
  $("checkerClose").addEventListener("click", () => toggleChecker(false));

  function canImportNow() {
    return document.documentElement.classList.contains("splash-on") || state.level === "cover";
  }

  $("importFile").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try { await importExcelFile(file); }
    catch (err) { console.error(err); alert("Import failed: " + (err.message || err)); }
  });

  let dragDepth = 0;
  function showDrop(on) {
    document.documentElement.classList.toggle("is-dropping", on && canImportNow());
  }
  window.addEventListener("dragenter", (e) => {
    if (!canImportNow()) return;
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault(); dragDepth += 1; showDrop(true);
  });
  window.addEventListener("dragover", (e) => {
    if (!canImportNow()) return;
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("dragleave", (e) => {
    if (!canImportNow()) return;
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault(); dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) showDrop(false);
  });
  window.addEventListener("drop", async (e) => {
    e.preventDefault(); dragDepth = 0; showDrop(false);
    if (!canImportNow()) {
      showImportToast("Load Excel on the start screen only");
      return;
    }
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    try { await importExcelFile(file); }
    catch (err) { console.error(err); alert("Import failed: " + (err.message || err)); }
  });

  window.addEventListener("popstate", (e) => {
    const snap = e.state && e.state.deck ? e.state : { level: "cover" };
    applyHistorySnapshot(snap);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("checker").hidden) { toggleChecker(false); return; }
      if (state.level === "offer" || state.level === "country") goBack();
      return;
    }
    if (e.shiftKey && (e.key === "D" || e.key === "d")) toggleChecker();
  });
}


export async function initDeck() {
  await loadOfferings();
  normalizeData();
  applyCopy();
  map.build(true);
  countryMap.build(false);
  bindChrome();
  syncMapTotals();
  splashShow();
  setLevel("cover");
  syncHistory("replace");
  if (typeof XLSX === "undefined") {
    console.error("XLSX missing");
    showImportToast("Excel lib missing — use npm start from million-engine");
  }
  if (location.hash === "#map") {
    document.documentElement.classList.remove("splash-on");
    $("splash").setAttribute("aria-hidden", "true");
    openMap("replace");
  }
}
