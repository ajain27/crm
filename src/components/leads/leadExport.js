// Turns leads into spreadsheet rows for the CSV download. One column set
// covers every lead type; fields a lead doesn't have are left blank.

const COLUMNS = [
  // Commercial leads use `name`; everything else uses `sellerName`.
  ["Name", (l) => l.sellerName || l.name],
  ["Email", (l) => l.email],
  ["Phone", (l) => l.phone],
  ["Address", (l) => l.address],
  ["State", (l) => l.state],
  ["Source", (l) => l.source],
  ["Deal Type", (l) => l.dealType],
  ["Asking Price", (l) => l.askingPrice],
  ["ARV", (l) => l.arv],
  ["Who's Living in the Property", (l) => l.occupant],
  ["Selling Urgency", (l) => l.sellingUrgency],
  ["Seller Motivation", (l) => l.sellerMotivation],
  ["Agent Name", (l) => l.agentName],
  ["Agent Phone", (l) => l.agentPhone],
  ["Listing / Website URL", (l) => l.url || l.website],
  ["Follow-Up Date", (l) => l.followUpDate],
  ["Date Added", (l) => l.dateAdded],
  ["Notes", (l) => l.notes],
];

// Campaign (PPC/PPL) leads never have an agent, so their export leaves the
// agent columns out and Phone is the only phone column.
const AGENT_COLUMNS = ["Agent Name", "Agent Phone"];

// Header row first, then one row per lead; every cell is a string.
export function leadsToRows(leads, { includeAgent = true } = {}) {
  const columns = includeAgent
    ? COLUMNS
    : COLUMNS.filter(([header]) => !AGENT_COLUMNS.includes(header));
  return [
    columns.map(([header]) => header),
    ...leads.map((lead) =>
      columns.map(([, get]) => {
        const value = get(lead);
        // Leading/trailing blank lines (common in imported notes) would
        // otherwise show as empty lines in the cell.
        return value === undefined || value === null
          ? ""
          : String(value).trim();
      }),
    ),
  ];
}

// Spreadsheet apps run a cell starting with = + - @ as a formula, so a lead
// note like "=HYPERLINK(...)" could execute when the CSV is opened. Prefix
// those with an apostrophe so they stay plain text. Phone numbers like
// "+1 206…" are affected too, but still read correctly.
function neutralizeFormula(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value) {
  const safe = neutralizeFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

// "PPL Leads" → "ppl-leads-2026-10-06"
export function exportBaseName(title) {
  const slug = String(title || "leads")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "leads"}-${new Date().toISOString().slice(0, 10)}`;
}

export function downloadCsv(rows, baseName) {
  // The BOM makes Excel read the file as UTF-8 (names with accents, "—").
  const blob = new Blob(["﻿" + rowsToCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
