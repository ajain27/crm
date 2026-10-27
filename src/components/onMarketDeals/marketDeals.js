// On Market Deals: combining each city's keyword searches into one list of
// homes, and the filters and sorts the page offers.

// Listing wording investors and motivated or distressed sellers use. Each is
// its own Zillow search (Zillow matches all words of a search, so they
// can't be combined); quotes match the exact phrase.
export const DEFAULT_KEYWORDS = [
  "investor",
  '"cash only"',
  '"cash buyers"',
  '"as is"',
  "fixer",
  "tlc",
  "handyman",
  '"needs work"',
  "rehab",
  '"motivated seller"',
  '"bring all offers"',
  '"estate sale"',
  "distressed",
  '"bank owned"',
  "foreclosure",
  '"priced to sell"',
];

// Listings on the market this many days or fewer are left out.
export const DEFAULT_MIN_DAYS = 20;

export const keywordLabel = (keyword) => keyword.replace(/"/g, "");

export const money = (n) =>
  typeof n === "number" && n > 0
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";

export const HOME_TYPES = {
  SINGLE_FAMILY: "Single family",
  MULTI_FAMILY: "Multi-family",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  MANUFACTURED: "Manufactured",
  LOT: "Lot / land",
  APARTMENT: "Apartment",
};

// Auctions aren't homes you can buy outright. Searches leave them out;
// this also drops them from results saved before that.
export const isAuction = (l) =>
  Boolean(l.isAuction) || /auction/i.test(l.statusText || "");

export const cityKey = ({ city, state }) => `${city}, ${state}`.toLowerCase();

// "372 W Columbia Ave" + "48340" → "372 w columbia ave|48340", for matching
// a Zillow listing to Redfin's.
export function addressKey(street, zip) {
  const s = String(street || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? `${s}|${String(zip || "").slice(0, 5)}` : null;
}

// One city's results: each keyword's Zillow listings (`byKeyword`) and
// Redfin's homes for sale, as one list. A home found by several keywords is
// one listing naming each; Redfin adds year built, HOA, MLS# and its link.
export function combineCityResults(byKeyword, redfinHomes = []) {
  const redfin = new Map(
    redfinHomes.map((h) => [addressKey(h.street, h.zip), h]),
  );
  const byId = new Map();
  Object.entries(byKeyword).forEach(([keyword, listings]) => {
    (listings || []).forEach((l) => {
      const id = l.zpid || addressKey(l.street, l.zip);
      if (!id) return;
      const existing = byId.get(id);
      if (existing) {
        if (!existing.keywords.includes(keyword)) {
          existing.keywords.push(keyword);
        }
        return;
      }
      const r = redfin.get(addressKey(l.street, l.zip));
      byId.set(id, {
        ...l,
        id,
        keywords: [keyword],
        yearBuilt: r?.yearBuilt ?? null,
        hoa: r?.hoa ?? null,
        mls: r?.mls ?? null,
        redfinUrl: r?.url ?? null,
        propertyType: r?.propertyType ?? null,
        daysOnMarket: l.daysOnMarket ?? r?.daysOnMarket ?? null,
        lotSqft: l.lotSqft ?? r?.lotSqft ?? null,
      });
    });
  });
  return [...byId.values()];
}

export const pricePerSqft = (l) =>
  l.price > 0 && l.sqft > 0 ? l.price / l.sqft : null;

// How far under its Zestimate a home is listed, as a fraction (0.2 = 20%
// under); null without a Zestimate.
export const belowZestimate = (l) =>
  l.price > 0 && l.zestimate > 0 ? (l.zestimate - l.price) / l.zestimate : null;

export const SORTS = {
  longest: {
    label: "Longest on market",
    compare: (a, b) => (b.daysOnMarket ?? 0) - (a.daysOnMarket ?? 0),
  },
  priceLow: {
    label: "Price: low to high",
    compare: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  },
  priceHigh: {
    label: "Price: high to low",
    compare: (a, b) => (b.price ?? 0) - (a.price ?? 0),
  },
  ppsf: {
    label: "Price per sq ft: low to high",
    compare: (a, b) =>
      (pricePerSqft(a) ?? Infinity) - (pricePerSqft(b) ?? Infinity),
  },
  zestimate: {
    label: "Furthest below Zestimate",
    compare: (a, b) =>
      (belowZestimate(b) ?? -Infinity) - (belowZestimate(a) ?? -Infinity),
  },
  keywords: {
    label: "Most keywords matched",
    compare: (a, b) => b.keywords.length - a.keywords.length,
  },
};

// The listings to show: on the market more than `minDays` (homes without a
// days-on-market count are left out), no auctions, sorted.
export function visibleListings(listings, { minDays, sort }) {
  return listings
    .filter(
      (l) =>
        typeof l.daysOnMarket === "number" &&
        l.daysOnMarket > minDays &&
        !isAuction(l),
    )
    .sort(SORTS[sort]?.compare || SORTS.longest.compare);
}
