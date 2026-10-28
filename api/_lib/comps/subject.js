// Step 1: the subject. Serper finds its Zillow, Redfin and Realtor.com
// pages and a scraper (Firecrawl, or Crawl4AI once Firecrawl's credits
// run out) reads its facts from each; the facts the sites agree
// on win.

import { distanceMiles, isNum, typeBucket } from "./rules.js";
import { extractJson, ogImageFromHtml, scrapeHtml } from "../scraper.js";

export const SITES = [
  {
    key: "zillow",
    label: "Zillow",
    domain: "zillow.com",
    // Property pages, not search or agent pages.
    propertyPath: /\/homedetails\//i,
  },
  {
    key: "redfin",
    label: "Redfin",
    domain: "redfin.com",
    propertyPath: /\/home\/\d+/i,
  },
  {
    key: "realtor",
    label: "Realtor.com",
    domain: "realtor.com",
    propertyPath: /\/realestateandhomes-detail\//i,
  },
];

// What the scraper reads about the subject from each of its pages.
export const SUBJECT_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string" },
    propertyType: {
      type: "string",
      description:
        "e.g. Single Family, Condo, Townhouse, Multi-Family (a duplex or two-family flat is Multi-Family)",
    },
    publicRecordsType: {
      type: "string",
      description:
        "The property type or land use from the page's public records / public facts / county records section (e.g. Duplex, Two Family, Single Family), not the listing's own type. Leave empty if the page has no public records.",
    },
    beds: { type: "number" },
    baths: { type: "number", description: "Total bathrooms, e.g. 2.5" },
    sqft: { type: "number" },
    yearBuilt: { type: "number" },
    latitude: { type: "number", description: "This home's map latitude" },
    longitude: { type: "number", description: "This home's map longitude" },
    valueEstimate: {
      type: "number",
      description:
        "The site's own estimated value of this home (Zestimate, Redfin Estimate, etc.)",
    },
    rentEstimate: { type: "number", description: "Estimated monthly rent" },
    annualTax: {
      type: "number",
      description: "Most recent annual property tax",
    },
    priceHistory: {
      type: "array",
      description:
        "Every row of this home's price / sale / property history table",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "As shown, e.g. 4/29/2025" },
          event: {
            type: "string",
            description:
              "e.g. Sold, Listed for sale, Price change, Pending, Listing removed, Listed for rent",
          },
          price: { type: "number" },
        },
      },
    },
    taxHistory: {
      type: "array",
      description: "Every row of this home's tax history table",
      items: {
        type: "object",
        properties: {
          year: { type: "number" },
          tax: { type: "number", description: "Property tax paid" },
          assessedValue: { type: "number" },
        },
      },
    },
  },
};

function siteForUrl(url) {
  return SITES.find((s) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "").endsWith(s.domain);
    } catch {
      return false;
    }
  });
}

// "5055 Belfast Dr, Memphis…" → { number: "5055", street: "belfast" }.
// Used to make sure a page is this house, not a neighbor's.
export function addressParts(address) {
  const words = String(address || "")
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const number = /^\d+[a-z]?$/.test(words[0] || "") ? words[0] : null;
  const DIRECTIONS = new Set([
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
    "north",
    "south",
    "east",
    "west",
  ]);
  const street =
    words.slice(number ? 1 : 0).find((w) => !DIRECTIONS.has(w)) || null;
  return { number, street };
}

// Street-name words the sites spell out or abbreviate either way
// ("15315 Hwy 99" is "15315-Highway-99" on Zillow).
const STREET_ALIASES = [
  ["hwy", "highway"],
  ["rte", "rt", "route"],
  ["mt", "mount"],
  ["ft", "fort"],
  ["st", "saint"],
];

function streetSpellings(street) {
  return STREET_ALIASES.find((names) => names.includes(street)) || [street];
}

function urlIsForAddress(url, { number, street }) {
  if (!number || !street) return false;
  const slug = decodeURIComponent(url)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  return (
    slug.includes(` ${number} `) &&
    streetSpellings(street).some((name) => slug.includes(` ${name} `))
  );
}

// Each site's property page for this exact address (house number and
// street in its URL). Search results often include neighbors' pages —
// those are never used; a site with no matching page is skipped.
export function pickListingUrls(organicResultsBySite, address) {
  const parts = addressParts(address);
  const urls = {};
  SITES.forEach((site, i) => {
    const links = (organicResultsBySite[i] || [])
      .map((r) => r.link)
      .filter((link) => siteForUrl(link)?.key === site.key)
      .filter((link) => site.propertyPath.test(link));
    urls[site.key] =
      links.find((link) => urlIsForAddress(` ${link} `, parts)) || null;
  });
  return urls;
}

// One search per site for the address. The ", USA" Google's address box
// adds is left off — with it, Google sometimes misses the property's page.
export function listingQueries(address) {
  const where = String(address || "").replace(/,?\s*USA$/i, "");
  return SITES.map((s) => `${where} site:${s.domain}`);
}

export async function serperSearch(queries, apiKey) {
  const search = async (body) => {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Serper search failed (${res.status})`);
    return res.json();
  };

  // One batched call; if Serper doesn't return one result per query, ask
  // for each site separately.
  try {
    const batch = await search(queries.map((q) => ({ q, num: 10 })));
    if (Array.isArray(batch) && batch.length === queries.length) {
      return batch.map((r) => r.organic || []);
    }
  } catch {
    // fall through to single searches
  }
  const single = await Promise.all(
    queries.map((q) => search({ q, num: 10 }).catch(() => ({}))),
  );
  return single.map((r) => r.organic || []);
}

// Scraped pages often fill unknown fields with "N/A", "—", "unknown" or
// 0; treat those as missing so they don't show up as values.
const PLACEHOLDER = /^(n\/?a|none|unknown|not available|-+|—|–)$/i;

export function cleanScraped(value) {
  if (Array.isArray(value)) return value.map(cleanScraped);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([k, v]) => [k, cleanScraped(v)])
        .filter(([, v]) => v !== null),
    );
  }
  if (typeof value === "string") {
    const text = value.trim();
    return text && !PLACEHOLDER.test(text) ? text : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value !== 0 ? value : null;
  }
  return value ?? null;
}

const SUBJECT_PROMPT =
  "Extract this property's own details (not nearby or similar homes) — its address, type, beds, total baths, square feet, year built, estimated value, estimated monthly rent and annual property tax — and every row of its price/sale history and tax history tables.";

// The subject's facts from one of its pages, with its listing photo when
// the scraper returns the page's metadata (`photoUrl` is left out when it
// doesn't, so the photo can be looked up another way).
export async function extractSubject(url, env) {
  const { data, metadata } = await extractJson(url, env, {
    schema: SUBJECT_SCHEMA,
    prompt: SUBJECT_PROMPT,
  });
  if (!data) return null;
  const facts = cleanScraped(data);
  return metadata ? { ...facts, photoUrl: listingPhotoUrl(metadata) } : facts;
}

// The listing's main photo: the page's share image (og:image), which
// Firecrawl returns with every scrape (from its metadata). Only the sites' own photo servers
// count — without photos, the share image is a logo or a map.
const PHOTO_HOSTS = [
  /^https:\/\/photos\.zillowstatic\.com\/fp\//i,
  /^https:\/\/ssl\.cdn-redfin\.com\/photo\//i,
  /^https:\/\/ap\.rdcpix\.com\//i,
];

export function listingPhotoUrl(metadata) {
  const og = metadata?.ogImage ?? metadata?.["og:image"];
  const url = Array.isArray(og) ? og[0] : og;
  return typeof url === "string" && PHOTO_HOSTS.some((re) => re.test(url))
    ? url
    : null;
}

const SOURCE_PRIORITY = ["zillow", "redfin", "realtor"];

// The value most sites agree on; when they all differ, Zillow's, then
// Redfin's, then Realtor.com's.
function agreedValue(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  const counts = new Map();
  present.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const [top, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return count > 1 ? top : present[0];
}

// Values outside these ranges are misreads (e.g. a "rent" of $93,161/mo).
const SANE = {
  beds: [1, 15],
  baths: [0.5, 15],
  sqft: [200, 20000],
  yearBuilt: [1700, new Date().getFullYear() + 1],
  valueEstimate: [5000, 50000000],
  rentEstimate: [100, 25000],
  // Higher is almost always the assessed value misread as the tax.
  annualTax: [1, 50000],
};

export function saneValue(field, value) {
  const range = SANE[field];
  if (!range) return value ?? null;
  return isNum(value) && value >= range[0] && value <= range[1] ? value : null;
}

// A page's data is only used if the address it shows has the subject's
// house number (when the page shows an address at all).
export function isSubjectData(data, address) {
  if (!data) return false;
  const { number } = addressParts(address);
  if (!number || !data.address) return true;
  return addressParts(data.address).number === number;
}

// The subject's photo: Zillow's, then Redfin's, then Realtor.com's.
export function subjectPhotoUrl(sources, address) {
  return (
    SOURCE_PRIORITY.map((key) => sources[key]?.data)
      .filter((data) => isSubjectData(data, address))
      .map((data) => data.photoUrl)
      .find(Boolean) || null
  );
}

// When no page's metadata had a photo to offer (the scraper didn't return
// it), the first subject page's share image, read from its HTML.
export async function lookUpSubjectPhoto(sources, address, env) {
  const unread = SOURCE_PRIORITY.map((key) => sources[key])
    .filter((src) => isSubjectData(src?.data, address))
    .find((src) => !("photoUrl" in src.data));
  if (!unread?.url) return null;
  try {
    const html = await scrapeHtml(unread.url, env);
    return listingPhotoUrl({ ogImage: ogImageFromHtml(html) });
  } catch {
    return null;
  }
}

// Coordinates from the subject's own pages (their maps), used when the
// geocoder can't place the address. Pages within ~0.05 mi of each other
// count as agreeing; otherwise the first (Zillow, Redfin, Realtor.com).
export function pageCoordinates(sources, address) {
  const points = SOURCE_PRIORITY.map((key) => sources[key]?.data)
    .filter((data) => isSubjectData(data, address))
    .map((data) => ({ lat: data.latitude, lng: data.longitude }))
    .filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180 &&
        p.lat !== 0 &&
        p.lng !== 0,
    );
  if (points.length === 0) return null;
  const agreed =
    points.find((p) =>
      points.some((q) => q !== p && distanceMiles(p, q) <= 0.05),
    ) || points[0];
  return { ...agreed, matchedAddress: null };
}

const TYPE_NAMES = {
  single: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  multi: "Multi-Family",
};

// The county's type wins over the listings' (Zillow and Redfin often call
// a two-family flat a single family home or a townhouse). Without it: any
// listing saying multi-family wins; listings that disagree leave the type
// unknown, so comps aren't held to a guessed type.
function subjectType(publicRecordsType, listingTypes) {
  const county = typeBucket(publicRecordsType);
  if (county) return TYPE_NAMES[county] || publicRecordsType;
  const buckets = new Set(listingTypes.map(typeBucket).filter(Boolean));
  if (buckets.has("multi")) return TYPE_NAMES.multi;
  if (buckets.size > 1) return null;
  return agreedValue(listingTypes);
}

export function reconcileSubject(sources, address) {
  const usable = SOURCE_PRIORITY.filter((key) =>
    isSubjectData(sources[key]?.data, address),
  );
  const values = (field) =>
    usable.map((key) => saneValue(field, sources[key].data[field]));
  const pick = (field) => agreedValue(values(field));
  const publicRecordsType = pick("publicRecordsType");
  return {
    propertyType: subjectType(
      publicRecordsType,
      values("propertyType").filter(Boolean),
    ),
    publicRecordsType,
    beds: pick("beds"),
    baths: pick("baths"),
    sqft: pick("sqft"),
    yearBuilt: pick("yearBuilt"),
    valueEstimate: pick("valueEstimate"),
    rentEstimate: pick("rentEstimate"),
    annualTax: pick("annualTax"),
  };
}
