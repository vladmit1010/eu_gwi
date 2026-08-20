import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { createHeat, COLORS } from "./utils/color.js";
import { opportunitiesFor, growthIndex } from "./model.js";
import { CONFIG } from "./config.js";

const NS = "http://www.w3.org/2000/svg";
const heat = createHeat(COLORS);
const VW = 176;
const VH = 82;

export async function loadEuropeGeo() {
  const res = await fetch("./data/europe.geojson", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load europe.geojson");
  return res.json();
}

export function createMap(svg, { onSelect, onPeek, onHidePeek, onPick }) {
  svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);

  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <filter id="landSoft" x="-12%" y="-12%" width="124%" height="124%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.28" result="b"/>
      <feOffset dy="0.2" result="o"/>
      <feComponentTransfer in="o" result="s">
        <feFuncA type="linear" slope="0.28"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="s"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="oceanGlow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="rgba(255,95,0,0.07)"/>
      <stop offset="55%" stop-color="rgba(255,255,255,0.02)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <clipPath id="mapClip">
      <rect x="0" y="0" width="${VW}" height="${VH}" rx="0"/>
    </clipPath>
  `;

  const gRoot = document.createElementNS(NS, "g");
  gRoot.setAttribute("clip-path", "url(#mapClip)");

  const ocean = document.createElementNS(NS, "rect");
  ocean.setAttribute("x", "0");
  ocean.setAttribute("y", "0");
  ocean.setAttribute("width", String(VW));
  ocean.setAttribute("height", String(VH));
  ocean.setAttribute("fill", "url(#oceanGlow)");
  ocean.setAttribute("pointer-events", "none");

  const gLand = document.createElementNS(NS, "g");
  gLand.setAttribute("class", "lands");
  const gCode = document.createElementNS(NS, "g");
  const gLock = document.createElementNS(NS, "g");
  const gSeg = document.createElementNS(NS, "g");

  svg.replaceChildren();
  svg.append(defs, gRoot);
  gRoot.append(ocean, gLand, gCode, gLock, gSeg);

  let geo = null;
  let pathGen = null;
  let projection = null;
  const lands = {};
  const labels = {};
  const centroids = {};
  let activeThemes = new Set();
  let active = null;
  let data = null;
  /** Optional { ISO: number|null } — when set, map heats by these values */
  let metricValues = null;
  const featureByCode = {};

  function setGeo(next) {
    geo = next;
    for (const f of geo.features) {
      featureByCode[f.properties.ISO2] = f;
    }
  }

  function codes() {
    return Object.keys(data?.markets || {}).filter((c) => featureByCode[c]);
  }

  function fitProjection(features) {
    /* Target markets fill the screen; rest of Europe continues off the sides */
    projection = d3
      .geoAzimuthalEqualArea()
      .rotate([-19, -47])
      .precision(0.2);
    pathGen = d3.geoPath(projection);
    projection.fitExtent(
      [
        [6, 4],
        [VW - 6, VH - 4],
      ],
      { type: "FeatureCollection", features }
    );
    pathGen = d3.geoPath(projection);
  }

  function centroidOf(code) {
    if (centroids[code]) return centroids[code];
    const f = featureByCode[code];
    const c = pathGen.centroid(f);
    centroids[code] = c;
    return c;
  }

  function build(intro = true) {
    if (!geo) throw new Error("GeoJSON not loaded");
    const activeList = codes();
    if (!activeList.length) throw new Error("No markets with map shapes");

    const activeSet = new Set(activeList);
    const focusFeatures = activeList.map((c) => featureByCode[c]).filter(Boolean);
    /* Zoom to Erste markets — neighbours still drawn where they fall in frame */
    fitProjection(focusFeatures);

    gLand.replaceChildren();
    gCode.replaceChildren();
    gLock.replaceChildren();
    gSeg.replaceChildren();
    Object.keys(lands).forEach((k) => delete lands[k]);
    Object.keys(labels).forEach((k) => delete labels[k]);
    Object.keys(centroids).forEach((k) => delete centroids[k]);

    const drawCodes = geo.features
      .map((f) => f.properties.ISO2)
      .filter((c) => featureByCode[c]);

    const ordered = [...drawCodes].sort((a, b) => {
      const aa = d3.geoArea(featureByCode[a]);
      const bb = d3.geoArea(featureByCode[b]);
      return bb - aa;
    });

    ordered.forEach((code, i) => {
      const feature = featureByCode[code];
      const d = pathGen(feature);
      if (!d) return;
      const isActive = activeSet.has(code);

      const group = document.createElementNS(NS, "g");
      group.setAttribute("class", "land-group" + (isActive ? "" : " inactive"));

      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "land" + (isActive ? " live" : " cold"));
      path.dataset.code = code;
      path.style.animationDelay = `${intro ? Math.min(i * 28, 500) : 0}ms`;

      if (isActive) {
        path.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect?.(code);
        });
        path.addEventListener("mouseenter", (e) => onPeek?.(code, e));
        path.addEventListener("mousemove", (e) => onPeek?.(code, e, true));
        path.addEventListener("mouseleave", () => onHidePeek?.());
      }

      group.appendChild(path);
      gLand.appendChild(group);
      lands[code] = path;
      requestAnimationFrame(() => path.classList.add("drawn"));

      /* Labels on every Erste market — only 6, so always show */
      if (isActive) {
        const [cx, cy] = centroidOf(code);
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", cx);
        t.setAttribute("y", cy);
        t.setAttribute("class", "code");
        t.textContent = code;
        gCode.appendChild(t);
        labels[code] = t;
      }
    });
  }

  function paint() {
    const list = codes().filter((c) => lands[c]);
    const usingMetric = metricValues != null;
    const empty = !usingMetric && activeThemes.size === 0;
    const vals = list.map((c) =>
      usingMetric ? metricValues[c] : growthIndex(data, c, activeThemes)
    );
    const numeric = vals.filter((v) => v != null && !Number.isNaN(v));
    const lo = numeric.length ? Math.min(...numeric) : 0;
    const hi = numeric.length ? Math.max(...numeric) : 1;

    Object.keys(lands).forEach((c) => {
      const path = lands[c];
      const live = list.includes(c);
      if (!live) {
        path.style.fill = COLORS.cold;
        path.classList.remove("on");
        path.parentNode?.classList.remove("mute");
        return;
      }

      let fill = COLORS.live;
      if (!empty) {
        const raw = usingMetric ? metricValues[c] : growthIndex(data, c, activeThemes);
        if (raw == null) fill = COLORS.live;
        else {
          const t = (raw - lo) / (hi - lo || 1);
          fill = heat(t);
        }
      }
      path.style.fill = fill;
      const isOn = c === active;
      const isMute = active !== null && c !== active;
      path.classList.toggle("on", isOn);
      path.parentNode?.classList.toggle("mute", isMute);
      if (labels[c]) {
        labels[c].classList.toggle("on", isOn);
        labels[c].classList.toggle("mute", isMute);
      }
    });
  }

  function drawLock(code) {
    gLock.replaceChildren();
    const list = codes();
    const vals = list.map((c) => growthIndex(data, c, activeThemes));
    const t =
      (growthIndex(data, code, activeThemes) - Math.min(...vals)) /
      (Math.max(...vals) - Math.min(...vals) || 1);
    const [cx, cy] = centroidOf(code);
    const r = 2.6 + t * 1.4;
    const off = r * 0.58;
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "lock");

    [
      [-off, COLORS.red],
      [off, COLORS.yellow],
    ].forEach(([dx, fill]) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", cx + dx);
      c.setAttribute("cy", cy);
      c.setAttribute("r", r);
      c.setAttribute("fill", fill);
      c.setAttribute("opacity", "0.9");
      c.style.mixBlendMode = "screen";
      g.appendChild(c);
    });

    gLock.appendChild(g);
    requestAnimationFrame(() => g.classList.add("in"));
  }

  function drawOpportunities(code) {
    gSeg.replaceChildren();
    const segs = opportunitiesFor(data, code, activeThemes);
    if (!segs.length) return;

    const [cx, cy] = centroidOf(code);
    const maxS = Math.max(...segs.map((s) => s.s));
    const ring = 7.5 + Math.min(segs.length, 8) * 0.35;

    segs.forEach((seg, i) => {
      const a = -Math.PI / 2 + (i / segs.length) * Math.PI * 2;
      const bx = cx + Math.cos(a) * ring;
      const by = cy + Math.sin(a) * ring * 0.78;
      const r = 1.35 + Math.sqrt(seg.s / maxS) * 1.8;

      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", cx);
      line.setAttribute("y1", cy);
      line.setAttribute("x2", bx);
      line.setAttribute("y2", by);
      line.setAttribute("class", "tether");
      gSeg.appendChild(line);

      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "bub");
      g.dataset.i = String(i);
      g.style.animationDelay = `${i * CONFIG.motion.bubbleStep}ms`;
      g.style.transformOrigin = `${bx}px ${by}px`;

      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", bx);
      c.setAttribute("cy", by);
      c.setAttribute("r", r);
      c.setAttribute("fill", heat(seg.e / 10));

      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", bx);
      t.setAttribute("y", by);
      t.textContent = `${seg.s}%`;

      g.append(c, t);
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        onPick?.(i, g);
      });
      gSeg.appendChild(g);
      requestAnimationFrame(() => g.classList.add("in"));
    });
  }

  function clearOverlays() {
    gLock.replaceChildren();
    gSeg.replaceChildren();
  }

  function setData(next) {
    data = next;
  }

  function setThemes(set) {
    activeThemes = set;
  }

  function setActive(code) {
    active = code;
  }

  function setMetricValues(mapOrNull) {
    metricValues = mapOrNull;
  }

  function bubbleAt(i) {
    return gSeg.querySelector(`.bub[data-i="${i}"]`);
  }

  function highlightBubbles(picked) {
    gSeg.querySelectorAll(".bub").forEach((b) => {
      const j = +b.dataset.i;
      b.classList.toggle("sel", j === picked);
      b.classList.toggle("off", picked !== null && j !== picked);
    });
  }

  function hasShape(code) {
    return Boolean(featureByCode[code] && lands[code]);
  }

  return {
    setGeo,
    build,
    paint,
    drawLock,
    drawOpportunities,
    clearOverlays,
    setData,
    setThemes,
    setActive,
    setMetricValues,
    bubbleAt,
    highlightBubbles,
    hasShape,
    heat,
    get svg() {
      return svg;
    },
  };
}
