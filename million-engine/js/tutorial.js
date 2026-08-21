/** Guided tutorial — Next for explain steps, wait-gates for real Explore actions. */

import { $ } from "./utils/dom.js";

export const TUTORIAL_STEPS = [
  {
    id: "intro",
    gate: "next",
    caption:
      "The Million Engine: connect with people through passions — powered by real GWI data.",
  },
  {
    id: "who",
    gate: "next",
    caption:
      "Who changes the map — try Affluent or Gen Z if you like, or just press Next.",
  },
  {
    id: "passions",
    gate: "next",
    caption:
      "Global sponsorships — try F1 / Running / Live music if you like, or Next.",
  },
  {
    id: "f1map",
    gate: "next",
    caption: "Example: Formula 1 — Interest across the six markets (placeholder fact slide).",
  },
  {
    id: "country",
    gate: "next",
    caption: "Click a market on the map — or Next for a sample country.",
  },
  {
    id: "f1split",
    gate: "category",
    caption: "Click a category circle — it opens the themes inside that area.",
    prompt: "Click a category",
  },
  {
    id: "local",
    gate: "next",
    caption:
      "Themes inside Global — hover to inspect Interest + reach. Next when ready.",
  },
  {
    id: "done",
    gate: "done",
    caption: "Tutorial done — explore on your own.",
  },
];

export function createTutorial({ onStep, onExit } = {}) {
  const root = $("tutorialBar");
  const captionEl = $("tutorialCaption");
  const stepEl = $("tutorialStep");
  const nextBtn = $("tutorialNext");
  const skipBtn = $("tutorialSkip");
  const startBtn = $("tutorialBtn");
  const panel = $("tutorialPanel");
  let active = false;
  let index = 0;

  function step() {
    return TUTORIAL_STEPS[index] || null;
  }

  function syncChrome() {
    document.documentElement.classList.toggle("tutorial-on", active);
    root?.classList.toggle("open", active);
    root?.setAttribute("aria-hidden", active ? "false" : "true");
    startBtn?.classList.toggle("on", active);
    if (startBtn) startBtn.textContent = active ? "Exit tutorial" : "Tutorial";

    if (!active) {
      panel?.classList.remove("open");
      return;
    }

    const s = step();
    if (stepEl) stepEl.textContent = `${index + 1} / ${TUTORIAL_STEPS.length}`;
    if (captionEl) {
      captionEl.textContent = s?.caption || "";
    }

    const wait =
      s?.gate === "country" ||
      s?.gate === "who" ||
      s?.gate === "passion" ||
      s?.gate === "category";
    const done = s?.gate === "done";
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = wait;
      nextBtn.textContent = done ? "Done" : "Next";
      nextBtn.classList.toggle("is-wait", wait);
      nextBtn.setAttribute("aria-disabled", wait ? "true" : "false");
    }
    document.documentElement.classList.toggle("tutorial-wait-country", s?.gate === "country");
    document.documentElement.classList.toggle("tutorial-wait-who", s?.gate === "who");
    document.documentElement.classList.toggle("tutorial-wait-passion", s?.gate === "passion");
    document.documentElement.classList.toggle("tutorial-wait-category", s?.gate === "category");
    document.documentElement.classList.remove("tutorial-wait-bubbles");
  }

  async function go(i) {
    if (!active) return;
    index = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, i));
    syncChrome();
    await onStep?.(step(), index);
  }

  async function start() {
    active = true;
    index = 0;
    syncChrome();
    await onStep?.(step(), 0);
  }

  async function next() {
    if (!active) return;
    const s = step();
    if (
      s?.gate === "country" ||
      s?.gate === "who" ||
      s?.gate === "passion" ||
      s?.gate === "category"
    )
      return;
    if (s?.gate === "done") {
      exit();
      return;
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
    if (index >= TUTORIAL_STEPS.length - 1) return true;
    await go(index + 1);
    return true;
  }

  function exit() {
    if (!active) return;
    active = false;
    panel?.classList.remove("open");
    if (panel) panel.innerHTML = "";
    document.documentElement.classList.remove(
      "tutorial-wait-country",
      "tutorial-wait-who",
      "tutorial-wait-passion",
      "tutorial-wait-category",
      "tutorial-wait-bubbles",
      "tutorial-step-bubbles"
    );
    syncChrome();
    onExit?.();
  }

  function showPanel(html) {
    if (!panel) return;
    panel.innerHTML = html;
    panel.classList.add("open");
  }

  function hidePanel() {
    panel?.classList.remove("open", "dock-start");
    if (panel) panel.innerHTML = "";
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

  return {
    start,
    next,
    notify,
    exit,
    go,
    showPanel,
    hidePanel,
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
