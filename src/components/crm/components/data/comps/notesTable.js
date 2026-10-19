import { splitCompsNotes } from "./compsNote";

const MAX_TITLE_LENGTH = 40;

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
// A short line just above "Question" is taken as the table's title; other
// text before it, and an odd cell left over at the end, are kept as text.
// Returns null when there's no such table.
export function splitQaTable(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const start = lines.findIndex(
    (line, i) => /^question$/i.test(line) && /^answer$/i.test(lines[i + 1]),
  );
  if (start === -1) return null;

  const before = lines.slice(0, start);
  const hasTitle =
    before.length > 0 && before.at(-1).length <= MAX_TITLE_LENGTH;
  const cells = lines.slice(start + 2);
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

// Whether the notes have anything the formatted notes view lays out (a
// comps note or a Question / Answer table), rather than plain text only.
export function hasFormattedNotes(notes) {
  return splitCompsNotes(notes).some(
    (seg) => seg.type === "comps" || splitQaTable(seg.text),
  );
}
