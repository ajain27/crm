// Step 5: ARV, worked out in code from the final comps.

import { isNum } from "./rules.js";

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const fmtMoney = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Price per sq ft when enough comps have a size (at least 2, and at least
// half of them) — one sized comp shouldn't set the ARV alone. Otherwise
// the median sale price.
export function estimateArv(comps, subjectSqft) {
  if (comps.length === 0) return { arvEstimate: null, arvBasis: null };
  const withSize = comps.filter((c) => isNum(c.sqft));
  const enoughSized =
    withSize.length >= 2 && withSize.length * 2 >= comps.length;
  if (isNum(subjectSqft) && enoughSized) {
    const ppsf = median(withSize.map((c) => c.price / c.sqft));
    return {
      arvEstimate: Math.round(ppsf * subjectSqft),
      arvBasis: `ARV = median ${fmtMoney(ppsf)}/sq ft across ${plural(withSize.length, "comp")} × ${subjectSqft.toLocaleString("en-US")} sq ft.`,
    };
  }
  const why = !isNum(subjectSqft)
    ? " (the property's size wasn't available)"
    : " (too few comps had a size for price per sq ft)";
  return {
    arvEstimate: Math.round(median(comps.map((c) => c.price))),
    arvBasis: `ARV = median sale price of ${plural(comps.length, "comp")}${why}.`,
  };
}

export function ruleReason(comp) {
  return [
    `${comp.distance} mi away`,
    comp.soldDate ? `sold ${comp.soldDate}` : null,
    isNum(comp.yearBuilt) ? `built ${comp.yearBuilt}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}
