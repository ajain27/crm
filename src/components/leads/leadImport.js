import { parseCsv } from "./countyRecords/countyRecordsCsv";
import { joinName, splitName, todayStr } from "./leadUtils";
import { fmtCurrencyInput } from "../../utils/utils";
import { leadsToRows } from "./leadExport";

// Turns an uploaded CSV into PPL or commercial leads. Columns are matched by header name
// (case, spaces and punctuation ignored), so the app's own export and most
// lead vendors' files import as they are. Unknown columns are ignored.

const FIELD_HEADERS = {
  sellerName: ["name", "fullname", "sellername", "ownername", "contactname"],
  firstName: ["firstname", "first"],
  lastName: ["lastname", "last"],
  email: ["email", "emailaddress", "selleremail"],
  phone: [
    "phone",
    "phonenumber",
    "mobile",
    "mobilephone",
    "cell",
    "cellphone",
    "sellerphone",
  ],
  phone2: [
    "phone2",
    "phonenumber2",
    "secondphone",
    "secondaryphone",
    "altphone",
    "alternatephone",
    "alternativephone",
    "otherphone",
    "mobile2",
    "cell2",
  ],
  address: ["address", "propertyaddress", "streetaddress", "street"],
  city: ["city", "propertycity"],
  state: ["state", "propertystate"],
  zip: ["zip", "zipcode", "postalcode", "propertyzip"],
  dealType: ["dealtype"],
  askingPrice: ["askingprice", "price"],
  arv: ["arv"],
  occupant: ["whoslivingintheproperty", "occupant", "occupancy"],
  sellingUrgency: ["sellingurgency", "urgency", "timeline"],
  sellerMotivation: ["sellermotivation", "motivation", "reasonforselling"],
  url: ["listingwebsiteurl", "url", "listingurl"],
  followUpDate: ["followupdate"],
  dateAdded: ["dateadded", "date", "createdat", "leaddate"],
  notes: ["notes", "note", "comments", "description"],
};

// Columns of the app's own export, normalized like file headers below.
const EXPORT_HEADERS = new Set(
  leadsToRows([])[0].map((h) =>
    String(h)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""),
  ),
);

const normalizeHeader = (h) =>
  String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// "+1 (206) 555-0100" → "206-555-0100"; anything that isn't a US number
// is kept as typed.
function cleanPhone(value) {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : value;
}

// Any date the browser can read → "YYYY-MM-DD"; blank when unreadable.
function isoDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "";
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "123 Main St" + city/state/zip columns → "123 Main St, Dallas, TX 75201",
// unless the address column already holds the full address.
function fullAddress({ address = "", city = "", state = "", zip = "" }) {
  if (!city || address.toLowerCase().includes(city.toLowerCase())) {
    return address;
  }
  return [address, city, joinName(state, zip)].filter(Boolean).join(", ");
}

const digitsOf = (v) => String(v || "").replace(/\D/g, "");
const addressKey = (v) =>
  String(v || "")
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Phone, email and street address each identify a lead; a row matching an
// existing lead (or an earlier row) on any of them is a duplicate.
function identityKeys(lead) {
  const phone = digitsOf(lead.phone).slice(-10);
  // Commercial leads keep their email in `sellerEmail`.
  const email = String(lead.email || lead.sellerEmail || "")
    .trim()
    .toLowerCase();
  const street = addressKey(lead.address);
  return [
    phone.length === 10 && `phone:${phone}`,
    email && `email:${email}`,
    street.length > 4 && `address:${street}`,
  ].filter(Boolean);
}

// Reads the header row and returns each data row as { field: value } for
// the fields in `fieldHeaders`, or { error } when no `identifying` column
// is present.
function readCsvRows(text, fieldHeaders, identifying) {
  const [header = [], ...rows] = parseCsv(text);
  const columnFor = {};
  const unmatchedHeaders = [];
  const extraColumns = [];
  const fieldFor = (key) =>
    Object.keys(fieldHeaders).find((f) => fieldHeaders[f].includes(key));
  header.forEach((h, i) => {
    const key = normalizeHeader(h);
    // "Seller First Name", "Owner Phone 2", "Contact Email" → the same
    // field as without the prefix.
    const field =
      fieldFor(key) || fieldFor(key.replace(/^(seller|owner|contact)/, ""));
    if (field && !(field in columnFor)) columnFor[field] = i;
    else if (key) {
      unmatchedHeaders.push(String(h).trim());
      // Kept on the lead as extra details, unless it's one of the app's
      // own export columns that this kind of lead doesn't use.
      if (!EXPORT_HEADERS.has(key)) extraColumns.push([String(h).trim(), i]);
    }
  });

  if (!identifying.some((f) => f in columnFor)) {
    return {
      error:
        "Couldn't find any lead columns. The first row should be headers like Name, Email, Phone and Address.",
    };
  }

  return {
    unmatchedHeaders,
    rows: rows.map((row) => ({
      blank: !row.some((cell) => String(cell).trim()),
      extra: Object.fromEntries(
        extraColumns
          .map(([label, i]) => [label, String(row[i] ?? "").trim()])
          .filter(([, value]) => value),
      ),
      values: Object.fromEntries(
        Object.keys(fieldHeaders).map((f) => [
          f,
          f in columnFor ? String(row[columnFor[f]] ?? "").trim() : "",
        ]),
      ),
    })),
  };
}

// Fields an import may fill in on a lead that's already in the list.
const NOT_FILLED = new Set([
  "id",
  "userId",
  "leadType",
  "source",
  "pplSource",
  "dateAdded",
  "dateAddedAt",
  "dealType",
  "extraFields",
]);

const NAME_FIELDS = ["sellerName", "firstName", "lastName"];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

// Builds a lead per row with `toLead`, skipping rows `isEmpty` rejects and
// rows that match an earlier row. A row matching a lead already in the
// list isn't added again; instead its values fill in that lead's blank
// fields (nothing already entered is overwritten) — returned as
// `updates`, each the existing lead with the new values.
function importRows(rows, existingLeads, toLead, isEmpty) {
  const existingByKey = new Map();
  existingLeads.forEach((lead) =>
    identityKeys(lead).forEach((k) => {
      if (!existingByKey.has(k)) existingByKey.set(k, lead);
    }),
  );
  const seen = new Set();
  const leads = [];
  const updated = new Map();
  let skippedEmpty = 0;
  let skippedDuplicates = 0;

  rows.forEach(({ blank, values, extra }) => {
    const lead = toLead(values);
    if (Object.keys(extra).length) lead.extraFields = extra;
    if (isEmpty(lead)) {
      if (!blank) skippedEmpty += 1;
      return;
    }
    const keys = identityKeys(lead);
    const existingKey = keys.find((k) => existingByKey.has(k));
    if (existingKey) {
      const existing = existingByKey.get(existingKey);
      const current = updated.get(existing.id) || existing;
      // A seller name is filled only when the lead has none at all, so a
      // first/last name from the file can't contradict the saved name.
      const hasName = NAME_FIELDS.some((f) => !isBlank(current[f]));
      const fills = Object.fromEntries(
        Object.entries(lead).filter(
          ([field, value]) =>
            !NOT_FILLED.has(field) &&
            !(hasName && NAME_FIELDS.includes(field)) &&
            !isBlank(value) &&
            isBlank(current[field]),
        ),
      );
      // Extra columns: add the ones the lead doesn't have yet.
      const newExtras = Object.fromEntries(
        Object.entries(lead.extraFields || {}).filter(([label]) =>
          isBlank(current.extraFields?.[label]),
        ),
      );
      if (Object.keys(newExtras).length) {
        fills.extraFields = { ...current.extraFields, ...newExtras };
      }
      if (Object.keys(fills).length) {
        updated.set(existing.id, { ...current, ...fills });
      } else {
        skippedDuplicates += 1;
      }
      return;
    }
    if (keys.some((k) => seen.has(k))) {
      skippedDuplicates += 1;
      return;
    }
    keys.forEach((k) => seen.add(k));
    leads.push(lead);
  });

  return {
    leads,
    updates: [...updated.values()],
    skippedEmpty,
    skippedDuplicates,
  };
}

// Residential imports also read the columns the residential export adds.
const RESIDENTIAL_HEADERS = {
  ...FIELD_HEADERS,
  source: ["source", "leadsource"],
  agentName: ["agentname", "agent", "listingagent"],
  agentPhone: ["agentphone", "listingagentphone"],
  listedPrice: ["listedprice", "listprice", "listingprice"],
};

// Seller leads (PPL or residential) from CSV rows; `extra(values)` adds the
// fields that differ between the two.
function csvToSellerLeads(
  text,
  { existingLeads = [], userId = "", now = new Date() },
  headers,
  extra,
) {
  const parsed = readCsvRows(text, headers, [
    "sellerName",
    "firstName",
    "email",
    "phone",
    "address",
  ]);
  if (parsed.error) return parsed;
  const today = todayStr();

  return {
    unmatchedHeaders: parsed.unmatchedHeaders,
    ...importRows(
      parsed.rows,
      existingLeads,
      (values) => {
        const names =
          values.firstName || values.lastName
            ? { firstName: values.firstName, lastName: values.lastName }
            : splitName(values.sellerName);
        return {
          ...names,
          sellerName:
            values.sellerName || joinName(names.firstName, names.lastName),
          email: values.email,
          phone: values.phone ? cleanPhone(values.phone) : "",
          phone2: values.phone2 ? cleanPhone(values.phone2) : "",
          address: fullAddress(values),
          dealType: values.dealType || "Wholesale",
          askingPrice: fmtCurrencyInput(values.askingPrice),
          arv: fmtCurrencyInput(values.arv),
          occupant: values.occupant,
          sellingUrgency: values.sellingUrgency,
          sellerMotivation: values.sellerMotivation,
          url: values.url,
          followUpDate: values.followUpDate ? isoDate(values.followUpDate) : "",
          notes: values.notes,
          id: crypto.randomUUID(),
          userId,
          leadType: "residential",
          dateAdded: (values.dateAdded && isoDate(values.dateAdded)) || today,
          dateAddedAt: now.toISOString(),
          ...extra(values),
        };
      },
      (lead) => !lead.sellerName && !lead.email && !lead.phone && !lead.address,
    ),
  };
}

// Returns { leads, skippedEmpty, skippedDuplicates, unmatchedHeaders }, or
// { error } when the file has no usable columns.
export function csvToPplLeads(text, options = {}) {
  return csvToSellerLeads(text, options, FIELD_HEADERS, () => ({
    source: "PPL",
    pplSource: true,
  }));
}

// Same as csvToPplLeads, for the Residential list: the file's own Source
// column is kept, along with any agent and listed price.
export function csvToResidentialLeads(text, options = {}) {
  return csvToSellerLeads(text, options, RESIDENTIAL_HEADERS, (values) => ({
    source: values.source,
    agentName: values.agentName,
    agentPhone: values.agentPhone ? cleanPhone(values.agentPhone) : "",
    listedPrice: fmtCurrencyInput(values.listedPrice),
  }));
}

const COMMERCIAL_HEADERS = {
  name: [
    "name",
    "businessname",
    "business",
    "company",
    "companyname",
    "propertyname",
  ],
  sellerName: ["sellername", "ownername", "owner", "contactname", "contact"],
  firstName: FIELD_HEADERS.firstName,
  lastName: FIELD_HEADERS.lastName,
  sellerEmail: ["email", "emailaddress", "selleremail"],
  phone: FIELD_HEADERS.phone,
  phone2: FIELD_HEADERS.phone2,
  address: FIELD_HEADERS.address,
  city: FIELD_HEADERS.city,
  state: FIELD_HEADERS.state,
  zip: FIELD_HEADERS.zip,
  propertyType: ["propertytype", "type"],
  source: ["source", "leadsource"],
  website: ["website", "websiteurl", "listingwebsiteurl", "url", "listingurl"],
  dateAdded: FIELD_HEADERS.dateAdded,
  notes: FIELD_HEADERS.notes,
};

// Commercial leads, e.g. a list of RV parks or campgrounds. Same rules as
// the PPL import; the app's own commercial export imports as is.
export function csvToCommercialLeads(
  text,
  { existingLeads = [], userId = "", now = new Date() } = {},
) {
  const parsed = readCsvRows(text, COMMERCIAL_HEADERS, [
    "name",
    "sellerName",
    "firstName",
    "phone",
    "address",
  ]);
  if (parsed.error) return parsed;
  const today = todayStr();

  return {
    unmatchedHeaders: parsed.unmatchedHeaders,
    ...importRows(
      parsed.rows,
      existingLeads,
      (values) => ({
        name: values.name,
        ...(values.firstName || values.lastName
          ? { firstName: values.firstName, lastName: values.lastName }
          : splitName(values.sellerName)),
        sellerName:
          values.sellerName || joinName(values.firstName, values.lastName),
        sellerEmail: values.sellerEmail,
        phone: values.phone ? cleanPhone(values.phone) : "",
        phone2: values.phone2 ? cleanPhone(values.phone2) : "",
        address: fullAddress(values),
        state: values.state,
        propertyType: values.propertyType,
        source: values.source,
        website: values.website,
        notes: values.notes,
        id: crypto.randomUUID(),
        userId,
        leadType: "commercial",
        dateAdded: (values.dateAdded && isoDate(values.dateAdded)) || today,
        dateAddedAt: now.toISOString(),
      }),
      (lead) => !lead.name && !lead.sellerName && !lead.phone && !lead.address,
    ),
  };
}
