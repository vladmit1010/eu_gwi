/** Guided tutorial — one fixed left reader; covers map mix + country themes. */

import { $ } from "./utils/dom.js";

export const TUTORIAL_STEPS = [
  {
    id: "intro",
    gate: "next",
    autoMs: 2800,
    caption:
      "Target: 1,000,000 customers — built from passions across Erste markets.",
  },
  {
    id: "who",
    gate: "next",
    autoMs: 3200,
    caption:
      "Who changes the map — Affluent and Gen Z recolour interest.",
  },
  {
    id: "passions",
    gate: "next",
    story: "sponsor",
    caption:
      "Pick F1, Running or Live music — then press Next to start that story.",
  },
  {
    id: "country",
    gate: "next",
    caption: "Click a market on the map — or Next for a sample country.",
  },
  {
    id: "f1split",
    gate: "category",
    caption:
      "Click Affluent or Gen Z — then a sponsorship circle or passion field.",
    prompt: "Explore audiences",
  },
  {
    id: "local",
    gate: "next",
    caption:
      "Themes inside the field — hover to inspect Interest + reach. Next when ready.",
  },
  {
    id: "done",
    gate: "done",
    caption:
      "Tutorial done — Compare paints Interest; switch to Mix for distribution circles.",
  },
];

export function createTutorial({ onStep, onExit, onStoryNext, onStoryAutoMs } = {}) {
  const nextBtn = $("tutorialNext");
  const skipBtn = $("tutorialSkip");
  const startBtn = $("tutorialBtn");
  const panel = $("tutorialPanel");
  const body = $("tutorialPanelBody");
  let active = false;
  let index = 0;
  let autoTimer = null;
  let autoToken = 0;

  function step() {
    return TUTORIAL_STEPS[index] || null;
  }

  function clearAuto() {
    if (autoTimer != null) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    autoToken += 1;
    document.documentElement.classList.remove("tutorial-auto");
  }

  function resolveAutoMs(s) {
    if (!s?.autoMs) return null;
    if (s.autoMs === "story") {
      const ms = onStoryAutoMs?.(s);
      return typeof ms === "number" && ms > 0 ? ms : null;
    }
    return typeof s.autoMs === "number" && s.autoMs > 0 ? s.autoMs : null;
  }

  function scheduleAuto() {
    clearAuto();
    if (!active) return;
    const s = step();
    const delay = resolveAutoMs(s);
    if (delay == null) return;

    document.documentElement.classList.add("tutorial-auto");
    const token = autoToken;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (!active || token !== autoToken) return;
      next({ fromAuto: true });
    }, delay);
  }

  function renderDefaultBody(s) {
    if (!body || !s) return;
    const autoOn = document.documentElement.classList.contains("tutorial-auto");
    const prompt = s.prompt
      ? `<div class="tutorial-panel-kicker">${s.prompt}</div>`
      : "";
    body.innerHTML = `
      <div class="tutorial-reader-progress">Tutorial · ${index + 1} / ${
        TUTORIAL_STEPS.length
      }${autoOn ? " · auto" : ""}</div>
      ${prompt}
      <p class="tutorial-reader-caption">${s.caption || ""}</p>
    `;
  }

  function openReader() {
    panel?.classList.add("open", "tutorial-reader");
    panel?.classList.remove("dock-end", "dock-start");
    panel?.setAttribute("aria-hidden", "false");
  }

  function syncChrome({ preserveBody = false } = {}) {
    document.documentElement.classList.toggle("tutorial-on", active);
    startBtn?.classList.toggle("on", active);
    if (startBtn) startBtn.textContent = active ? "Exit tutorial" : "Tutorial";

    if (!active) {
      panel?.classList.remove("open", "tutorial-reader", "f1-story-panel", "dock-start", "dock-end");
      if (body) body.innerHTML = "";
      panel?.setAttribute("aria-hidden", "true");
      return;
    }

    const s = step();
    openReader();

    const wait = s?.gate === "category";
    const done = s?.gate === "done";
    const autoPlaying = resolveAutoMs(s) != null;
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = wait;
      nextBtn.textContent = done ? "Done" : "Next";
      nextBtn.classList.toggle("is-wait", wait);
      nextBtn.classList.toggle("is-auto", autoPlaying);
      nextBtn.setAttribute("aria-disabled", wait ? "true" : "false");
    }
    document.documentElement.classList.toggle("tutorial-wait-category", wait);

    if (!preserveBody && !s?.story) {
      panel?.classList.remove("f1-story-panel");
      renderDefaultBody(s);
    }
  }

  async function go(i) {
    if (!active) return;
    index = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, i));
    syncChrome();
    await onStep?.(step(), index);
    scheduleAuto();
  }

  async function start() {
    clearAuto();
    active = true;
    index = 0;
    syncChrome();
    await onStep?.(step(), 0);
    scheduleAuto();
  }

  async function next({ fromAuto = false } = {}) {
    if (!active) return;
    const s = step();
    if (s?.gate === "category") return;
    if (s?.gate === "done") {
      exit();
      return;
    }
    if (!fromAuto) clearAuto();
    if (s?.story) {
      const stayed = await onStoryNext?.(s);
      if (stayed) {
        syncChrome({ preserveBody: true });
        scheduleAuto();
        return;
      }
    }
    if (index >= TUTORIAL_STEPS.length - 1) {
      exit();
      return;
    }
    await go(index + 1);
  }

  /** Advance when a wait-gate action happens. */
  async function notify(gate) {
    if (!active) return false;
    const s = step();
    if (s?.gate !== gate) return false;
    clearAuto();
    if (index >= TUTORIAL_STEPS.length - 1) return true;
    await go(index + 1);
    return true;
  }

  function exit() {
    if (!active) return;
    clearAuto();
    active = false;
    document.documentElement.classList.remove(
      "tutorial-wait-category",
      "tutorial-step-bubbles",
      "tutorial-step-dist",
      "tutorial-step-who",
      "tutorial-step-passions",
      "tutorial-step-f1map",
      "tutorial-step-country",
      "tutorial-auto",
      "tutorial-free"
    );
    syncChrome();
    onExit?.();
  }

  function showPanel(html) {
    if (!body) return;
    body.innerHTML = html;
    openReader();
    panel?.classList.add("f1-story-panel");
  }

  function hidePanel() {
    panel?.classList.remove("f1-story-panel", "dock-start", "dock-end");
    if (body) body.innerHTML = "";
    if (active) {
      openReader();
      renderDefaultBody(step());
    } else {
      panel?.classList.remove("open", "tutorial-reader");
      panel?.setAttribute("aria-hidden", "true");
    }
  }

  /** Restart auto-advance for the current step (e.g. after a story starts mid-step). */
  function resyncAuto() {
    if (!active) return;
    scheduleAuto();
    syncChrome({ preserveBody: true });
  }

  startBtn?.addEventListener("click", () => {
    if (active) exit();
    else start();
  });
  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    next();
  });
  skipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    exit();
  });

  function setCaption(text) {
    const el = body?.querySelector(".tutorial-reader-caption");
    if (el) el.textContent = text || "";
  }

  return {
    start,
    next,
    notify,
    exit,
    go,
    showPanel,
    hidePanel,
    setCaption,
    resyncAuto,
    get active() {
      return active;
    },
    get index() {
      return index;
    },
    get gate() {
      return step()?.gate || null;
    },
  };
}
