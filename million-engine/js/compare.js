import { $, formatInt } from "./utils/dom.js";
import { opportunitiesFor, growthIndex } from "./model.js";
import { CONFIG } from "./config.js";

const MAX_COMPARE = 12;

export function createCompare({ heat, onChange, onOpenChange }) {
  const root = $("compare");
  const btn = $("compareBtn");
  let open = false;
  let codes = [];
  let data = null;
  let themes = new Set();
  let pickerOpen = false;

  function setData(next) {
    data = next;
    codes = codes.filter((c) => data?.markets?.[c]);
    if (open) render();
    onChange?.(codes);
  }

  function setThemes(set) {
    themes = set;
    if (open) render();
  }

  function has(code) {
    return codes.includes(code);
  }

  function add(code) {
    if (!data?.markets?.[code]) return false;
    if (has(code)) return false;
    if (codes.length >= MAX_COMPARE) {
      alert(`You can compare up to ${MAX_COMPARE} markets.`);
      return false;
    }
    codes = [...codes, code];
    if (open) render();
    onChange?.(codes);
    return true;
  }

  function remove(code) {
    codes = codes.filter((c) => c !== code);
    if (open) render();
    onChange?.(codes);
  }

  function clearAll() {
    codes = [];
    if (open) render();
    onChange?.(codes);
  }

  function marketList(query = "") {
    const q = query.trim().toLowerCase();
    return Object.entries(data?.markets || {})
      .map(([code, m]) => ({ code, name: m.name }))
      .filter((m) => !has(m.code))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderPicker(query = "") {
    const picker = $("comparePicker");
    if (!picker) return;
    const list = marketList(query);
    picker.innerHTML = `
      <input class="compare-search" id="compareSearch" type="search" placeholder="Search market…" autocomplete="off">
      ${
        list.length
          ? list
              .map(
                (m) => `
        <button type="button" class="compare-option" data-code="${m.code}">
          ${m.name}<span>${m.code}</span>
        </button>`
              )
              .join("")
          : `<div class="compare-empty" style="padding:14px">No markets left to add</div>`
      }
    `;
    const search = $("compareSearch");
    search.value = query;
    search.focus();
    search.oninput = () => renderPicker(search.value);
    picker.querySelectorAll(".compare-option").forEach((btnEl) => {
      btnEl.onclick = () => {
        add(btnEl.dataset.code);
        pickerOpen = false;
        picker.classList.remove("open");
      };
    });
  }

  function render() {
    const body = $("compareBody");
    const target = data?.meta?.target || 1_000_000;
    const total = codes.reduce((a, c) => a + (data.markets[c]?.contribution || 0), 0);
    const themeLabel = data.themes
      .filter((t) => themes.has(t.id))
      .map((t) => t.label)
      .join(" · ");

    $("compareHeadline").textContent = codes.length
      ? `${codes.length} markets · ${themeLabel || "no audience selected"}`
      : "Add markets to compare side by side — 2, 3, 4 or more.";

    const chips = codes
      .map((code) => {
        const m = data.markets[code];
        return `
        <div class="compare-chip">
          ${m.name}
          <span class="compare-chip-code">${code}</span>
          <button type="button" class="compare-chip-x" data-remove="${code}" aria-label="Remove ${m.name}">×</button>
        </div>`;
      })
      .join("");

    const cards = codes
      .map((code) => {
        const m = data.markets[code];
        const index = growthIndex(data, code, themes);
        const share = target ? ((m.contribution / target) * 100).toFixed(1) : "0";
        const opps = opportunitiesFor(data, code, themes)
          .slice()
          .sort((a, b) => b.s * b.e - a.s * a.e)
          .slice(0, 3);
        const metrics = m.metrics || {};

        return `
        <article class="compare-card">
          <div class="compare-card-head">
            <div>
              <div class="compare-card-name">${m.name}</div>
              <div class="compare-card-code">${code}${
                metrics.rank_priority != null ? ` · priority #${metrics.rank_priority}` : ""
              }</div>
            </div>
            <button type="button" class="ghostbtn" data-remove="${code}">Remove</button>
          </div>
          <div class="compare-metrics">
            <div>
              <div class="compare-metric-val">${formatInt(m.contribution || 0)}</div>
              <div class="compare-metric-lab">${CONFIG.text.contribution}</div>
            </div>
            <div>
              <div class="compare-metric-val">${share}%</div>
              <div class="compare-metric-lab">of target</div>
            </div>
            <div>
              <div class="compare-metric-val">${index.toFixed(1)}</div>
              <div class="compare-metric-lab">${CONFIG.text.potential}</div>
            </div>
            <div>
              <div class="compare-metric-val">${opps.length}</div>
              <div class="compare-metric-lab">${CONFIG.text.opportunities}</div>
            </div>
          </div>
          <div class="compare-opps">
            ${
              opps.length
                ? opps
                    .map(
                      (o) => `
              <div class="compare-opp">
                <div class="compare-swatch" style="background:${heat(o.e / 10)}"></div>
                <div>
                  <div class="compare-opp-name">${o.n}</div>
                  <div class="compare-opp-meta">${
                    themes.size > 1 ? o.themeLabel + " · " : ""
                  }${CONFIG.text.engagement} ${o.e}</div>
                </div>
                <div class="compare-opp-num">${o.s}%</div>
              </div>`
                    )
                    .join("")
                : `<div class="compare-empty">Choose an audience to see opportunities</div>`
            }
          </div>
        </article>`;
      })
      .join("");

    body.innerHTML = `
      <div class="compare-toolbar">
        ${chips}
        <div class="compare-add-wrap">
          <button type="button" class="ghostbtn" id="compareAddBtn">+ Add country</button>
          <div class="compare-picker" id="comparePicker"></div>
        </div>
        ${codes.length ? `<button type="button" class="ghostbtn" id="compareClearBtn">Clear all</button>` : ""}
      </div>

      ${
        codes.length
          ? `<div class="compare-sum">
        <div class="compare-stat">
          <div class="compare-stat-val">${formatInt(total)}</div>
          <div class="compare-stat-lab">Combined toward 1M</div>
        </div>
        <div class="compare-stat">
          <div class="compare-stat-val">${((total / target) * 100).toFixed(1)}%</div>
          <div class="compare-stat-lab">Of the million</div>
        </div>
        <div class="compare-stat">
          <div class="compare-stat-val">${codes.length}</div>
          <div class="compare-stat-lab">Markets in view</div>
        </div>
      </div>
      <div class="compare-grid">${cards}</div>`
          : `<div class="compare-empty">Start with Austria, Czechia and Romania — or add any markets from the list. While Compare is open, you can also click countries on the map to add them.</div>`
      }
    `;

    $("compareAddBtn").onclick = (e) => {
      e.stopPropagation();
      pickerOpen = !pickerOpen;
      const picker = $("comparePicker");
      picker.classList.toggle("open", pickerOpen);
      if (pickerOpen) renderPicker("");
    };

    const clearBtn = $("compareClearBtn");
    if (clearBtn) clearBtn.onclick = () => clearAll();

    body.querySelectorAll("[data-remove]").forEach((el) => {
      el.onclick = () => remove(el.dataset.remove);
    });
  }

  function show() {
    open = true;
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    pickerOpen = false;
    render();
    onOpenChange?.(true);
  }

  function hide() {
    open = false;
    pickerOpen = false;
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    onOpenChange?.(false);
  }

  function toggle() {
    if (open) hide();
    else show();
  }

  $("compareClose").onclick = () => hide();

  document.addEventListener("click", (e) => {
    if (!pickerOpen) return;
    const wrap = e.target.closest?.(".compare-add-wrap");
    if (!wrap) {
      pickerOpen = false;
      $("comparePicker")?.classList.remove("open");
    }
  });

  return {
    setData,
    setThemes,
    add,
    remove,
    has,
    show,
    hide,
    toggle,
    get open() {
      return open;
    },
    get codes() {
      return codes;
    },
  };
}
