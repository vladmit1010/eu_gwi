/** Mercator helpers + auto viewBox from active markets */

export function merc([lng, lat]) {
  return [lng, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * (180 / Math.PI)];
}

export function computeProjection(rings, { vw = 100, pad = 5.5 } = {}) {
  const pts = rings.flat().map(merc);
  const x0 = Math.min(...pts.map((p) => p[0]));
  const x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  const spanX = x1 - x0 || 1;
  const spanY = y1 - y0 || 1;
  const vh = Math.max(48, vw * (spanY / spanX));

  const project = (pt) => {
    const [mx, my] = merc(pt);
    return [
      pad + ((mx - x0) / spanX) * (vw - 2 * pad),
      pad + ((y1 - my) / spanY) * (vh - 2 * pad),
    ];
  };

  return { project, vw, vh };
}

export function ringCenter(ring, project) {
  const pts = ring.map(project);
  return [
    pts.reduce((a, p) => a + p[0], 0) / pts.length,
    pts.reduce((a, p) => a + p[1], 0) / pts.length,
  ];
}
