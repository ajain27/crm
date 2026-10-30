import { createEmptyDealForm } from "../crm/components/crmConfig";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import { PAGE_SIZE } from "../pagination/usePagination";

export const ITEMS_PER_PAGE = PAGE_SIZE;

export const SOURCES = [
  "MLS / Zillow",
  "Cold Call",
  "Propwire",
  "Auction.com",
  "PPL",
];

const PPC_SOURCE_TERMS = [
  "website",
  "ppc",
  "google ad",
  "google ads",
  "adwords",
  "paid search",
  "facebook ad",
  "facebook ads",
  "meta ad",
  "meta ads",
];

// "leadzolo" keeps leads from the old Leadzolo webhook in the PPL tab.
const PPL_SOURCE_TERMS = ["ppl", "pay per lead", "leadzolo"];

export function isPpcLead(lead) {
  if (lead?.ppcSource === true) return true;
  const source = String(lead?.source || "").toLowerCase();
  return PPC_SOURCE_TERMS.some((term) => source.includes(term));
}

// Commercial leads can also be tagged "PPL" as a source but stay in the
// Commercial list.
export function isPplLead(lead) {
  if (lead?.leadType === "commercial") return false;
  if (lead?.pplSource === true) return true;
  const source = String(lead?.source || "").toLowerCase();
  return PPL_SOURCE_TERMS.some((term) => source.includes(term));
}

// Residential leads whose source is "Cold Call" get their own tab
// (PPC and PPL take precedence). Changing the source moves them.
export function isColdCallLead(lead) {
  if (lead?.leadType === "commercial") return false;
  if (isPpcLead(lead) || isPplLead(lead)) return false;
  return /cold ?call/i.test(String(lead?.source || ""));
}

export function isResidentialLead(lead) {
  return (
    (!lead.leadType || lead.leadType === "residential") &&
    !isPpcLead(lead) &&
    !isPplLead(lead) &&
    !isColdCallLead(lead)
  );
}

export function isCommercialLead(lead) {
  return lead.leadType === "commercial";
}

// The Leads tab a lead is listed under, and its name.
const LEAD_TABS = {
  residential: "Residential Leads",
  commercial: "Commercial Leads",
  ppc: "PPC Leads",
  ppl: "PPL Leads",
  coldcall: "Cold Calling",
};

export function leadTabOf(lead) {
  if (isCommercialLead(lead)) return "commercial";
  if (isPpcLead(lead)) return "ppc";
  if (isPplLead(lead)) return "ppl";
  if (isColdCallLead(lead)) return "coldcall";
  return "residential";
}

export const leadTabLabel = (tab) => LEAD_TABS[tab] || LEAD_TABS.residential;

// The tabs a lead can be moved to, in the Leads page's order.
export const LEAD_TAB_IDS = Object.keys(LEAD_TABS);

// The lead as it should be to list under `tab`: its type, the PPC / PPL
// flags and, where the tab goes by it, its source. Anything else is kept.
export function leadForTab(lead, tab) {
  const residential = {
    ...lead,
    leadType: "residential",
    ppcSource: false,
    pplSource: false,
  };
  // Keeps the lead's own source when that alone (without the flags) lists
  // it under `tab`, e.g. "Facebook Ads" for PPC; otherwise `source`.
  const withSource = (moved, source) =>
    leadTabOf({ ...moved, ppcSource: false, pplSource: false }) === tab
      ? moved
      : { ...moved, source };

  switch (tab) {
    case "commercial":
      return {
        ...residential,
        leadType: "commercial",
        // Commercial leads go by a business name and keep the seller's
        // email in `sellerEmail`.
        name: lead.name || lead.address || "",
        sellerEmail: lead.sellerEmail || lead.email || "",
      };
    case "ppc":
      return withSource({ ...residential, ppcSource: true }, "PPC");
    case "ppl":
      return withSource({ ...residential, pplSource: true }, "PPL");
    case "coldcall":
      return withSource(residential, "Cold Call");
    default:
      return withSource(residential, "");
  }
}

// The tab a CRM deal goes back to (see buildLeadFromDeal).
export const dealLeadTab = (deal) =>
  leadTabOf(deal?.fromLead || { source: deal?.source || "" });

// Prefer the full submission timestamp so same-day leads still sort by
// time added; fall back to the day-only date for leads saved before
// dateAddedAt existed.
function leadSortKey(lead) {
  return lead?.dateAddedAt || lead?.dateAdded || "";
}

export function sortNewestFirst(leads) {
  return [...leads].sort((a, b) =>
    leadSortKey(b).localeCompare(leadSortKey(a)),
  );
}

export function leadIdentityKeys(lead) {
  if (lead?.wpLeadId) return [`wp:${lead.wpLeadId}`];

  return [
    [
      lead?.sellerName,
      lead?.email,
      lead?.phone,
      lead?.address,
      lead?.dateAdded,
      lead?.notes,
    ]
      .map((value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      )
      .join("|"),
  ].filter((key) => key.replace(/\|/g, ""));
}

export function leadMatchesAnyKey(lead, keys) {
  return leadIdentityKeys(lead).some((key) => keys.has(key));
}

function leadPrimaryKey(lead) {
  return leadIdentityKeys(lead)[0] || lead?.id || "";
}

export function dedupeLeads(leads) {
  const seen = new Set();
  return leads.filter((lead) => {
    const key = leadPrimaryKey(lead);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function stableWpLeadId(lead) {
  if (lead?.wpLeadId) {
    return `wp-lead-${String(lead.wpLeadId).replace(/[^A-Za-z0-9_-]/g, "-")}`;
  }

  return lead?.id || crypto.randomUUID();
}

function leadAddress(lead) {
  return (
    lead?.address ||
    lead?.propertyAddress ||
    lead?.property_address ||
    lead?.property ||
    ""
  ).trim();
}

function hasUsableAddress(address) {
  const normalized = String(address || "").trim();
  return Boolean(normalized && normalized !== "—" && normalized !== "-");
}

export function createEmptyResidentialForm() {
  return {
    dealType: "Wholesale",
    address: "",
    source: "",
    agentName: "",
    agentPhone: "",
    sellerName: "",
    firstName: "",
    lastName: "",
    askingPrice: "",
    arv: "",
    occupant: "",
    sellingUrgency: "",
    sellerMotivation: "",
    url: "",
    followUpDate: "",
    email: "",
    phone: "",
    onMarket: "No",
    listedPrice: "",
    rent: "",
    occupied: "No",
    offerStatus: "Not Sent",
    sellerAccepted: "No",
    offerPrice: "",
    notes: "",
  };
}

export function createEmptyCommercialForm() {
  return {
    name: "",
    address: "",
    propertyType: "",
    source: "",
    sellerName: "",
    sellerEmail: "",
    state: "",
    website: "",
    phone: "",
    notes: "",
  };
}

// "Jane" + "Doe" → "Jane Doe"; blank parts are dropped.
export function joinName(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

// The seller's full name from their first and last name, falling back to
// the combined name older leads (and some imports) only have.
export function sellerNameOf(lead) {
  return (
    joinName(lead?.firstName, lead?.lastName) ||
    String(lead?.sellerName || "").trim()
  );
}

// "Jane Q Doe" → { firstName: "Jane", lastName: "Q Doe" }, for leads saved
// with only a combined sellerName.
export function splitName(fullName) {
  const [firstName = "", ...rest] = String(fullName || "")
    .trim()
    .split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

// Zillow search URL for an address — Zillow lands on the property page when
// the address matches a single home.
export function zillowUrl(address) {
  const slug = String(address || "")
    .replace(/[#,]/g, " ")
    .trim()
    .replace(/\s+/g, "-");
  return slug
    ? `https://www.zillow.com/homes/${encodeURIComponent(slug)}_rb/`
    : "";
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parses "123 Main St, Dallas, TX 75201" → { address, city, state, zipCode }
const STATE_CODES = new Set(STATE_OPTIONS.map((o) => o.value).filter(Boolean));
// "georgia" → "GA", from labels like "Georgia (GA)".
const STATE_BY_NAME = new Map(
  STATE_OPTIONS.filter((o) => o.value).map((o) => [
    o.label.replace(/\s*\(.*\)$/, "").toLowerCase(),
    o.value,
  ]),
);

// The state code in what follows the city — "GA 30318", "Fulton, GA",
// "Georgia 30318, USA" — skipping counties and the country. Searched from
// the end, where the state sits. "" when there's none.
function findState(parts) {
  for (const part of [...parts].reverse()) {
    const words = part.replace(/\d{5}(-\d{4})?/g, " ").trim();
    const byName = STATE_BY_NAME.get(words.toLowerCase());
    if (byName) return byName;
    const code = words
      .split(/\s+/)
      .reverse()
      .find((w) => STATE_CODES.has(w.toUpperCase()) && w.length === 2);
    if (code) return code.toUpperCase();
  }
  return "";
}

const findZip = (parts) =>
  parts.join(" ").match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] || "";

// "123 Main St, Dallas, TX 75201" → street, city, state and ZIP. Extra
// parts like a county ("…, Atlanta, Fulton, GA 30318") or "USA" are
// skipped when finding the state.
export function parseAddress(full) {
  const parts = String(full || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const rest = parts.slice(2);
    return {
      address: parts[0],
      city: parts[1],
      state: findState(rest),
      zipCode: findZip(rest),
    };
  }
  if (parts.length === 2) {
    const rest = parts.slice(1);
    const state = findState(rest);
    return {
      address: parts[0],
      // "123 Main St, Dallas" — no state, so it's the city.
      city: state ? "" : parts[1],
      state,
      zipCode: findZip(rest),
    };
  }
  return { address: full, city: "", state: "", zipCode: "" };
}

// Case-insensitive "does any of these fields contain the query" check used
// by every lead list's search box.
export function leadMatchesSearch(lead, query, fields) {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((field) =>
    String(lead[field] || "")
      .toLowerCase()
      .includes(q),
  );
}

export function pluralizeLeads(count) {
  return `lead${count !== 1 ? "s" : ""}`;
}

// Slices `items` down to one page and builds the "1–10 of 42 leads" summary
// shown beside the pagination controls. Clamps an out-of-range page (e.g.
// after a filter shrinks the list) to the last page.
export function paginate(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = items.slice(start, safePage * ITEMS_PER_PAGE);
  const summary =
    items.length === 0
      ? "No leads"
      : `${start + 1}–${Math.min(safePage * ITEMS_PER_PAGE, items.length)} of ${items.length} ${pluralizeLeads(items.length)}`;
  return { pageItems, totalPages, page: safePage, summary };
}

// A new deal's notes: the lead's details, then its own notes.
function dealNotesFromLead(lead) {
  return [
    lead.source ? `Source: ${lead.source}` : "Source: Website",
    lead.sellerName ? `Seller: ${lead.sellerName}` : "",
    lead.email ? `Email: ${lead.email}` : "",
    lead.phone ? `Phone: ${lead.phone}` : "",
    lead.askingPrice ? `Asking Price: ${lead.askingPrice}` : "",
    lead.arv ? `ARV: ${lead.arv}` : "",
    lead.occupant ? `Living in Property: ${lead.occupant}` : "",
    lead.sellingUrgency ? `Selling Urgency: ${lead.sellingUrgency}` : "",
    lead.sellerMotivation ? `Seller Motivation: ${lead.sellerMotivation}` : "",
    lead.notes || "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Builds a CRM deal from a lead, or returns null when the lead has no usable
// property address to put on the deal.
export function buildDealFromLead(lead, userId) {
  const fullAddress = leadAddress(lead);
  if (!hasUsableAddress(fullAddress)) return null;

  const { address, city, state, zipCode } = parseAddress(fullAddress);
  // Older leads only have a combined sellerName.
  const { firstName, lastName } =
    lead.firstName || lead.lastName
      ? {
          firstName: String(lead.firstName || "").trim(),
          lastName: String(lead.lastName || "").trim(),
        }
      : splitName(lead.sellerName);
  return {
    ...createEmptyDealForm(),
    id: crypto.randomUUID(),
    userId,
    address,
    city,
    state,
    zipCode,
    listingUrl: lead.url || "",
    agentName: lead.agentName || "",
    agentPhone: lead.agentPhone || "",
    onMarket: lead.onMarket || (lead.source === "MLS / Zillow" ? "Yes" : "No"),
    listedPrice: lead.listedPrice || "",
    sellerFirstName: firstName,
    sellerLastName: lastName,
    sellerPhone: lead.phone || "",
    sellerPhones: lead.phone2 ? [lead.phone2] : [],
    sellerEmail: lead.email || lead.sellerEmail || "",
    askingPrice: lead.askingPrice || "",
    occupant: lead.occupant || "",
    sellingUrgency: lead.sellingUrgency || "",
    sellerMotivation: lead.sellerMotivation || "",
    followUpDate: lead.followUpDate || "",
    // PPL leads collect an ARV; carry it over so the deal's MAO calculates.
    arv:
      Math.round(parseFloat(String(lead.arv || "").replace(/[^0-9.]/g, ""))) ||
      "",
    source: lead.source || "Website",
    // The lead as it was, so the deal can be moved back to Leads. Its
    // photos are deleted with it, so they don't come back.
    fromLead: JSON.parse(JSON.stringify({ ...lead, photos: [] })),
    notes: dealNotesFromLead(lead),
  };
}

// Seller details a lead and its CRM deal both keep, under the same name.
const SHARED_LEAD_FIELDS = [
  "askingPrice",
  "occupant",
  "sellingUrgency",
  "sellerMotivation",
  "followUpDate",
];

// { [field]: value } when value is set on the deal and differs from the
// lead's (blank and missing count as the same), else {}.
function changedField(lead, field, value) {
  if (value === undefined || (value || "") === (lead[field] || "")) return {};
  return { [field]: value };
}

// The lead a CRM deal goes back to Leads as: the lead it was made from
// or, for a deal that wasn't, one built from its seller and property.
export function buildLeadFromDeal(deal, userId) {
  const lead = deal.fromLead;
  if (lead) {
    // Notes added in the CRM come back with it.
    const original = dealNotesFromLead(lead);
    const notes = deal.notes || "";
    const notesNow =
      notes === original
        ? lead.notes || ""
        : notes.startsWith(original)
          ? [lead.notes, notes.slice(original.length).trim()]
              .filter(Boolean)
              .join("\n\n")
          : notes;
    return {
      ...lead,
      phone: deal.sellerPhone || lead.phone || "",
      // Phone 2 and email come back only when they were changed on the deal.
      ...changedField(
        lead,
        "phone2",
        deal.sellerPhones && (deal.sellerPhones[0] || ""),
      ),
      ...changedField(
        lead,
        lead.leadType === "commercial" ? "sellerEmail" : "email",
        deal.sellerEmail,
      ),
      ...SHARED_LEAD_FIELDS.reduce(
        (changed, field) => ({
          ...changed,
          ...changedField(lead, field, deal[field]),
        }),
        {},
      ),
      notes: notesNow,
    };
  }
  const sellerName = joinName(deal.sellerFirstName, deal.sellerLastName);
  return {
    ...createEmptyResidentialForm(),
    id: crypto.randomUUID(),
    userId,
    leadType: "residential",
    sellerName,
    firstName: deal.sellerFirstName || "",
    lastName: deal.sellerLastName || "",
    phone: deal.sellerPhone || "",
    phone2: deal.sellerPhones?.[0] || "",
    email: deal.sellerEmail || "",
    ...Object.fromEntries(
      SHARED_LEAD_FIELDS.map((field) => [field, deal[field] || ""]),
    ),
    address: [
      deal.address,
      deal.city,
      [deal.state, deal.zipCode].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", "),
    url: deal.listingUrl || "",
    agentName: deal.agentName || "",
    agentPhone: deal.agentPhone || "",
    listedPrice: deal.listedPrice || "",
    arv: deal.arv ? String(deal.arv) : "",
    source: deal.source || "",
    notes: deal.notes || "",
    dateAdded: todayStr(),
    dateAddedAt: new Date().toISOString(),
  };
}

// One entry per id, keeping the first.
export function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
