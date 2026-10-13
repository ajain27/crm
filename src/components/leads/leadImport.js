import { parseCsv } from "./countyRecords/countyRecordsCsv";
import { joinName, splitName, todayStr } from "./leadUtils";

// Turns an uploaded CSV into PPL leads. Columns are matched by header name
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
  const email = String(lead.email || "")
    .trim()
    .toLowerCase();
  const street = addressKey(lead.address);
  return [
    phone.length === 10 && `phone:${phone}`,
    email && `email:${email}`,
    street.length > 4 && `address:${street}`,
  ].filter(Boolean);
}

// Returns { leads, skippedEmpty, skippedDuplicates, unmatchedHeaders }, or
// { error } when the file has no usable columns.
export function csvToPplLeads(
  text,
  { existingLeads = [], userId = "", now = new Date() } = {},
) {
  const [header = [], ...rows] = parseCsv(text);
  const columnFor = {};
  const unmatchedHeaders = [];
  header.forEach((h, i) => {
    const key = normalizeHeader(h);
    const field = Object.keys(FIELD_HEADERS).find((f) =>
      FIELD_HEADERS[f].includes(key),
    );
    if (field && !(field in columnFor)) columnFor[field] = i;
    else if (key) unmatchedHeaders.push(String(h).trim());
  });

  const identifying = ["sellerName", "firstName", "email", "phone", "address"];
  if (!identifying.some((f) => f in columnFor)) {
    return {
      error:
        "Couldn't find any lead columns. The first row should be headers like Name, Email, Phone and Address.",
    };
  }

  const seen = new Set(existingLeads.flatMap(identityKeys));
  const leads = [];
  let skippedEmpty = 0;
  let skippedDuplicates = 0;
  const today = todayStr();

  rows.forEach((row) => {
    const get = (field) =>
      field in columnFor ? String(row[columnFor[field]] ?? "").trim() : "";
    const values = Object.fromEntries(
      Object.keys(FIELD_HEADERS).map((f) => [f, get(f)]),
    );

    const names =
      values.firstName || values.lastName
        ? { firstName: values.firstName, lastName: values.lastName }
        : splitName(values.sellerName);
    const lead = {
      ...names,
      sellerName:
        values.sellerName || joinName(names.firstName, names.lastName),
      email: values.email,
      phone: values.phone ? cleanPhone(values.phone) : "",
      address: fullAddress(values),
      dealType: values.dealType || "Wholesale",
      askingPrice: values.askingPrice,
      arv: values.arv,
      occupant: values.occupant,
      sellingUrgency: values.sellingUrgency,
      sellerMotivation: values.sellerMotivation,
      url: values.url,
      followUpDate: values.followUpDate ? isoDate(values.followUpDate) : "",
      notes: values.notes,
    };

    if (!lead.sellerName && !lead.email && !lead.phone && !lead.address) {
      if (row.some((cell) => String(cell).trim())) skippedEmpty += 1;
      return;
    }
    const keys = identityKeys(lead);
    if (keys.some((k) => seen.has(k))) {
      skippedDuplicates += 1;
      return;
    }
    keys.forEach((k) => seen.add(k));

    leads.push({
      ...lead,
      id: crypto.randomUUID(),
      userId,
      leadType: "residential",
      source: "PPL",
      pplSource: true,
      dateAdded: (values.dateAdded && isoDate(values.dateAdded)) || today,
      dateAddedAt: now.toISOString(),
    });
  });

  return { leads, skippedEmpty, skippedDuplicates, unmatchedHeaders };
}
