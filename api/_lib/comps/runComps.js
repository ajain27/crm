// Runs comps for a property address.
//
// A comp is a home that SOLD within 0.5 miles of the subject in the last
// 90 days, with the same beds and baths, built within 5 years of it, and
// of the same type (the county's public records type when a page shows it).
//
//   1. The subject: Serper finds its Zillow, Redfin and Realtor.com pages
//      and Firecrawl reads its facts (beds, baths, sq ft, year built…)
//      from each; the US Census geocoder gives its coordinates.
//   2. Candidates: Redfin's sold-homes data for the last 90 days around
//      those coordinates (sold date, beds, baths, year built, location).
//   3. Sales across a major highway (interstate/expressway, from
//      OpenStreetMap) from the subject are dropped, and so are distressed
//      sales (under 40% of the area's typical price per sq ft). Every other sale
//      within 1 mile over 180 days is ranked: those meeting all
//      the rules above first (closest, then most recent), then the rest by
//      how closely they match. The top 5 are shown; any outside the rules
//      are labeled with exactly how they differ. When there are no sales
//      at all, the search widens to 2 miles over 12 months.
//   4. Claude (optional) reviews the top candidates, drops bad or
//      irrelevant comps and picks the 5 closest. It never estimates value.
//      Without Claude, or if it fails, the ranking's top 5 are used.
//   5. The property's own history (sales, listings, taxes) comes from the
//      same pages, read in the same scrape.
//   6. ARV is worked out in code from the final comps: the upper quartile
//      of their price per sq ft × the subject's size.
//
// Env: SERPER_API_KEY, FIRECRAWL_API_KEY (required); ANTHROPIC_API_KEY
// (optional — Claude's review of the candidates).

import {
  COMP_RULES,
  SEARCH,
  WIDE_SEARCH,
  errorWithStatus,
  isNum,
} from "./rules.js";
import {
  SITES,
  firecrawlExtract,
  pageCoordinates,
  pickListingUrls,
  reconcileSubject,
  saneValue,
  serperSearch,
  listingQueries,
} from "./subject.js";
import { geocodeAddress, geocodeWithOpenStreetMap } from "./geocode.js";
import { fetchRedfinSold } from "./sales.js";
import { fetchMajorHighways } from "./highways.js";
import { rankComps } from "./rank.js";
import { claudeReview } from "./review.js";
import { estimateArv, plural, ruleReason } from "./arv.js";
import { historyFromSources } from "../propertyHistory.js";

// The sales and major highways around a location, loaded together.
async function loadArea(location, search = SEARCH) {
  const [sales, highways] = await Promise.all([
    fetchRedfinSold(location, search),
    fetchMajorHighways(location, search.miles),
  ]);
  return { sales, highways };
}

// Finds the subject's pages, reads its facts from each, locates it and
// loads the sales around it.
async function gatherSubject(address, env) {
  const missing = ["SERPER_API_KEY", "FIRECRAWL_API_KEY"].filter(
    (k) => !env[k],
  );
  if (missing.length) {
    throw errorWithStatus(
      `Comps aren't set up yet: missing ${missing.join(", ")}.`,
      500,
    );
  }

  // The subject's pages and its coordinates, in parallel.
  const [searchResults, geocoded] = await Promise.all([
    serperSearch(listingQueries(address), env.SERPER_API_KEY),
    geocodeAddress(address),
  ]);
  const listingUrls = pickListingUrls(searchResults, address);

  // Scrape the subject's pages; when the address was geocoded, load nearby
  // sales at the same time.
  const scrapeAll = Promise.all(
    SITES.map(async (site) => {
      const url = listingUrls[site.key];
      if (!url) {
        return [site.key, { url: null, data: null, error: "No page found" }];
      }
      try {
        const data = await firecrawlExtract(url, env.FIRECRAWL_API_KEY);
        return [site.key, { url, data, error: null }];
      } catch (err) {
        return [site.key, { url, data: null, error: err.message }];
      }
    }),
  );
  const [scraped, areaNearGeocode] = await Promise.all([
    scrapeAll,
    geocoded ? loadArea(geocoded) : null,
  ]);
  const sources = Object.fromEntries(scraped);

  // Geocoder couldn't place it: use the pages' own map coordinates, then
  // OpenStreetMap.
  const location =
    geocoded ||
    pageCoordinates(sources, address) ||
    (await geocodeWithOpenStreetMap(address));
  if (!location) {
    throw errorWithStatus(
      "Couldn't locate this address. Check it and include the city, state and zip.",
      404,
    );
  }
  const { sales, highways } = areaNearGeocode || (await loadArea(location));
  return {
    location,
    sales,
    highways,
    sources,
    listingUrls,
    property: reconcileSubject(sources, address),
  };
}

// Corrected subject facts from the user ("adjust"), checked like scraped
// ones. Fields left blank stay unknown.
const ADJUSTABLE = [
  "propertyType",
  "beds",
  "baths",
  "sqft",
  "yearBuilt",
  "valueEstimate",
  "rentEstimate",
  "annualTax",
];

export function sanitizeSubject(subject = {}) {
  return Object.fromEntries(
    ADJUSTABLE.map((field) => {
      const value = subject[field];
      if (field === "propertyType") {
        return [
          field,
          typeof value === "string" && value.trim() ? value.trim() : null,
        ];
      }
      return [
        field,
        saneValue(field, typeof value === "string" ? Number(value) : value),
      ];
    }),
  );
}

// `adjust` re-runs comps with the user's corrected subject facts at a known
// location — no searching or scraping, so it's quick and costs no credits.
export async function runComps(
  address,
  env = process.env,
  now = Date.now(),
  adjust = null,
) {
  let location;
  let sales;
  let highways;
  let sources = {};
  let listingUrls = null;
  let property;
  if (adjust) {
    const { lat, lng } = adjust.location || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw errorWithStatus(
        "Adjusting comps needs the property's location.",
        400,
      );
    }
    location = {
      lat,
      lng,
      matchedAddress: adjust.location.matchedAddress ?? null,
    };
    ({ sales, highways } = await loadArea(location));
    property = sanitizeSubject(adjust.subject);
  } else {
    ({ location, sales, highways, sources, listingUrls, property } =
      await gatherSubject(address, env));
  }

  const rank = (search) =>
    rankComps({
      subject: property,
      location,
      sales,
      highways,
      search,
      subjectAddress: address,
      now,
    });
  let search = SEARCH;
  let ranking = rank(search);
  // No sales at all nearby: look a mile further out and 6 months further
  // back.
  if (ranking.ranked.length === 0) {
    search = WIDE_SEARCH;
    ({ sales, highways } = await loadArea(location, search));
    ranking = rank(search);
  }
  const { ranked, strictCount, excluded, acrossHighway, distressed, unknown } =
    ranking;

  // The 5 best-ranked; Claude, when available, reviews the top candidates,
  // drops bad ones and picks the 5 closest (it never sets the value).
  const candidates = ranked.slice(0, 15);
  let method = "rules";
  let aiError = null;
  let removedByAi = [];
  let picked = ranked
    .slice(0, COMP_RULES.maxComps)
    .map((m) => ({ ...m, reason: ruleReason(m) }));
  if (env.ANTHROPIC_API_KEY && candidates.length > 0) {
    try {
      const review = await claudeReview(
        property,
        candidates,
        env.ANTHROPIC_API_KEY,
      );
      picked = review.selected
        .slice(0, COMP_RULES.maxComps)
        .map(({ id, reason }) => ({ ...candidates[Number(id)], reason }));
      removedByAi = review.removed.map(({ id, reason }) => ({
        address: candidates[Number(id)].address,
        reason,
      }));
      method = "claude";
    } catch (err) {
      aiError = err.message;
      console.warn("run-comps: Claude unavailable, using rules:", err.message);
    }
  }

  const topComps = picked.map((c) => ({
    address: c.address,
    meetsRules: c.misses.length === 0,
    differs: c.misses.length
      ? c.misses.map(([, label]) => label).join(" · ")
      : null,
    price: c.price,
    beds: c.beds,
    baths: c.baths,
    sqft: isNum(c.sqft) ? c.sqft : null,
    yearBuilt: isNum(c.yearBuilt) ? c.yearBuilt : null,
    soldDate: c.soldDate,
    distance: c.distance,
    lat: c.lat,
    lng: c.lng,
    url: c.url,
    source: "Redfin",
    reason: c.reason,
  }));
  const outsideRules = topComps.filter((c) => !c.meetsRules).length;
  const { arvEstimate, arvBasis } = estimateArv(topComps, property.sqft);

  return {
    address,
    location,
    listingUrls,
    sourceErrors: Object.fromEntries(
      Object.entries(sources)
        .filter(([, s]) => s.error)
        .map(([key, s]) => [key, s.error]),
    ),
    property,
    // What each site said, so differences can be spotted and corrected.
    subjectSources: Object.fromEntries(
      Object.entries(sources)
        .filter(([, src]) => src.data)
        .map(([key, src]) => [
          key,
          Object.fromEntries(
            [
              "propertyType",
              "publicRecordsType",
              "beds",
              "baths",
              "sqft",
              "yearBuilt",
            ].map((f) => [
              f,
              f === "propertyType" || f === "publicRecordsType"
                ? (src.data[f] ?? null)
                : saneValue(f, src.data[f]),
            ]),
          ),
        ]),
    ),
    adjusted: Boolean(adjust),
    // The property's sales, listings and taxes, from the same pages (none
    // on a re-run, which doesn't scrape).
    history: adjust ? null : historyFromSources(sources, address),
    criteria: {
      radiusMiles: COMP_RULES.radiusMiles,
      soldWithinDays: COMP_RULES.soldWithinDays,
      beds: property.beds,
      baths: property.baths,
      searchRadiusMiles: search.miles,
      searchDays: search.days,
      widened: search === WIDE_SEARCH,
      yearBuiltFrom: isNum(property.yearBuilt)
        ? property.yearBuilt - COMP_RULES.yearBuiltTolerance
        : null,
      yearBuiltTo: isNum(property.yearBuilt)
        ? property.yearBuilt + COMP_RULES.yearBuiltTolerance
        : null,
      // False when OpenStreetMap couldn't be reached, so sales across a
      // highway weren't screened out.
      highwayCheck: highways !== null,
      unknown,
    },
    stats: {
      nearbySales: ranked.length,
      matched: strictCount,
      outsideRules,
      excluded,
      acrossHighway,
      distressed,
      removedByAi,
    },
    topComps,
    arvEstimate,
    rentEstimate: property.rentEstimate,
    summary:
      topComps.length === 0
        ? `No homes sold within ${search.miles} mi in the last ${Math.round(search.days / 30.4)} months.`
        : [
            arvBasis,
            outsideRules > 0
              ? `${plural(outsideRules, "comp")} ${outsideRules === 1 ? "falls" : "fall"} outside the comp rules — see how each differs.`
              : null,
          ]
            .filter(Boolean)
            .join(" "),
    method,
    ...(aiError ? { aiError } : {}),
  };
}
