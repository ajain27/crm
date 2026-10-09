// Formatting shared by the comps window, the deal note and the Find Comps
// tab: the comp rules applied, what they excluded, and the note itself.

const money = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";

const num = (n, suffix = "") =>
  typeof n === "number" && Number.isFinite(n)
    ? `${n.toLocaleString("en-US")}${suffix}`
    : "—";

export function pricePerSqft(comp) {
  return comp.price > 0 && comp.sqft > 0 ? comp.price / comp.sqft : null;
}

const UNKNOWN_LABELS = {
  beds: "beds",
  baths: "baths",
  yearBuilt: "year built",
};

// "Sold within 0.5 mi in the last 90 days · 3 bd · 1 ba · built 1967–1977"
export function compsCriteriaText(result) {
  const c = result.criteria;
  if (!c) return "";
  const parts = [
    `Sold within ${c.radiusMiles} mi in the last ${c.soldWithinDays} days`,
    c.beds ? `${c.beds} bd` : null,
    c.baths ? `${c.baths} ba` : null,
    c.yearBuiltFrom ? `built ${c.yearBuiltFrom}–${c.yearBuiltTo}` : null,
  ].filter(Boolean);
  const unknown = (c.unknown || []).map((f) => UNKNOWN_LABELS[f] || f);
  return (
    parts.join(" · ") +
    (unknown.length
      ? ` (the property's ${unknown.join(", ")} couldn't be found, so not applied)`
      : "")
  );
}

const EXCLUDED_LABELS = {
  distance: "too far",
  soldDate: "sold too long ago",
  beds: "different beds",
  baths: "different baths",
  yearBuilt: "built outside the range",
  propertyType: "different property type",
};

// "30 homes sold within 1 mi in the last 6 months; 3 meet every rule
// (others: 4 too far, …). 2 of the comps shown fall outside the rules."
export function compsStatsText(result) {
  const s = result.stats;
  const c = result.criteria || {};
  if (!s) return "";
  const area = c.searchRadiusMiles
    ? ` within ${c.searchRadiusMiles} mi in the last ${Math.round(c.searchDays / 30)} months`
    : " nearby";
  const excluded = Object.entries(s.excluded || {})
    .filter(([, count]) => count > 0)
    .map(([rule, count]) => `${count} ${EXCLUDED_LABELS[rule] || rule}`);
  const removed = s.removedByAi?.length
    ? ` AI removed ${s.removedByAi.length} as poor comps.`
    : "";
  const outside = s.outsideRules
    ? ` ${s.outsideRules} of the comps shown ${s.outsideRules === 1 ? "falls" : "fall"} outside the rules.`
    : "";
  return (
    `${s.nearbySales} home${s.nearbySales === 1 ? "" : "s"} sold${area}; ` +
    `${s.matched} ${s.matched === 1 ? "meets" : "meet"} every rule` +
    (excluded.length ? ` (others: ${excluded.join(", ")})` : "") +
    `.${outside}${removed}`
  );
}

export function compDetailsText(comp) {
  return [
    `${num(comp.beds)} bd/${num(comp.baths)} ba` +
      (comp.differs ? ` (${comp.differs})` : ""),
    comp.sqft ? num(comp.sqft, " sq ft") : null,
    comp.yearBuilt ? `built ${comp.yearBuilt}` : null,
    comp.soldDate ? `sold ${comp.soldDate}` : null,
    typeof comp.distance === "number" ? `${comp.distance} mi away` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatCompsNote(result, date = new Date()) {
  const p = result.property || {};
  const lines = [
    `Comps (${date.toLocaleDateString("en-US")}):`,
    `ARV estimate: ${money(result.arvEstimate)} · Rent estimate: ${money(result.rentEstimate)}/mo`,
    `Property: ${num(p.beds)} bd · ${num(p.baths)} ba · ${num(p.sqft, " sq ft")} · built ${p.yearBuilt ?? "—"} · tax ${money(p.annualTax)}/yr`,
  ];
  if (result.criteria) lines.push(`Rules: ${compsCriteriaText(result)}`);
  if (result.stats) lines.push(compsStatsText(result));
  (result.topComps || []).forEach((comp, i) => {
    const ppsf = pricePerSqft(comp);
    lines.push(
      `${i + 1}. ${comp.address} — ${money(comp.price)}` +
        `${ppsf ? ` (${money(ppsf)}/sq ft)` : ""}` +
        ` · ${compDetailsText(comp)}` +
        `${comp.url ? ` · ${comp.url}` : ""}`,
    );
  });
  if (result.summary) lines.push(result.summary);
  lines.push(
    result.method === "claude"
      ? "Comps reviewed and picked by Claude."
      : "Comps ordered by distance, then most recent sale.",
  );
  const sourceLinks = Object.entries(result.listingUrls || {})
    .filter(([, url]) => url)
    .map(([, url]) => url);
  if (sourceLinks.length) lines.push(`Sources: ${sourceLinks.join(" · ")}`);
  return lines.join("\n");
}

export { requestComps } from "../../../../../services/compsService";
