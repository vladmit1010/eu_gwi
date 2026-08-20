const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r) =>
  "#" + r.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function mix(a, b, t) {
  return rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));
}

/**
 * Heat scale: restrained greys, then Mastercard red → yellow.
 * Knee keeps most of the map calm so hotspots read clearly.
 */
export function createHeat(colors, knee = 0.55) {
  return (t) => {
    t = Math.max(0, Math.min(1, t));
    if (t < knee) return mix(colors.land, colors.landHi, t / knee);
    const u = (t - knee) / (1 - knee);
    return u < 0.5
      ? mix(colors.landHi, colors.red, u / 0.5)
      : mix(colors.red, colors.yellow, (u - 0.5) / 0.5);
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
};
