import { $, countTo, formatInt } from "./utils/dom.js";
import { growthIndex } from "./model.js";
import { CONFIG } from "./config.js";
import {
  ISO_TO_GWI,
  categoriesFor,
  metricAt,
  signalsForCountryAudience,
} from "./gwi.js";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortCat(text, max = 18) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function createPanel({ heat, onClose, onPick, onSignal }) {
  const el = $("panel");
  let ctx = null; // last render context
  let filterCat = null; // null = all
  let sortBy = "index"; // index | reach
  let lastCode = null;

  function render(data, code, activeThemes, picked, opts = {}) {
    const market = data.markets[code];
    if (!market) return;

    if (lastCode !== code) {
      filterCat = opts.category || null;
      lastCode = code;
    }

    const gwi = opts.gwi || null;
    const audienceKey = opts.audienceKey || null;
    const activeAnswer = opts.answer || null;
    const activeCategory = opts.category || null;

    ctx = { data, code, activeThemes, picked, gwi, audienceKey, activeAnswer, activeCategory };

    const themeLabels = data.themes
      .filter((t) => activeThemes.has(t.id))
      .map((t) => t.label)
      .join(" · ");
    const share =
      data.meta.target > 0
        ? ((market.contribution / data.meta.target) * 100).toFixed(1)
        : "0";

    const countryKey = ISO_TO_GWI[code];
    const cats = audienceKey ? categoriesFor(gwi, audienceKey) : [];
    if (filterCat && !cats.includes(filterCat)) filterCat = null;

    const rows =
      gwi && audienceKey && countryKey
        ? signalsForCountryAudience(gwi, audienceKey, countryKey, {
            sortBy,
            category: filterCat,
            limit: 12,
          })
        : [];

    const activeMetric =
      gwi && audienceKey && activeCategory && activeAnswer
        ? metricAt(gwi, audienceKey, code, activeCategory, activeAnswer)
        : null;

    const catChips = [
      `<button type="button" class="p-chip${
        !filterCat ? " on" : ""
      }" data-cat="">All</button>`,
      ...cats.map(
        (c) =>
          `<button type="button" class="p-chip${
            filterCat === c ? " on" : ""
          }" data-cat="${esc(c)}" title="${esc(c)}">${esc(shortCat(c))}</button>`
      ),
    ].join("");

    const signalRows = rows.length
      ? rows
          .map((r, i) => {
            const on =
              activeCategory === r.category && activeAnswer === r.answer ? " sel" : "";
            const primary =
              sortBy === "reach"
                ? `<span class="o-num">${r.col_pct}%</span>`
                : `<span class="o-num">${r.index}</span>`;
            const secondary =
              sortBy === "reach" ? `Index ${r.index}` : `${r.col_pct}% of audience`;
            const heatVal = Math.min(1, Math.max(0, (r.index - 80) / 120));
            return `
        <button type="button" class="opp p-signal${on}" data-i="${i}">
          <div class="swatch" style="background:${heat(heatVal)}"></div>
          <div class="o-body">
            <div class="o-name">${esc(r.answer)}</div>
            <div class="o-meta">${esc(r.category)} · ${secondary}</div>
          </div>
          ${primary}
        </button>`;
          })
          .join("")
      : `<div class="p-empty">${
          audienceKey
            ? "No signals for this filter"
            : "Choose an audience above to explore GWI signals"
        }</div>`;

    const focusBlock = activeMetric
      ? `
      <div class="p-focus">
        <div class="p-focus-lab">Selected signal</div>
        <div class="p-focus-title">${esc(activeAnswer)}</div>
        <div class="p-focus-meta">${esc(activeCategory)}</div>
        <div class="p-focus-stats">
          <div><b>${activeMetric.index ?? "—"}</b><span>Index</span></div>
          <div><b>${activeMetric.col_pct ?? "—"}%</b><span>of people</span></div>
        </div>
      </div>`
      : "";

    el.innerHTML = `
      <div class="p-head">
        <div>
          <div class="p-country">${esc(market.name)}</div>
          <div class="p-theme">${esc(themeLabels || "No audience")} · toward 1M</div>
        </div>
        <button class="x" id="close" type="button" aria-label="Close">&times;</button>
      </div>

      <div class="contrib">
        <div class="contrib-item">
          <div class="contrib-val" id="contribNum">0</div>
          <div class="contrib-lab">${CONFIG.text.contribution}</div>
        </div>
        <div class="contrib-item">
          <div class="contrib-val">${share}%</div>
          <div class="contrib-lab">of target</div>
        </div>
        <div class="contrib-item">
          <div class="contrib-val" id="hnum">0.0</div>
          <div class="contrib-lab">${CONFIG.text.potential}</div>
        </div>
      </div>

      ${focusBlock}

      <div class="section-label">Explore signals</div>
      <div class="p-filters">
        <div class="p-chips">${catChips}</div>
        <div class="p-sort">
          <button type="button" class="p-sort-btn${
            sortBy === "index" ? " on" : ""
          }" data-sort="index">Index</button>
          <button type="button" class="p-sort-btn${
            sortBy === "reach" ? " on" : ""
          }" data-sort="reach">% people</button>
        </div>
      </div>
      <div class="p-signals">${signalRows}</div>
    `;

    el.classList.add("up");
    el.setAttribute("aria-hidden", "false");
    el.classList.toggle("has-sel", Boolean(activeAnswer) || picked !== null);

    $("close").onclick = () => onClose?.();

    el.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        filterCat = btn.dataset.cat || null;
        rerender();
      };
    });

    el.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        sortBy = btn.dataset.sort;
        rerender();
      };
    });

    el.querySelectorAll(".p-signal").forEach((btn) => {
      btn.onclick = () => {
        const row = rows[+btn.dataset.i];
        if (!row) return;
        onSignal?.({
          category: row.category,
          answer: row.answer,
          code,
        });
      };
    });

    countTo($("hnum"), growthIndex(data, code, activeThemes), 1, 750);
    countTo($("contribNum"), market.contribution || 0, 0, 750);
  }

  function rerender() {
    if (!ctx) return;
    render(ctx.data, ctx.code, ctx.activeThemes, ctx.picked, {
      gwi: ctx.gwi,
      audienceKey: ctx.audienceKey,
      category: ctx.activeCategory,
      answer: ctx.activeAnswer,
    });
  }

  function showPick(data, code, activeThemes, picked, fromEl) {
    // Keep compatibility for story bubble picks — light highlight only
    el.classList.toggle("has-sel", picked !== null);
    void data;
    void code;
    void activeThemes;
    void fromEl;
  }

  function hide() {
    el.classList.remove("up", "has-sel");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "";
    ctx = null;
    lastCode = null;
  }

  return { render, showPick, hide, el, rerender };
}

export { formatInt };
