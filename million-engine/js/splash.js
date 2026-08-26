/** Boot splash — title + tilted map, then reveal Explore. */

import { $ } from "./utils/dom.js";

const REDUCE =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createSplash({ onEnter } = {}) {
  const root = $("splash");
  const startBtn = $("splashStart");
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

  async function runReveal() {
    if (!visible || busy) return;
    busy = true;

    document.documentElement.classList.add("splash-leaving", "splash-reveal");
    document.documentElement.classList.remove("splash-on");

    const wait = REDUCE ? 40 : 450;
    await new Promise((r) => setTimeout(r, wait));

    hideChromeFlags();
    await onEnter?.();
  }

  startBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    runReveal();
  });

  return {
    show,
    hide: hideChromeFlags,
    get visible() {
      return visible;
    },
  };
}
