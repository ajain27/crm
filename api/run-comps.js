// Runs comps for a property address.
//
// A comp is a home that SOLD within 0.5 miles of the subject in the last
// 90 days, with the same beds and baths, and built within 5 years of it.
//
//   1. The subject: Serper finds its Zillow, Redfin and Realtor.com pages
//      and Firecrawl reads its facts (beds, baths, sq ft, year built…)
//      from each; the US Census geocoder gives its coordinates.
//   2. Candidates: Redfin's sold-homes data for the last 90 days around
//      those coordinates (sold date, beds, baths, year built, location).
//   3. The rules above are applied in code. Only true matches are kept —
//      if fewer than 5 qualify, fewer are shown, with a count of the
//      nearby sales each rule excluded.
//   4. OpenAI (optional) reviews the matches, drops bad or irrelevant ones
//      and picks the 5 closest. It never estimates value. Without OpenAI,
//      or if it fails, matches are ordered by distance, then recency.
//   5. ARV is worked out in code from the final comps.
//
// Env: SERPER_API_KEY, FIRECRAWL_API_KEY (required); OPENAI_API_KEY,
// OPENAI_MODEL (optional).

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
// Pages are scraped in parallel; this leaves time for the rest inside the
// function's 60s limit (vercel.json).
const FIRECRAWL_TIMEOUT_MS = 30000;

export const COMP_RULES = {
  radiusMiles: 0.5,
  soldWithinDays: 90,
  yearBuiltTolerance: 5,
  maxComps: 5,
};

// When no sale matches the subject's beds and baths exactly, these steps
// are tried in order and the first that finds any comps is used. Distance,
// sale date and year built are never relaxed.
export const BED_BATH_STEPS = [
  { beds: 0, baths: 0 },
  { beds: 0, baths: 0.5 },
  { beds: 0, baths: 1 },
  { beds: 1, baths: 1 },
];

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

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
};

// What Firecrawl reads about the subject from each of its pages.
export const SUBJECT_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string" },
    propertyType: {
      type: "string",
      description: "e.g. Single Family, Condo, Townhouse, Multi-Family",
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
  },
};

const isNum = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

// ── Step 1: the subject ──────────────────────────────────────────────────

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

function urlIsForAddress(url, { number, street }) {
  if (!number || !street) return false;
  const slug = decodeURIComponent(url)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  return slug.includes(` ${number} `) && slug.includes(` ${street} `);
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

async function serperSearch(queries, apiKey) {
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

async function firecrawlExtract(url, apiKey) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        {
          type: "json",
          schema: SUBJECT_SCHEMA,
          prompt:
            "Extract this property's own details (not nearby or similar homes): its address, type, beds, total baths, square feet, year built, estimated value, estimated monthly rent and annual property tax.",
        },
      ],
      onlyMainContent: true,
      timeout: FIRECRAWL_TIMEOUT_MS,
      proxy: "auto",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Firecrawl failed (${res.status})`);
  }
  const extracted = data.data?.json;
  return extracted ? cleanScraped(extracted) : null;
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
  annualTax: [1, 500000],
};

function saneValue(field, value) {
  const range = SANE[field];
  if (!range) return value ?? null;
  return isNum(value) && value >= range[0] && value <= range[1] ? value : null;
}

// A page's data is only used if the address it shows has the subject's
// house number (when the page shows an address at all).
function isSubjectData(data, address) {
  if (!data) return false;
  const { number } = addressParts(address);
  if (!number || !data.address) return true;
  return addressParts(data.address).number === number;
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

export function reconcileSubject(sources, address) {
  const usable = SOURCE_PRIORITY.filter((key) =>
    isSubjectData(sources[key]?.data, address),
  );
  const pick = (field) =>
    agreedValue(
      usable.map((key) => saneValue(field, sources[key].data[field])),
    );
  return {
    propertyType: pick("propertyType"),
    beds: pick("beds"),
    baths: pick("baths"),
    sqft: pick("sqft"),
    yearBuilt: pick("yearBuilt"),
    valueEstimate: pick("valueEstimate"),
    rentEstimate: pick("rentEstimate"),
    annualTax: pick("annualTax"),
  };
}

// US Census geocoder (free, no key); null when it finds no match.
async function censusGeocode(address) {
  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const res = await fetch(
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`,
  );
  if (!res.ok) throw new Error(`Census geocoding failed (${res.status})`);
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    lat: match.coordinates.y,
    lng: match.coordinates.x,
    matchedAddress: match.matchedAddress,
  };
}

// OpenStreetMap's geocoder (free, no key), as a backup.
async function osmGeocode(address) {
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    countrycodes: "us",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: { "User-Agent": "YouWinEstatesCRM/1.0 (comps)" },
    },
  );
  if (!res.ok)
    throw new Error(`OpenStreetMap geocoding failed (${res.status})`);
  const [match] = await res.json();
  if (!match) return null;
  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
    matchedAddress: match.display_name,
  };
}

const withoutCountry = (address) =>
  String(address).replace(/,?\s*(USA|United States)\s*$/i, "");

// Runs geocoders in order; the first location found wins. Null when none
// can place the address.
async function firstLocation(address, geocoders) {
  for (const geocode of geocoders) {
    try {
      const location = await geocode(withoutCountry(address));
      if (location) return location;
    } catch (err) {
      console.warn("run-comps geocoding:", err.message);
    }
  }
  return null;
}

// The Census geocoder, tried twice (it has occasional hiccups).
export function geocodeAddress(address) {
  return firstLocation(address, [censusGeocode, censusGeocode]);
}

// OpenStreetMap, the last resort.
export function geocodeWithOpenStreetMap(address) {
  return firstLocation(address, [osmGeocode]);
}

// ── Step 2: candidates (Redfin sold homes) ───────────────────────────────

export function distanceMiles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export function redfinSoldUrl({ lat, lng }) {
  // A box a little bigger than the radius; distance is checked exactly
  // afterwards.
  const miles = COMP_RULES.radiusMiles * 1.2;
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.cos((lat * Math.PI) / 180));
  const box = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
  const params = new URLSearchParams({
    al: "1",
    num_homes: "350",
    page_number: "1",
    poly: box.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(","),
    sold_within_days: String(COMP_RULES.soldWithinDays),
    status: "9", // sold
    uipt: "1,2,3,4", // house, condo, townhouse, multi-family
    v: "8",
  });
  return `https://www.redfin.com/stingray/api/gis-csv?${params}`;
}

// Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF.
export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const toNumber = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// "August-14-2026" → "2026-08-14"; null when blank or unreadable.
function toIsoDate(text) {
  const time = Date.parse(String(text || "").replace(/-/g, " "));
  if (Number.isNaN(time)) return null;
  const d = new Date(time);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// Redfin's CSV → sale records. Rows that aren't sales (e.g. the MLS
// notice line) are skipped.
export function parseRedfinSoldCsv(text) {
  const [header = [], ...rows] = parseCsvRows(text.replace(/^﻿/, ""));
  const col = (name) => header.findIndex((h) => h.trim().startsWith(name));
  const at = {
    soldDate: col("SOLD DATE"),
    type: col("PROPERTY TYPE"),
    address: col("ADDRESS"),
    city: col("CITY"),
    state: col("STATE OR PROVINCE"),
    zip: col("ZIP OR POSTAL CODE"),
    price: col("PRICE"),
    beds: col("BEDS"),
    baths: col("BATHS"),
    sqft: col("SQUARE FEET"),
    yearBuilt: col("YEAR BUILT"),
    url: col("URL"),
    lat: col("LATITUDE"),
    lng: col("LONGITUDE"),
  };
  if (at.address === -1 || at.lat === -1) return [];
  return rows
    .filter((r) => r.length >= header.length - 1 && toNumber(r[at.price]))
    .map((r) => ({
      address: [
        r[at.address],
        r[at.city],
        [r[at.state], r[at.zip]].filter(Boolean).join(" "),
      ]
        .map((s) => (s || "").trim())
        .filter(Boolean)
        .join(", "),
      street: (r[at.address] || "").trim(),
      propertyType: (r[at.type] || "").trim() || null,
      soldDate: toIsoDate(r[at.soldDate]),
      price: toNumber(r[at.price]),
      beds: toNumber(r[at.beds]),
      baths: toNumber(r[at.baths]),
      sqft: toNumber(r[at.sqft]),
      yearBuilt: toNumber(r[at.yearBuilt]),
      url: (r[at.url] || "").trim() || null,
      lat: toNumber(r[at.lat]),
      lng: toNumber(r[at.lng]),
    }))
    .filter((s) => s.lat !== null && s.lng !== null);
}

async function fetchRedfinSold(location) {
  const res = await fetch(redfinSoldUrl(location), {
    headers: BROWSER_HEADERS,
  });
  const text = await res.text().catch(() => "");
  if (!res.ok || !/LATITUDE/.test(text)) {
    const error = new Error(
      `Couldn't load recent sales from Redfin (${res.status}). Try again in a minute.`,
    );
    error.status = 502;
    throw error;
  }
  return parseRedfinSoldCsv(text);
}

// ── Step 3: the comp rules ───────────────────────────────────────────────

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

const within = (value, target, tolerance) =>
  isNum(value) && Math.abs(value - target) <= tolerance + 1e-9;

// Applies the comp rules to every nearby sale. `tolerance` allows beds and
// baths to differ by up to that much (0 = exact). Returns the matches
// (with distance) and how many sales each rule excluded. A rule whose
// subject value is unknown can't be applied; it's listed in `unknown`.
export function applyCompRules({
  subject,
  location,
  sales,
  subjectAddress,
  tolerance = { beds: 0, baths: 0 },
  now = Date.now(),
}) {
  const cutoff = now - COMP_RULES.soldWithinDays * 24 * 60 * 60 * 1000;
  const subjectBucket = typeBucket(subject.propertyType);
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
  const subjectStreet = streetKey(subjectAddress);
  const matches = [];

  for (const sale of sales) {
    if (streetKey(sale.street || sale.address) === subjectStreet) continue;
    const distance = distanceMiles(location, sale);
    // Each sale is counted under the first rule it fails.
    if (distance > COMP_RULES.radiusMiles) {
      excluded.distance += 1;
    } else if (sale.soldDate && Date.parse(sale.soldDate) < cutoff) {
      excluded.soldDate += 1;
    } else if (
      isNum(subject.beds) &&
      !within(sale.beds, subject.beds, tolerance.beds)
    ) {
      excluded.beds += 1;
    } else if (
      isNum(subject.baths) &&
      !within(sale.baths, subject.baths, tolerance.baths)
    ) {
      excluded.baths += 1;
    } else if (
      isNum(subject.yearBuilt) &&
      !(
        isNum(sale.yearBuilt) &&
        Math.abs(sale.yearBuilt - subject.yearBuilt) <=
          COMP_RULES.yearBuiltTolerance
      )
    ) {
      excluded.yearBuilt += 1;
    } else if (
      subjectBucket &&
      typeBucket(sale.propertyType) &&
      typeBucket(sale.propertyType) !== subjectBucket
    ) {
      excluded.propertyType += 1;
    } else {
      matches.push({ ...sale, distance: Math.round(distance * 100) / 100 });
    }
  }

  // Closest first, then most recent.
  matches.sort(
    (a, b) =>
      a.distance - b.distance ||
      String(b.soldDate || "").localeCompare(String(a.soldDate || "")),
  );
  return { matches, excluded, unknown };
}

// ── Step 4: OpenAI review (optional) ─────────────────────────────────────

const ID_REASON_LIST = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "reason"],
    properties: { id: { type: "string" }, reason: { type: "string" } },
  },
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["selected", "removed"],
  properties: { selected: ID_REASON_LIST, removed: ID_REASON_LIST },
};

const REVIEW_PROMPT = `You are helping a real estate wholesaler pick comps.
You get the subject property, the rules used, and a list of homes that already pass them (sold within 0.5 miles in the last 90 days, built within 5 years, and the same beds and baths — or, when no home matched exactly, beds/baths within the stated tolerance).
Remove any that are bad or irrelevant comps: price outliers versus the others, likely distressed or non-arm's-length sales, a clearly different kind of property, or duplicates.
Then select up to 5 of the rest that are the closest matches to the subject (prefer closer, more recent, and more similar in size).
Do NOT estimate the subject's value. Only use ids from the list. Give a short reason for each selected and removed id.`;

async function openAiReview(subject, matches, tolerance, apiKey, model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: REVIEW_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            subject,
            bedBathTolerance: tolerance,
            candidates: matches.map((m, i) => ({
              id: String(i),
              address: m.address,
              soldDate: m.soldDate,
              price: m.price,
              beds: m.beds,
              baths: m.baths,
              sqft: m.sqft,
              yearBuilt: m.yearBuilt,
              propertyType: m.propertyType,
              distanceMiles: m.distance,
            })),
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "comp_review",
          strict: true,
          schema: REVIEW_SCHEMA,
        },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI failed (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no result.");
  const review = JSON.parse(content);
  // Keep only ids that exist; OpenAI can't add homes.
  const valid = (list) =>
    (list || []).filter((x) => /^\d+$/.test(x.id) && matches[Number(x.id)]);
  return { selected: valid(review.selected), removed: valid(review.removed) };
}

// ── Step 5: ARV ──────────────────────────────────────────────────────────

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const fmtMoney = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

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

function ruleReason(comp) {
  return [
    `${comp.distance} mi away`,
    comp.soldDate ? `sold ${comp.soldDate}` : null,
    isNum(comp.yearBuilt) ? `built ${comp.yearBuilt}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

// ── The run ──────────────────────────────────────────────────────────────

function errorWithStatus(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
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
    serperSearch(
      SITES.map((s) => `${address} site:${s.domain}`),
      env.SERPER_API_KEY,
    ),
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
  const [scraped, salesNearGeocode] = await Promise.all([
    scrapeAll,
    geocoded ? fetchRedfinSold(geocoded) : null,
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
  const sales = salesNearGeocode || (await fetchRedfinSold(location));
  return {
    location,
    sales,
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
    sales = await fetchRedfinSold(location);
    property = sanitizeSubject(adjust.subject);
  } else {
    ({ location, sales, sources, listingUrls, property } = await gatherSubject(
      address,
      env,
    ));
  }

  // Exact beds/baths first; relax step by step only if nothing matches.
  let ruleResult;
  let tolerance;
  for (tolerance of BED_BATH_STEPS) {
    ruleResult = applyCompRules({
      subject: property,
      location,
      sales,
      subjectAddress: address,
      tolerance,
      now,
    });
    if (ruleResult.matches.length > 0) break;
  }
  const relaxed = tolerance.beds > 0 || tolerance.baths > 0;
  // With nothing found at any step, report the exact rules' exclusions.
  if (ruleResult.matches.length === 0) {
    tolerance = BED_BATH_STEPS[0];
    ruleResult = applyCompRules({
      subject: property,
      location,
      sales,
      subjectAddress: address,
      tolerance,
      now,
    });
  }
  const { matches, excluded, unknown } = ruleResult;

  // OpenAI weeds out bad comps and picks the closest 5, when available.
  let method = "rules";
  let aiError = null;
  let removedByAi = [];
  let picked = matches
    .slice(0, COMP_RULES.maxComps)
    .map((m) => ({ ...m, reason: ruleReason(m) }));
  if (env.OPENAI_API_KEY && matches.length > 0) {
    try {
      const review = await openAiReview(
        property,
        matches,
        tolerance,
        env.OPENAI_API_KEY,
        env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      );
      picked = review.selected
        .slice(0, COMP_RULES.maxComps)
        .map(({ id, reason }) => ({ ...matches[Number(id)], reason }));
      removedByAi = review.removed.map(({ id, reason }) => ({
        address: matches[Number(id)].address,
        reason,
      }));
      method = "openai";
    } catch (err) {
      aiError = err.message;
      console.warn("run-comps: OpenAI unavailable, using rules:", err.message);
    }
  }

  const diffLabel = (c) =>
    [
      ["bed", c.beds - property.beds],
      ["bath", c.baths - property.baths],
    ]
      .filter(([, d]) => isNum(Math.abs(d)) && Math.abs(d) > 1e-9)
      .map(([word, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d)} ${word}`)
      .join(", ") || null;

  const topComps = picked.map((c) => ({
    address: c.address,
    differs:
      isNum(property.beds) && isNum(property.baths) ? diffLabel(c) : null,
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
            ["propertyType", "beds", "baths", "sqft", "yearBuilt"].map((f) => [
              f,
              f === "propertyType"
                ? (src.data[f] ?? null)
                : saneValue(f, src.data[f]),
            ]),
          ),
        ]),
    ),
    adjusted: Boolean(adjust),
    criteria: {
      radiusMiles: COMP_RULES.radiusMiles,
      soldWithinDays: COMP_RULES.soldWithinDays,
      beds: property.beds,
      baths: property.baths,
      bedsTolerance: tolerance.beds,
      bathsTolerance: tolerance.baths,
      relaxed: relaxed && matches.length > 0,
      yearBuiltFrom: isNum(property.yearBuilt)
        ? property.yearBuilt - COMP_RULES.yearBuiltTolerance
        : null,
      yearBuiltTo: isNum(property.yearBuilt)
        ? property.yearBuilt + COMP_RULES.yearBuiltTolerance
        : null,
      unknown,
    },
    stats: {
      nearbySales: sales.length,
      matched: matches.length,
      excluded,
      removedByAi,
    },
    topComps,
    arvEstimate,
    rentEstimate: property.rentEstimate,
    summary:
      topComps.length === 0
        ? "No sold homes met all the comp rules."
        : arvBasis,
    method,
    ...(aiError ? { aiError } : {}),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const address = String(req.body?.address || "").trim();
  if (address.length < 8 || address.length > 200) {
    return res
      .status(400)
      .json({ error: "Enter the property's full address." });
  }

  try {
    const { subject, location } = req.body || {};
    const adjust = subject && location ? { subject, location } : null;
    return res
      .status(200)
      .json(await runComps(address, process.env, Date.now(), adjust));
  } catch (err) {
    console.error("run-comps error:", err);
    return res.status(err.status || 502).json({
      error: err.message || "Running comps failed.",
    });
  }
}
