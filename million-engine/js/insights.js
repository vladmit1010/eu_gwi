import { $ } from "./utils/dom.js";
import {
  AUDIENCE_LABELS,
  COUNTRY_LABELS,
  GWI_TO_THEME,
  audiencesIn,
  countriesIn,
  topSignalsForAudience,
  topSignalsForCountry,
} from "./gwi.js";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SORT_COPY = {
  index: {
    label: "Index",
    subAudience: "Highest average Index across Erste markets",
    subCountry: "Highest Index in this market",
  },
  reach: {
    label: "% of people",
    subAudience: "Highest share of people (col %) across Erste markets",
    subCountry: "Highest share of people (col %) in this market",
  },
  balanced: {
    label: "Balanced",
    subAudience: "Over-index × reach across Erste markets",
    subCountry: "Where this market stands out vs peers × reach",
  },
};

export function createInsights({ onApply } = {}) {
  const root = $("insights");
  let open = false;
  let gwi = null;
  let lens = "audience"; // audience | country
  let sortBy = "index"; // index | reach | balanced
  let audienceKey = "Affluent";
  let countryKey = "austria";

  function setGwi(next) {
    gwi = next || null;
    const auds = audiencesIn(gwi);
    const countries = countriesIn(gwi);
    if (auds.length && !auds.includes(audienceKey)) audienceKey = auds[0];
    if (countries.length && !countries.includes(countryKey)) countryKey = countries[0];
    if (open) render();
  }

  function setInsights() {}

  function currentRows() {
    if (!gwi) return [];
    return lens === "audience"
      ? topSignalsForAudience(gwi, audienceKey, 10, sortBy)
      : topSignalsForCountry(gwi, countryKey, 10, sortBy);
  }

  function barWidth(row, rows) {
    if (sortBy === "reach") {
      const max = rows[0]?.col_pct || 1;
      return Math.max(8, Math.round((row.col_pct / max) * 100));
    }
    if (sortBy === "balanced") {
      const max = rows[0]?.score || 1;
      return Math.max(8, Math.round((row.score / max) * 100));
    }
    const max = rows[0]?.index || 1;
    return Math.max(8, Math.round((row.index / max) * 100));
  }

  function render() {
    const body = $("insightsBody");
    if (!body) return;

    if (!gwi) {
      body.innerHTML = `<p class="insights-sub">GWI data is not loaded yet.</p>`;
      return;
    }

    const auds = audiencesIn(gwi);
    const countries = countriesIn(gwi);
    const rows = currentRows();
    const copy = SORT_COPY[sortBy];

    const pickChips =
      lens === "audience"
        ? auds
            .map(
              (a) =>
                `<button type="button" class="an-chip${
                  a === audienceKey ? " on" : ""
                }" data-aud="${esc(a)}">${esc(AUDIENCE_LABELS[a] || a)}</button>`
            )
            .join("")
        : countries
            .map(
              (c) =>
                `<button type="button" class="an-chip${
                  c === countryKey ? " on" : ""
                }" data-country="${esc(c)}">${esc(COUNTRY_LABELS[c] || c)}</button>`
            )
            .join("");

    const sortChips = ["index", "reach", "balanced"]
      .map(
        (key) =>
          `<button type="button" class="an-sort-btn${
            sortBy === key ? " on" : ""
          }" data-sort="${key}">${SORT_COPY[key].label}</button>`
      )
      .join("");

    const list = rows.length
      ? rows
          .map((r, i) => {
            const bar = barWidth(r, rows);
            const meta =
              lens === "audience"
                ? `${esc(r.category)} · strongest in ${esc(
                    COUNTRY_LABELS[r.bestCountry] || r.bestCountry
                  )}`
                : `${esc(r.category)} · ${esc(AUDIENCE_LABELS[r.audience] || r.audience)}${
                    r.lift != null ? ` · ${r.lift >= 0 ? "+" : ""}${r.lift} vs peers` : ""
                  }`;

            const primary =
              sortBy === "reach"
                ? `<span class="an-primary">${r.col_pct}%</span><span class="an-secondary">Index ${r.index}</span>`
                : `<span class="an-primary">Index ${r.index}</span><span class="an-secondary">${r.col_pct}%</span>`;

            return `
          <button type="button" class="an-row" data-i="${i}">
            <span class="an-rank">${i + 1}</span>
            <span class="an-main">
              <span class="an-title">${esc(r.answer)}</span>
              <span class="an-meta">${meta}</span>
              <span class="an-bar"><span style="width:${bar}%"></span></span>
            </span>
            <span class="an-stats">${primary}</span>
          </button>`;
          })
          .join("")
      : `<div class="an-empty">No strong signals for this selection.</div>`;

    const focusLabel =
      lens === "audience"
        ? AUDIENCE_LABELS[audienceKey] || audienceKey
        : COUNTRY_LABELS[countryKey] || countryKey;

    body.innerHTML = `
      <div class="an-controls">
        <div class="an-lens" role="tablist" aria-label="Analysis lens">
          <button type="button" class="an-lens-btn${
            lens === "audience" ? " on" : ""
          }" data-lens="audience">People</button>
          <button type="button" class="an-lens-btn${
            lens === "country" ? " on" : ""
          }" data-lens="country">Country</button>
        </div>
        <div class="an-chips" id="anChips">${pickChips}</div>
        <div class="an-sort" role="tablist" aria-label="Rank by">
          <span class="an-sort-label">Rank by</span>
          ${sortChips}
        </div>
      </div>

      <div class="an-intro">
        <div class="an-intro-title">Top 10 · ${esc(focusLabel)} · ${esc(copy.label)}</div>
        <div class="an-intro-sub">${
          lens === "audience" ? copy.subAudience : copy.subCountry
        }</div>
      </div>

      <div class="an-list" id="anList">${list}</div>
    `;

    body.querySelectorAll("[data-lens]").forEach((btn) => {
      btn.onclick = () => {
        lens = btn.dataset.lens;
        render();
      };
    });

    body.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.onclick = () => {
        sortBy = btn.dataset.sort;
        render();
      };
    });

    body.querySelectorAll("[data-aud]").forEach((btn) => {
      btn.onclick = () => {
        audienceKey = btn.dataset.aud;
        render();
      };
    });

    body.querySelectorAll("[data-country]").forEach((btn) => {
      btn.onclick = () => {
        countryKey = btn.dataset.country;
        render();
      };
    });

    body.querySelectorAll(".an-row").forEach((btn) => {
      btn.onclick = () => {
        const row = rows[+btn.dataset.i];
        if (!row || !onApply) return;
        onApply({
          themeId: GWI_TO_THEME[row.audience] || null,
          category: row.category,
          answer: row.answer,
        });
      };
    });
  }

  async function show() {
    open = true;
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    render();
  }

  function hide() {
    open = false;
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
  }

  function toggle() {
    if (open) hide();
    else show();
  }

  return {
    setGwi,
    setInsights,
    show,
    hide,
    toggle,
    get open() {
      return open;
    },
  };
}
