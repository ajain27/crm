// CSV parsing and storage chunking for County Records imports.

const DELIMITERS = [",", "\t", ";", "|"];

// Counties export comma-, tab- or semicolon-separated files; pick whichever
// separator appears most in the header line (outside quotes).
function detectDelimiter(text) {
  const counts = Object.fromEntries(DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  return DELIMITERS.reduce((best, d) => (counts[d] > counts[best] ? d : best));
}

// RFC 4180 parsing: quoted fields may hold the delimiter, line breaks and
// doubled quotes (""). Returns an array of rows, each an array of strings.
export function parseCsv(input) {
  const text = String(input || "").replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// First row is the header. Blank headers become "Column N" and repeated
// ones get " (2)", " (3)"… so every column has a unique name. Rows are
// padded/trimmed to the header width; blank rows are dropped. A row longer
// than the header adds extra "Column N" headers rather than losing data.
export function toCountyRecords(parsedRows) {
  const [rawHeader = [], ...rawBody] = parsedRows;
  const body = rawBody
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell !== ""));
  // A loop, not Math.max(...spread): large files exceed the argument limit.
  const width = body.reduce((w, r) => Math.max(w, r.length), rawHeader.length);

  const seen = new Map();
  const columns = Array.from({ length: width }, (_, i) => {
    const base = String(rawHeader[i] ?? "").trim() || `Column ${i + 1}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });

  const rows = body.map((r) =>
    Array.from({ length: width }, (_, i) => r[i] ?? ""),
  );
  return { columns, rows };
}

const MAX_CHUNK_BYTES = 900_000;
const encoder = new TextEncoder();

// Splits rows into JSON strings each under ~900KB (UTF-8), so every chunk
// fits in a Firestore document (1MB limit, with room for the other fields).
export function chunkRows(rows, maxBytes = MAX_CHUNK_BYTES) {
  const chunks = [];
  let current = [];
  let size = 2; // "[]"
  for (const row of rows) {
    const rowBytes = encoder.encode(JSON.stringify(row)).length + 1;
    if (current.length > 0 && size + rowBytes > maxBytes) {
      chunks.push(JSON.stringify(current));
      current = [];
      size = 2;
    }
    current.push(row);
    size += rowBytes;
  }
  if (current.length > 0) chunks.push(JSON.stringify(current));
  return chunks;
}

// "$4,210.55" → 4210.55, "(1,200)" → -1200; null for non-numbers.
function cellNumber(value) {
  const text = String(value).trim();
  if (!/^\(?-?\$?\s*[\d,]*\.?\d+\s*\)?%?$/.test(text)) return null;
  const n = parseFloat(text.replace(/[$,%()\s]/g, ""));
  if (Number.isNaN(n)) return null;
  return /^\(.*\)$/.test(text) ? -Math.abs(n) : n;
}

// Sort order for two cells of one column: numbers (money included) by
// value, other text alphabetically with digits compared as numbers ("Unit
// 2" before "Unit 10"). Blank cells always sort last, whichever direction.
export function compareCells(a, b, direction = "asc") {
  const aBlank = !String(a ?? "").trim();
  const bBlank = !String(b ?? "").trim();
  if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1;
  const aNum = cellNumber(a);
  const bNum = cellNumber(b);
  const order =
    aNum !== null && bNum !== null
      ? aNum - bNum
      : String(a).localeCompare(String(b), undefined, {
          numeric: true,
          sensitivity: "base",
        });
  return direction === "desc" ? -order : order;
}
