import { splitCompsNotes } from "../../crm/components/data/comps/compsNote";
import { historyToSave } from "../../propertyHistory/propertyHistory";

// One shape for a lead's comps, whichever way they were saved: the
// structured result Run comps now keeps on the lead (`compsResult`, with
// map coordinates), or — for leads that ran comps before that — the comps
// note in their notes, parsed back out (no coordinates; the map looks the
// addresses up).
//
// Returns null when the lead has no comps, else
// { date, arv, rent, subject, comps } where subject and each comp are
// { address, price, beds, baths, sqft, yearBuilt, soldDate, distance,
//   lat, lng, url, differs } (missing values are null).

const numberOrNull = (n) =>
  typeof n === "number" && Number.isFinite(n) ? n : null;

// "$595,900" → 595900; "2,260" → 2260; anything else → null.
function parseNumber(text) {
  if (text == null) return null;
  const n = Number(String(text).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && String(text).trim() !== "" ? n : null;
}

function point(lat, lng) {
  return numberOrNull(lat) !== null && numberOrNull(lng) !== null
    ? { lat, lng }
    : { lat: null, lng: null };
}

function fromResult(result, address) {
  const p = result.property || {};
  return {
    date: result.runAt
      ? new Date(result.runAt).toLocaleDateString("en-US")
      : "",
    arv: numberOrNull(result.arvEstimate),
    rent: numberOrNull(result.rentEstimate),
    subject: {
      address: result.address || address,
      price: null,
      beds: numberOrNull(p.beds),
      baths: numberOrNull(p.baths),
      sqft: numberOrNull(p.sqft),
      yearBuilt: numberOrNull(p.yearBuilt),
      soldDate: null,
      distance: null,
      url: "",
      differs: null,
      ...point(result.location?.lat, result.location?.lng),
    },
    comps: (result.topComps || []).map((c) => ({
      address: c.address,
      price: numberOrNull(c.price),
      beds: numberOrNull(c.beds),
      baths: numberOrNull(c.baths),
      sqft: numberOrNull(c.sqft),
      yearBuilt: numberOrNull(c.yearBuilt),
      soldDate: c.soldDate || null,
      distance: numberOrNull(c.distance),
      url: c.url || "",
      differs: c.differs || null,
      ...point(c.lat, c.lng),
    })),
  };
}

// The facts in a note line like
// "3 bd/2 ba (+1 bed · built 2015) · 2,260 sq ft · built 2015 · sold
// 2026-09-30 · 1.98 mi away" or "2 bd · 2 ba · 2,014 sq ft · built 2001".
export function parseFacts(text) {
  const differs = String(text || "").match(/\(([^)]*)\)/)?.[1] || null;
  const plain = String(text || "").replace(/\s*\([^)]*\)/g, "");
  const beds = plain.match(/([\d.]+) bd\b/)?.[1];
  const baths = plain.match(/([\d.]+) ba\b/)?.[1];
  return {
    beds: parseNumber(beds),
    baths: parseNumber(baths),
    sqft: parseNumber(plain.match(/([\d,]+) sq ft/)?.[1]),
    yearBuilt: parseNumber(plain.match(/built (\d{4})/)?.[1]),
    soldDate: plain.match(/sold (\S+)/)?.[1] || null,
    distance: parseNumber(plain.match(/([\d.]+) mi away/)?.[1]),
    differs,
  };
}

function fromNote(note, address) {
  const subjectFacts = parseFacts(note.property);
  return {
    date: note.date,
    arv: parseNumber(note.arv),
    rent: parseNumber(note.rent),
    subject: {
      address,
      price: null,
      ...subjectFacts,
      soldDate: null,
      distance: null,
      differs: null,
      url: "",
      lat: null,
      lng: null,
    },
    comps: note.comps.map((c) => ({
      address: c.address,
      price: parseNumber(c.price),
      ...parseFacts(c.details),
      url: c.url || "",
      lat: null,
      lng: null,
    })),
  };
}

export function leadComps(lead) {
  const address = String(lead?.address || "").trim();
  if (lead?.compsResult) return fromResult(lead.compsResult, address);
  const note = splitCompsNotes(lead?.notes)
    .filter((seg) => seg.type === "comps")
    .at(-1)?.comps;
  return note ? fromNote(note, address) : null;
}

// The parts of a run-comps response worth keeping on the lead — enough
// for the comps table and map, without the debugging detail.
export function compsResultToSave(result, runAt = new Date()) {
  const p = result.property || {};
  return {
    runAt: runAt.toISOString(),
    address: result.address || "",
    location: result.location
      ? { lat: result.location.lat, lng: result.location.lng }
      : null,
    arvEstimate: numberOrNull(result.arvEstimate),
    rentEstimate: numberOrNull(result.rentEstimate),
    property: {
      beds: numberOrNull(p.beds),
      baths: numberOrNull(p.baths),
      sqft: numberOrNull(p.sqft),
      yearBuilt: numberOrNull(p.yearBuilt),
    },
    // The property's sales, listings and taxes, read in the same run.
    history: historyToSave(result.history, runAt),
    topComps: (result.topComps || []).map((c) => ({
      address: c.address,
      price: numberOrNull(c.price),
      beds: numberOrNull(c.beds),
      baths: numberOrNull(c.baths),
      sqft: numberOrNull(c.sqft),
      yearBuilt: numberOrNull(c.yearBuilt),
      soldDate: c.soldDate || null,
      distance: numberOrNull(c.distance),
      lat: numberOrNull(c.lat),
      lng: numberOrNull(c.lng),
      url: c.url || "",
      differs: c.differs || null,
    })),
  };
}

// Median sale price per sq ft across the comps; null without any.
export function medianPricePerSqft(comps) {
  const values = comps
    .filter((c) => c.price > 0 && c.sqft > 0)
    .map((c) => c.price / c.sqft)
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

// "$595,900" → "$596k"; for the map's price pins.
export function shortPrice(n) {
  if (!(n > 0)) return "—";
  if (n >= 1_000_000) return `$${parseFloat((n / 1_000_000).toFixed(2))}M`;
  return `$${Math.round(n / 1000)}k`;
}
