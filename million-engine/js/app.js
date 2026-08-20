import { CONFIG } from "./config.js";
import { SAMPLE_DATA } from "./data/markets.js";
import { $, formatInt } from "./utils/dom.js";
import { opportunitiesFor } from "./model.js";
import { createMap, loadEuropeGeo } from "./map.js";
import { createPanel } from "./panel.js";
import { createStory } from "./story.js";
import { createInsights } from "./insights.js";
import { createCompare } from "./compare.js";
import { loadInitialData, wireImport } from "./data-loader.js";
import {
  loadGwi,
  THEME_TO_GWI,
  categoriesFor,
  answersFor,
  metricAt,
  indexByMarket,
} from "./gwi.js";

const state = {
  data: null,
  gwi: null,
  activeThemes: new Set(),
  active: null,
  picked: null,
  mode: "explore",
  category: null,
  answer: null,
  pickerOpen: false,
  expandAudience: true,
  expandCategory: true,
};

const map = createMap($("map"), {
  onSelect: (code) => select(code),
  onPeek: (code, e, moveOnly) => {
    if (moveOnly) {
      movePeek(e);
      return;
    }
    showPeek(code, e);
  },
  onHidePeek: hidePeek,
  onPick: (i, el) => pick(i, el),
});

const panel = createPanel({
  heat: map.heat,
  onClose: clear,
  onPick: (i) => pick(i, map.bubbleAt(i)),
  onSignal: ({ category, answer }) => applyPanelSignal(category, answer),
});

function panelOpts() {
  return {
    gwi: state.gwi,
    audienceKey: gwiAudienceKey(),
    category: state.category,
    answer: state.answer,
  };
}

function renderActivePanel() {
  if (!state.active || compare.open) return;
  panel.render(state.data, state.active, state.activeThemes, state.picked, panelOpts());
}

function applyPanelSignal(category, answer) {
  if (!category || !answer) return;
  state.category = category;
  state.answer = answer;
  state.expandAudience = false;
  state.expandCategory = false;
  closeAnswerPicker();
  buildCategories();
  syncCategories();
  syncFilterPath();
  applyMetricToMap();
  if (state.active) {
    map.drawLock(state.active);
    map.drawOpportunities(state.active);
  }
  renderActivePanel();
}

const insights = createInsights({
  onApply: ({ themeId, category, answer }) => {
    applyAnalysisSignal(themeId, category, answer);
  },
});

const compare = createCompare({
  heat: map.heat,
  onChange: (codes) => {
    map.setCompare(compare.open ? codes : []);
    map.paint();
  },
  onOpenChange: (open) => {
    if (open) {
      if (insights.open) insights.hide();
      if (story.active) story.toggle(false);
      clear();
      map.setCompare(compare.codes);
      map.paint();
      setMode("compare");
    } else if (state.mode === "compare") {
      map.setCompare([]);
      map.paint();
      setMode("explore");
    }
  },
});

const story = createStory({
  onStep: applyStoryStep,
  onExit: () => {
    if (state.mode === "story") {
      setMode("explore");
    }
  },
});

function primaryAudienceId() {
  return [...state.activeThemes][0] || null;
}

function gwiAudienceKey() {
  const id = primaryAudienceId();
  return id ? THEME_TO_GWI[id] || null : null;
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode").forEach((b) => {
    const on = b.dataset.mode === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", String(on));
  });
  $("filterPath")?.classList.toggle("is-locked", mode === "story");
}


function syncLegend() {
  const title = document.querySelector(".legend-title");
  if (!title) return;
  if (state.answer && state.category) {
    title.textContent = CONFIG.text.legendIndex;
    $("scaleLo").textContent = CONFIG.text.scaleLow;
    $("scaleHi").textContent = CONFIG.text.scaleHigh;
  } else {
    title.textContent = CONFIG.text.legendDefault;
    $("scaleLo").textContent = "lower";
    $("scaleHi").textContent = "higher";
  }
}

function applyMetricToMap() {
  const aud = gwiAudienceKey();
  if (!state.gwi || !aud || !state.category || !state.answer) {
    map.setMetricValues(null);
    map.paint();
    syncLegend();
    return;
  }
  const isos = Object.keys(state.data.markets);
  const values = indexByMarket(state.gwi, aud, state.category, state.answer, isos);
  map.setMetricValues(values);
  map.paint();
  syncLegend();
}

function applyCopy() {
  const T = CONFIG.text;
  $("wordmark").textContent = state.data?.meta?.title || T.wordmark;
  $("tagline").textContent = T.tagline;
  $("scaleLo").textContent = T.scaleLow;
  $("scaleHi").textContent = T.scaleHigh;
  $("ioBtn").textContent = T.import;
  $("exploreBtn").textContent = T.explore;
  $("storyBtn").textContent = T.story;
  $("insightsBtn").textContent = T.insights;
  $("compareBtn").textContent = T.compare;
  $("drop").textContent = T.dropzone;
  $("source").textContent = state.data?.meta?.source || T.source;
  const target = state.data?.meta?.target ?? 1_000_000;
  $("targetNum").textContent = formatInt(target);

  $("insightsHeadline").textContent =
    "Top 10 most relevant questions from the Erste markets data";
  syncLegend();
}

function applyAnalysisSignal(themeId, category, answer) {
  if (!themeId || !category || !answer) return;
  if (compare.open) compare.hide();
  if (story.active) story.toggle(false);
  if (insights.open) insights.hide();

  state.activeThemes = new Set([themeId]);
  state.category = category;
  state.answer = answer;
  state.expandAudience = false;
  state.expandCategory = false;
  state.picked = null;
  state.active = null;

  syncThemes();
  map.setThemes(state.activeThemes);
  compare.setThemes(state.activeThemes);
  buildCategories();
  syncCategories();
  syncFilterPath();
  applyMetricToMap();
  map.setActive(null);
  map.clearOverlays();
  panel.hide();
  $("mapwrap").classList.remove("dim");
  setMode("explore");
}

function shortLabel(text, max = 26) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function syncFilterPath() {
  const hasAud = state.activeThemes.size > 0;
  const hasCat = Boolean(state.category);

  const filterRow = $("filterRow");
  const answerRow = $("answerRow");
  const sepCat = $("sepCat");
  const sepSig = $("sepSig");

  if (filterRow) filterRow.hidden = !hasAud;
  if (sepCat) sepCat.hidden = !hasAud;
  if (answerRow) answerRow.hidden = !hasCat;
  if (sepSig) sepSig.hidden = !hasCat;

  $("themes")?.classList.toggle(
    "is-compact",
    hasAud && !state.expandAudience
  );
  $("categories")?.classList.toggle(
    "is-compact",
    hasCat && !state.expandCategory
  );

  syncAnswerTrigger();
}

/** Audience = single select; collapses after pick */
function buildThemes() {
  const bar = $("themes");
  bar.replaceChildren();
  state.activeThemes = new Set();
  state.expandAudience = true;

  state.data.themes.forEach((th) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme";
    b.dataset.theme = th.id;
    b.textContent = th.label;
    b.title = th.label;
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      const already = state.activeThemes.has(th.id);
      if (already && !state.expandAudience) {
        state.expandAudience = true;
        syncFilterPath();
        return;
      }
      state.activeThemes = new Set([th.id]);
      state.expandAudience = false;
      state.expandCategory = true;
      state.category = null;
      state.answer = null;
      closeAnswerPicker();
      syncThemes();
      state.picked = null;
      map.setThemes(state.activeThemes);
      compare.setThemes(state.activeThemes);
      buildCategories();
      applyMetricToMap();
      syncFilterPath();
      if (state.active && !compare.open) {
        map.drawLock(state.active);
        map.drawOpportunities(state.active);
        renderActivePanel();
        $("mapwrap").classList.add("dim");
      }
    };
    bar.appendChild(b);
  });
  map.setThemes(state.activeThemes);
  compare.setThemes(state.activeThemes);
  syncFilterPath();
}

function syncThemes() {
  $("themes").querySelectorAll(".theme").forEach((b) => {
    const on = state.activeThemes.has(b.dataset.theme);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}

function buildCategories() {
  const bar = $("categories");
  if (!bar) return;
  bar.replaceChildren();
  const aud = gwiAudienceKey();
  const cats = categoriesFor(state.gwi, aud);

  if (state.category && !cats.includes(state.category)) {
    state.category = null;
    state.answer = null;
  }

  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme" + (state.category === cat ? " on" : "");
    b.textContent = shortLabel(cat);
    b.title = cat;
    b.dataset.cat = cat;
    b.onclick = () => {
      const already = state.category === cat;
      if (already && !state.expandCategory) {
        state.expandCategory = true;
        syncFilterPath();
        return;
      }
      state.category = cat;
      state.expandCategory = false;
      state.answer = null;
      closeAnswerPicker();
      syncCategories();
      applyMetricToMap();
      syncFilterPath();
      renderActivePanel();
    };
    bar.appendChild(b);
  });
  syncFilterPath();
}

function syncCategories() {
  $("categories")?.querySelectorAll(".theme").forEach((b) => {
    b.classList.toggle("on", b.dataset.cat === state.category);
  });
}

function syncAnswerTrigger() {
  const trigger = $("answerTrigger");
  const clearBtn = $("answerClear");
  if (!trigger) return;
  const enabled = Boolean(state.category);
  trigger.disabled = !enabled;
  if (state.answer) {
    trigger.textContent = shortLabel(state.answer, 32);
    trigger.title = state.answer;
    trigger.classList.add("has-value");
    clearBtn.hidden = false;
  } else {
    trigger.textContent = CONFIG.text.signalPlaceholder;
    trigger.title = "";
    trigger.classList.remove("has-value");
    clearBtn.hidden = true;
  }
}

function openAnswerPicker() {
  if (!state.category) return;
  state.pickerOpen = true;
  const picker = $("answerPicker");
  picker.hidden = false;
  renderAnswerList($("answerSearch")?.value || "");
  $("answerSearch")?.focus();
}

function closeAnswerPicker() {
  state.pickerOpen = false;
  const picker = $("answerPicker");
  if (picker) picker.hidden = true;
}

function renderAnswerList(query = "") {
  const list = $("answerList");
  if (!list) return;
  const aud = gwiAudienceKey();
  const all = answersFor(state.gwi, aud, state.category);
  const q = query.trim().toLowerCase();
  const filtered = q ? all.filter((a) => a.toLowerCase().includes(q)) : all;

  list.innerHTML = filtered.length
    ? filtered
        .map(
          (a, i) =>
            `<button type="button" class="answer-option${
              a === state.answer ? " on" : ""
            }" data-i="${i}">${a}</button>`
        )
        .join("")
    : `<div class="compare-empty" style="padding:14px">No matches</div>`;

  list.querySelectorAll(".answer-option").forEach((btn) => {
    btn.onclick = () => {
      state.answer = filtered[+btn.dataset.i];
      closeAnswerPicker();
      syncAnswerTrigger();
      applyMetricToMap();
      renderActivePanel();
    };
  });
}

function showPeek(code, e) {
  if (state.activeThemes.size === 0 || story.active) return;
  const market = state.data.markets[code];
  const p = $("peek");
  const extra = compare.open
    ? compare.has(code)
      ? " · in compare"
      : " · click to add"
    : "";

  if (state.category && state.answer) {
    const m = metricAt(state.gwi, gwiAudienceKey(), code, state.category, state.answer);
    p.innerHTML = `<b>${market.name}</b><span>${state.answer} · Index ${
      m?.index ?? "—"
    } · ${m?.col_pct ?? "—"}%${extra}</span>`;
  } else {
    const idx = opportunitiesFor(state.data, code, state.activeThemes);
    const score = idx.reduce((a, s) => a + s.s * s.e, 0) / 100;
    p.innerHTML = `<b>${market.name}</b><span>${CONFIG.text.potential} ${score.toFixed(
      1
    )} · ${formatInt(market.contribution || 0)}${extra}</span>`;
  }
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
  $("peek").classList.remove("on");
}

function select(code) {
  if (compare.open) {
    if (!state.data.markets[code]) return;
    if (compare.has(code)) compare.remove(code);
    else compare.add(code);
    hidePeek();
    return;
  }

  if (state.activeThemes.size === 0) return;
  if (!state.data.markets[code] || !map.hasShape(code)) return;
  state.active = code;
  state.picked = null;
  hidePeek();
  map.setActive(code);
  map.paint();
  map.drawLock(code);
  map.drawOpportunities(code);
  renderActivePanel();
  $("mapwrap").classList.add("dim");
}

function clear() {
  state.active = null;
  state.picked = null;
  map.setActive(null);
  map.clearOverlays();
  panel.hide();
  $("mapwrap").classList.remove("dim");
  map.paint();
}

function pick(i, fromEl) {
  if (!state.active || compare.open) return;
  state.picked = state.picked === i ? null : i;
  map.highlightBubbles(state.picked);
  panel.showPick(state.data, state.active, state.activeThemes, state.picked, fromEl);
}

function applyStoryStep(s) {
  if (compare.open) compare.hide();
  if (insights.open) insights.hide();
  setMode("story");
  state.activeThemes = new Set(s.themes || []);
  state.expandAudience = false;
  state.expandCategory = !state.category;
  syncThemes();
  map.setThemes(state.activeThemes);
  compare.setThemes(state.activeThemes);
  buildCategories();
  applyMetricToMap();
  syncFilterPath();

  if (s.market && state.data.markets[s.market]) {
    select(s.market);
    if (s.opportunity != null) {
      setTimeout(() => pick(s.opportunity, map.bubbleAt(s.opportunity)), 420);
    }
  } else {
    state.active = null;
    state.picked = null;
    map.setActive(null);
    map.clearOverlays();
    panel.hide();
    $("mapwrap").classList.remove("dim");
    map.paint();
  }
}

function goExplore() {
  if (compare.open) compare.hide();
  if (insights.open) insights.hide();
  if (story.active) story.toggle(false);
  setMode("explore");
}

function boot(data) {
  state.data = data;
  state.active = null;
  state.picked = null;
  state.category = null;
  state.answer = null;
  state.expandAudience = true;
  state.expandCategory = true;
  map.setData(data);
  map.setMetricValues(null);
  compare.setData(data);
  insights.setInsights(data.insights);
  if (state.gwi) insights.setGwi(state.gwi);
  applyCopy();
  map.build(true);
  buildThemes();
  buildCategories();
  story.syncVisibility();
  setMode("explore");
  clear();
}

$("exploreBtn").onclick = () => goExplore();

$("compareBtn").onclick = () => {
  if (compare.open) {
    compare.hide();
    return;
  }
  if (insights.open) insights.hide();
  if (story.active) story.toggle(false);
  compare.show();
};

const _storyToggle = story.toggle.bind(story);
story.toggle = (force) => {
  const willOn = force !== undefined ? force : !story.active;
  if (willOn) {
    if (compare.open) compare.hide();
    if (insights.open) insights.hide();
  }
  _storyToggle(force);
  if (story.active) {
    setMode("story");
  } else if (state.mode === "story") {
    setMode("explore");
  }
};
$("storyBtn").onclick = () => story.toggle();

const insightsShow = insights.show.bind(insights);
const insightsHide = insights.hide.bind(insights);
insights.show = async () => {
  if (compare.open) compare.hide();
  if (story.active) story.toggle(false);
  await insightsShow();
  setMode("insights");
};
insights.hide = () => {
  insightsHide();
  if (state.mode === "insights") {
    setMode("explore");
  }
};
$("insightsBtn").onclick = () => {
  if (insights.open) insights.hide();
  else insights.show();
};
$("insightsClose").onclick = () => insights.hide();

$("answerTrigger").onclick = (e) => {
  e.stopPropagation();
  if (state.pickerOpen) closeAnswerPicker();
  else openAnswerPicker();
};

$("answerSearch")?.addEventListener("input", (e) => {
  renderAnswerList(e.target.value);
});

$("answerClear").onclick = () => {
  state.answer = null;
  closeAnswerPicker();
  syncAnswerTrigger();
  applyMetricToMap();
  renderActivePanel();
};

document.addEventListener("click", (e) => {
  if (state.pickerOpen && !e.target.closest?.(".answer-wrap")) {
    closeAnswerPicker();
  }
  if (e.target.closest?.("#filterPath")) return;
  let changed = false;
  if (state.expandAudience && state.activeThemes.size > 0) {
    state.expandAudience = false;
    changed = true;
  }
  if (state.expandCategory && state.category) {
    state.expandCategory = false;
    changed = true;
  }
  if (changed) syncFilterPath();
});

wireImport({
  onLoad: (data) => {
    if (story.active) story.toggle(false);
    if (compare.open) compare.hide();
    if (insights.open) insights.hide();
    boot(data);
  },
  dropEl: $("drop"),
  fileInput: $("file"),
  button: $("ioBtn"),
});

$("map").addEventListener("click", (e) => {
  if (story.active || compare.open) return;
  if (e.target.closest?.(".land") || e.target.closest?.(".bub")) return;
  clear();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.pickerOpen) {
      closeAnswerPicker();
      return;
    }
    if (compare.open) compare.hide();
    else if (insights.open) insights.hide();
    else if (story.active) story.toggle(false);
    else clear();
  }
  if (!story.active) return;
  if (e.key === "ArrowRight") story.goto(story.step + 1);
  if (e.key === "ArrowLeft") story.goto(story.step - 1);
});

Promise.all([loadInitialData(SAMPLE_DATA), loadEuropeGeo(), loadGwi().catch(() => null)])
  .then(([data, geo, gwi]) => {
    state.gwi = gwi;
    insights.setGwi(gwi);
    map.setGeo(geo);
    boot(data);
  })
  .catch((err) => {
    console.error(err);
  });
