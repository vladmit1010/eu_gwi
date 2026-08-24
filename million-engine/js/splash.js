/** Boot splash — default entry: title + tilted map, then reveal + tutorial. */

import { $ } from "./utils/dom.js";

const REDUCE =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createSplash({ onStartTutorial, onSkipToExplore } = {}) {
  const root = $("splash");
  const startBtn = $("splashStart");
  const skipBtn = $("splashSkip");
  let visible = false;
  let busy = false;

  function show() {
    visible = true;
    busy = false;
    document.documentElement.classList.add("splash-on");
    document.documentElement.classList.remove("splash-leaving", "splash-reveal");
    root?.setAttribute("aria-hidden", "false");
  }

  function hideChromeFlags() {
    document.documentElement.classList.remove(
      "splash-on",
      "splash-leaving",
      "splash-reveal"
    );
    root?.setAttribute("aria-hidden", "true");
    visible = false;
    busy = false;
  }

  async function runReveal({ startTutorial }) {
    if (!visible || busy) return;
    busy = true;

    document.documentElement.classList.add("splash-leaving", "splash-reveal");
    document.documentElement.classList.remove("splash-on");

    const wait = REDUCE ? 80 : 1100;
    await new Promise((r) => setTimeout(r, wait));

    hideChromeFlags();

    if (startTutorial) await onStartTutorial?.();
    else await onSkipToExplore?.();
  }

  startBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    runReveal({ startTutorial: true });
  });

  skipBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    runReveal({ startTutorial: false });
  });

  return {
    show,
    hide: hideChromeFlags,
    get visible() {
      return visible;
    },
  };
}
