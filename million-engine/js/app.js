import { CONFIG } from "./config.js";
import { SAMPLE_DATA } from "./data/markets.js";
import { $, formatInt, formatPeople } from "./utils/dom.js";
import { createMap, loadEuropeGeo } from "./map.js";
import { createPanel } from "./panel.js";
import { createInsights } from "./insights.js";
import { createBubbles } from "./bubbles.js";
import { createTutorial } from "./tutorial.js";
import { loadInitialData } from "./data-loader.js";
import {
  loadGwi,
  THEME_TO_GWI,
  ISO_TO_GWI,
  metricAt,
  indexByMarket,
  EXPLORE_THEME_IDS,
  coerceExploreThemeId,
} from "./gwi.js";
import {
  CORE_PASSIONS,
  resolvePassion,
  mostLikedInterests,
  categoryBubblesForCountry,
  answerBubblesForCategory,
  countryBubblesForAudience,
  whoSplitForCountry,
  audienceSnapshot,
  CATEGORY_META,
} from "./passions.js";

/** Explore audiences only — Affluent & Gen Z */
const EXPLORE_AUDIENCES = EXPLORE_THEME_IDS;

const state = {
  data: null,
  gwi: null,
  activeThemes: new Set(["affluent"]),
  active: null,
  mode: "explore",
  passionId: null,
  likedSort: "people",
  localLens: null,
};

/** Country picked during tutorial country-gate — survives the Who step */
let tutorialCountry = null;

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
  onPick: () => {},
});

const panel = createPanel({
  onClose: clear,
  onLocalPassion: (row) => applyLocalLens(row),
});

const bubbles = createBubbles({
  onCategory: (item) => {
    const code = state.active;
    if (!code) return;
    openAnswerBubbles(code, item);
  },
  onPassion: (item) => {
    // Apply theme, then close so the map colour change is visible.
    if (item.kind === "global") {
      state.passionId = item.id;
      state.localLens = null;
    } else {
      state.localLens = { category: item.category, answer: item.answer };
      state.passionId = null;
    }
    document.querySelectorAll(".passion-chip.pulse").forEach((el) => {
      el.classList.remove("pulse");
    });
    syncPassions();
    applyMetricToMap();
    bubbles.hide();
    if (tutorial.active) tutorial.notify("passion");
  },
  onCountry: (code) => {
    select(code);
  },
  onBack: () => {
    if (state.active) openPassionBubbles(state.active);
  },
  onClose: (opts) => {
    if (opts?.phase === "before") {
      if (tutorial.active && tutorial.gate === "passion") return false;
      return;
    }
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    map.paint();
    syncPassions();
  },
});

const insights = createInsights({
  onApply: ({ themeId, category, answer }) => {
    applyAnalysisSignal(themeId, category, answer);
  },
});

function clearTutorialHighlights() {
  document.documentElement.classList.remove(
    "tutorial-step-who",
    "tutorial-step-passions",
    "tutorial-step-f1map"
  );
  $("targetPill")?.classList.remove("tutorial-focus");
  document.querySelectorAll(".tutorial-spot").forEach((el) => {
    el.classList.remove("tutorial-spot");
  });
  document.querySelectorAll(".aud-chip.tutorial-hl, .passion-chip.tutorial-hl").forEach((el) => {
    el.classList.remove("tutorial-hl");
  });
  const scrim = $("tutorialScrim");
  scrim?.classList.remove("on");
  scrim?.setAttribute("aria-hidden", "true");
}

function spotlight(...els) {
  const list = els.filter(Boolean);
  const scrim = $("tutorialScrim");
  if (list.length && scrim) {
    scrim.classList.add("on");
    scrim.setAttribute("aria-hidden", "false");
  }
  list.forEach((el) => {
    el.classList.add("tutorial-spot");
  });
}

async function applyTutorialStep(step) {
  clearTutorialHighlights();
  tutorial.hidePanel();
  if (insights.open) insights.hide();

  const id = step?.id;

  if (id === "intro") {
    tutorialCountry = null;
    if (bubbles.open) bubbles.hide();
    state.active = null;
    state.localLens = null;
    state.passionId = null;
    state.activeThemes = new Set(["affluent"]);
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    syncAudiences();
    map.setThemes(state.activeThemes);
    syncPassions();
    map.setMetricValues(null);
    map.paint();
    syncLegend(null);
    $("targetPill")?.classList.add("tutorial-focus");
    spotlight($("targetPill"));
    return;
  }

  if (id === "who") {
    if (bubbles.open) bubbles.hide();
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    // F1 on so switching Who visibly recolours the map
    state.activeThemes = new Set(["affluent"]);
    state.passionId = "f1";
    state.localLens = null;
    syncAudiences();
    syncPassions();
    map.setThemes(state.activeThemes);
    applyMetricToMap();
    document.documentElement.classList.add("tutorial-step-who");
    $("audiences")?.querySelectorAll(".aud-chip").forEach((b) => {
      b.classList.add("tutorial-hl");
    });
    spotlight(document.querySelector(".explore-group-who"), $("mapwrap"));
    return;
  }

  if (id === "passions") {
    if (!state.activeThemes.size) state.activeThemes = new Set(["affluent"]);
    state.passionId = "f1";
    state.localLens = null;
    syncAudiences();
    syncPassions();
    applyMetricToMap();
    document.documentElement.classList.add("tutorial-step-passions");
    $("passions")?.querySelectorAll(".passion-chip").forEach((b) => {
      b.classList.add("tutorial-hl");
    });
    spotlight(document.querySelector(".explore-group-passions"));
    return;
  }

  if (id === "f1map") {
    if (!state.activeThemes.size) state.activeThemes = new Set(["affluent"]);
    state.passionId = "f1";
    state.localLens = null;
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    if (bubbles.open) bubbles.hide();
    syncAudiences();
    syncPassions();
    applyMetricToMap();
    document.documentElement.classList.add("tutorial-step-f1map");
    $("passions")?.querySelector('[data-passion="f1"]')?.classList.add("tutorial-hl");
    spotlight($("mapwrap"), $("passions")?.querySelector('[data-passion="f1"]'));
    return;
  }

  if (id === "country") {
    tutorialCountry = null;
    state.passionId = "f1";
    state.localLens = null;
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    if (bubbles.open) bubbles.hide();
    syncPassions();
    applyMetricToMap();
    spotlight($("mapwrap"));
    return;
  }

  if (id === "f1split") {
    const code = tutorialCountry || state.active;
    if (!code) return;
    tutorial.hidePanel();
    hidePeek();
    state.active = code;
    map.setActive(code);
    map.clearOverlays();
    map.paint();
    $("mapwrap").classList.add("dim");
    if (!bubbles.open) openPassionBubbles(code);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const whoBlock = document.querySelector("#bubbleSide .bubble-side-block");
        if (whoBlock) spotlight(whoBlock);
        else spotlight($("bubbleOverlay"));
      });
    });
    return;
  }

  if (id === "local") {
    tutorial.hidePanel();
    let code = tutorialCountry || state.active;
    if (!code || !map.hasShape(code)) {
      code = ["AT", "CZ", "HU", "RO", "HR", "RS"].find((c) => state.data.markets[c] && map.hasShape(c));
    }
    if (!code) return;
    if (!state.passionId && !state.localLens) state.passionId = "f1";
    state.active = code;
    hidePeek();
    map.setActive(code);
    map.clearOverlays();
    map.paint();
    openPassionBubbles(code);
    syncPassions();
    $("mapwrap").classList.add("dim");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const overlay = $("bubbleOverlay");
        if (overlay?.classList.contains("open")) spotlight(overlay);
        else spotlight($("mapwrap"));
      });
    });
    return;
  }

  if (id === "done") {
    tutorial.hidePanel();
    clearTutorialHighlights();
    if (bubbles.open) bubbles.hide();
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    map.paint();
    return;
  }
}

const tutorial = createTutorial({
  onStep: (step) => applyTutorialStep(step),
  onExit: () => {
    clearTutorialHighlights();
    tutorial.hidePanel();
    tutorialCountry = null;
    // Drop country selection left over from tutorial gates
    if (bubbles.open) bubbles.hide();
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    if (!state.passionId && !state.localLens) state.passionId = "f1";
    syncPassions();
    applyMetricToMap();
    map.paint();
  },
});

function primaryAudienceId() {
  return [...state.activeThemes][0] || null;
}

function gwiAudienceKey() {
  const id = primaryAudienceId();
  return id ? THEME_TO_GWI[id] || null : null;
}

function audienceLabel() {
  const id = primaryAudienceId();
  const th = state.data?.themes?.find((t) => t.id === id);
  return th?.label || id || "Audience";
}

function activeLens() {
  if (state.localLens) return state.localLens;
  const p = resolvePassion(state.passionId);
  return p ? { category: p.category, answer: p.answer } : null;
}

function themeLabelForLens() {
  if (state.localLens) return state.localLens.answer;
  const p = resolvePassion(state.passionId);
  return p?.label || p?.short || null;
}

function setMode(mode) {
  state.mode = mode;
  $("insightsBtn")?.classList.toggle("on", mode === "insights");
}

function syncGuide() {
  const hasTheme = Boolean(state.passionId || state.localLens);
  const hasCountry = Boolean(state.active);
  let active = "theme";
  if (hasTheme && !hasCountry) active = "map";
  if (hasCountry) active = "country";

  document.querySelectorAll(".guide-step").forEach((el) => {
    const key = el.dataset.step;
    const done =
      (key === "theme" && hasTheme) ||
      (key === "map" && hasCountry) ||
      (key === "country" && hasCountry);
    el.classList.toggle("on", key === active);
    el.classList.toggle("done", done && key !== active);
  });
}

function syncLegend(values = null) {
  const title = $("legendTitle") || document.querySelector(".legend-title");
  const kicker = $("legendKicker");
  const note = $("legendNote");
  const mid = $("scaleMid");
  if (!title) return;

  const lens = activeLens();
  if (!lens) {
    title.textContent = "Pick a theme first";
    if (kicker) kicker.textContent = "Map colour";
    if (note) note.textContent = "Darker = lower · Brighter orange = higher Interest";
    if (mid) mid.textContent = "";
    $("scaleLo").textContent = "—";
    $("scaleHi").textContent = "—";
    return;
  }

  const nums = values
    ? Object.values(values).filter((v) => v != null && !Number.isNaN(v))
    : [];
  const lo = nums.length ? Math.min(...nums) : null;
  const hi = nums.length ? Math.max(...nums) : null;
  const fmt = (n) => (n == null ? "—" : String(Math.round(n * 10) / 10));

  title.textContent = lens.answer;
  if (kicker) kicker.textContent = "Interest (Index) across Erste";
  if (note) {
    note.textContent =
      "Darker = lower Interest · Brighter orange = higher (among these 6 markets)";
  }
  if (mid) mid.textContent = "→";
  $("scaleLo").textContent = lo != null ? `Lower ${fmt(lo)}` : "Lower";
  $("scaleHi").textContent = hi != null ? `Higher ${fmt(hi)}` : "Higher";
}

function applyMetricToMap() {
  const aud = gwiAudienceKey();
  const lens = activeLens();
  if (!state.gwi || !aud || !lens) {
    map.setMetricValues(null);
    map.paint();
    syncLegend(null);
    return;
  }
  const isos = Object.keys(state.data.markets);
  const values = indexByMarket(state.gwi, aud, lens.category, lens.answer, isos);
  map.setMetricValues(values);
  map.paint();
  syncLegend(values);
}

function openPassionBubbles(code) {
  const market = state.data.markets[code];
  const countryKey = ISO_TO_GWI[code];
  const aud = gwiAudienceKey();
  const items = categoryBubblesForCountry(state.gwi, aud, countryKey);
  const lens = activeLens();
  panel.hide();
  bubbles.showPassions({
    countryName: market?.name || code,
    audienceLabel: audienceLabel(),
    items,
    level: "categories",
    who: whoSplitForCountry(state.gwi, countryKey, lens),
    snapshot: audienceSnapshot(state.gwi, aud, countryKey),
  });
}

function openAnswerBubbles(code, categoryItem) {
  const market = state.data.markets[code];
  const countryKey = ISO_TO_GWI[code];
  const aud = gwiAudienceKey();
  const items = answerBubblesForCategory(state.gwi, aud, countryKey, {
    category: categoryItem.category,
    pack: categoryItem.pack,
    limit: 14,
  });
  const lens = activeLens();
  const categoryLabel =
    categoryItem.pack === "global"
      ? "Global sponsorships"
      : CATEGORY_META[categoryItem.category]?.label || categoryItem.label;
  bubbles.showPassions({
    countryName: market?.name || code,
    audienceLabel: audienceLabel(),
    items,
    level: "answers",
    categoryLabel,
    selectedAnswer: lens?.answer || null,
    who: whoSplitForCountry(state.gwi, countryKey, lens),
    snapshot: audienceSnapshot(state.gwi, aud, countryKey),
  });
}

function openCountryBubbles() {
  const lens = activeLens();
  const items = countryBubblesForAudience(
    state.gwi,
    gwiAudienceKey(),
    lens,
    state.data.markets
  );
  panel.hide();
  bubbles.showCountries({
    audienceLabel: audienceLabel(),
    themeLabel: themeLabelForLens(),
    items,
  });
  if ($("bubbleKicker")) $("bubbleKicker").textContent = "Countries";
}

function applyCopy() {
  const T = CONFIG.text;
  $("wordmark").textContent = state.data?.meta?.title || T.wordmark;
  $("tagline").textContent = T.tagline;
  $("insightsBtn").textContent = T.insights;
  $("source").textContent = state.data?.meta?.source || T.source;
  $("targetNum").textContent = formatInt(state.data?.meta?.target ?? 1_000_000);
  $("insightsHeadline").textContent =
    "Top signals from Erste markets · Affluent & Gen Z";
  syncLegend();
}

function buildAudiences() {
  const bar = $("audiences");
  if (!bar) return;
  bar.replaceChildren();
  const themes = state.data.themes.filter((t) => EXPLORE_AUDIENCES.includes(t.id));
  if (!state.activeThemes.size && themes[0]) {
    state.activeThemes = new Set([themes[0].id]);
  }

  themes.forEach((th) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "aud-chip" + (state.activeThemes.has(th.id) ? " on" : "");
    b.dataset.theme = th.id;
    b.textContent = th.label;
    b.onclick = () => {
      state.activeThemes = new Set([th.id]);
      state.localLens = null;
      if (!state.passionId) state.passionId = "f1";
      state.active = null;
      map.setActive(null);
      map.clearOverlays();
      $("mapwrap").classList.remove("dim");
      if (bubbles.open) bubbles.hide();
      syncAudiences();
      map.setThemes(state.activeThemes);
      buildLikedThemes();
      applyMetricToMap();
      syncPassions();
      if (tutorial.active && tutorial.gate === "who") {
        // Let the map recolour before advancing
        window.setTimeout(() => tutorial.notify("who"), 500);
      }
    };
    bar.appendChild(b);
  });
  map.setThemes(state.activeThemes);
}

function syncAudiences() {
  $("audiences")?.querySelectorAll(".aud-chip").forEach((b) => {
    b.classList.toggle("on", state.activeThemes.has(b.dataset.theme));
  });
}

function buildPassions() {
  const bar = $("passions");
  if (!bar) return;
  bar.replaceChildren();

  CORE_PASSIONS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "passion-chip" + (state.passionId === p.id ? " on" : "");
    b.dataset.passion = p.id;
    b.innerHTML = `<span class="passion-mark"></span><span class="passion-label">${p.short}</span>`;
    b.title = `${p.label} — ${p.blurb}`;
    b.onclick = () => selectPassion(p.id);
    bar.appendChild(b);
  });

  buildLikedThemes();
  wireLikedSort();
}

function wireLikedSort() {
  document.querySelectorAll("[data-liked-sort]").forEach((btn) => {
    btn.onclick = () => {
      state.likedSort = btn.dataset.likedSort;
      document.querySelectorAll("[data-liked-sort]").forEach((b) => {
        b.classList.toggle("on", b.dataset.likedSort === state.likedSort);
      });
      buildLikedThemes();
    };
  });
}

function buildLikedThemes() {
  const bar = $("likedThemes");
  if (!bar) return;
  bar.replaceChildren();

  const liked = mostLikedInterests(state.gwi, gwiAudienceKey(), {
    limit: 5,
    sortBy: state.likedSort,
  });

  liked.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "liked-chip" + (state.passionId === p.id ? " on" : "");
    b.dataset.passion = p.id;
    const metric =
      state.likedSort === "index" ? String(p.index) : formatPeople(p.universe);
    b.innerHTML = `<span class="liked-label">${p.short}</span><span class="liked-metric">${metric}</span>`;
    b.title =
      state.likedSort === "index"
        ? `${p.label} · Interest ${p.index} vs market average (100)`
        : `${p.label} · ${formatInt(p.universe)} people`;
    b.onclick = () => selectPassion(p.id);
    bar.appendChild(b);
  });
}

function selectPassion(id) {
  state.passionId = id;
  state.localLens = null;
  document.querySelectorAll(".passion-chip.pulse").forEach((el) => {
    el.classList.remove("pulse");
  });
  syncPassions();
  applyMetricToMap();
  if (bubbles.open && bubbles.mode === "countries") openCountryBubbles();
  else if (bubbles.open && state.active) openPassionBubbles(state.active);
}

function syncPassions() {
  $("passions")?.querySelectorAll(".passion-chip").forEach((b) => {
    b.classList.toggle("on", b.dataset.passion === state.passionId);
  });
  $("likedThemes")?.querySelectorAll(".liked-chip").forEach((b) => {
    b.classList.toggle("on", b.dataset.passion === state.passionId);
  });
  $("passionHint")?.classList.toggle(
    "gone",
    Boolean(state.passionId || state.localLens || state.active || bubbles.open)
  );
  syncGuide();
}

function applyLocalLens(row) {
  state.localLens = { category: row.category, answer: row.answer };
  state.passionId = null;
  syncPassions();
  applyMetricToMap();
  if (bubbles.open && bubbles.mode === "countries") openCountryBubbles();
}

function applyAnalysisSignal(themeId, category, answer) {
  if (!category || !answer) return;
  if (insights.open) insights.hide();
  if (bubbles.open) bubbles.hide();

  const who = coerceExploreThemeId(themeId);
  state.activeThemes = new Set([who]);
  state.localLens = { category, answer };
  state.passionId = null;
  state.active = null;

  syncAudiences();
  buildLikedThemes();
  syncPassions();
  map.setThemes(state.activeThemes);
  applyMetricToMap();
  map.setActive(null);
  map.clearOverlays();
  panel.hide();
  $("mapwrap").classList.remove("dim");
  setMode("explore");
  openCountryBubbles();
}

function showPeek(code, e) {
  if (state.activeThemes.size === 0 || bubbles.open) return;
  const market = state.data.markets[code];
  const p = $("peek");

  const lens = activeLens();
  if (lens) {
    const m = metricAt(state.gwi, gwiAudienceKey(), code, lens.category, lens.answer);
    p.innerHTML = `<b>${market.name}</b><span>${lens.answer} · Interest ${
      m?.index ?? "—"
    } · ${formatPeople(m?.universe)} people</span>`;
  } else {
    p.innerHTML = `<b>${market.name}</b><span>${formatInt(
      market.contribution || 0
    )} toward 1M</span>`;
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
  if (state.activeThemes.size === 0) return;
  if (!state.data.markets[code] || !map.hasShape(code)) return;
  if (tutorial.active && tutorial.gate !== "country" && tutorial.gate !== "passion") {
    return;
  }
  state.active = code;
  hidePeek();
  map.setActive(code);
  map.paint();
  map.clearOverlays();
  openPassionBubbles(code);
  syncPassions();
  $("mapwrap").classList.add("dim");
  if (tutorial.active && tutorial.gate === "country") {
    tutorialCountry = code;
    tutorial.notify("country");
  }
}

function clear() {
  if (tutorial.active && (tutorial.gate === "country" || tutorial.gate === "passion")) {
    return;
  }
  if (bubbles.open) bubbles.hide();
  state.active = null;
  map.setActive(null);
  map.clearOverlays();
  panel.hide();
  $("mapwrap").classList.remove("dim");
  map.paint();
  syncPassions();
}

function boot(data) {
  state.data = data;
  state.active = null;
  state.passionId = "f1";
  state.localLens = null;
  state.activeThemes = new Set(["affluent"]);
  map.setData(data);
  insights.setInsights(data.insights);
  if (state.gwi) insights.setGwi(state.gwi);
  applyCopy();
  // Chrome first — never block Who/passions if map geography fails
  buildAudiences();
  buildPassions();
  try {
    map.build(true);
  } catch (err) {
    console.error("Map build failed", err);
  }
  applyMetricToMap();
  setMode("explore");
  clear();
  syncPassions();
  requestAnimationFrame(() => {
    const f1 = $("passions")?.querySelector('[data-passion="f1"]');
    f1?.classList.add("pulse");
    window.setTimeout(() => f1?.classList.remove("pulse"), 4200);
  });
}

const insightsShow = insights.show.bind(insights);
const insightsHide = insights.hide.bind(insights);
insights.show = async () => {
  if (bubbles.open) bubbles.hide();
  await insightsShow();
  setMode("insights");
};
insights.hide = () => {
  insightsHide();
  if (state.mode === "insights") setMode("explore");
};
$("insightsBtn").onclick = () => {
  if (insights.open) insights.hide();
  else insights.show();
};
$("insightsClose").onclick = () => insights.hide();

$("map").addEventListener("click", (e) => {
  if (e.target.closest?.(".land") || e.target.closest?.(".bub")) return;
  if (bubbles.open) return;
  clear();
});

document.addEventListener("keydown", (e) => {
  if (tutorial.active) {
    if (e.key === "Escape") {
      tutorial.exit();
      return;
    }
    if (e.key === "Enter" || e.key === "ArrowRight") {
      const g = tutorial.gate;
      if (g === "next" || g === "done") {
        e.preventDefault();
        tutorial.next();
      }
      return;
    }
  }
  if (e.key !== "Escape") return;
  if (insights.open) insights.hide();
  else if (bubbles.open) {
    if (bubbles.level === "answers" && state.active) {
      openPassionBubbles(state.active);
    } else {
      bubbles.hide();
    }
  } else if (state.localLens) {
    state.localLens = null;
    if (!state.passionId) state.passionId = "f1";
    syncPassions();
    applyMetricToMap();
  } else clear();
});

wireLikedSort();

Promise.all([
  loadInitialData(SAMPLE_DATA),
  loadEuropeGeo().catch((err) => {
    console.error("Map geography failed to load", err);
    return null;
  }),
  loadGwi().catch(() => null),
])
  .then(([data, geo, gwi]) => {
    state.gwi = gwi;
    insights.setGwi(gwi);
    if (geo) map.setGeo(geo);
    boot(data);
    // If geo arrived but shapes missing, rebuild once more after paint
    if (geo && !map.hasShape("HU") && !map.hasShape("AT")) {
      console.warn("Retrying map build");
      map.setGeo(geo);
      map.build(true);
      applyMetricToMap();
    }
  })
  .catch((err) => {
    console.error(err);
    // Last-resort chrome so the page is not an empty shell
    try {
      boot(SAMPLE_DATA);
    } catch (e2) {
      console.error("Boot fallback failed", e2);
    }
  });
