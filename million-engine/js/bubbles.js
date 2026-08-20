/** Proportional bubble overlays — passions (country) & countries (audience). */

import { $, formatPeople } from "./utils/dom.js";

const PIE_COLORS = [
  "#FF5F00",
  "#F79E1B",
  "#EB001B",
  "#C45A2C",
  "#8F4A16",
  "#5C6B7A",
];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function radiusFor(universe, maxU, rMin, rMax) {
  if (!maxU || universe <= 0) return rMin;
  const t = Math.sqrt(universe / maxU);
  return rMin + (rMax - rMin) * t;
}

/** Simple ring layout around center; largest near middle. */
function layoutBubbles(items, W, H, rMin, rMax) {
  const maxU = Math.max(...items.map((i) => i.universe || 0), 1);
  const sized = items.map((item) => ({
    ...item,
    r: radiusFor(item.universe || 0, maxU, rMin, rMax),
  }));

  const cx = W * 0.5;
  const cy = H * 0.52;
  if (!sized.length) return [];

  const [first, ...rest] = sized;
  const placed = [{ ...first, x: cx, y: cy * 0.92 }];

  rest.forEach((item, i) => {
    const n = rest.length;
    const angle = -Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;
    const ring = Math.min(W, H) * (0.28 + (i % 3) * 0.04);
    placed.push({
      ...item,
      x: cx + Math.cos(angle) * ring,
      y: cy + Math.sin(angle) * ring * 0.85,
    });
  });

  return placed;
}

function pieGradient(rows) {
  if (!rows.length) return "var(--surface-2)";
  let acc = 0;
  const parts = rows.map((r, i) => {
    const start = acc * 100;
    acc += r.share || 0;
    const end = acc * 100;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    return `${color} ${start}% ${end}%`;
  });
  return `conic-gradient(from -90deg, ${parts.join(", ")})`;
}

export function createBubbles({ onPassion, onCountry, onClose } = {}) {
  const root = $("bubbleOverlay");
  const stage = $("bubbleStage");
  const titleEl = $("bubbleTitle");
  const subEl = $("bubbleSub");
  const pieEl = $("bubblePie");
  const legendEl = $("bubblePieLegend");
  let open = false;
  let mode = null;

  function hide() {
    if (!open) return;
    open = false;
    mode = null;
    root?.classList.remove("open");
    root?.setAttribute("aria-hidden", "true");
    if (stage) stage.replaceChildren();
    if (pieEl) pieEl.style.background = "";
    if (legendEl) legendEl.replaceChildren();
    onClose?.();
  }

  function showShell({ title, sub, showPie }) {
    open = true;
    root?.classList.add("open");
    root?.setAttribute("aria-hidden", "false");
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub || "";
    root?.classList.toggle("has-pie", Boolean(showPie));
  }

  function showPassions({ countryName, audienceLabel, items }) {
    mode = "passions";
    showShell({
      title: countryName,
      sub: `${audienceLabel} · passions by audience size`,
      showPie: false,
    });
    requestAnimationFrame(() => renderPassionStage(items));
  }

  function renderPassionStage(items) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    const placed = layoutBubbles(items, W, H, 36, 78);

    stage.replaceChildren();
    placed.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `bubble-node bubble-${b.kind || "local"}`;
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(i * 40, 280)}ms`;
      btn.innerHTML = `
        <span class="bubble-reach">${esc(formatPeople(b.universe))}</span>
        <span class="bubble-label">${esc(b.short || b.label)}</span>
        <span class="bubble-idx">Interest ${b.index ?? "—"}</span>
      `;
      btn.title = `${b.label} · ${formatPeople(b.universe)} people · Interest ${b.index ?? "—"}`;
      btn.onclick = (e) => {
        e.stopPropagation();
        onPassion?.(b);
      };
      stage.appendChild(btn);
    });
  }

  function showCountries({ audienceLabel, themeLabel, items }) {
    mode = "countries";
    showShell({
      title: audienceLabel,
      sub: themeLabel
        ? `Country share · ${themeLabel}`
        : "Country share across Erste markets",
      showPie: true,
    });
    requestAnimationFrame(() => renderCountryStage(items));
  }

  function renderCountryStage(items) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    const placed = layoutBubbles(items, W, H, 40, 72);

    if (pieEl) pieEl.style.background = pieGradient(items);
    if (legendEl) {
      legendEl.replaceChildren();
      items.forEach((r, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<i style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></i><b>${esc(
          r.code
        )}</b><span>${Math.round((r.share || 0) * 100)}%</span>`;
        legendEl.appendChild(li);
      });
    }

    stage.replaceChildren();
    placed.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bubble-node bubble-country";
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(i * 40, 280)}ms`;
      const pct = Math.round((b.share || 0) * 100);
      btn.innerHTML = `
        <span class="bubble-reach">${esc(formatPeople(b.universe))}</span>
        <span class="bubble-label">${esc(b.code)}</span>
        <span class="bubble-idx">${pct}% · Interest ${b.index ?? "—"}</span>
      `;
      btn.title = `${b.name} · ${formatPeople(b.universe)} · ${pct}% of Erste`;
      btn.onclick = (e) => {
        e.stopPropagation();
        onCountry?.(b.code);
      };
      stage.appendChild(btn);
    });
  }

  $("bubbleClose")?.addEventListener("click", (e) => {
    e.stopPropagation();
    hide();
  });

  root?.addEventListener("click", (e) => {
    if (e.target === root) hide();
  });

  return {
    showPassions,
    showCountries,
    hide,
    get open() {
      return open;
    },
    get mode() {
      return mode;
    },
  };
}
