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

// States that don't make sale prices public: the "sold" prices sites show
// there are often missing, list prices or estimates, so comps alone can be
// well off.
export const NON_DISCLOSURE_STATES = {
  AK: "Alaska",
  ID: "Idaho",
  KS: "Kansas",
  LA: "Louisiana",
  MS: "Mississippi",
  MT: "Montana",
  NM: "New Mexico",
  ND: "North Dakota",
  TX: "Texas",
  UT: "Utah",
  WY: "Wyoming",
};

// "11916 Canoe Rd, Frisco, TX 75035" → "TX" (the last two-letter part
// after the street), or null.
export function stateFromAddress(address) {
  const parts = String(address || "")
    .split(",")
    .slice(1)
    .reverse();
  for (const part of parts) {
    const code = part.trim().match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
    if (code) return code[1].toUpperCase();
  }
  return null;
}

// The Zestimate and Redfin Estimate, and their average (either alone when
// only one site has one).
export function valueEstimates(zestimate, redfinEstimate) {
  const present = [zestimate, redfinEstimate].filter(isNum);
  return {
    zestimate: isNum(zestimate) ? zestimate : null,
    redfinEstimate: isNum(redfinEstimate) ? redfinEstimate : null,
    average: present.length
      ? Math.round(present.reduce((a, b) => a + b, 0) / present.length)
      : null,
  };
}

// The ARV given the comps' ARV and the sites' estimates. In a
// non-disclosure state it's the average of the two (either alone when the
// other is missing); elsewhere it's the comps' ARV, with how far it is
// from the estimates noted.
export function blendArv({ compsArv, estimates, state }) {
  const stateName = NON_DISCLOSURE_STATES[state] || null;
  const average = estimates?.average ?? null;
  const names = [
    isNum(estimates?.zestimate) && "Zestimate",
    isNum(estimates?.redfinEstimate) && "Redfin Estimate",
  ].filter(Boolean);
  const estimateName =
    names.length === 2 ? "Zestimate/Redfin Estimate average" : names[0];

  if (stateName && isNum(average)) {
    if (!isNum(compsArv)) {
      return {
        arvEstimate: average,
        note: `${stateName} doesn't publish sale prices and there were no comps, so the ARV is the ${estimateName} (${fmtMoney(average)}).`,
      };
    }
    const arvEstimate = Math.round((compsArv + average) / 2);
    return {
      arvEstimate,
      note: `${stateName} doesn't publish sale prices, so comps can be off: the ARV is the average of the comps (${fmtMoney(compsArv)}) and the ${estimateName} (${fmtMoney(average)}).`,
    };
  }
  if (stateName) {
    return {
      arvEstimate: compsArv,
      note: `${stateName} doesn't publish sale prices, so comps can be off — and neither Zillow nor Redfin had an estimate to check against.`,
    };
  }
  if (isNum(compsArv) && isNum(average)) {
    const gap = Math.round(((compsArv - average) / average) * 100);
    return {
      arvEstimate: compsArv,
      note:
        Math.abs(gap) >= 10
          ? `The comps ARV is ${Math.abs(gap)}% ${gap < 0 ? "under" : "over"} the ${estimateName} (${fmtMoney(average)}).`
          : null,
    };
  }
  return { arvEstimate: compsArv, note: null };
}
