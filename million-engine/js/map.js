import { createThemeHeat, themeColors, COLORS } from "./utils/color.js";
import { opportunitiesFor, growthIndex } from "./model.js";
import { CONFIG } from "./config.js";

/** Local UMD build (js/vendor/d3.min.js) — avoids CDN blocking the whole app. */
const d3 = globalThis.d3;
if (!d3) {
  throw new Error("d3 missing — load js/vendor/d3.min.js before app.js");
}

const NS = "http://www.w3.org/2000/svg";
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
      <stop offset="0%" stop-color="rgba(91,163,224,0.16)"/>
      <stop offset="55%" stop-color="rgba(244,247,251,0.5)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
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
  const gPies = document.createElementNS(NS, "g");
  gPies.setAttribute("class", "dist-pies");

  svg.replaceChildren();
  svg.append(defs, gRoot);
  gRoot.append(ocean, gLand, gCode, gLock, gSeg, gPies);

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
    Object.keys(featureByCode).forEach((k) => delete featureByCode[k]);
    if (!geo?.features) return;
    for (const f of geo.features) {
      const iso = f?.properties?.ISO2;
      if (iso) featureByCode[iso] = f;
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
    if (!geo?.features?.length) {
      console.warn("Map build skipped — geography not loaded");
      return false;
    }
    const activeList = codes();
    if (!activeList.length) {
      console.warn("Map build skipped — no Erste markets match geo ISO codes", {
        markets: Object.keys(data?.markets || {}),
        geoSample: geo.features.slice(0, 3).map((f) => f.properties?.ISO2),
      });
      return false;
    }

    const activeSet = new Set(activeList);
    const focusFeatures = activeList.map((c) => featureByCode[c]).filter(Boolean);
    /* Zoom to Erste markets — neighbours still drawn where they fall in frame */
    fitProjection(focusFeatures);

    gLand.replaceChildren();
    gCode.replaceChildren();
    gLock.replaceChildren();
    gSeg.replaceChildren();
    gPies.replaceChildren();
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
      let d;
      try {
        d = pathGen(feature);
      } catch (err) {
        console.warn("Skip bad feature", code, err);
        return;
      }
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
    return true;
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

    const palette = themeColors();
    const heat = createThemeHeat();

    Object.keys(lands).forEach((c) => {
      const path = lands[c];
      const live = list.includes(c);
      if (!live) {
        path.style.fill = palette.cold;
        path.classList.remove("on");
        path.parentNode?.classList.remove("mute");
        return;
      }

      let fill = palette.live;
      if (!empty) {
        const raw = usingMetric ? metricValues[c] : growthIndex(data, c, activeThemes);
        if (raw == null) fill = palette.live;
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
      c.setAttribute("fill", createThemeHeat()(seg.e / 10));

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

  function clearDistributionPies() {
    gPies.replaceChildren();
  }

  /** Donut pies on country centroids — prettier distribution rings. */
  function drawDistributionPies(byCode, { onHover, onLeave } = {}) {
    gPies.replaceChildren();
    if (!byCode) return;

    if (!defs.querySelector("#pieSoft")) {
      const f = document.createElementNS(NS, "filter");
      f.setAttribute("id", "pieSoft");
      f.setAttribute("x", "-40%");
      f.setAttribute("y", "-40%");
      f.setAttribute("width", "180%");
      f.setAttribute("height", "180%");
      f.innerHTML = `
        <feDropShadow dx="0" dy="0.35" stdDeviation="0.55" flood-color="#000" flood-opacity="0.45"/>
      `;
      defs.appendChild(f);
    }

    const R = 6.8;
    const R_IN = 3.1;
    const GAP = 0.06; // radians between slices

    Object.entries(byCode).forEach(([code, slices]) => {
      if (!slices?.length || !featureByCode[code]) return;
      const [cx, cy] = centroidOf(code);
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "dist-pie");
      g.dataset.code = code;
      g.setAttribute("filter", "url(#pieSoft)");

      const halo = document.createElementNS(NS, "circle");
      halo.setAttribute("class", "dist-pie-halo");
      halo.setAttribute("cx", cx);
      halo.setAttribute("cy", cy);
      halo.setAttribute("r", R + 0.55);
      g.appendChild(halo);

      const total = slices.reduce((a, s) => a + (s.share || 0), 0) || 1;
      let angle = -Math.PI / 2;
      slices.forEach((s) => {
        const sweep = ((s.share || 0) / total) * Math.PI * 2;
        if (sweep <= 0.001) return;
        const a0 = angle + GAP / 2;
        const a1 = angle + sweep - GAP / 2;
        if (a1 > a0) {
          const path = document.createElementNS(NS, "path");
          path.setAttribute("class", "dist-pie-slice");
          path.setAttribute("fill", s.color || "#ff5f00");
          path.setAttribute("d", donutSlice(cx, cy, R, R_IN, a0, a1));
          path.setAttribute("pointer-events", "none");
          g.appendChild(path);
        }
        angle += sweep;
      });

      const core = document.createElementNS(NS, "circle");
      core.setAttribute("class", "dist-pie-core");
      core.setAttribute("cx", cx);
      core.setAttribute("cy", cy);
      core.setAttribute("r", R_IN - 0.15);
      core.setAttribute("pointer-events", "none");
      g.appendChild(core);

      const hit = document.createElementNS(NS, "circle");
      hit.setAttribute("class", "dist-pie-hit");
      hit.setAttribute("cx", cx);
      hit.setAttribute("cy", cy);
      hit.setAttribute("r", R + 1.2);
      hit.addEventListener("mouseenter", (e) => {
        e.stopPropagation();
        g.classList.add("is-hot");
        onHover?.(code, slices, { cx, cy, clientX: e.clientX, clientY: e.clientY });
      });
      hit.addEventListener("mouseleave", () => {
        g.classList.remove("is-hot");
        onLeave?.(code);
      });
      hit.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect?.(code);
      });
      g.appendChild(hit);

      gPies.appendChild(g);
    });
  }

  function donutSlice(cx, cy, rOut, rIn, a0, a1) {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + rOut * Math.cos(a0);
    const y0 = cy + rOut * Math.sin(a0);
    const x1 = cx + rOut * Math.cos(a1);
    const y1 = cy + rOut * Math.sin(a1);
    const x2 = cx + rIn * Math.cos(a1);
    const y2 = cy + rIn * Math.sin(a1);
    const x3 = cx + rIn * Math.cos(a0);
    const y3 = cy + rIn * Math.sin(a0);
    return [
      `M ${x0} ${y0}`,
      `A ${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3}`,
      "Z",
    ].join(" ");
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

  /** Refit projection to one country (L2 inset) or all Erste markets (L1). */
  function focusCountry(code) {
    const live = codes();
    const features =
      code && featureByCode[code]
        ? [featureByCode[code]]
        : live.map((c) => featureByCode[c]).filter(Boolean);
    if (!features.length) return;
    fitProjection(features);
    Object.keys(centroids).forEach((k) => delete centroids[k]);
    Object.keys(lands).forEach((c) => {
      const f = featureByCode[c];
      if (!f || !lands[c]) return;
      try {
        const d = pathGen(f);
        if (d) lands[c].setAttribute("d", d);
      } catch {
        /* skip */
      }
      if (labels[c]) {
        const [cx, cy] = centroidOf(c);
        labels[c].setAttribute("x", cx);
        labels[c].setAttribute("y", cy);
      }
    });
    paint();
  }

  return {
    setGeo,
    build,
    paint,
    drawLock,
    drawOpportunities,
    clearOverlays,
    clearDistributionPies,
    drawDistributionPies,
    setData,
    setThemes,
    setActive,
    setMetricValues,
    bubbleAt,
    highlightBubbles,
    hasShape,
    focusCountry,
    centroidOf,
    get svg() {
      return svg;
    },
  };
}
