/**
 * Excel acquisition model (from formeln.txt / Table38).
 *
 * Columns (rows 8–15 = AT…RS):
 *   C  Target                  INPUT
 *   D  Share of total cards    = Target / $C$16
 *   E  Market Share            INPUT
 *   F  Market Potential        = Target / MarketShare
 *   G  Max. Acquisition        = Potential * $C$19   (Acquisition potential)
 *   H  Expected Acquisition    = Max * MarketShare
 *   J…R  PP1…PP9 growth %      INPUT (9 rates)
 *   S    PP1 acq               = H
 *   T    PP2 acq               = S * (1 + J)
 *   U…AB PP3…PP10 acq          = prev * (1 + next growth)
 *
 * Readiness (row 25–32 → 37–44): Yes → full year vol, Partially → half, else 0
 * Proposition weights (51–72): Yes props get equal share of strength budget
 * Hobby blocks (78+): readinessVol[year] * propWeight[hobby]
 * Final check (156+): sum(6 hobbies) == readiness year vol
 */

export function shareOfTotal(target, sumTargets) {
  if (!sumTargets) return 0;
  return target / sumTargets;
}

export function marketPotential(target, marketSharePct) {
  const ms = Math.max(Number(marketSharePct) || 0.01, 0.01) / 100;
  return Math.round(Number(target) / ms);
}

export function maxAcquisition(potential, acquisitionRate) {
  return Math.round(Number(potential) * Number(acquisitionRate));
}

/** Expected = Max × MarketShare (= Target × rate) */
export function expectedAcquisition(maxAcq, marketSharePct) {
  return Math.round(Number(maxAcq) * (Math.max(Number(marketSharePct), 0.01) / 100));
}

/**
 * PP acquisition volumes incl. growth (S…AB).
 * growthPcts: percent points, Excel J…R (up to 9 values for 10 years).
 */
export function acquisitionSeries(expected, growthPcts = []) {
  const out = [Math.round(Number(expected) || 0)];
  let v = out[0];
  const rates = (growthPcts || []).slice(0, 9);
  for (const g of rates) {
    v = Math.round(v * (1 + Number(g) / 100));
    out.push(v);
  }
  while (out.length < 10) {
    out.push(out[out.length - 1] || 0);
  }
  return out.slice(0, 10);
}

/** Readiness gate: Yes / Partially / No */
export function applyReadiness(volume, readiness) {
  const r = String(readiness || "").trim().toLowerCase();
  if (r === "yes") return volume;
  if (r === "partially") return volume / 2;
  return 0;
}

/**
 * Normalize proposition strengths among Yes props for one country.
 * strengths: [{ id, active: boolean, weight: number }]
 * returns { [id]: share } summing to 1 among active, else {}.
 */
export function propositionShares(strengths = []) {
  const active = strengths.filter((s) => s.active);
  const budget = active.reduce((s, x) => s + (Number(x.weight) || 0), 0);
  const out = {};
  if (!active.length || budget <= 0) return out;
  for (const s of active) out[s.id] = (Number(s.weight) || 0) / budget;
  return out;
}

export function hobbyYearVolume(readinessVol, propShare) {
  return readinessVol * (Number(propShare) || 0);
}
