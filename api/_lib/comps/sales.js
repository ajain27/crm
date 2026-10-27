// Step 2: candidates — Redfin's sold homes around the subject.

import { COMP_RULES, SEARCH } from "./rules.js";

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
};

export function redfinSoldUrl(
  { lat, lng },
  {
    miles: radius = COMP_RULES.searchRadiusMiles,
    days = COMP_RULES.searchDays,
  } = {},
) {
  // A box a little bigger than the radius; distance is checked exactly
  // afterwards.
  const miles = radius * 1.2;
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
    sold_within_days: String(days),
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
    lotSize: col("LOT SIZE"),
    daysOnMarket: col("DAYS ON MARKET"),
    hoa: col("HOA/MONTH"),
    mls: col("MLS#"),
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
      // Used for listings for sale (On Market Deals); blank on sales.
      city: (r[at.city] || "").trim(),
      zip: (r[at.zip] || "").trim().slice(0, 5),
      lotSqft: toNumber(r[at.lotSize]),
      daysOnMarket: toNumber(r[at.daysOnMarket]),
      hoa: toNumber(r[at.hoa]),
      mls: (r[at.mls] || "").trim() || null,
      lat: toNumber(r[at.lat]),
      lng: toNumber(r[at.lng]),
    }))
    .filter((s) => s.lat !== null && s.lng !== null);
}

export async function fetchRedfinCsv(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
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

// Sales within the search radius over the search's days (by default 1 mi
// and 180 days). Sales Redfin returns for the last 90 days are marked
// `recent` — some regions leave sale dates blank, so this is how they're
// known to meet the 90-day rule.
export async function fetchRedfinSold(location, search = SEARCH) {
  const [recent, older] = await Promise.all([
    fetchRedfinCsv(
      redfinSoldUrl(location, {
        miles: search.miles,
        days: COMP_RULES.soldWithinDays,
      }),
    ),
    fetchRedfinCsv(redfinSoldUrl(location, search)),
  ]);
  const key = (sale) => sale.url || `${sale.street}|${sale.price}`;
  const recentKeys = new Set(recent.map(key));
  const byKey = new Map();
  [...recent, ...older].forEach((sale) => {
    if (!byKey.has(key(sale))) {
      byKey.set(key(sale), { ...sale, recent: recentKeys.has(key(sale)) });
    }
  });
  return [...byKey.values()];
}
