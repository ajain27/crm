// Step 5: ARV, worked out in code from the final comps.

import { COMP_RULES, isNum } from "./rules.js";

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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Price per sq ft when enough comps have a size (at least 2, and at least
// half of them) — one sized comp shouldn't set the ARV alone. Otherwise
// the sale prices. Either way the upper quartile, except:
//   - a property much bigger than the comps (over the size tolerance) gets
//     the median $/sq ft, as bigger homes sell for less per sq ft;
//   - the ARV never goes more than 10% over the highest comp sale, so a
//     smaller home's $/sq ft stretched over a big one can't run away. When
//     some comps are about the property's size, only their sales set the
//     cap. When none are (see poorSizeMatch) and `hasEstimates` (a
//     Zestimate or Redfin Estimate to average with — see blendArv),
//     there's no cap: sales of homes half its size say little about its
//     price.
export function estimateArv(comps, subjectSqft, { hasEstimates = false } = {}) {
  if (comps.length === 0) return { arvEstimate: null, arvBasis: null };
  const withSize = comps.filter((c) => isNum(c.sqft));
  const enoughSized =
    withSize.length >= 2 && withSize.length * 2 >= comps.length;
  let arv;
  let basis;
  if (isNum(subjectSqft) && enoughSized) {
    const typicalSqft = median(withSize.map((c) => c.sqft));
    const bigger = subjectSqft / typicalSqft - 1;
    const ppsfs = withSize.map((c) => c.price / c.sqft);
    const sized = plural(withSize.length, "comp");
    const size = `${subjectSqft.toLocaleString("en-US")} sq ft`;
    if (bigger > COMP_RULES.sqftTolerance) {
      const ppsf = median(ppsfs);
      arv = ppsf * subjectSqft;
      basis = `ARV = median ${fmtMoney(ppsf)}/sq ft across ${sized} × ${size} — the property is ${Math.round(bigger * 100)}% bigger than the typical comp (${Math.round(typicalSqft).toLocaleString("en-US")} sq ft), and bigger homes sell for less per sq ft.`;
    } else {
      const ppsf = upperQuartile(ppsfs);
      arv = ppsf * subjectSqft;
      basis = `ARV = upper-quartile ${fmtMoney(ppsf)}/sq ft across ${sized} × ${size}.`;
    }
  } else {
    const why = !isNum(subjectSqft)
      ? " (the property's size wasn't available)"
      : " (too few comps had a size for price per sq ft)";
    arv = upperQuartile(comps.map((c) => c.price));
    basis = `ARV = upper-quartile sale price of ${plural(comps.length, "comp")}${why}.`;
  }

  const sameSize = isNum(subjectSqft)
    ? comps.filter((c) => sizeMatches(c, subjectSqft))
    : [];
  const capComps = sameSize.length
    ? sameSize
    : hasEstimates && poorSizeMatch(comps, subjectSqft)
      ? []
      : comps;
  const topSale = Math.max(...capComps.map((c) => c.price).filter(isNum));
  const cap = Number.isFinite(topSale)
    ? topSale * (1 + COMP_RULES.arvOverTopSale)
    : null;
  if (cap !== null && arv > cap) {
    return {
      arvEstimate: Math.round(cap),
      arvBasis: `${basis} That came to ${fmtMoney(arv)}, more than ${Math.round(COMP_RULES.arvOverTopSale * 100)}% over the highest ${sameSize.length ? "sale among comps about its size" : "comp sale"} (${fmtMoney(topSale)}), so the ARV is capped at ${fmtMoney(cap)}.`,
    };
  }
  return { arvEstimate: Math.round(arv), arvBasis: basis };
}

// Whether a comp is within the size rule of the property (its size
// known).
export function sizeMatches(comp, subjectSqft) {
  return (
    isNum(comp.sqft) &&
    Math.abs(comp.sqft - subjectSqft) / subjectSqft <= COMP_RULES.sqftTolerance
  );
}

// Whether the comps aren't the property's size: at least 2 have a known
// size and none of those is within the size rule.
export function poorSizeMatch(comps, subjectSqft) {
  if (!isNum(subjectSqft)) return false;
  const sized = comps.filter((c) => isNum(c.sqft));
  return sized.length >= 2 && !sized.some((c) => sizeMatches(c, subjectSqft));
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
// `poorSizeMatch` is set when the comps aren't the property's size (see
// poorSizeMatch): their ARV is then averaged with the estimates, as in a
// non-disclosure state.
export function blendArv({
  compsArv,
  estimates,
  state,
  poorSizeMatch = false,
}) {
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
  if (poorSizeMatch && isNum(compsArv) && isNum(average)) {
    return {
      arvEstimate: Math.round((compsArv + average) / 2),
      note: `None of the comps is near the property's size, so the comps can be off: the ARV is the average of the comps (${fmtMoney(compsArv)}) and the ${estimateName} (${fmtMoney(average)}).`,
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
