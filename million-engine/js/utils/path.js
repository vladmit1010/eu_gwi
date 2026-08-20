/**
 * Catmull-Rom → cubic Bézier path so country fills look solid, not faceted.
 * Closed rings only.
 */
function catmullRomToBezier(points, tension = 0.55) {
  const n = points.length;
  if (n < 3) return points.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ") + " Z";

  const pts = points.map(([x, y]) => [x, y]);
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2;

    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  return d + " Z";
}

/** Optional densify before smoothing for short rings */
export function densify(ring, every = 1) {
  if (every <= 1) return ring;
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    out.push(a);
    for (let s = 1; s < every; s++) {
      const t = s / every;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export function smoothPath(projectedRing, { tension = 0.72, densifyBy = 2 } = {}) {
  const dense = densify(projectedRing, densifyBy);
  return catmullRomToBezier(dense, tension);
}
