import { buildDealFromLead, parseAddress } from "../leadUtils";

// County exports name the same fields many ways ("Situs Address",
// "Property Address", "Site City", "Owner 1 Name"…). Each field lists
// header patterns in priority order; the first column matching one (and not
// excluded) wins. Mailing-address columns are always excluded so the
// owner's mailing address is never taken for the property.
const PROPERTY_PREFIX = "(situs|site|property|prop|location|physical|parcel)";
const MAILING = /mail/i;

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

  return { address, ownerName, firstName, lastName, phone: value("phone") };
}

// Builds a CRM deal from a county record, or null when no property
// address could be found. Every non-empty column goes into the deal's
// notes, so nothing in the record is lost.
export function buildDealFromCountyRecord({ columns, row, fileName, userId }) {
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
      source: "County Records",
      notes: [`County record (${fileName}):`, ...recordLines].join("\n"),
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
