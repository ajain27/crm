// On Market Deals: homes for sale in a city whose listing reads like an
// investor deal ("investor", "as is", "TLC", "motivated seller"…).
//
//   - Zillow, one keyword at a time: Firecrawl loads the city's Zillow
//     search with that keyword (Zillow searches the listing descriptions)
//     and the results are read from the page's own data (__NEXT_DATA__):
//     photo, price, beds, baths, size, lot, days on Zillow, Zestimate,
//     rent Zestimate, tax assessed value, broker.
//   - Redfin, once per city: its for-sale data for the city adds what
//     Zillow's results lack — year built, HOA, MLS# and its own link.
//
// Env: FIRECRAWL_API_KEY.

import { errorWithStatus } from "./comps/rules.js";
import { fetchRedfinCsv } from "./comps/sales.js";

// Firecrawl renders the page; this leaves time inside the function's 60s
// limit (vercel.json).
const FIRECRAWL_TIMEOUT_MS = 45000;
// Pages of results per keyword (Zillow shows ~40 a page).
const MAX_PAGES = 2;

// "Pontiac", "MI" → "pontiac-mi", Zillow's city path.
export function zillowCitySlug(city, state) {
  return `${city} ${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The city's Zillow search for homes for sale whose description has
// `keyword` (a phrase in quotes matches exactly): listed by agents and by
// owners, without auctions.
export function zillowSearchUrl(city, state, keyword, page = 1) {
  const query = {
    pagination: page > 1 ? { currentPage: page } : {},
    isMapVisible: false,
    isListVisible: true,
    filterState: {
      att: { value: keyword },
      fsbo: { value: true },
      auc: { value: false },
    },
  };
  return (
    `https://www.zillow.com/${zillowCitySlug(city, state)}/` +
    `${page > 1 ? `${page}_p/` : ""}` +
    `?searchQueryState=${encodeURIComponent(JSON.stringify(query))}`
  );
}

function* walk(value, key) {
  if (Array.isArray(value)) {
    for (const v of value) yield* walk(v, key);
  } else if (value && typeof value === "object") {
    if (key in value) yield value[key];
    for (const v of Object.values(value)) yield* walk(v, key);
  }
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// How a home is being sold, from Zillow's flags.
function saleTypeOf(sub = {}, fallback = null) {
  if (sub.is_FSBO || sub.isFSBO) return "For sale by owner";
  if (sub.is_bankOwned || sub.isBankOwned) return "Bank owned";
  if (sub.is_foreclosure || sub.isForeclosure) return "Foreclosure";
  if (sub.is_newHome || sub.isNewHome) return "New construction";
  if (sub.is_FSBA || sub.isFSBA) return "For sale by agent";
  return fallback;
}

// One Zillow search result → a listing.
export function fromZillowResult(r) {
  const info = r.hdpData?.homeInfo || {};
  const sub = info.listing_sub_type || {};
  const lot =
    info.lotAreaUnit === "acres" && num(info.lotAreaValue)
      ? Math.round(info.lotAreaValue * 43560)
      : num(info.lotAreaValue);
  return {
    zpid: String(r.zpid || info.zpid || ""),
    address: r.address || "",
    street: r.addressStreet || info.streetAddress || "",
    city: r.addressCity || info.city || "",
    state: r.addressState || info.state || "",
    zip: String(r.addressZipcode || info.zipcode || "").slice(0, 5),
    price: num(r.unformattedPrice) ?? num(info.price),
    beds: num(r.beds) ?? num(info.bedrooms),
    baths: num(r.baths) ?? num(info.bathrooms),
    sqft: num(r.area) ?? num(info.livingArea),
    lotSqft: lot ? Math.round(lot) : null,
    homeType: info.homeType || null,
    statusText: r.statusText || null,
    saleType: saleTypeOf(sub, r.marketingStatusSimplifiedCd || null),
    isAuction: Boolean(
      sub.is_forAuction ||
      info.isPreforeclosureAuction ||
      /auction/i.test(`${r.statusText} ${r.marketingStatusSimplifiedCd}`),
    ),
    daysOnMarket: num(info.daysOnZillow),
    zestimate: num(r.zestimate) ?? num(info.zestimate),
    rentZestimate: num(info.rentZestimate),
    taxAssessedValue: num(info.taxAssessedValue),
    broker: r.brokerName || null,
    photo: r.hasImage ? r.imgSrc : null,
    zillowUrl: r.detailUrl || null,
    lat: num(r.latLong?.latitude) ?? num(info.latitude),
    lng: num(r.latLong?.longitude) ?? num(info.longitude),
  };
}

// The listings and page count from a Zillow search page's HTML.
export function parseZillowSearchHtml(html) {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(
    html || "",
  );
  if (!match) return null;
  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }
  const results = walk(data, "listResults").next().value || [];
  return {
    // Auctions aren't deals you can buy outright; they're left out.
    listings: results
      .filter((r) => r.zpid)
      .map(fromZillowResult)
      .filter((l) => !l.isAuction),
    totalPages: walk(data, "totalPages").next().value || 1,
  };
}

// Firecrawl's plan allows so many pages a minute; the page waits the
// seconds it names and tries again.
function throwIfRateLimited(res, data) {
  if (res.status !== 429 && !/rate limit/i.test(data.error || "")) return;
  const error = errorWithStatus(
    "Zillow searches are coming too fast for the scraper's plan.",
    429,
  );
  const seconds = Number(/retry after (\d+)s/i.exec(data.error || "")?.[1]);
  error.retryAfter = seconds > 0 ? seconds : 30;
  throw error;
}

async function fetchZillowPage(url, apiKey) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["rawHtml"],
      onlyMainContent: false,
      proxy: "auto",
      waitFor: 2000,
      timeout: FIRECRAWL_TIMEOUT_MS,
    }),
  });
  const data = await res.json().catch(() => ({}));
  throwIfRateLimited(res, data);
  if (!res.ok || !data.success) {
    throw errorWithStatus(
      `Couldn't load Zillow (${data.error || res.status}). Try again in a minute.`,
      502,
    );
  }
  const parsed = parseZillowSearchHtml(data.data?.rawHtml);
  if (!parsed) {
    throw errorWithStatus(
      "Zillow didn't return its results this time. Try again in a minute.",
      502,
    );
  }
  return parsed;
}

// Zillow listings in the city whose description has `keyword`.
export async function fetchZillowKeyword(city, state, keyword, apiKey) {
  const first = await fetchZillowPage(
    zillowSearchUrl(city, state, keyword),
    apiKey,
  );
  const more = await Promise.all(
    Array.from({ length: Math.min(first.totalPages, MAX_PAGES) - 1 }, (_, i) =>
      fetchZillowPage(zillowSearchUrl(city, state, keyword, i + 2), apiKey)
        .then((p) => p.listings)
        .catch((err) => {
          // A rate limit retries the whole keyword; other misses on a
          // later page just leave it out.
          if (err.status === 429) throw err;
          return [];
        }),
    ),
  );
  // Zillow fills a thin search with nearby towns; keep the city's own.
  const inCity = (l) => !l.city || l.city.toLowerCase() === city.toLowerCase();
  return [...first.listings, ...more.flat()].filter(inCity);
}

const humanize = (id) =>
  String(id || "")
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());

const CONTACT_ROLES = {
  LISTING_AGENT: "Listing agent",
  BROKER: "Brokerage",
  CO_LISTING_AGENT: "Co-listing agent",
  CO_LISTING_AGENT_OFFICE: "Co-listing office",
  PROPERTY_OWNER: "Owner",
};

// Everyone the listing names (agent, brokerage, co-listing agent and
// office, or the owner), each with what Zillow shows for them.
export function listingContacts(property) {
  const contacts = (property.listedBy || [])
    .map((group) => {
      const field = (id) =>
        group.elements?.find((e) => e.id === id)?.text?.trim() || null;
      return {
        role: CONTACT_ROLES[group.id] || humanize(group.id),
        name: field("NAME"),
        phone: field("PHONE"),
        email: field("EMAIL"),
      };
    })
    .filter((c) => c.name || c.phone || c.email);
  if (contacts.length) return contacts;
  // Older pages only have the attribution block.
  const a = property.attributionInfo || {};
  return [
    {
      role: "Listing agent",
      name: a.agentName,
      phone: a.agentPhoneNumber,
      email: a.agentEmail,
    },
    { role: "Brokerage", name: a.brokerName, phone: a.brokerPhoneNumber },
  ].filter((c) => c.name || c.phone || c.email);
}

// A photo's ~1024px version (Zillow lists several widths).
function photoUrl(photo) {
  const sizes = photo?.mixedSources?.jpeg || [];
  const best =
    sizes.filter((s) => s.width <= 1024).sort((a, b) => b.width - a.width)[0] ||
    sizes[0];
  return best?.url || photo?.url || null;
}

const SHOWN_FACTS = new Set([
  "bedrooms",
  "bathrooms",
  "homeType",
  "pricePerSquareFoot",
  "livingArea",
]);

// The Zillow home page's own data → the details the deal window shows.
export function parseZillowDetailsHtml(html) {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(
    html || "",
  );
  if (!match) return null;
  let property;
  try {
    const cache = walk(JSON.parse(match[1]), "gdpClientCache").next().value;
    const entries = typeof cache === "string" ? JSON.parse(cache) : cache;
    property = Object.values(entries || {}).find((e) => e?.property)?.property;
  } catch {
    return null;
  }
  if (!property) return null;
  const facts = Object.entries(property.resoFacts || {})
    .filter(([key]) => !SHOWN_FACTS.has(key))
    .map(([key, value]) => [
      key,
      Array.isArray(value) ? value.filter(Boolean).join(", ") : value,
    ])
    .filter(
      ([, value]) =>
        (typeof value === "string" && value.trim()) ||
        (typeof value === "number" && value > 0),
    )
    .map(([key, value]) => ({
      label: key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase()),
      value: String(value),
    }));
  const photos = (property.responsivePhotos || property.originalPhotos || [])
    .map(photoUrl)
    .filter(Boolean);
  return {
    description: property.description || null,
    photos,
    contacts: listingContacts(property),
    saleType: saleTypeOf(property.listingSubType),
    mlsName: property.attributionInfo?.mlsName || null,
    mlsId: property.attributionInfo?.mlsId || property.mlsid || null,
    yearBuilt: num(property.resoFacts?.yearBuilt),
    hoa: num(property.monthlyHoaFee),
    datePosted: num(property.datePosted)
      ? new Date(property.datePosted).toISOString().slice(0, 10)
      : null,
    pageViews: num(property.pageViewCount),
    saves: num(property.favoriteCount),
    facts,
  };
}

// The full details from a home's Zillow page.
export async function fetchZillowDetails(url, apiKey) {
  let page;
  try {
    page = new URL(url);
  } catch {
    page = null;
  }
  if (
    !page ||
    !/(^|\.)zillow\.com$/.test(page.hostname) ||
    !page.pathname.startsWith("/homedetails/")
  ) {
    throw errorWithStatus("That isn't a Zillow home page.", 400);
  }
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: page.href,
      formats: ["rawHtml"],
      onlyMainContent: false,
      proxy: "auto",
      waitFor: 2000,
      timeout: FIRECRAWL_TIMEOUT_MS,
    }),
  });
  const data = await res.json().catch(() => ({}));
  throwIfRateLimited(res, data);
  if (!res.ok || !data.success) {
    throw errorWithStatus(
      `Couldn't load the Zillow page (${data.error || res.status}). Try again in a minute.`,
      502,
    );
  }
  const details = parseZillowDetailsHtml(data.data?.rawHtml);
  if (!details) {
    throw errorWithStatus(
      "Zillow didn't return this home's details this time. Try again in a minute.",
      502,
    );
  }
  return details;
}

// The city's bounding box, from OpenStreetMap.
async function cityBox(city, state) {
  const params = new URLSearchParams({
    city,
    state,
    country: "USA",
    format: "json",
    limit: "1",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "User-Agent": "YouWinEstatesCRM/1.0 (on-market deals)" } },
  );
  const [place] = res.ok ? await res.json().catch(() => []) : [];
  if (!place?.boundingbox) return null;
  const [south, north, west, east] = place.boundingbox.map(Number);
  return { south, north, west, east };
}

// Redfin's homes for sale in the city.
export async function fetchRedfinForSale(city, state) {
  const box = await cityBox(city, state);
  if (!box) {
    throw errorWithStatus(`Couldn't find ${city}, ${state} on the map.`, 404);
  }
  const { south, north, west, east } = box;
  const poly = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]
    .map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`)
    .join(",");
  const params = new URLSearchParams({
    al: "1",
    num_homes: "350",
    page_number: "1",
    poly,
    status: "1", // for sale
    uipt: "1,2,3,4", // house, condo, townhouse, multi-family
    v: "8",
  });
  const homes = await fetchRedfinCsv(
    `https://www.redfin.com/stingray/api/gis-csv?${params}`,
  );
  // The box takes in parts of neighboring towns.
  return homes.filter((h) => h.city.toLowerCase() === city.toLowerCase());
}

export async function fetchMarketListings(
  { city, state, keyword, redfin, detailsUrl },
  env = process.env,
) {
  if (redfin) return { listings: await fetchRedfinForSale(city, state) };
  if (!env.FIRECRAWL_API_KEY) {
    throw errorWithStatus(
      "On Market Deals isn't set up yet: missing FIRECRAWL_API_KEY.",
      500,
    );
  }
  if (detailsUrl) {
    return {
      details: await fetchZillowDetails(detailsUrl, env.FIRECRAWL_API_KEY),
    };
  }
  return {
    listings: await fetchZillowKeyword(
      city,
      state,
      keyword,
      env.FIRECRAWL_API_KEY,
    ),
  };
}
