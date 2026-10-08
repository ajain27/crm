// The note Run comps adds to a deal: property facts, ARV / rent estimate
// and the top comps with links, as plain text for the deal's notes.

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

export function formatCompsNote(result, date = new Date()) {
  const p = result.property || {};
  const lines = [
    `Comps (${date.toLocaleDateString("en-US")}):`,
    `ARV estimate: ${money(result.arvEstimate)} · Rent estimate: ${money(result.rentEstimate)}/mo`,
    `Property: ${num(p.beds)} bd · ${num(p.baths)} ba · ${num(p.sqft, " sq ft")} · built ${p.yearBuilt ?? "—"} · tax ${money(p.annualTax)}/yr`,
  ];
  (result.topComps || []).forEach((comp, i) => {
    const ppsf = pricePerSqft(comp);
    lines.push(
      `${i + 1}. ${comp.address} — ${money(comp.price)}` +
        `${ppsf ? ` (${money(ppsf)}/sq ft)` : ""}` +
        ` · ${num(comp.beds)} bd/${num(comp.baths)} ba · ${num(comp.sqft, " sq ft")}` +
        `${comp.soldDate ? ` · sold ${comp.soldDate}` : ""}` +
        ` · ${comp.source}${comp.url ? `: ${comp.url}` : ""}`,
    );
  });
  if (result.summary) lines.push(result.summary);
  const sourceLinks = Object.entries(result.listingUrls || {})
    .filter(([, url]) => url)
    .map(([, url]) => url);
  if (sourceLinks.length) lines.push(`Sources: ${sourceLinks.join(" · ")}`);
  return lines.join("\n");
}

export { requestComps } from "../../../../../services/compsService";
