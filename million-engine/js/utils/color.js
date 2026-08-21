const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r) =>
  "#" + r.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function mix(a, b, t) {
  return rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));
}

/**
 * Brightness scale (intuitive for demos):
 * darker/cooler = lower Interest · brighter/deeper orange = higher.
 */
export function createHeat(colors) {
  const stops = [colors.heat0, colors.heat1, colors.heat2, colors.heat3, colors.heat4];
  return (t) => {
    t = Math.max(0, Math.min(1, t));
    const n = stops.length - 1;
    const x = t * n;
    const i = Math.min(n - 1, Math.floor(x));
    return mix(stops[i], stops[i + 1], x - i);
  };
}

/** Fallback dark palette (also mirrored in :root CSS vars). */
export const COLORS = {
  red: "#EB001B",
  yellow: "#F79E1B",
  land: "#1C1F27",
  landMid: "#2A2E38",
  landHi: "#3A3532",
  cold: "#12141A",
  live: "#3A3D48",
  heat0: "#1B1D24",
  heat1: "#3A322C",
  heat2: "#8F4A16",
  heat3: "#FF5F00",
  heat4: "#FFC857",
};

function cssVar(name, fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Live theme colours from CSS variables. */
export function themeColors() {
  return {
    red: COLORS.red,
    yellow: COLORS.yellow,
    cold: cssVar("--map-cold", COLORS.cold),
    live: cssVar("--map-live", COLORS.live),
    heat0: cssVar("--heat-0", COLORS.heat0),
    heat1: cssVar("--heat-1", COLORS.heat1),
    heat2: cssVar("--heat-2", COLORS.heat2),
    heat3: cssVar("--heat-3", COLORS.heat3),
    heat4: cssVar("--heat-4", COLORS.heat4),
  };
}

export function createThemeHeat() {
  return createHeat(themeColors());
}
