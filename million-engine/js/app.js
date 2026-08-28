import { $ } from "./utils/dom.js";
import { createMap, loadEuropeGeo } from "./map.js?v=20260828e";
import { createSplash } from "./splash.js?v=20260826b";
import { PRESENTATION_DATA } from "./data/presentation.js";

const state = {
  data: structuredClone(PRESENTATION_DATA),
  geo: null,
  level: "cover", // cover | map | country | offer
  country: null,
  topic: null,
};

/** Skip pushState while restoring from browser Back/Forward */
let applyingHistory = false;

function marketsPayload(data) {
  const markets = {};
  for (const [code, c] of Object.entries(data.countries || {})) {
    markets[code] = { name: c.name, contribution: 0 };
  }
  return {
    meta: data.meta || {},
    themes: [{ id: "deck", label: "Deck" }],
    markets,
  };
}

async function loadPresentation() {
  try {
    const res = await fetch("./data/presentation.json", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    /* file:// fallback */
  }
  return structuredClone(PRESENTATION_DATA);
}

function setLevel(level) {
  state.level = level;
  const root = document.documentElement;
  root.classList.toggle("level-map", level === "map");
  root.classList.toggle("level-country", level === "country");
  root.classList.toggle("level-offer", level === "offer");

  $("countryLayer")?.setAttribute("aria-hidden", level === "country" ? "false" : "true");
  $("offerLayer")?.setAttribute("aria-hidden", level === "offer" ? "false" : "true");
  $("restartBtn").hidden = level === "map" || level === "cover";
}

function countryOf(code) {
  return state.data.countries?.[code] || null;
}

function topicMeta(id) {
  if (id === "base") return { id: "base", label: "Country total" };
  return state.data.hobbies?.find((t) => t.id === id) || { id, label: id };
}

function metricsOf(country, topicId) {
  if (!country) return null;
  if (!topicId || topicId === "base") return country.base || null;
  return country.hobbies?.[topicId] || null;
}

function rates() {
  const r = state.data.meta?.rates || {};
  return {
    acquisition: Number(r.acquisition) || 0.005,
    expected: Number(r.expected) || 0.00136,
  };
}

function setRates({ acquisition, expected }) {
  if (!state.data.meta) state.data.meta = {};
  if (!state.data.meta.rates) state.data.meta.rates = {};
  if (acquisition != null) state.data.meta.rates.acquisition = Number(acquisition);
  if (expected != null) state.data.meta.rates.expected = Number(expected);
}

function marketPotential(m) {
  if (!m) return 0;
  const target = Number(m.target_audience) || 0;
  const share = Math.max(Number(m.market_share_pct) || 0.01, 0.01) / 100;
  return Math.round(target / share);
}

/** Derive potential / max / expected from inputs + global rates. */
function derive(m) {
  if (!m) return null;
  const { acquisition, expected } = rates();
  const potential = marketPotential(m);
  const maxAcq = Math.round(potential * acquisition);
  const expAcq = Math.round(potential * expected);
  return {
    ...m,
    market_potential: potential,
    max_acquisition: maxAcq,
    expected_acquisition: expAcq,
    display: {
      target_audience: fmtPeople(m.target_audience),
      share_of_total_target_pct:
        m.share_of_total_target_pct != null
          ? `${m.share_of_total_target_pct}%`
          : m.display?.share_of_total_cards_pct,
      share_of_total_cards_pct:
        m.share_of_total_target_pct != null
          ? `${m.share_of_total_target_pct}%`
          : m.display?.share_of_total_cards_pct,
      market_share_pct: `${m.market_share_pct}%`,
      market_potential: fmtPeople(potential),
      max_acquisition: fmtPeople(maxAcq),
      expected_acquisition: fmtPeople(expAcq),
    },
  };
}

function fmtPeople(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

function fmtMetric(m, key) {
  const d = derive(m);
  if (!d) return "—";
  if (d.display?.[key] != null) return d.display[key];
  const v = d[key];
  if (v == null) return "—";
  if (typeof v === "number" && key.endsWith("_pct")) return `${v}%`;
  if (typeof v === "number") return fmtPeople(v);
  return String(v);
}

function potentialByCountry() {
  const out = {};
  for (const code of Object.keys(state.data.countries || {})) {
    const d = derive(state.data.countries[code]?.base);
    out[code] = d?.market_potential ?? null;
  }
  return out;
}

function expectedByCountry() {
  const out = {};
  for (const code of Object.keys(state.data.countries || {})) {
    const d = derive(state.data.countries[code]?.base);
    out[code] = d?.expected_acquisition ?? null;
  }
  return out;
}

function maxByCountry() {
  const out = {};
  for (const code of Object.keys(state.data.countries || {})) {
    const d = derive(state.data.countries[code]?.base);
    out[code] = d?.max_acquisition ?? null;
  }
  return out;
}

function sumValues(map) {
  return Object.values(map)
    .filter((v) => v != null && Number.isFinite(v))
    .reduce((a, b) => a + b, 0);
}

function syncMapHeat() {
  const potential = potentialByCountry();
  const expected = expectedByCountry();
  const maxAcq = maxByCountry();
  // Heat + labels follow expected (the k-scale numbers on the map)
  map.setMetricValues(expected);
  map.setMetricThreshold(null);
  map.setLabelValues(expected);
  map.paint();

  const nums = Object.values(expected).filter((v) => v != null && Number.isFinite(v));
  const lo = nums.length ? Math.min(...nums) : 0;
  const hi = nums.length ? Math.max(...nums) : 0;
  if ($("legendLo")) $("legendLo").textContent = fmtPeople(lo);
  if ($("legendHi")) $("legendHi").textContent = fmtPeople(hi);

  if ($("mapTotalValue")) $("mapTotalValue").textContent = fmtPeople(sumValues(expected));
  if ($("mapTotalMax")) $("mapTotalMax").textContent = fmtPeople(sumValues(maxAcq));
  if ($("mapTotalPotential")) $("mapTotalPotential").textContent = fmtPeople(sumValues(potential));
}

function syncRatesUI() {
  const { acquisition, expected } = rates();
  const acq = $("acqRate");
  const exp = $("expRate");
  if (acq) acq.value = String(acquisition);
  if (exp) exp.value = String(expected);
  if ($("acqRateLabel")) $("acqRateLabel").textContent = `${(acquisition * 100).toFixed(2)}%`;
  if ($("expRateLabel")) $("expRateLabel").textContent = `${(expected * 100).toFixed(3)}%`;
  const at = derive(state.data.countries?.AT?.base);
  if ($("ratesHint") && at) {
    $("ratesHint").textContent = `Austria → expected ${at.display.expected_acquisition} · max ${at.display.max_acquisition} (potential ${at.display.market_potential})`;
  }
}

function onRatesChange() {
  setRates({
    acquisition: Number($("acqRate")?.value),
    expected: Number($("expRate")?.value),
  });
  syncRatesUI();
  syncMapHeat();
  if (state.level === "country" && state.country) {
    const c = countryOf(state.country);
    renderMetricStrip($("baseStrip"), c?.base);
  }
  if (state.level === "offer" && state.topic) {
    openOffer(state.topic, { history: false });
  }
}

function renderMetricStrip(el, m, { clickable } = {}) {
  if (!el) return;
  el.replaceChildren();
  if (!m) return;
  const items = [
    ["Target <27", fmtMetric(m, "target_audience")],
    ["Share of total target", fmtMetric(m, "share_of_total_target_pct")],
    ["Market share", fmtMetric(m, "market_share_pct")],
    ["Market potential", fmtMetric(m, "market_potential")],
    ["Max acquisition", fmtMetric(m, "max_acquisition")],
    ["Expected acquisition", fmtMetric(m, "expected_acquisition")],
  ];
  for (const [label, value] of items) {
    const cell = document.createElement(clickable ? "button" : "div");
    if (clickable) {
      cell.type = "button";
      cell.className = "metric-chip metric-chip-btn";
    } else {
      cell.className = "metric-chip";
    }
    cell.innerHTML = `<span class="metric-chip-label">${label}</span><span class="metric-chip-value">${value}</span>`;
    el.appendChild(cell);
  }
}

function showPeek(code, e) {
  if (state.level !== "map") return;
  const c = countryOf(code);
  if (!c) return;
  const d = derive(c.base);
  const p = $("peek");
  p.innerHTML = `<b>${c.name}</b><span>Target ${d?.display.target_audience || "—"} · Expected ${
    d?.display.expected_acquisition || "—"
  }</span><span>Max ${d?.display.max_acquisition || "—"} · Potential ${
    d?.display.market_potential || "—"
  }</span>`;
  p.classList.add("on");
  movePeek(e);
}

function movePeek(e) {
  const wrap = $("mapwrap").getBoundingClientRect();
  const p = $("peek");
  p.style.left = `${e.clientX - wrap.left}px`;
  p.style.top = `${e.clientY - wrap.top}px`;
}

function hidePeek() {
  $("peek")?.classList.remove("on");
}

const map = createMap($("map"), {
  onSelect: (code) => openCountry(code),
  onPeek: (code, e, moveOnly) => {
    if (moveOnly) {
      movePeek(e);
      return;
    }
    showPeek(code, e);
  },
  onHidePeek: hidePeek,
  onPick: () => {},
});

const countryMap = createMap($("countryMap"), {
  onSelect: () => {},
  onPeek: () => {},
  onHidePeek: () => {},
  onPick: () => {},
});

function applyCopy() {
  const m = state.data.meta || {};
  if ($("wordmark") && m.title) $("wordmark").textContent = m.title;
  if ($("source") && m.source) $("source").textContent = m.source;
}

function bootMaps(geo) {
  if (geo) state.geo = geo;
  const payload = marketsPayload(state.data);
  map.setData(payload);
  countryMap.setData(payload);
  if (state.geo) {
    map.setGeo(state.geo);
    countryMap.setGeo(state.geo);
  }
  map.setThemes(new Set());
  countryMap.setThemes(new Set());
  map.build(false);
  map.setActive(null);
  map.focusCountry(null);
  countryMap.build(false);
  countryMap.paint();
  syncRatesUI();
  syncMapHeat();
}

function deckSnapshot() {
  return {
    deck: true,
    level: state.level,
    country: state.country,
    topic: state.topic,
  };
}

function syncHistory(mode = "push") {
  if (applyingHistory) return;
  const snap = deckSnapshot();
  try {
    if (mode === "replace") history.replaceState(snap, "");
    else history.pushState(snap, "");
  } catch {
    /* file:// or restricted history */
  }
}

/** In-app / browser back — one step up the deck */
function goBack() {
  if (state.level === "offer" || state.level === "country") {
    try {
      history.back();
      return;
    } catch {
      /* fall through */
    }
  }
  if (state.level === "offer" && state.country) openCountry(state.country, { history: false });
  else if (state.level === "country") openMap({ history: false });
}

function showCover({ history = "replace" } = {}) {
  hidePeek();
  state.country = null;
  state.topic = null;
  map.setActive(null);
  map.focusCountry(null);
  map.paint();
  setLevel("cover");
  document.documentElement.classList.remove("level-map", "level-country", "level-offer");
  splash.show();
  if (history === "push") syncHistory("push");
  else if (history === "replace") syncHistory("replace");
}

function openMap({ history = "push" } = {}) {
  hidePeek();
  state.country = null;
  state.topic = null;
  map.setActive(null);
  map.focusCountry(null);
  syncMapHeat();
  setLevel("map");
  if (history === "push") syncHistory("push");
  else if (history === "replace") syncHistory("replace");
}

function openCountry(code, { history = "push" } = {}) {
  const c = countryOf(code);
  if (!c || !map.hasShape(code)) return;
  hidePeek();
  state.country = code;
  state.topic = null;

  $("countryTitle").textContent = c.name;
  $("countryTeaser").textContent = c.teaser || "";

  const strip = $("baseStrip");
  renderMetricStrip(strip, c.base);
  if (strip) {
    strip.onclick = () => openOffer("base");
    strip.title = "Open country total detail";
    strip.classList.add("metric-strip-clickable");
  }

  const cards = $("topicCards");
  cards.replaceChildren();
  for (const h of state.data.hobbies || []) {
    const block = c.hobbies?.[h.id];
    if (!block) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "topic-card";
    btn.dataset.topic = h.id;
    btn.innerHTML = `
      <span class="topic-card-label">${h.label}</span>
      <span class="topic-card-value">${fmtMetric(block, "expected_acquisition")}</span>
      <span class="topic-card-meta">Expected acquisition</span>
    `;
    btn.addEventListener("click", () => openOffer(h.id));
    cards.appendChild(btn);
  }

  map.setActive(code);
  map.paint();

  countryMap.setActive(code);
  countryMap.focusCountry(code);
  countryMap.paint();

  setLevel("country");
  if (history === "push") syncHistory("push");
  else if (history === "replace") syncHistory("replace");
}

function renderYearTable(m) {
  const years = state.data.years || [];
  const table = $("yearTable");
  if (!table || !m) return;
  const headRow = table.querySelector("thead tr");
  const pctRow = $("yearPctRow");
  const volRow = $("yearVolRow");
  if (!headRow || !pctRow || !volRow) return;

  headRow.replaceChildren(document.createElement("th"));
  pctRow.replaceChildren();
  volRow.replaceChildren();
  const thPct = document.createElement("th");
  thPct.textContent = "Growth %";
  pctRow.appendChild(thPct);
  const thVol = document.createElement("th");
  thVol.textContent = "Volume";
  volRow.appendChild(thVol);

  years.forEach((y, i) => {
    const th = document.createElement("th");
    th.textContent = String(y);
    headRow.appendChild(th);

    const tdP = document.createElement("td");
    tdP.textContent = m.growth_pct?.[i] != null ? `${m.growth_pct[i]}%` : "—";
    pctRow.appendChild(tdP);

    const tdV = document.createElement("td");
    const v = m.growth_volume?.[i];
    tdV.textContent =
      v == null ? "—" : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v);
    volRow.appendChild(tdV);
  });
}

function renderOfferChartFromMetrics(m, title) {
  const wrap = $("offerChart");
  const barsEl = $("offerChartBars");
  if (!wrap || !barsEl) return;
  const years = state.data.years || [];
  const vols = m?.growth_volume || [];
  if (!vols.length) {
    wrap.hidden = true;
    barsEl.replaceChildren();
    return;
  }
  wrap.hidden = false;
  $("offerChartTitle").textContent = title || "10-year volume";
  $("offerChartCaption").textContent =
    "Yearly volume after growth % · demo — replace via Import";

  const max = Math.max(...vols.map(Number), 1);
  barsEl.replaceChildren();
  vols.forEach((val, i) => {
    const col = document.createElement("div");
    col.className = "offer-chart-col";
    const h = Math.max(6, Math.round((Number(val) / max) * 120));
    const label = years[i] != null ? String(years[i]).slice(2) : `Y${i + 1}`;
    col.innerHTML = `
      <span class="offer-chart-value">${val >= 1000 ? `${Math.round(val / 1000)}k` : val}</span>
      <span class="offer-chart-bar" style="height:${h}px"></span>
      <span class="offer-chart-label">${label}</span>
    `;
    barsEl.appendChild(col);
  });
}

function openOffer(topicId, { history = "push" } = {}) {
  const c = countryOf(state.country);
  const m = metricsOf(c, topicId);
  if (!c || !m) return;
  state.topic = topicId;
  const meta = topicMeta(topicId);

  $("offerKicker").textContent = `${c.name} · ${meta.label}`;
  $("offerTitle").textContent = meta.label;

  const stats = $("offerStats");
  stats.replaceChildren();
  const cells = [
    ["Target <27", fmtMetric(m, "target_audience")],
    ["Share of total target", fmtMetric(m, "share_of_total_target_pct")],
    ["Market share", fmtMetric(m, "market_share_pct")],
    ["Market potential", fmtMetric(m, "market_potential")],
    ["Max acquisition", fmtMetric(m, "max_acquisition")],
    ["Expected acquisition", fmtMetric(m, "expected_acquisition")],
  ];
  for (const [label, value] of cells) {
    const div = document.createElement("div");
    div.className = "offer-stat";
    div.innerHTML = `<span class="offer-stat-label">${label}</span><span class="offer-stat-value">${value}</span>`;
    stats.appendChild(div);
  }

  $("offerDesc1").textContent =
    topicId === "base"
      ? `Potential = target ÷ (market share / 100). Max = potential × acquisition rate. Expected = potential × expected rate.`
      : `Hobby row for ${meta.label}. Same formulas · rates are global (see map panel).`;
  $("offerDesc2").textContent =
    "Change rates on the map to recalculate max / expected for every country.";

  renderOfferChartFromMetrics(m, `${meta.label} · volume by year`);
  renderYearTable(m);

  setLevel("offer");
  if (history === "push") syncHistory("push");
  else if (history === "replace") syncHistory("replace");
}

function restart() {
  showCover({ history: "push" });
}

function applyHistorySnapshot(snap) {
  applyingHistory = true;
  try {
    const level = snap?.level || "cover";
    if (level === "cover") {
      showCover({ history: false });
      return;
    }
    if (level === "map") {
      openMap({ history: false });
      return;
    }
    if (level === "country" && snap.country && countryOf(snap.country)) {
      openCountry(snap.country, { history: false });
      return;
    }
    if (level === "offer" && snap.country && snap.topic && countryOf(snap.country)) {
      openCountry(snap.country, { history: false });
      openOffer(snap.topic, { history: false });
      return;
    }
    openMap({ history: false });
  } finally {
    applyingHistory = false;
  }
}

function bindChrome() {
  $("countryBack")?.addEventListener("click", () => goBack());
  $("offerBack")?.addEventListener("click", () => goBack());
  $("offerRestart")?.addEventListener("click", () => restart());
  $("restartBtn")?.addEventListener("click", () => restart());

  $("acqRate")?.addEventListener("input", onRatesChange);
  $("expRate")?.addEventListener("input", onRatesChange);

  window.addEventListener("popstate", (e) => {
    const snap = e.state?.deck ? e.state : { level: "cover", country: null, topic: null, deck: true };
    applyHistorySnapshot(snap);
  });

  $("importFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json.countries || !json.hobbies) throw new Error("Invalid presentation JSON");
      state.data = json;
      applyCopy();
      bootMaps();
      if (state.level === "country" && state.country) openCountry(state.country, { history: "replace" });
      else if (state.level === "offer" && state.country && state.topic) {
        openCountry(state.country, { history: false });
        openOffer(state.topic, { history: "replace" });
      } else if (state.level === "map" || state.level === "country" || state.level === "offer") {
        openMap({ history: "replace" });
      }
    } catch (err) {
      console.error(err);
      alert("Could not import JSON. Check the presentation.json schema.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (state.level === "offer" || state.level === "country") goBack();
  });
}

const splash = createSplash({
  onEnter: async () => {
    openMap({ history: "push" });
  },
});

bindChrome();

Promise.all([loadPresentation(), loadEuropeGeo().catch((err) => {
  console.error(err);
  return null;
})])
  .then(([data, geo]) => {
    state.data = data;
    applyCopy();
    bootMaps(geo);
    splash.show();
    setLevel("cover");
    syncHistory("replace");
  })
  .catch((err) => {
    console.error(err);
    state.data = structuredClone(PRESENTATION_DATA);
    applyCopy();
    bootMaps(null);
    splash.show();
    setLevel("cover");
    syncHistory("replace");
  });
