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

/**
 * Bubble radius from audience size.
 * Close values (e.g. 1.6M vs 2.0M) stay visually similar;
 * wide spreads still get a clear hierarchy.
 */
function radiusFor(universe, minU, maxU, rMin, rMax) {
  if (universe <= 0 || !maxU) return rMin;
  if (maxU <= minU) return (rMin + rMax) * 0.55;

  // Size vs the largest in this set (area ~ mildly proportional to people)
  const relative = Math.max(0.05, Math.min(1, universe / maxU));
  const t = Math.pow(relative, 0.42);

  // How different are min/max? Small spread → compress visual range
  const spread = (maxU - minU) / maxU;
  const compress = Math.max(0.22, Math.min(1, spread * 2.2));
  const tSoft = 1 - compress + compress * t;

  return rMin + (rMax - rMin) * tSoft;
}

/**
 * Place items on a regular polygon (no center bubble).
 * startAngle = -90° puts a vertex on top (triangle / pentagon tip up).
 */
function layoutPolygon(items, W, H, rMin, rMax, { startAngle = -Math.PI / 2 } = {}) {
  const n = items.length;
  if (!n) return [];

  const pad = Math.max(10, Math.min(W, H) * 0.06);
  const universes = items.map((i) => i.universe || 0);
  const maxU = Math.max(...universes, 1);
  const minU = Math.min(...universes.filter((u) => u > 0), maxU);
  const area = Math.max(W * H, 1);
  const scale = Math.min(1, Math.sqrt(area / (640 * 280)));
  const rMaxUse = Math.max(22, Math.min(rMax, Math.min(W, H) * 0.28) * scale);
  const rMinUse = Math.max(18, Math.min(rMin, rMaxUse * 0.58));

  const sized = items.map((item) => ({
    ...item,
    r: radiusFor(item.universe || 0, minU, maxU, rMinUse, rMaxUse),
  }));

  const maxR = Math.max(...sized.map((s) => s.r), rMinUse);
  const cx = W * 0.5;
  const cy = H * 0.52;
  // Ring large enough that neighbours barely kiss
  const chordGap = 10;
  let ring = maxR / Math.sin(Math.PI / Math.max(n, 2)) + chordGap;
  const maxRingX = W / 2 - maxR - pad;
  const maxRingY = H / 2 - maxR - pad;
  ring = Math.min(ring, maxRingX, maxRingY * 1.05);
  ring = Math.max(ring, maxR * 1.35);

  return sized.map((item, i) => {
    const a = startAngle + (i / n) * Math.PI * 2;
    return {
      ...item,
      x: cx + Math.cos(a) * ring,
      y: cy + Math.sin(a) * ring * 0.92,
    };
  });
}

/** Pack bubbles with less overlap — scales to stage size (incl. 13" laptops). */
function layoutBubbles(items, W, H, rMin, rMax) {
  const n = items.length;
  if (!n) return [];

  const pad = Math.max(10, Math.min(W, H) * 0.04);
  const area = Math.max(W * H, 1);
  // Smaller radii when crowded or on a short stage
  const scale = Math.min(1, Math.sqrt(area / (920 * 420)));
  const crowd = Math.max(0, n - 4) * 0.06;
  const rMaxUse = Math.max(22, Math.min(rMax, Math.min(W, H) * 0.22) * scale * (1 - crowd));
  const rMinUse = Math.max(18, Math.min(rMin, rMaxUse * 0.55));

  const universes = items.map((i) => i.universe || 0);
  const maxU = Math.max(...universes, 1);
  const minU = Math.min(...universes.filter((u) => u > 0), maxU);
  const sized = items
    .map((item) => ({
      ...item,
      r: radiusFor(item.universe || 0, minU, maxU, rMinUse, rMaxUse),
    }))
    .sort((a, b) => b.universe - a.universe);

  const cx = W * 0.5;
  const cy = H * 0.5;
  const [first, ...rest] = sized;
  const placed = [{ ...first, x: cx, y: cy }];

  const gap = Math.max(8, Math.min(W, H) * 0.02);
  rest.forEach((item, i) => {
    const count = rest.length;
    const angle = -Math.PI / 2 + (i / Math.max(count, 1)) * Math.PI * 2;
    // Ring clears the center bubble + this bubble + a gap
    const ring = first.r + item.r + gap + Math.min(W, H) * 0.02;
    const rx = Math.min(ring, (W / 2) - item.r - pad);
    const ry = Math.min(ring * 0.92, (H / 2) - item.r - pad);
    placed.push({
      ...item,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    });
  });

  // Push apart overlaps (a few iterations)
  const iterations = 24;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const minDist = a.r + b.r + gap * 0.65;
        if (dist >= minDist) continue;
        const push = ((minDist - dist) / dist) * 0.5;
        dx *= push;
        dy *= push;
        // Keep the largest (first) more anchored
        const aW = i === 0 ? 0.15 : 0.5;
        const bW = i === 0 ? 0.85 : 0.5;
        a.x -= dx * aW;
        a.y -= dy * aW;
        b.x += dx * bW;
        b.y += dy * bW;
      }
    }
    // Clamp inside stage
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      p.x = Math.min(W - p.r - pad, Math.max(p.r + pad, p.x));
      p.y = Math.min(H - p.r - pad, Math.max(p.r + pad, p.y));
    }
  }

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
  onAudience,
  onThemeField,
  onSponsor,
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
  let level = "audiences"; // audiences | menu | answers | categories | countries

  function hide() {
    if (!open) return;
    open = false;
    mode = null;
    level = "audiences";
    root?.classList.remove(
      "open",
      "has-pie",
      "has-side",
      "level-answers",
      "level-menu",
      "level-audiences"
    );
    root?.setAttribute("aria-hidden", "true");
    if (stage) stage.replaceChildren();
    if (pieEl) pieEl.style.background = "";
    if (legendEl) legendEl.replaceChildren();
    if (sideEl) {
      sideEl.replaceChildren();
      sideEl.classList.remove("bubble-side-prose");
    }
    if (footEl) footEl.replaceChildren();
    if (backBtn) backBtn.hidden = true;
    onClose?.();
  }

  function showShell({ title, sub, showPie, showSide, showBack, levelClass }) {
    open = true;
    root?.classList.add("open");
    root?.setAttribute("aria-hidden", "false");
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub || "";
    root?.classList.toggle("has-pie", Boolean(showPie));
    root?.classList.toggle("has-side", Boolean(showSide));
    root?.classList.toggle("level-answers", levelClass === "answers");
    root?.classList.toggle("level-menu", levelClass === "menu");
    root?.classList.toggle("level-audiences", levelClass === "audiences");
    if (backBtn) backBtn.hidden = !showBack;
  }

  function renderProseSide(prose, { onlyAudience = null, sponsors = null } = {}) {
    if (!sideEl) return;
    sideEl.replaceChildren();
    sideEl.classList.add("bubble-side-prose");

    const intro = document.createElement("div");
    intro.className = "bubble-side-block";
    const focus = onlyAudience || null;
    intro.innerHTML = `<div class="bubble-side-kicker">Cultural snapshot</div>
      <p class="bubble-prose-intro">${
        focus
          ? `From GWI Values &amp; Character — how <strong>${esc(
              focus
            )}</strong> tick in this market.`
          : "From GWI Values &amp; Character — how Affluent and Gen Z tick in this market."
      }</p>`;
    sideEl.appendChild(intro);

    const sections = [
      { key: "values", title: "What matters" },
      { key: "character", title: "How they show up" },
    ];
    const auds = focus ? [focus] : ["Affluent", "Gen Z"];

    sections.forEach(({ key, title }) => {
      const block = document.createElement("div");
      block.className = "bubble-side-block bubble-prose-block";
      block.innerHTML = `<div class="bubble-side-kicker">${title}</div>`;
      let any = false;
      auds.forEach((aud) => {
        const text = prose?.[key]?.[aud];
        if (!text) return;
        any = true;
        const p = document.createElement("div");
        p.className = "bubble-prose-chunk" + (focus ? " on" : "");
        p.innerHTML = focus
          ? `<p>${esc(text)}</p>`
          : `<div class="bubble-prose-aud">${esc(aud)}</div><p>${esc(text)}</p>`;
        block.appendChild(p);
      });
      if (any) sideEl.appendChild(block);
    });

    // After audience pick: fill the freed space with sponsorship briefing
    if (focus) {
      const sponsorText = prose?.sponsor?.[focus];
      const block = document.createElement("div");
      block.className = "bubble-side-block bubble-prose-block bubble-sponsor-brief";
      block.innerHTML = `<div class="bubble-side-kicker">Global sponsorships</div>`;

      if (Array.isArray(sponsors) && sponsors.length) {
        const ul = document.createElement("ul");
        ul.className = "bubble-sponsor-stats";
        sponsors.forEach((s) => {
          const li = document.createElement("li");
          li.innerHTML = `<b>${esc(s.short || s.label)}</b><span>${esc(
            formatPeople(s.universe)
          )}${s.index != null ? ` · Idx ${esc(String(s.index))}` : ""}</span>`;
          ul.appendChild(li);
        });
        block.appendChild(ul);
      }

      if (sponsorText) {
        const p = document.createElement("div");
        p.className = "bubble-prose-chunk on";
        p.innerHTML = `<p>${esc(sponsorText)}</p>`;
        block.appendChild(p);
      }

      sideEl.appendChild(block);
    }
  }

  function renderSide({ who, snapshot, audienceLabel }) {
    if (!sideEl) return;
    sideEl.classList.remove("bubble-side-prose");
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
  }

  function renderFoot(items, kind) {
    if (!footEl) return;
    footEl.replaceChildren();
    if (kind === "audiences" || kind === "menu") return;
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

  /** Country landing: Affluent + Gen Z + total people. */
  function showCountryLanding({ countryName, who, prose, lensNote = null }) {
    mode = "passions";
    level = "audiences";
    const total = who?.total || 0;
    showShell({
      title: countryName,
      sub: lensNote || "Click Affluent or Gen Z to explore",
      showPie: false,
      showSide: true,
      showBack: false,
      levelClass: "audiences",
    });
    renderProseSide(prose);
    renderFoot([], "audiences");
    if ($("bubbleKicker")) {
      $("bubbleKicker").textContent = total
        ? `${formatPeople(total)} people`
        : "Who";
    }
    const items = (who?.rows || []).map((r) => ({
      id: `aud:${r.key}`,
      key: r.key,
      label: r.label,
      short: r.label,
      universe: r.universe || 1,
      kind: "audience",
    }));
    requestAnimationFrame(() => renderAudienceStage(items, { total }));
  }

  function renderAudienceStage(items, { total = 0 } = {}) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    stage.replaceChildren();

    if (total > 0) {
      const banner = document.createElement("div");
      banner.className = "bubble-total";
      banner.innerHTML = `<span class="bubble-total-num">${esc(
        formatPeople(total)
      )}</span><span class="bubble-total-cap">people in this market</span>`;
      stage.appendChild(banner);
    }

    const bandTop = total > 0 ? 56 : 12;
    const placed = layoutBubbles(
      items.map((i) => ({ ...i, universe: Math.max(i.universe || 1, 1) })),
      W,
      Math.max(120, H - bandTop),
      52,
      78
    );
    placed.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bubble-node bubble-audience";
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y + bandTop}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(i * 50, 200)}ms`;
      const reach =
        b.universe > 1
          ? `<span class="bubble-reach">${esc(formatPeople(b.universe))}</span>`
          : "";
      btn.innerHTML = `${reach}<span class="bubble-label">${esc(b.label)}</span>`;
      btn.title = `Explore as ${b.label}${
        b.universe > 1 ? ` · ${formatPeople(b.universe)}` : ""
      }`;
      btn.onclick = (e) => {
        e.stopPropagation();
        onAudience?.(b);
      };
      stage.appendChild(btn);
    });
  }

  /** Audience selected → sponsorships (top) + passion fields (bottom). */
  function showThemeMenu({
    countryName,
    audienceLabel,
    sponsors = [],
    fields = [],
    prose,
    lensNote = null,
  }) {
    mode = "passions";
    level = "menu";
    const path = [audienceLabel].filter(Boolean).join(" · ");
    showShell({
      title: countryName,
      sub: lensNote
        ? `${path} · ${lensNote}`
        : `${path} · sponsorships above · passion fields below`,
      showPie: false,
      showSide: true,
      showBack: true,
      levelClass: "menu",
    });
    renderProseSide(prose, { onlyAudience: audienceLabel, sponsors });
    renderFoot([], "menu");
    if ($("bubbleKicker")) $("bubbleKicker").textContent = path || "Explore";
    requestAnimationFrame(() =>
      renderExploreMenuStage({ sponsors, fields, audienceLabel })
    );
  }

  function renderExploreMenuStage({ sponsors, fields }) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    stage.replaceChildren();

    const mid = Math.round(H * 0.42);
    const topH = Math.max(120, mid - 8);
    const botY = mid + 8;
    const botH = Math.max(140, H - botY - 8);

    const headTop = document.createElement("div");
    headTop.className = "bubble-band-label";
    headTop.style.top = "6px";
    headTop.textContent = "Global sponsorships";
    stage.appendChild(headTop);

    const headBot = document.createElement("div");
    headBot.className = "bubble-band-label";
    headBot.style.top = `${botY}px`;
    headBot.textContent = "Passion fields";
    stage.appendChild(headBot);

    const sponsorPlaced = layoutPolygon(
      (sponsors || []).map((s) => ({
        ...s,
        universe: Math.max(s.universe || 1, 1),
      })),
      W,
      topH - 22,
      38,
      58,
      { startAngle: -Math.PI / 2 }
    );
    sponsorPlaced.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bubble-node bubble-sponsor";
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y + 22}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(i * 40, 200)}ms`;
      btn.innerHTML = `
        <span class="bubble-reach">${esc(formatPeople(b.universe))}</span>
        <span class="bubble-label">${esc(b.short || b.label)}</span>
      `;
      btn.title = `${b.label} · ${formatPeople(b.universe)} people · Interest ${
        b.index ?? "—"
      }`;
      btn.onclick = (e) => {
        e.stopPropagation();
        onSponsor?.(b);
      };
      stage.appendChild(btn);
    });

    const fieldPlaced = layoutPolygon(
      (fields || []).map((f) => ({
        ...f,
        universe: Math.max(f.universe || 1, 1),
      })),
      W,
      botH - 22,
      30,
      46,
      { startAngle: -Math.PI / 2 }
    );
    fieldPlaced.forEach((b, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bubble-node bubble-field";
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y + botY + 22}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(80 + i * 35, 280)}ms`;
      btn.innerHTML = `
        <span class="bubble-label">${esc(b.short || b.label)}</span>
      `;
      btn.title = b.label || b.short || "Passion field";
      btn.onclick = (e) => {
        e.stopPropagation();
        onThemeField?.(b.field || b);
      };
      stage.appendChild(btn);
    });
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
    prose = null,
  }) {
    mode = "passions";
    level = nextLevel;
    const isAnswers = nextLevel === "answers";
    const path = [audienceLabel, isAnswers ? categoryLabel : null]
      .filter(Boolean)
      .join(" · ");
    showShell({
      title: countryName,
      sub: isAnswers
        ? `${path} · hover a circle for Interest + reach`
        : `${path || audienceLabel} · click a category circle to open themes inside`,
      showPie: false,
      showSide: true,
      showBack: isAnswers,
      levelClass: isAnswers ? "answers" : "categories",
    });
    if (prose) renderProseSide(prose, { onlyAudience: audienceLabel });
    else renderSide({ who, snapshot, audienceLabel });
    renderFoot(items, isAnswers ? "answer" : "category");
    if ($("bubbleKicker")) {
      $("bubbleKicker").textContent = path || (isAnswers ? "Themes" : "Local activations");
    }
    requestAnimationFrame(() =>
      renderPassionStage(items, selectedAnswer, isAnswers ? "answer" : "category")
    );
  }

  function renderPassionStage(items, selectedAnswer, kind) {
    if (!stage) return;
    const W = stage.clientWidth || 640;
    const H = stage.clientHeight || 420;
    const isAnswers = kind === "answer";
    const rMin = isAnswers ? 26 : 28;
    const rMax = isAnswers
      ? Math.min(72, Math.min(W, H) * 0.2)
      : Math.min(88, Math.min(W, H) * 0.24);
    const placed = layoutBubbles(items, W, H, rMin, rMax);

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
      const lookOnly = kind === "answer";
      btn.className = `bubble-node bubble-${tone}${selected ? " on" : ""}${
        lookOnly ? " bubble-look" : ""
      }`;
      btn.style.left = `${b.x}px`;
      btn.style.top = `${b.y}px`;
      btn.style.width = `${b.r * 2}px`;
      btn.style.height = `${b.r * 2}px`;
      btn.style.animationDelay = `${Math.min(i * 40, 280)}ms`;
      if (lookOnly) {
        btn.tabIndex = -1;
        btn.setAttribute("aria-disabled", "true");
      }

      const idxHtml =
        kind === "answer" && b.index != null
          ? `<span class="bubble-idx">Interest ${esc(String(b.index))}</span>`
          : "";
      btn.innerHTML = `
        <span class="bubble-reach">${esc(formatPeople(b.universe))}</span>
        <span class="bubble-label">${esc(b.short || b.label)}</span>
        ${idxHtml}
      `;
      btn.title =
        kind === "category"
          ? `${b.label} · potential ${formatPeople(b.universe)}`
          : `${b.label} · ${formatPeople(b.universe)} people · Interest ${b.index ?? "—"}`;
      if (kind === "category") {
        btn.onclick = (e) => {
          e.stopPropagation();
          onCategory?.(b);
        };
      } else {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };
      }
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
      levelClass: null,
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
    showCountryLanding,
    showThemeMenu,
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
