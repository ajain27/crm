// A property's history: its sales, listings and price changes, and its
// tax history, read from its Zillow, Redfin and Realtor.com pages (the
// same pages and the same scrape comps use — SUBJECT_SCHEMA includes the
// history tables) and merged into one timeline.
//
// Env: SERPER_API_KEY, FIRECRAWL_API_KEY.

import { errorWithStatus } from "./comps/rules.js";
import {
  SITES,
  firecrawlExtract,
  isSubjectData,
  pickListingUrls,
  reconcileSubject,
  serperSearch,
  listingQueries,
} from "./comps/subject.js";

// Each site words events its own way; these are what the timeline shows.
const EVENT_KINDS = [
  ["sold", /sold|deed|transfer/i],
  ["pending", /pending|contingent|under contract/i],
  ["delisted", /removed|delisted|withdrawn|expired|cancel|off market/i],
  ["rental", /rent/i],
  ["priceChange", /price|reduc|increas|change/i],
  ["listed", /list|relist|for sale|new/i],
];

export function eventKind(event) {
  const text = String(event || "");
  return EVENT_KINDS.find(([, re]) => re.test(text))?.[0] || "other";
}

// "4/29/2025", "Apr 29, 2025", "2025-04-29" → "2025-04-29"; null when
// unreadable.
export function isoDate(text) {
  const s = String(text || "").trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const time = us ? Date.UTC(us[3], us[1] - 1, us[2]) : Date.parse(s);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

const LABEL = Object.fromEntries(SITES.map((s) => [s.key, s.label]));

// The sites' rows as one timeline, newest first. The same event on the
// same day from several sites is one row listing each site; a price
// missing on one site is taken from another.
export function mergeTimeline(rowsBySite) {
  const byKey = new Map();
  Object.entries(rowsBySite).forEach(([site, rows]) => {
    (rows || []).forEach((row) => {
      const date = isoDate(row.date);
      if (!date) return;
      const kind = eventKind(row.event);
      const key = `${date}|${kind}`;
      const price =
        typeof row.price === "number" && row.price > 0 ? row.price : null;
      const existing = byKey.get(key);
      if (existing) {
        existing.price ??= price;
        if (!existing.sources.includes(LABEL[site])) {
          existing.sources.push(LABEL[site]);
        }
        return;
      }
      byKey.set(key, {
        date,
        kind,
        event: String(row.event || "").trim() || kind,
        price,
        sources: [LABEL[site]],
      });
    });
  });
  return [...byKey.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// Tax rows by year, newest first; for each year the first site (Zillow,
// Redfin, Realtor.com) with a value wins.
export function mergeTaxes(rowsBySite) {
  const byYear = new Map();
  SITES.forEach(({ key }) => {
    (rowsBySite[key] || []).forEach((row) => {
      const year = Number(row.year);
      if (!Number.isInteger(year) || year < 1900) return;
      const prev = byYear.get(year) || { year };
      byYear.set(year, {
        year,
        tax: prev.tax ?? (row.tax > 0 ? row.tax : null),
        assessedValue:
          prev.assessedValue ??
          (row.assessedValue > 0 ? row.assessedValue : null),
      });
    });
  });
  return [...byYear.values()].sort((a, b) => b.year - a.year);
}

// The sales, with how long each owner held the home and the price change
// from the sale before.
export function salesSummary(timeline) {
  const sales = timeline.filter((e) => e.kind === "sold");
  return sales.map((sale, i) => {
    const before = sales[i + 1];
    const years = before
      ? (Date.parse(sale.date) - Date.parse(before.date)) /
        (365.25 * 24 * 60 * 60 * 1000)
      : null;
    return {
      date: sale.date,
      price: sale.price,
      heldYears: years !== null ? Math.round(years * 10) / 10 : null,
      change: before?.price && sale.price ? sale.price - before.price : null,
    };
  });
}

// The timeline, sales and taxes from the scraped pages (`sources`, as
// comps gathers them) that are this house, not a neighbor's; null when
// none are.
export function historyFromSources(sources, address) {
  const usable = Object.entries(sources).filter(([, s]) =>
    isSubjectData(s.data, address),
  );
  if (usable.length === 0) return null;
  const pick = (field) =>
    Object.fromEntries(usable.map(([key, s]) => [key, s.data[field]]));
  const timeline = mergeTimeline(pick("priceHistory"));
  return {
    timeline,
    sales: salesSummary(timeline),
    taxes: mergeTaxes(pick("taxHistory")),
  };
}

export async function fetchPropertyHistory(address, env = process.env) {
  const missing = ["SERPER_API_KEY", "FIRECRAWL_API_KEY"].filter(
    (k) => !env[k],
  );
  if (missing.length) {
    throw errorWithStatus(
      `Property history isn't set up yet: missing ${missing.join(", ")}.`,
      500,
    );
  }

  const listingUrls = pickListingUrls(
    await serperSearch(listingQueries(address), env.SERPER_API_KEY),
    address,
  );
  if (!Object.values(listingUrls).some(Boolean)) {
    throw errorWithStatus(
      "Couldn't find this property on Zillow, Redfin or Realtor.com. Check the address and include the city, state and zip.",
      404,
    );
  }

  const sources = Object.fromEntries(
    await Promise.all(
      SITES.map(async ({ key }) => {
        const url = listingUrls[key];
        if (!url)
          return [key, { url: null, data: null, error: "No page found" }];
        try {
          const data = await firecrawlExtract(url, env.FIRECRAWL_API_KEY);
          return [key, { url, data, error: null }];
        } catch (err) {
          return [key, { url, data: null, error: err.message }];
        }
      }),
    ),
  );
  const history = historyFromSources(sources, address);
  if (!history) {
    throw errorWithStatus(
      "Couldn't read this property's pages. Try again in a minute.",
      502,
    );
  }
  return {
    address,
    listingUrls,
    property: reconcileSubject(sources, address),
    ...history,
    sourceErrors: Object.fromEntries(
      Object.entries(sources)
        .filter(([, s]) => s.error)
        .map(([key, s]) => [key, s.error]),
    ),
  };
}
