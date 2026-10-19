import { splitCompsNotes } from "./compsNote";

const MAX_TITLE_LENGTH = 40;
const MIN_LABELLED_ROWS = 2;

// Field labels lead providers use for property details, so a table can be
// found even when its "Question / Answer" header was cut off.
const KNOWN_LABELS = new Set(
  [
    "Repair scope",
    "Repairs needed",
    "Property condition",
    "Condition",
    "ZIP code",
    "Zip",
    "Property type",
    "Square footage",
    "Sq ft",
    "Year built",
    "Bedrooms",
    "Beds",
    "Bathrooms",
    "Baths",
    "Years of ownership",
    "Years owned",
    "Lot size",
    "Reason for selling",
    "Selling reason",
    "Timeline",
    "Selling timeline",
    "Asking price",
    "Occupancy",
    "Occupied",
    "Mortgage balance",
    "Listed with an agent",
    "Listed with agent",
  ].map((label) => label.toLowerCase()),
);

function isKnownLabel(line) {
  return KNOWN_LABELS.has(line.toLowerCase().replace(/[:?]$/, ""));
}

function isHeaderCell(line) {
  return /^(question|answer)$/i.test(line);
}

// Lead providers send property details as a two-column "Question /
// Answer" table, which lands in the notes one cell per line:
//
//   Property details
//   Question
//   Answer
//   Repair scope
//   Cosmetic updates: flooring, paint, etc.
//   ZIP code
//   78010
//
// Finds that table in a piece of notes text and pairs the cells back up.
// With the "Question / Answer" header every cell after it is paired, and a
// short line just above the header is the table's title. Without it, the
// table is a run of known labels each followed by its value, ending at
// the first line that isn't a known label. Text around the table is kept
// as text. Returns null when there's no such table.
export function splitQaTable(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const header = lines.findIndex(
    (line, i) => /^question$/i.test(line) && /^answer$/i.test(lines[i + 1]),
  );
  if (header !== -1) {
    const before = lines.slice(0, header);
    const hasTitle =
      before.length > 0 && before.at(-1).length <= MAX_TITLE_LENGTH;
    const cells = lines.slice(header + 2);
    const rows = [];
    for (let i = 0; i + 1 < cells.length; i += 2) {
      rows.push({ question: cells[i], answer: cells[i + 1] });
    }
    if (rows.length === 0) return null;
    return {
      before: (hasTitle ? before.slice(0, -1) : before).join("\n"),
      title: hasTitle ? before.at(-1) : "",
      rows,
      after: cells.length % 2 ? cells.at(-1) : "",
    };
  }

  const startsRow = (i) =>
    i + 1 < lines.length &&
    isKnownLabel(lines[i]) &&
    !isKnownLabel(lines[i + 1]) &&
    !isHeaderCell(lines[i + 1]);
  for (let start = 0; start < lines.length; start++) {
    if (!startsRow(start)) continue;
    const rows = [];
    let end = start;
    while (startsRow(end)) {
      rows.push({ question: lines[end], answer: lines[end + 1] });
      end += 2;
    }
    if (rows.length < MIN_LABELLED_ROWS) continue;
    const before = lines.slice(0, start);
    const hasTitle = /^property (details|info(rmation)?)$/i.test(
      before.at(-1) || "",
    );
    return {
      before: (hasTitle ? before.slice(0, -1) : before).join("\n"),
      title: hasTitle ? before.at(-1) : "",
      rows,
      after: lines.slice(end).join("\n"),
    };
  }
  return null;
}

// Whether the notes have anything the formatted notes view lays out (a
// comps note or a Question / Answer table), rather than plain text only.
export function hasFormattedNotes(notes) {
  return splitCompsNotes(notes).some(
    (seg) => seg.type === "comps" || splitQaTable(seg.text),
  );
}
