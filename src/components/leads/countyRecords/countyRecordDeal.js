import { buildDealFromLead, parseAddress } from "../leadUtils";

// County exports name the same fields many ways ("Situs Address",
// "Property Address", "Site City", "Owner 1 Name"…). Each field lists
// header patterns in priority order; the first column matching one (and not
// excluded) wins. Mailing-address columns are always excluded so the
// owner's mailing address is never taken for the property.
const PROPERTY_PREFIX = "(situs|site|property|prop|location|physical|parcel)";
const MAILING = /mail/i;

// Columns holding a phone number ("Phone", "Phone 2", "Cell", "Mobile"…).
export const PHONE_COLUMN = /phone|cell|mobile|\btel\b|telephone/i;
export const PHONE_NUMBER =
  /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

// Every phone number in a cell: "(313) 274-5192; (727) 785-9729" → both.
export function phoneNumbers(text) {
  return [...String(text || "").matchAll(PHONE_NUMBER)].map((m) => m[0]);
}

const FIELDS = {
  street: {
    patterns: [
      new RegExp(`^${PROPERTY_PREFIX}\\b.*\\b(address|addr|street)\\b`, "i"),
      new RegExp(`^${PROPERTY_PREFIX}$`, "i"),
      /^(street\s*)?address(\s*(line\s*)?1)?$/i,
      /\b(address|addr)\b/i,
    ],
    exclude: /mail|city|state|zip|postal|owner/i,
  },
  city: {
    patterns: [
      new RegExp(`^${PROPERTY_PREFIX}\\b.*\\bcity\\b`, "i"),
      /\bcity\b/i,
    ],
  },
  state: {
    patterns: [
      new RegExp(`^${PROPERTY_PREFIX}\\b.*\\bstate\\b`, "i"),
      /^state$/i,
      /\bstate\b/i,
    ],
  },
  zip: {
    patterns: [
      new RegExp(`^${PROPERTY_PREFIX}\\b.*\\b(zip|postal)`, "i"),
      /\b(zip|postal)/i,
    ],
  },
  ownerName: {
    patterns: [
      /^owner\s*1?\s*(full\s*)?name$/i,
      /^owner\s*1?$/i,
      /\bowner\b.*\bname\b/i,
      /^(full\s*)?name$/i,
    ],
    exclude: /mail|first|last|address|addr/i,
  },
  firstName: { patterns: [/\bowner\b.*\bfirst\b/i, /^first\s*name$/i] },
  lastName: { patterns: [/\bowner\b.*\blast\b/i, /^last\s*name$/i] },
  phone: { patterns: [/phone|cell|mobile/i] },
  county: {
    patterns: [
      new RegExp(`^${PROPERTY_PREFIX}\\b.*\\bcounty\\b`, "i"),
      /\bcounty\b/i,
    ],
  },
};

function findColumn(columns, { patterns, exclude = MAILING }) {
  for (const pattern of patterns) {
    const index = columns.findIndex((c) => pattern.test(c) && !exclude.test(c));
    if (index !== -1) return index;
  }
  return -1;
}

// "Amount Due", "Total Due", "Balance Due", "Taxes Due", "Delinquent
// Amount"… — shown in red.
const AMOUNT_DUE_COLUMN =
  /\b(amount|amt|total|balance|bal|tax(es)?)\s*(due|owed|owing)\b|\bdue\s*(amount|amt)\b|\bdelinquen\w*\s*(amount|amt|balance|total|tax(es)?)\b/i;

export function isAmountDueColumn(column) {
  return AMOUNT_DUE_COLUMN.test(column);
}

// Index of the column holding `field` (e.g. "city", "county"), or -1.
export function findFieldColumn(columns, field) {
  return findColumn(columns, FIELDS[field]);
}

// The order columns are shown in, as indexes into `columns`: the file's
// order, with the phone columns moved right after the ZIP code (rows stay
// stored in the file's order).
export function displayColumnOrder(columns) {
  const order = columns.map((_, i) => i);
  const zip = findColumn(columns, FIELDS.zip);
  if (zip === -1) return order;
  const phones = order.filter(
    (i) => i !== zip && PHONE_COLUMN.test(columns[i]),
  );
  const rest = order.filter((i) => !phones.includes(i));
  rest.splice(rest.indexOf(zip) + 1, 0, ...phones);
  return rest;
}

// The record's key fields, pulled out by column name. Blank when the file
// has no matching column.
export function countyRecordFields(columns, row) {
  const value = (field) => {
    const index = findColumn(columns, FIELDS[field]);
    return index === -1 ? "" : String(row[index] || "").trim();
  };

  const street = value("street");
  const city = value("city");
  const stateZip = [value("state"), value("zip")].filter(Boolean).join(" ");
  // Some counties put the whole address in one column.
  const address =
    street.includes(",") && !city
      ? street
      : [street, city, stateZip].filter(Boolean).join(", ");

  const firstName = value("firstName");
  const lastName = value("lastName");
  const ownerName =
    value("ownerName") || [firstName, lastName].filter(Boolean).join(" ");

  // Every number in every phone column (fax and mailing ones aside), each
  // once.
  const seen = new Set();
  const phones = columns
    .flatMap((column, i) =>
      PHONE_COLUMN.test(column) && !/fax|mail/i.test(column)
        ? phoneNumbers(row[i])
        : [],
    )
    .filter((phone) => {
      const digits = phone.replace(/\D/g, "").slice(-10);
      if (seen.has(digits)) return false;
      seen.add(digits);
      return true;
    });

  return {
    address,
    ownerName,
    firstName,
    lastName,
    phone: phones[0] || value("phone"),
    phones,
  };
}

// Builds a CRM deal from a county record, or null when no property
// address could be found. Every non-empty column goes into the deal's
// notes, so nothing in the record is lost.
// `comps` ({ note, arv }, optional): comps run on the record, added to the
// deal's notes and ARV.
export function buildDealFromCountyRecord({
  columns,
  row,
  fileName,
  userId,
  comps,
}) {
  const fields = countyRecordFields(columns, row);
  const recordLines = columns
    .map((column, i) => (row[i] ? `${column}: ${row[i]}` : ""))
    .filter(Boolean);

  return buildDealFromLead(
    {
      address: fields.address,
      sellerName: fields.ownerName,
      firstName: fields.firstName,
      lastName: fields.lastName,
      phone: fields.phone,
      phones: fields.phones.slice(1),
      source: "County Records",
      arv: comps?.arv || "",
      notes: [
        [`County record (${fileName}):`, ...recordLines].join("\n"),
        comps?.note,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    userId,
  );
}

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Street + city, normalized — used to tell whether a record's property is
// already a deal in the CRM.
export function propertyKey({ address, city }) {
  return address ? `${normalize(address)}|${normalize(city)}` : "";
}

export function countyRecordPropertyKey(columns, row) {
  const { address } = countyRecordFields(columns, row);
  return address ? propertyKey(parseAddress(address)) : "";
}
