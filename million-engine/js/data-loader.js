import { normalizeData } from "./model.js";

/** Load markets.json (or embedded fallback). */
export async function loadInitialData(fallback) {
  try {
    const res = await fetch("./data/markets.json", { cache: "no-store" });
    if (res.ok) {
      const raw = await res.json();
      if (raw.markets && raw.themes) return normalizeData(raw);
    }
  } catch {
    /* use fallback */
  }
  return normalizeData(fallback);
}
