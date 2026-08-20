import { $ } from "./utils/dom.js";
import { CONFIG } from "./config.js";

export function createStory({ onStep, onExit }) {
  const btn = $("storyBtn");
  const el = $("story");
  let on = false;
  let step = 0;

  function syncVisibility() {
    const stories = CONFIG.stories || [];
    btn.style.display = stories.length ? "" : "none";
    btn.textContent = CONFIG.text.story;
  }

  function render() {
    const s = CONFIG.stories[step];
    el.innerHTML = `
      <div class="st-kicker">${s.kicker || ""}</div>
      <div class="st-line">${s.line || ""}</div>
      <div class="st-nav">
        <button class="st-arrow" id="stPrev" type="button" ${step === 0 ? "disabled" : ""}>&larr;</button>
        <button class="st-arrow" id="stNext" type="button" ${
          step === CONFIG.stories.length - 1 ? "disabled" : ""
        }>&rarr;</button>
        <div class="st-dots">${CONFIG.stories
          .map((_, i) => `<span class="st-dot${i === step ? " on" : ""}"></span>`)
          .join("")}</div>
        <span class="st-count">${step + 1} / ${CONFIG.stories.length}</span>
      </div>
    `;
    $("stPrev").onclick = () => goto(step - 1);
    $("stNext").onclick = () => goto(step + 1);
    onStep?.(s, step);
  }

  function goto(i) {
    if (i < 0 || i >= CONFIG.stories.length) return;
    step = i;
    render();
  }

  function toggle(force) {
    on = force !== undefined ? force : !on;
    el.classList.toggle("up", on);
    $("filterPath")?.classList.toggle("is-locked", on);
    if (on) {
      step = 0;
      render();
    } else {
      el.innerHTML = "";
      onExit?.();
    }
  }

  return {
    syncVisibility,
    toggle,
    goto,
    get active() {
      return on;
    },
    get step() {
      return step;
    },
  };
}
