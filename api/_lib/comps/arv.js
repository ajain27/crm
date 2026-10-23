// Step 5: ARV, worked out in code from the final comps.

import { isNum } from "./rules.js";

// The value three quarters of the way up (interpolated). Comps mix
// renovated and as-is sales; ARV is the after-repair value, so it sits
// toward the top of the range rather than the middle.
function upperQuartile(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const at = (sorted.length - 1) * 0.75;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

const fmtMoney = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Price per sq ft when enough comps have a size (at least 2, and at least
// half of them) — one sized comp shouldn't set the ARV alone. Otherwise
// the sale prices. Either way, the upper quartile.
export function estimateArv(comps, subjectSqft) {
  if (comps.length === 0) return { arvEstimate: null, arvBasis: null };
  const withSize = comps.filter((c) => isNum(c.sqft));
  const enoughSized =
    withSize.length >= 2 && withSize.length * 2 >= comps.length;
  if (isNum(subjectSqft) && enoughSized) {
    const ppsf = upperQuartile(withSize.map((c) => c.price / c.sqft));
    return {
      arvEstimate: Math.round(ppsf * subjectSqft),
      arvBasis: `ARV = upper-quartile ${fmtMoney(ppsf)}/sq ft across ${plural(withSize.length, "comp")} × ${subjectSqft.toLocaleString("en-US")} sq ft.`,
    };
  }
  const why = !isNum(subjectSqft)
    ? " (the property's size wasn't available)"
    : " (too few comps had a size for price per sq ft)";
  return {
    arvEstimate: Math.round(upperQuartile(comps.map((c) => c.price))),
    arvBasis: `ARV = upper-quartile sale price of ${plural(comps.length, "comp")}${why}.`,
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
