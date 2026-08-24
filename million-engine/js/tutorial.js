/** Guided tutorial — early steps auto-play; wait-gates for real Explore actions. */

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
    autoMs: 3200,
    caption:
      "Global sponsorships — F1 lights the six markets.",
  },
  {
    id: "f1map",
    gate: "next",
    story: "f1",
    autoMs: "story",
    caption: "12,3 Mio. folgen Motorsport — 1 Mio. Ziel. Jede zwölfte Person schaut schon zu.",
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
      "Click Affluent or Gen Z — then pick a passion field.",
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
    caption: "Tutorial done — explore on your own.",
  },
];

export function createTutorial({ onStep, onExit, onStoryNext, onStoryAutoMs } = {}) {
  const root = $("tutorialBar");
  const captionEl = $("tutorialCaption");
  const stepEl = $("tutorialStep");
  const nextBtn = $("tutorialNext");
  const skipBtn = $("tutorialSkip");
  const startBtn = $("tutorialBtn");
  const panel = $("tutorialPanel");
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
      return typeof ms === "number" && ms > 0 ? ms : 6500;
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
    // Manual Skip during auto: cancel timer, then advance once
    if (!fromAuto) clearAuto();
    if (s?.story) {
      const stayed = await onStoryNext?.(s);
      if (stayed) {
        // Beat caption already set by story handler — don't reset via syncChrome
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
    panel?.classList.remove("open");
    if (panel) panel.innerHTML = "";
    document.documentElement.classList.remove(
      "tutorial-wait-category",
      "tutorial-step-bubbles",
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
    if (!panel) return;
    panel.innerHTML = html;
    panel.classList.add("open");
  }

  function hidePanel() {
    panel?.classList.remove("open", "dock-start", "f1-story-panel");
    if (panel) {
      panel.innerHTML = "";
      panel.setAttribute("aria-hidden", "true");
    }
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
    if (captionEl) captionEl.textContent = text || "";
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
