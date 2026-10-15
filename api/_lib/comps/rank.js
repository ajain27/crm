// Step 3: every nearby sale ranked against the comp rules.

import { COMP_RULES, distanceMiles, isNum } from "./rules.js";
import { highwayBetween } from "./highways.js";

// Broad type buckets so "Single Family Residential" matches "Single Family".
function typeBucket(type) {
  const t = String(type || "").toLowerCase();
  if (!t) return null;
  if (/condo|co-?op|apartment/.test(t)) return "condo";
  if (/town/.test(t)) return "townhouse";
  if (/multi|duplex|triplex|fourplex|2-4/.test(t)) return "multi";
  if (/single|house|residential|detached/.test(t)) return "single";
  return t;
}

const streetKey = (s) =>
  String(s || "")
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(dateText, now) {
  const time = Date.parse(dateText || "");
  return Number.isNaN(time) ? null : Math.max(0, (now - time) / DAY_MS);
}

const TYPE_LABELS = {
  single: "single family",
  condo: "condo",
  townhouse: "townhouse",
  multi: "multi-family",
};

const signed = (n) => `${n > 0 ? "+" : "−"}${Math.abs(n)}`;

// How a sale differs from the comp rules, as [rule, label] pairs; none
// means it meets every rule. Rules whose subject value is unknown aren't
// checked.
function ruleMisses(sale, subject, distance, now) {
  const misses = [];
  if (distance > COMP_RULES.radiusMiles) {
    misses.push(["distance", `${distance.toFixed(2)} mi away`]);
  }
  const age = daysAgo(sale.soldDate, now);
  if (!sale.recent && (age === null || age > COMP_RULES.soldWithinDays)) {
    misses.push([
      "soldDate",
      age === null
        ? "sold 3–6 months ago"
        : `sold ${Math.round(age / 30.4)} months ago`,
    ]);
  }
  if (isNum(subject.beds) && sale.beds !== subject.beds) {
    misses.push([
      "beds",
      isNum(sale.beds)
        ? `${signed(sale.beds - subject.beds)} bed`
        : "beds unknown",
    ]);
  }
  if (isNum(subject.baths) && sale.baths !== subject.baths) {
    misses.push([
      "baths",
      isNum(sale.baths)
        ? `${signed(sale.baths - subject.baths)} bath`
        : "baths unknown",
    ]);
  }
  if (
    isNum(subject.yearBuilt) &&
    !(
      isNum(sale.yearBuilt) &&
      Math.abs(sale.yearBuilt - subject.yearBuilt) <=
        COMP_RULES.yearBuiltTolerance
    )
  ) {
    misses.push([
      "yearBuilt",
      isNum(sale.yearBuilt) ? `built ${sale.yearBuilt}` : "year built unknown",
    ]);
  }
  const subjectType = typeBucket(subject.propertyType);
  const saleType = typeBucket(sale.propertyType);
  if (subjectType && saleType && saleType !== subjectType) {
    misses.push(["propertyType", TYPE_LABELS[saleType] || sale.propertyType]);
  }
  return misses;
}

// Lower = closer match: how far each fact is from the subject.
function matchScore(sale, subject, distance, now) {
  const age = daysAgo(sale.soldDate, now) ?? (sale.recent ? 45 : 135);
  let score = distance * 2 + Math.max(0, distance - COMP_RULES.radiusMiles) * 6;
  score += Math.max(0, age - COMP_RULES.soldWithinDays) / 30;
  if (isNum(subject.beds)) {
    score += isNum(sale.beds) ? Math.abs(sale.beds - subject.beds) * 2 : 2;
  }
  if (isNum(subject.baths)) {
    score += isNum(sale.baths)
      ? Math.abs(sale.baths - subject.baths) * 1.5
      : 1.5;
  }
  if (isNum(subject.yearBuilt)) {
    score += isNum(sale.yearBuilt)
      ? Math.max(
          0,
          Math.abs(sale.yearBuilt - subject.yearBuilt) -
            COMP_RULES.yearBuiltTolerance,
        ) * 0.15
      : 1;
  }
  if (isNum(subject.sqft) && isNum(sale.sqft)) {
    score += (Math.abs(sale.sqft - subject.sqft) / subject.sqft) * 3;
  }
  const subjectType = typeBucket(subject.propertyType);
  const saleType = typeBucket(sale.propertyType);
  if (subjectType && saleType && saleType !== subjectType) score += 4;
  return score;
}

// Ranks every nearby sale (within the search radius) by how well it
// matches: sales meeting every comp rule first (closest, then most
// recent), then the rest by match score. Each carries `misses`, the rules
// it doesn't meet. `excluded` counts the sales failing each rule (by the
// first rule they fail), for explaining how many strictly qualify. Sales
// across a major highway from the subject are dropped entirely (counted
// in `acrossHighway`).
export function rankComps({
  subject,
  location,
  sales,
  highways = null,
  subjectAddress,
  now = Date.now(),
}) {
  const subjectStreet = streetKey(subjectAddress);
  const unknown = ["beds", "baths", "yearBuilt"].filter(
    (f) => !isNum(subject[f]),
  );
  const excluded = {
    distance: 0,
    soldDate: 0,
    beds: 0,
    baths: 0,
    yearBuilt: 0,
    propertyType: 0,
  };
  const ranked = [];
  let acrossHighway = 0;
  for (const sale of sales) {
    if (streetKey(sale.street || sale.address) === subjectStreet) continue;
    const distance = distanceMiles(location, sale);
    if (distance > COMP_RULES.searchRadiusMiles) continue;
    if (highwayBetween(location, sale, highways)) {
      acrossHighway += 1;
      continue;
    }
    const misses = ruleMisses(sale, subject, distance, now);
    if (misses.length > 0) excluded[misses[0][0]] += 1;
    ranked.push({
      ...sale,
      distance: Math.round(distance * 100) / 100,
      misses,
      score: matchScore(sale, subject, distance, now),
    });
  }
  ranked.sort((a, b) => {
    const aStrict = a.misses.length === 0;
    const bStrict = b.misses.length === 0;
    if (aStrict !== bStrict) return aStrict ? -1 : 1;
    if (aStrict) {
      return (
        a.distance - b.distance ||
        String(b.soldDate || "").localeCompare(String(a.soldDate || ""))
      );
    }
    return a.score - b.score;
  });
  const strictCount = ranked.filter((r) => r.misses.length === 0).length;
  return { ranked, strictCount, excluded, acrossHighway, unknown };
}
