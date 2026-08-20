const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r) =>
  "#" + r.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function mix(a, b, t) {
  return rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));
}

/**
 * Brightness scale (intuitive for demos):
 * darker = lower Interest · brighter orange = higher.
 * Single warm hue family — no red→yellow “which is more?” confusion.
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

export const COLORS = {
  red: "#EB001B",
  yellow: "#F79E1B",
  land: "#1C1F27",
  landMid: "#2A2E38",
  landHi: "#3A3532",
  /** Inactive neighbours — flat grey context */
  cold: "#12141A",
  /** Erste markets at rest (no lens heat yet) */
  live: "#3A3D48",
  /** Map Interest ramp — dark → bright */
  heat0: "#1B1D24",
  heat1: "#3A322C",
  heat2: "#8F4A16",
  heat3: "#FF5F00",
  heat4: "#FFC857",
};
