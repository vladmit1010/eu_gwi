import { CONFIG } from "./config.js";
import { SAMPLE_DATA } from "./data/markets.js";
import { $, formatInt, formatPeople } from "./utils/dom.js";
import { createMap, loadEuropeGeo } from "./map.js?v=20260824a";
import { createInsights } from "./insights.js";
import { createBubbles } from "./bubbles.js?v=20260824m";
import { createTutorial } from "./tutorial.js?v=20260824m";
import { createSplash } from "./splash.js?v=20260824a";
import { createF1Story } from "./f1-story.js?v=20260824f";
import { loadInitialData } from "./data-loader.js";
import {
  loadGwi,
  THEME_TO_GWI,
  GWI_TO_THEME,
  ISO_TO_GWI,
  metricAt,
  indexByMarket,
  EXPLORE_THEME_IDS,
  coerceExploreThemeId,
} from "./gwi.js";
import {
  CORE_PASSIONS,
  resolvePassion,
  answerBubblesForCategory,
  countryBubblesForAudience,
  whoSplitForCountry,
  themeFieldsForMenu,
  CATEGORY_META,
} from "./passions.js?v=20260824m";
import { proseForMarket } from "./market-prose.js?v=20260824k";

/** Explore audiences only — Affluent & Gen Z */
const EXPLORE_AUDIENCES = EXPLORE_THEME_IDS;

const state = {
  data: null,
  gwi: null,
  activeThemes: new Set(["affluent"]),
  active: null,
  mode: "explore",
  passionId: null,
  localLens: null,
};

/** Country picked during tutorial country-gate — survives the Who step */
let tutorialCountry = null;
/** GWI audience key while drilled into theme menu / answers */
let bubbleAudienceKey = null;

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

const insights = createInsights({
  onApply: ({ themeId, category, answer }) => {
    applyAnalysisSignal(themeId, category, answer);
  },
});

const bubbles = createBubbles({
  onAudience: (item) => {
    const code = state.active;
    if (!code || !item?.key) return;
    const themeId = GWI_TO_THEME[item.key];
    if (themeId) {
      state.activeThemes = new Set([themeId]);
      syncAudiences();
      map.setThemes(state.activeThemes);
      applyMetricToMap();
    }
    bubbleAudienceKey = item.key;
    openAudienceThemeMenu(code);
  },
  onThemeField: (field) => {
    const code = state.active;
    if (!code || !field) return;
    openAnswerBubbles(code, field);
    if (tutorial.active && tutorial.gate === "category") {
      tutorial.notify("category");
    }
  },
  onCategory: (item) => {
    const code = state.active;
    if (!code) return;
    openAnswerBubbles(code, item);
    if (tutorial.active && tutorial.gate === "category") {
      tutorial.notify("category");
    }
  },
  onPassion: (item) => {
    // Apply theme to the map but keep Potential open with a richer readout.
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

    const code = state.active;
    if (code && item.category) {
      openAnswerBubbles(code, {
        category: item.category,
        pack: item.pack,
        label: item.category,
      });
    }
    const sub = $("bubbleSub");
    if (sub) {
      const reach = formatPeople(item.universe);
      const idx = item.index != null ? `Interest ${item.index}` : "Interest —";
      const name = item.label || item.answer || "Theme";
      sub.textContent = `${name} · ${reach} people · ${idx} vs Erste peers · Close to see the full map`;
    }
  },
  onCountry: (code) => {
    select(code);
  },
  onBack: () => {
    if (!state.active) return;
    if (bubbles.level === "answers") {
      openAudienceThemeMenu(state.active);
    } else {
      bubbleAudienceKey = null;
      openPassionBubbles(state.active);
    }
  },
  onClose: (opts) => {
    if (opts?.phase === "before") {
      if (tutorial.active && tutorial.gate === "category") return false;
      return;
    }
    bubbleAudienceKey = null;
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    map.paint();
    syncPassions();
  },
});

function clearTutorialHighlights() {
  document.documentElement.classList.remove(
    "tutorial-step-who",
    "tutorial-step-passions",
    "tutorial-step-f1map",
    "tutorial-step-country",
    "tutorial-step-bubbles",
    "tutorial-free"
  );
  $("targetPill")?.classList.remove("tutorial-focus");
  document.querySelectorAll(".tutorial-spot, .tutorial-spot-stage").forEach((el) => {
    el.classList.remove("tutorial-spot", "tutorial-spot-stage", "tutorial-spot-map-only");
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
    if (el.id === "mapwrap" || el.id === "bubbleOverlay") {
      el.classList.add("tutorial-spot-stage");
    }
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
    const f1Chip = $("passions")?.querySelector('[data-passion="f1"]');
    f1Chip?.classList.add("tutorial-hl");
    const beat = f1Story.reset();
    renderF1StoryBeat(beat);
    return;
  }

  if (id === "country") {
    tutorialCountry = null;
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
    document.documentElement.classList.add("tutorial-step-country");
    const f1Chip = $("passions")?.querySelector('[data-passion="f1"]');
    f1Chip?.classList.add("tutorial-hl");
    return;
  }

  if (id === "f1split") {
    let code = tutorialCountry || state.active;
    if (!code || !map.hasShape(code)) {
      code = ["RO", "HU", "AT", "CZ", "HR", "RS"].find(
        (c) => state.data.markets[c] && map.hasShape(c)
      );
    }
    if (!code) return;
    tutorialCountry = code;
    bubbleAudienceKey = null;
    tutorial.hidePanel();
    hidePeek();
    document.documentElement.classList.add("tutorial-step-bubbles");
    state.active = code;
    map.setActive(code);
    map.clearOverlays();
    map.paint();
    $("mapwrap").classList.add("dim");
    openPassionBubbles(code);
    const sub = $("bubbleSub");
    if (sub) {
      sub.textContent = "Click to Explore the audiences";
    }
    return;
  }

  if (id === "local") {
    tutorial.hidePanel();
    document.documentElement.classList.add("tutorial-step-bubbles");
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
    // Prefer answer level if already drilled; otherwise Interests for current audience
    if (bubbles.open && bubbles.level === "answers") {
      /* keep current answer view from the theme-field click */
    } else if (bubbles.open && bubbles.level === "menu") {
      openAnswerBubbles(code, {
        category: "Personal Interests",
        pack: null,
        label: "Interests",
      });
    } else {
      if (!bubbleAudienceKey) bubbleAudienceKey = gwiAudienceKey() || "Affluent";
      openAnswerBubbles(code, {
        category: "Personal Interests",
        pack: null,
        label: "Interests",
      });
    }
    syncPassions();
    $("mapwrap").classList.add("dim");
    const sub = $("bubbleSub");
    if (sub) {
      sub.textContent = `${bubbleAudienceKey || audienceLabel()} · hover themes for Interest + reach — Next when ready`;
    }
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
    // Keep the chosen theme on the map — that's the payoff after a theme click
    state.active = null;
    map.setActive(null);
    map.clearOverlays();
    $("mapwrap").classList.remove("dim");
    applyMetricToMap();
    // Unlock Who + sponsorships while the "done" bar is still visible
    document.documentElement.classList.add("tutorial-free");
    return;
  }
}

const f1Story = createF1Story();

function renderF1StoryBeat(beat) {
  if (!beat) return;
  const panel = $("tutorialPanel");
  tutorial.showPanel(`
    <div class="f1-story">
      <div class="f1-story-progress">${f1Story.progressLabel()}</div>
      <div class="tutorial-panel-kicker">${beat.kicker}</div>
      <div class="tutorial-panel-title">${beat.title}</div>
      <p class="f1-story-body">${beat.body}</p>
    </div>
  `);
  panel?.classList.add("dock-start", "f1-story-panel");
  panel?.setAttribute("aria-hidden", "false");
  tutorial.setCaption(beat.caption);

  if (beat.code && map.hasShape(beat.code)) {
    state.active = beat.code;
    map.setActive(beat.code);
    map.paint();
  } else {
    state.active = null;
    map.setActive(null);
    map.paint();
  }
}

function advanceF1Story() {
  const moved = f1Story.next();
  if (!moved) {
    tutorial.hidePanel();
    $("tutorialPanel")?.classList.remove("dock-start", "f1-story-panel");
    state.active = null;
    map.setActive(null);
    map.paint();
    return false;
  }
  renderF1StoryBeat(f1Story.beat());
  return true;
}

const tutorial = createTutorial({
  onStep: (step) => applyTutorialStep(step),
  onStoryNext: async (step) => {
    if (step?.story !== "f1") return false;
    return advanceF1Story();
  },
  onStoryAutoMs: (step) => {
    if (step?.story !== "f1") return null;
    return f1Story.beat()?.autoMs ?? 6500;
  },
  onExit: () => {
    clearTutorialHighlights();
    tutorial.hidePanel();
    $("tutorialPanel")?.classList.remove("dock-start", "f1-story-panel");
    tutorialCountry = null;
    bubbleAudienceKey = null;
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

const splash = createSplash({
  onStartTutorial: async () => {
    await tutorial.start();
  },
  onSkipToExplore: async () => {
    if (tutorial.active) tutorial.exit();
    if (!state.passionId && !state.localLens) state.passionId = "f1";
    syncPassions();
    applyMetricToMap();
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
  const lens = activeLens();
  bubbleAudienceKey = null;
  bubbles.showCountryLanding({
    countryName: market?.name || code,
    who: whoSplitForCountry(state.gwi, countryKey, lens),
    prose: proseForMarket(code),
  });
}

function openAudienceThemeMenu(code) {
  const market = state.data.markets[code];
  const countryKey = ISO_TO_GWI[code];
  const aud = bubbleAudienceKey || gwiAudienceKey();
  const lens = activeLens();
  bubbles.showThemeMenu({
    countryName: market?.name || code,
    audienceLabel: aud || audienceLabel(),
    audienceKey: aud,
    fields: themeFieldsForMenu(),
    prose: proseForMarket(code),
    who: whoSplitForCountry(state.gwi, countryKey, lens),
  });
}

function openAnswerBubbles(code, categoryItem) {
  const market = state.data.markets[code];
  const countryKey = ISO_TO_GWI[code];
  const aud = bubbleAudienceKey || gwiAudienceKey();
  const items = answerBubblesForCategory(state.gwi, aud, countryKey, {
    category: categoryItem.category,
    pack: categoryItem.pack,
    limit: 7,
  });
  const lens = activeLens();
  const categoryLabel =
    categoryItem.pack === "global"
      ? "Global sponsorships"
      : categoryItem.pack === "media"
        ? "Media Touchpoints"
        : categoryItem.label ||
          CATEGORY_META[categoryItem.category]?.label ||
          categoryItem.category;
  bubbles.showPassions({
    countryName: market?.name || code,
    audienceLabel: aud || audienceLabel(),
    items,
    level: "answers",
    categoryLabel,
    selectedAnswer: lens?.answer || null,
    prose: proseForMarket(code),
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
      applyMetricToMap();
      syncPassions();
      // Optional play on Who step — do not auto-advance
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

  syncPassionsNote();
}

function syncPassionsNote() {
  const el = $("passionsNote");
  if (!el) return;
  const p = resolvePassion(state.passionId);
  if (p?.note) {
    el.textContent = p.note;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
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
  syncPassionsNote();
  $("passionHint")?.classList.toggle(
    "gone",
    Boolean(state.passionId || state.localLens || state.active || bubbles.open)
  );
  syncGuide();
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
  syncPassions();
  map.setThemes(state.activeThemes);
  applyMetricToMap();
  map.setActive(null);
  map.clearOverlays();
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

let lastCountryPickAt = 0;

function select(code) {
  if (state.activeThemes.size === 0) return;
  if (!state.data.markets[code] || !map.hasShape(code)) return;
  // F1 story step: map is narrative, not clickable explore
  if (document.documentElement.classList.contains("tutorial-step-f1map")) return;

  const now = performance.now();
  if (now - lastCountryPickAt < 350) return;
  lastCountryPickAt = now;

  const countryPlay = document.documentElement.classList.contains("tutorial-step-country");

  state.active = code;
  hidePeek();
  map.setActive(code);
  map.paint();
  map.clearOverlays();
  openPassionBubbles(code);
  syncPassions();
  $("mapwrap").classList.add("dim");

  if (tutorial.active && countryPlay) {
    tutorialCountry = code;
    tutorial.next();
  }
}

function clear() {
  if (tutorial.active && tutorial.gate === "category") {
    return;
  }
  if (bubbles.open) bubbles.hide();
  state.active = null;
  map.setActive(null);
  map.clearOverlays();
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
  // Default entry: splash (tilted map + Start the engine)
  splash.show();
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
  // Prefer land under the pointer (works when SVG path click is flaky)
  const stack = document.elementsFromPoint?.(e.clientX, e.clientY) || [];
  const land = stack.find(
    (el) => el?.classList?.contains?.("land") && el.classList.contains("live")
  );
  if (land?.dataset?.code) {
    select(land.dataset.code);
    return;
  }
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
      openAudienceThemeMenu(state.active);
    } else if (bubbles.level === "menu" && state.active) {
      bubbleAudienceKey = null;
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
