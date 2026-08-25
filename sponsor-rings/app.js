/** Map + distribution pies (sponsorships / social) × audience filter. */

const d3 = globalThis.d3;
const CODES = ["AT", "CZ", "HU", "RO", "HR", "RS"];
const VW = 176;
const VH = 82;
const RING_R = 6.4;

const svg = d3.select("#map").attr("viewBox", `0 0 ${VW} ${VH}`);
const stage = document.getElementById("stage");
const tip = document.getElementById("tip");
const btnSponsors = document.getElementById("btnSponsors");
const btnSocial = document.getElementById("btnSocial");
const modeLegend = document.getElementById("modeLegend");
const noteEl = document.getElementById("note");
const audGroup = document.getElementById("audFilter");

/** @type {null | 'sponsors' | 'social'} */
let mode = null;
/** @type {'all' | 'affluent' | 'genz'} */
let audience = "all";
let catalog = null;
let gLand = null;
let gRings = null;
let gCode = null;
const centroids = {};
const landNodes = {};

function activeAud() {
  return catalog?.audiences?.[audience] || null;
}

function fmtPeople(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(Math.round(n));
}

function heatColor(v, lo, hi) {
  if (v == null || lo == null || hi == null || hi === lo) return "#1c1f26";
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const stops = [
    [42, 46, 56],
    [143, 74, 22],
    [255, 95, 0],
    [255, 200, 87],
  ];
  const x = t * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

function piePath(cx, cy, r, start, end) {
  const a0 = start - Math.PI / 2;
  const a1 = end - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function itemsFor(code) {
  const m = activeAud()?.markets?.[code];
  if (!m || !mode) return [];
  return mode === "social" ? m.social : m.sponsors;
}

function showTip(html, x, y) {
  tip.innerHTML = html;
  tip.classList.add("on");
  tip.setAttribute("aria-hidden", "false");
  const rect = stage.getBoundingClientRect();
  tip.style.left = `${(x / VW) * rect.width}px`;
  tip.style.top = `${(y / VH) * rect.height}px`;
}

function hideTip() {
  tip.classList.remove("on");
  tip.setAttribute("aria-hidden", "true");
}

function paintMap() {
  const aud = activeAud();
  if (!aud || !gLand) return;
  const vals = CODES.map((c) => aud.heat[c]).filter((v) => v != null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  document.getElementById("lo").textContent = `Lower ${lo}`;
  document.getElementById("hi").textContent = `Higher ${hi}`;
  CODES.forEach((code) => {
    const node = landNodes[code];
    if (node) node.attr("fill", heatColor(aud.heat[code], lo, hi));
  });
}

function syncChrome() {
  btnSponsors.classList.toggle("on", mode === "sponsors");
  btnSocial.classList.toggle("on", mode === "social");
  stage.classList.toggle("rings-hidden", !mode);
  audGroup?.querySelectorAll("[data-aud]").forEach((el) => {
    el.classList.toggle("on", el.dataset.aud === audience);
  });
  const aud = activeAud();
  if (noteEl && aud) {
    noteEl.textContent = `GWI ${aud.label} · Erste markets (AT, HR, CZ, HU, RO, RS)`;
  }
  if (gCode) {
    gCode.classed("is-dim", Boolean(mode));
    gCode.selectAll(".code").attr("y", (d, i, nodes) => {
      const code = nodes[i].textContent;
      const c = centroids[code];
      if (!c) return 0;
      return mode ? c[1] + RING_R + 3.2 : c[1] + 1.1;
    });
  }
}

function renderModeLegend() {
  if (!modeLegend) return;
  if (!catalog || !mode) {
    modeLegend.innerHTML = "";
    return;
  }
  const legend = catalog.modes[mode]?.legend || [];
  modeLegend.innerHTML = legend
    .map(
      (s) =>
        `<span class="mode-chip"><i style="background:${s.color}"></i>${s.short}</span>`
    )
    .join("");
}

function renderRings() {
  if (!gRings) return;
  gRings.selectAll("*").remove();
  const aud = activeAud();
  if (!mode || !aud) return;

  const tipTitle = catalog.modes[mode]?.tipTitle || "mix";
  const audLabel = aud.label;

  CODES.forEach((code) => {
    const c = centroids[code];
    const market = aud.markets[code];
    const items = itemsFor(code);
    if (!c || !market || !items.length) return;

    const [ax, ay] = c;
    const g = gRings.append("g").attr("class", "ring-group");

    g.append("circle")
      .attr("class", "ring-halo")
      .attr("cx", ax)
      .attr("cy", ay)
      .attr("r", RING_R);

    let angle = 0;
    items.forEach((s) => {
      const sweep = (s.share || 0) * Math.PI * 2;
      if (sweep <= 0) return;
      g.append("path")
        .attr("class", "ring-slice")
        .attr("fill", s.color)
        .attr("d", piePath(ax, ay, RING_R - 0.3, angle, angle + sweep));
      angle += sweep;
    });

    g.append("circle")
      .attr("class", "ring-hit")
      .attr("cx", ax)
      .attr("cy", ay)
      .attr("r", RING_R + 1)
      .on("mouseenter", () => {
        const rows = items
          .map(
            (s) => `
            <div class="tip-row">
              <span class="tip-swatch" style="background:${s.color}"></span>
              <span>${s.short}</span>
              <b>${Math.round((s.share || 0) * 100)}% · ${fmtPeople(s.universe)} · Idx ${s.index ?? "—"}</b>
            </div>`
          )
          .join("");
        showTip(
          `<div class="tip-title">${market.name} · ${audLabel} · ${tipTitle}</div>${rows}`,
          ax,
          ay
        );
      })
      .on("mouseleave", hideTip);
  });
}

function setMode(next) {
  mode = mode === next ? null : next;
  syncChrome();
  renderModeLegend();
  hideTip();
  renderRings();
}

function setAudience(next) {
  if (!catalog?.audiences?.[next]) return;
  audience = next;
  paintMap();
  syncChrome();
  hideTip();
  renderRings();
}

async function main() {
  const [geoJson, sponsors] = await Promise.all([
    fetch("./data/europe.geojson").then((r) => r.json()),
    fetch("./data/sponsors.json").then((r) => r.json()),
  ]);
  catalog = sponsors;
  audience = catalog.audienceOrder?.[0] || "all";

  const features = geoJson.features.filter((f) =>
    CODES.includes(f.properties?.ISO2)
  );
  const projection = d3.geoMercator().fitSize([VW, VH], {
    type: "FeatureCollection",
    features,
  });
  const path = d3.geoPath(projection);

  gLand = svg.append("g").attr("class", "lands");
  gCode = svg.append("g").attr("class", "codes");
  gRings = svg.append("g").attr("class", "ring-layer");

  features.forEach((f) => {
    const code = f.properties.ISO2;
    const [cx, cy] = path.centroid(f);
    centroids[code] = [cx, cy];

    landNodes[code] = gLand
      .append("path")
      .attr("class", "land live")
      .attr("d", path(f));

    gCode
      .append("text")
      .attr("class", "code")
      .attr("x", cx)
      .attr("y", cy + 1.1)
      .text(code);
  });

  paintMap();
  syncChrome();

  btnSponsors.addEventListener("click", () => setMode("sponsors"));
  btnSocial.addEventListener("click", () => setMode("social"));
  audGroup?.addEventListener("click", (e) => {
    const t = e.target.closest("[data-aud]");
    if (!t) return;
    setAudience(t.dataset.aud);
  });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="padding:20px;color:#f66">Failed to load: ${err.message}</p>`
  );
});
