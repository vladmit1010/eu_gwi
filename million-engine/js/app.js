import { $ } from "./utils/dom.js";
import { createMap, loadEuropeGeo } from "./map.js?v=20260827a";
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
  return state.data.topics?.find((t) => t.id === id) || { id, label: id };
}

function showPeek(code, e) {
  if (state.level !== "map") return;
  const c = countryOf(code);
  if (!c) return;
  const p = $("peek");
  p.innerHTML = `<b>${c.name}</b><span>${c.peek || ""}</span>${
    c.teaser ? `<span>${c.teaser}</span>` : ""
  }`;
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
  map.setMetricValues(null);
  countryMap.setThemes(new Set());
  countryMap.setMetricValues(null);
  map.build(false);
  map.setActive(null);
  map.focusCountry(null);
  map.paint();
  countryMap.build(false);
  countryMap.paint();
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
  map.paint();
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

  const cards = $("topicCards");
  cards.replaceChildren();
  for (const t of state.data.topics || []) {
    const block = c.topics?.[t.id];
    if (!block) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "topic-card";
    btn.dataset.topic = t.id;
    btn.innerHTML = `
      <span class="topic-card-label">${t.label}</span>
      <span class="topic-card-value">${block.potential || "—"}</span>
      <span class="topic-card-meta">Potential</span>
    `;
    btn.addEventListener("click", () => openOffer(t.id));
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

function renderOfferChart(chart) {
  const wrap = $("offerChart");
  const barsEl = $("offerChartBars");
  if (!wrap || !barsEl) return;

  if (!chart?.bars?.length) {
    wrap.hidden = true;
    barsEl.replaceChildren();
    return;
  }

  wrap.hidden = false;
  $("offerChartTitle").textContent = chart.title || "Schematic";
  $("offerChartCaption").textContent = chart.caption || "";

  const max = Math.max(...chart.bars.map((b) => Number(b.value) || 0), 1);
  barsEl.replaceChildren();
  for (const bar of chart.bars) {
    const col = document.createElement("div");
    col.className = "offer-chart-col";
    const val = Number(bar.value) || 0;
    const h = Math.max(6, Math.round((val / max) * 120));
    col.innerHTML = `
      <span class="offer-chart-value">${bar.value}</span>
      <span class="offer-chart-bar" style="height:${h}px" title="${bar.tag || ""}"></span>
      <span class="offer-chart-label">${bar.label || ""}</span>
    `;
    barsEl.appendChild(col);
  }
}

function openOffer(topicId, { history = "push" } = {}) {
  const c = countryOf(state.country);
  const block = c?.topics?.[topicId];
  if (!block) return;
  state.topic = topicId;
  const meta = topicMeta(topicId);
  const offer = block.offer || {};

  $("offerKicker").textContent = `${c.name} · ${meta.label}`;
  $("offerTitle").textContent = offer.title || meta.label;
  $("offerPotential").textContent = block.potential || "—";
  $("offerStat1").textContent = offer.statistic_1 || "—";
  $("offerStat2").textContent = offer.statistic_2 || "—";
  $("offerDesc1").textContent = offer.description_1 || "";
  $("offerDesc2").textContent = offer.description_2 || "";
  renderOfferChart(offer.chart);

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
      if (!json.countries || !json.topics) throw new Error("Invalid presentation JSON");
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
