export function $(id) {
  return document.getElementById(id);
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
