/** Lightweight presenter: drives Explore via fixed beats + caption strip. */

import { $ } from "./utils/dom.js";

export const PRESENTER_BEATS = [
  {
    id: "who",
    caption: "Zwei Zielgruppen — hier Affluent",
  },
  {
    id: "theme",
    caption: "Global sponsorship: Formula 1",
  },
  {
    id: "map",
    caption: "Interest über die 6 Erste-Märkte",
  },
  {
    id: "country",
    caption: "Pro Land: Reichweite der Passions",
  },
  {
    id: "pick",
    caption: "Klick färbt die Karte neu",
  },
  {
    id: "signals",
    caption: "Weitere Signale nur bei Bedarf",
  },
];

export function createPresenter({ applyBeat, onExit } = {}) {
  const root = $("presenterBar");
  const captionEl = $("presenterCaption");
  const stepEl = $("presenterStep");
  const btn = $("presenterBtn");
  let active = false;
  let index = 0;

  function syncChrome() {
    document.documentElement.classList.toggle("presenter-on", active);
    root?.classList.toggle("open", active);
    root?.setAttribute("aria-hidden", active ? "false" : "true");
    btn?.classList.toggle("on", active);
    if (btn) btn.textContent = active ? "Exit present" : "Present";
    if (!active) return;
    const beat = PRESENTER_BEATS[index];
    if (stepEl) stepEl.textContent = `${index + 1} / ${PRESENTER_BEATS.length}`;
    if (captionEl) captionEl.textContent = beat?.caption || "";
  }

  async function go(i) {
    if (!active) return;
    index = Math.max(0, Math.min(PRESENTER_BEATS.length - 1, i));
    syncChrome();
    await applyBeat?.(PRESENTER_BEATS[index], index);
  }

  async function start() {
    active = true;
    index = 0;
    syncChrome();
    await applyBeat?.(PRESENTER_BEATS[0], 0);
  }

  async function next() {
    if (!active) return;
    if (index >= PRESENTER_BEATS.length - 1) return;
    await go(index + 1);
  }

  async function prev() {
    if (!active) return;
    if (index <= 0) return;
    await go(index - 1);
  }

  function exit() {
    if (!active) return;
    active = false;
    syncChrome();
    onExit?.();
  }

  btn?.addEventListener("click", () => {
    if (active) exit();
    else start();
  });

  $("presenterPrev")?.addEventListener("click", (e) => {
    e.stopPropagation();
    prev();
  });
  $("presenterNext")?.addEventListener("click", (e) => {
    e.stopPropagation();
    next();
  });

  return {
    start,
    next,
    prev,
    exit,
    go,
    get active() {
      return active;
    },
    get index() {
      return index;
    },
  };
}
