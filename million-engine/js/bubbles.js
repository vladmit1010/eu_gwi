/** Proportional bubble overlays — category drill-down + countries. */

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

function radiusFor(universe, minU, maxU, rMin, rMax) {
  if (!maxU || universe <= 0) return rMin;
  if (maxU <= minU) return (rMin + rMax) * 0.5;
  const t = Math.sqrt((universe - minU) / (maxU - minU));
  return rMin + (rMax - rMin) * t;
}

function layoutBubbles(items, W, H, rMin, rMax) {
  const universes = items.map((i) => i.universe || 0);
  const maxU = Math.max(...universes, 1);
  const minU = Math.min(...universes.filter((u) => u > 0), maxU);
  const sized = items
    .map((item) => ({
      ...item,
      r: radiusFor(item.universe || 0, minU, maxU, rMin, rMax),
    }))
    .sort((a, b) => b.universe - a.universe);

  const cx = W * 0.52;
  const cy = H * 0.5;
  if (!sized.length) return [];

  const [first, ...rest] = sized;
  const placed = [{ ...first, x: cx, y: cy }];

  rest.forEach((item, i) => {
    const n = rest.length;
    const angle = -Math.PI / 2 + ((i + 0.5) / Math.max(n, 1)) * Math.PI * 2;
    const ring = Math.min(W, H) * 0.34;
    placed.push({
      ...item,
      x: cx + Math.cos(angle) * ring,
      y: cy + Math.sin(angle) * ring * 0.88,
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

export function createBubbles({
  onPassion,
  onCategory,
  onCountry,
  onBack,
  onClose,
} = {}) {
  const root = $("bubbleOverlay");
  const stage = $("bubbleStage");
  const titleEl = $("bubbleTitle");
  const subEl = $("bubbleSub");
  const pieEl = $("bubblePie");
  const legendEl = $("bubblePieLegend");
  const sideEl = $("bubbleSide");
  const footEl = $("bubbleFoot");
  const backBtn = $("bubbleBack");
  let open = false;
  let mode = null;
  let level = "categories"; // categories | answers | countries

  function hide() {
    if (!open) return;
    open = false;
    mode = null;
    level = "categories";
    root?.classList.remove("open", "has-pie", "has-side", "level-answers");
    root?.setAttribute("aria-hidden", "true");
    if (stage) stage.replaceChildren();
    if (pieEl) pieEl.style.background = "";
    if (legendEl) legendEl.replaceChildren();
    if (sideEl) sideEl.replaceChildren();
    if (footEl) footEl.replaceChildren();
    if (backBtn) backBtn.hidden = true;
    onClose?.();
  }

  function showShell({ title, sub, showPie, showSide, showBack }) {
    open = true;
    root?.classList.add("open");
    root?.setAttribute("aria-hidden", "false");
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub || "";
    root?.classList.toggle("has-pie", Boolean(showPie));
    root?.classList.toggle("has-side", Boolean(showSide));
    root?.classList.toggle("level-answers", Boolean(showBack));
    if (backBtn) backBtn.hidden = !showBack;
  }

  function renderSide({ who, snapshot, audienceLabel }) {
    if (!sideEl) return;
    sideEl.replaceChildren();

    const whoBlock = document.createElement("div");
    whoBlock.className = "bubble-side-block";
    whoBlock.innerHTML = `<div class="bubble-side-kicker">Who</div>`;
    if (who?.rows?.length) {
      const list = document.createElement("ul");
      list.className = "bubble-who-list";
      const maxU = Math.max(...who.rows.map((r) => r.universe || 0), 1);
      who.rows.forEach((r) => {
        const li = document.createElement("li");
        const on = r.label === audienceLabel;
        li.className = on ? "on" : "";
        li.innerHTML = `<div class="bubble-who-top"><b>${esc(r.label)}</b><span>${esc(
          formatPeople(r.universe)
        )}</span></div>
          <span class="bubble-who-bar"><i style="width:${Math.max(
            6,
            Math.round((r.universe / maxU) * 100)
          )}%"></i></span>`;
        list.appendChild(li);
      });
      whoBlock.appendChild(list);
    }
    sideEl.appendChild(whoBlock);

    const values = (snapshot?.values || []).slice(0, 4);
    if (values.length) {
      const block = document.createElement("div");
      block.className = "bubble-side-block";
      block.innerHTML = `<div class="bubble-side-kicker">Values</div>`;
      const ul = document.createElement("ul");
      ul.className = "bubble-side-list bubble-side-list-soft";
      values.forEach((v) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${esc(v.answer)}</span>`;
        ul.appendChild(li);
      });
      block.appendChild(ul);
      sideEl.appendChild(block);
    }

    const character = (snapshot?.character || []).slice(0, 3);
    if (character.length) {
      const block = document.createElement("div");
      block.className = "bubble-side-block";
      block.innerHTML = `<div class="bubble-side-kicker">Character</div>`;
      const ul = document.createElement("ul");
      ul.className = "bubble-side-list bubble-side-list-soft";
      character.forEach((v) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${esc(v.answer)}</span>`;
        ul.appendChild(li);
      });
      block.appendChild(ul);
      sideEl.appendChild(block);
    }

    const channels = (snapshot?.channels || []).slice(0, 4);
    if (channels.length) {
      const block = document.createElement("div");
      block.className = "bubble-side-block";
      block.innerHTML = `<div class="bubble-side-kicker">Channels</div>`;
      const ul = document.createElement("ul");
      ul.className = "bubble-side-list bubble-side-list-soft";
      channels.forEach((v) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${esc(v.answer)}</span><b>${esc(formatPeople(v.universe))}</b>`;
        ul.appendChild(li);
      });
      block.appendChild(ul);
      sideEl.appendChild(block);
    }
  }

  function renderFoot(items, kind) {
    if (!footEl) return;
    footEl.replaceChildren();
    const kicker = document.createElement("div");
    kicker.className = "bubble-foot-kicker";
    kicker.textContent =
      kind === "category"
        ? "Potential (audience size)"
        : "Potential · Interest";
    footEl.appendChild(kicker);

    const row = document.createElement("div");
    row.className = "bubble-foot-row";
    const top = [...items].sort((a, b) => (b.universe || 0) - (a.universe || 0)).slice(0, 5);
    top.forEach((b) => {
      const chip = document.createElement("span");
      chip.className = "bubble-foot-stat";
      const interest =
        kind === "answer" && b.index != null ? ` · Interest ${b.index}` : "";
      chip.textContent = `${b.short || b.label} · ${formatPeople(b.universe)}${interest}`;
      row.appendChild(chip);
    });
    footEl.appendChild(row);
  }

  function showPassions({
    countryName,
    audienceLabel,
    items,
    selectedAnswer,
    level: nextLevel = "categories",
    categoryLabel = null,
    who = null,
    snapshot = null,
  }) {
    mode = "passions";
    level = nextLevel;
    const isAnswers = nextLevel === "answers";
    showShell({
      title: countryName,
      sub: isAnswers
        ? `${audienceLabel} · ${categoryLabel || "theme"} · tap a circle = colour the map`
        : `${audienceLabel} · circle size = potential · tap a category`,
      showPie: false,
      showSide: true,
      showBack: isAnswers,
    });
    renderSide({ who, snapshot, audienceLabel });
    renderFoot(items, isAnswers ? "answer" : "category");
    if ($("bubbleKicker")) {
      $("bubbleKicker").textContent = isAnswers
        ? categoryLabel || "Themes"
        : "Potential";
    }
    requestAnimationFrame(() =>
      renderPassionStage(items, selectedAnswer, isAnswers ? "answer" : "category")
    );
  }

  function renderPassionStage(items, selectedAnswer, kind) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    const placed = layoutBubbles(items, W, H, 30, 92);

    stage.replaceChildren();
    placed.forEach((b, i) => {
      const selected = selectedAnswer && b.answer === selectedAnswer;
      const btn = document.createElement("button");
      btn.type = "button";
      const tone =
        b.kind === "global" || b.pack === "global"
          ? "global"
          : b.kind === "category"
            ? "category"
            : "local";
      btn.className = `bubble-node bubble-${tone}${selected ? " on" : ""}`;
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(i * 40, 280)}ms`;

      // Potential-first: big reach + short label only
      btn.innerHTML = `
        <span class="bubble-reach">${esc(formatPeople(b.universe))}</span>
        <span class="bubble-label">${esc(b.short || b.label)}</span>
      `;
      btn.title =
        kind === "category"
          ? `${b.label} · potential ${formatPeople(b.universe)}`
          : `${b.label} · ${formatPeople(b.universe)} people · Interest ${b.index ?? "—"}`;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (kind === "category") onCategory?.(b);
        else onPassion?.(b);
      };
      stage.appendChild(btn);
    });
  }

  function showCountries({ audienceLabel, themeLabel, items }) {
    mode = "countries";
    level = "countries";
    showShell({
      title: audienceLabel,
      sub: themeLabel
        ? `Country share · ${themeLabel}`
        : "Country share across Erste markets",
      showPie: true,
      showSide: false,
      showBack: false,
    });
    if (footEl) footEl.replaceChildren();
    requestAnimationFrame(() => renderCountryStage(items));
  }

  function renderCountryStage(items) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    const placed = layoutBubbles(items, W, H, 28, 86);

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
    if (onClose?.({ phase: "before" }) === false) return;
    hide();
  });

  backBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    onBack?.();
  });

  root?.addEventListener("click", (e) => {
    if (e.target !== root) return;
    if (onClose?.({ phase: "before" }) === false) return;
    hide();
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
    get level() {
      return level;
    },
  };
}
