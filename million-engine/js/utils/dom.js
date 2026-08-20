export function $(id) {
  return document.getElementById(id);
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function formatInt(n) {
  return Math.round(n).toLocaleString("en-US");
}

/** Compact people count for chips / dense UI */
export function formatPeople(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Math.round(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  return v.toLocaleString("en-US");
}

export function countTo(el, to, dec = 0, dur = 600, suffix = "") {
  const from = parseFloat(el.dataset.v || "0");
  const t0 = performance.now();
  el.dataset.v = String(to);
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    const v = from + (to - from) * e;
    el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
