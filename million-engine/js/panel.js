import { $, countTo, formatInt, formatPeople } from "./utils/dom.js";
import { CONFIG } from "./config.js";
import { ISO_TO_GWI } from "./gwi.js";
import {
  coreMetricsForCountry,
  localPassionsForCountry,
  audienceSnapshot,
} from "./passions.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function barPct(value, max, floor = 8) {
  if (!max || value == null) return floor;
  return Math.max(floor, Math.round((value / max) * 100));
}

export function createPanel({ onClose, onLocalPassion }) {
  const el = $("panel");

  function render(data, code, activeThemes, _picked, opts = {}) {
    const market = data.markets[code];
    if (!market) return;

    const gwi = opts.gwi || null;
    const audienceKey = opts.audienceKey || null;
    const passionId = opts.passionId || null;
    const themeLabels = data.themes
      .filter((t) => activeThemes.has(t.id))
      .map((t) => t.label)
      .join(" · ");

    const countryKey = ISO_TO_GWI[code];
    const share =
      data.meta.target > 0
        ? ((market.contribution / data.meta.target) * 100).toFixed(1)
        : "0";

    const core = coreMetricsForCountry(gwi, audienceKey, countryKey);
    const local = localPassionsForCountry(gwi, audienceKey, countryKey, {
      limit: 5,
      sortBy: "people",
    });
    const snap = audienceSnapshot(gwi, audienceKey, countryKey);
    const coreMax = Math.max(...core.map((c) => c.universe || 0), 1);
    const localMax = Math.max(...local.map((r) => r.universe || 0), 1);

    const coreRows = core
      .map((p) => {
        const on = passionId === p.id ? " on" : "";
        const w = barPct(p.universe, coreMax);
        return `
        <div class="dash-core${on}" data-passion="${p.id}">
          <div class="dash-core-top">
            <span class="dash-badge global">Global</span>
            <span class="dash-core-name">${esc(p.label)}</span>
            <span class="dash-core-reach">${formatPeople(p.universe)}</span>
          </div>
          <div class="dash-bar"><span style="width:${w}%"></span></div>
          <div class="dash-core-meta">
            <span class="dash-idx-sm">Interest ${p.index ?? "—"}</span>
            <span>${esc(p.blurb)}</span>
          </div>
        </div>`;
      })
      .join("");

    const localRows = local.length
      ? local
          .map((r, i) => {
            const w = barPct(r.universe, localMax, 6);
            return `
          <button type="button" class="dash-local" data-i="${i}">
            <span class="dash-badge local">Local</span>
            <span class="dash-local-main">
              <span class="dash-local-name">${esc(r.answer)}</span>
              <span class="dash-local-meta">
                <span class="dash-idx-sm">Interest ${r.index ?? "—"}</span>
                · local activation idea
              </span>
              <span class="dash-mini-bar" aria-hidden="true"><span style="width:${w}%"></span></span>
            </span>
            <span class="dash-local-reach">${formatPeople(r.universe)}</span>
          </button>`;
          })
          .join("")
      : `<div class="p-empty">No local passions for this cut</div>`;

    const snapBlock = (title, rows, empty) => `
      <div class="dash-snap-block">
        <div class="dash-snap-title">${esc(title)}</div>
        ${
          rows.length
            ? `<ul class="dash-snap-list">${rows
                .map(
                  (r) =>
                    `<li><span>${esc(r.answer)}</span><b>${formatPeople(r.universe)}</b></li>`
                )
                .join("")}</ul>`
            : `<div class="p-empty">${esc(empty)}</div>`
        }
      </div>`;

    el.innerHTML = `
      <div class="p-head">
        <div>
          <div class="p-country">${esc(market.name)}</div>
          <div class="p-theme">${esc(themeLabels || "—")} · audience snapshot</div>
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
      </div>

      <div class="section-label">Global sponsorships here</div>
      <div class="dash-core-list">${coreRows}</div>

      <div class="section-label">Local passion ideas</div>
      <div class="dash-local-list">${localRows}</div>

      <div class="section-label">Audience snapshot</div>
      <div class="dash-snap">
        ${snapBlock("Values that matter", snap.values, "No values data")}
        ${snapBlock("Character", snap.character, "No character data")}
        ${snapBlock("Channels", snap.channels, "No channel data")}
      </div>
    `;

    el.classList.add("up");
    el.setAttribute("aria-hidden", "false");

    $("close").onclick = () => onClose?.();

    el.querySelectorAll(".dash-local").forEach((btn) => {
      btn.onclick = () => {
        const row = local[+btn.dataset.i];
        if (row) onLocalPassion?.(row);
      };
    });

    countTo($("contribNum"), market.contribution || 0, 0, 750);
  }

  function showPick() {}

  function hide() {
    el.classList.remove("up", "has-sel");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "";
  }

  return { render, showPick, hide, el };
}

export { formatInt };
