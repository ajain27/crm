import { createEmptyDealForm } from "../crm/components/crmConfig";

export const ITEMS_PER_PAGE = 10;

export const SOURCES = ["MLS / Zillow", "Cold Call", "Propwire", "Auction.com"];

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

const PPL_SOURCE_TERMS = ["ppl", "pay per lead", "leadzolo"];

export function isPpcLead(lead) {
  if (lead?.ppcSource === true) return true;
  const source = String(lead?.source || "").toLowerCase();
  return PPC_SOURCE_TERMS.some((term) => source.includes(term));
}

export function isPplLead(lead) {
  if (lead?.pplSource === true) return true;
  const source = String(lead?.source || "").toLowerCase();
  return PPL_SOURCE_TERMS.some((term) => source.includes(term));
}

export function isResidentialLead(lead) {
  return (
    (!lead.leadType || lead.leadType === "residential") &&
    !isPpcLead(lead) &&
    !isPplLead(lead)
  );
}

export function isCommercialLead(lead) {
  return lead.leadType === "commercial";
}

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

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parses "123 Main St, Dallas, TX 75201" → { address, city, state, zipCode }
export function parseAddress(full) {
  const parts = full
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZipRaw = parts.slice(2).join(" ").trim();
    const [state = "", zipCode = ""] = stateZipRaw.split(/\s+/);
    return { address: street, city, state, zipCode };
  }
  if (parts.length === 2) {
    const street = parts[0];
    const [state = "", zipCode = ""] = parts[1].split(/\s+/);
    return { address: street, city: "", state, zipCode };
  }
  return { address: full, city: "", state: "", zipCode: "" };
}

export function followUpStatus(dateStr) {
  if (!dateStr) return null;
  const today = todayStr();
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  return "upcoming";
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

// Builds a CRM deal from a lead, or returns null when the lead has no usable
// property address to put on the deal.
export function buildDealFromLead(lead, userId) {
  const fullAddress = leadAddress(lead);
  if (!hasUsableAddress(fullAddress)) return null;

  const { address, city, state, zipCode } = parseAddress(fullAddress);
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
    sellerPhone: lead.phone || "",
    source: lead.source || "Website",
    notes: [
      lead.source ? `Source: ${lead.source}` : "Source: Website",
      lead.sellerName ? `Seller: ${lead.sellerName}` : "",
      lead.email ? `Email: ${lead.email}` : "",
      lead.phone ? `Phone: ${lead.phone}` : "",
      lead.notes || "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
