// The comp rules and helpers shared by every step.

export const COMP_RULES = {
  radiusMiles: 0.5,
  soldWithinDays: 90,
  yearBuiltTolerance: 5,
  maxComps: 5,
  // Sales are gathered this far out so there are always enough to fill 5
  // comps; ones outside the rules are labeled with how they differ.
  searchRadiusMiles: 1,
  searchDays: 180,
  // When that finds no sales at all, one more mile and 6 more months.
  wideSearchRadiusMiles: 2,
  wideSearchDays: 365,
};

// The area sales are gathered from: the usual one, and the wider one used
// when the usual one has no sales.
export const SEARCH = {
  miles: COMP_RULES.searchRadiusMiles,
  days: COMP_RULES.searchDays,
};
export const WIDE_SEARCH = {
  miles: COMP_RULES.wideSearchRadiusMiles,
  days: COMP_RULES.wideSearchDays,
};

export const isNum = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

export function distanceMiles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export function errorWithStatus(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
