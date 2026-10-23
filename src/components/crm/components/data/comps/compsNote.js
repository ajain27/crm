// Formatting shared by the comps window, the deal note and the Find Comps
// tab: the comp rules applied, what they excluded, and the note itself.

const money = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";

const num = (n, suffix = "") =>
  typeof n === "number" && Number.isFinite(n)
    ? `${n.toLocaleString("en-US")}${suffix}`
    : "—";

export function pricePerSqft(comp) {
  return comp.price > 0 && comp.sqft > 0 ? comp.price / comp.sqft : null;
}

const UNKNOWN_LABELS = {
  beds: "beds",
  baths: "baths",
  yearBuilt: "year built",
};

// "Sold within 0.5 mi in the last 90 days · 3 bd · 1 ba · built 1967–1977"
export function compsCriteriaText(result) {
  const c = result.criteria;
  if (!c) return "";
  const parts = [
    `Sold within ${c.radiusMiles} mi in the last ${c.soldWithinDays} days`,
    c.beds ? `${c.beds} bd` : null,
    c.baths ? `${c.baths} ba` : null,
    c.yearBuiltFrom ? `built ${c.yearBuiltFrom}–${c.yearBuiltTo}` : null,
    c.highwayCheck ? "same side of major highways" : null,
  ].filter(Boolean);
  const unknown = (c.unknown || []).map((f) => UNKNOWN_LABELS[f] || f);
  return (
    parts.join(" · ") +
    (unknown.length
      ? ` (the property's ${unknown.join(", ")} couldn't be found, so not applied)`
      : "") +
    (c.highwayCheck === false
      ? " (major highways couldn't be checked this time)"
      : "")
  );
}

const EXCLUDED_LABELS = {
  distance: "too far",
  soldDate: "sold too long ago",
  beds: "different beds",
  baths: "different baths",
  yearBuilt: "built outside the range",
  propertyType: "different property type",
};

// "30 homes sold within 1 mi in the last 6 months; 3 meet every rule
// (others: 4 too far, …). 2 of the comps shown fall outside the rules."
// When none sold that close, the wider search is said to be widened.
export function compsStatsText(result) {
  const s = result.stats;
  const c = result.criteria || {};
  if (!s) return "";
  const area = c.searchRadiusMiles
    ? ` within ${c.searchRadiusMiles} mi in the last ${Math.round(c.searchDays / 30)} months`
    : " nearby";
  const excluded = Object.entries(s.excluded || {})
    .filter(([, count]) => count > 0)
    .map(([rule, count]) => `${count} ${EXCLUDED_LABELS[rule] || rule}`);
  const across = s.acrossHighway
    ? ` ${s.acrossHighway} across a major highway ${s.acrossHighway === 1 ? "was" : "were"} left out.`
    : "";
  const distressed = s.distressed
    ? ` ${s.distressed} distressed ${s.distressed === 1 ? "sale was" : "sales were"} left out.`
    : "";
  const removed = s.removedByAi?.length
    ? ` AI removed ${s.removedByAi.length} as poor comps.`
    : "";
  const outside = s.outsideRules
    ? ` ${s.outsideRules} of the comps shown ${s.outsideRules === 1 ? "falls" : "fall"} outside the rules.`
    : "";
  const widened = c.widened
    ? "None sold within 1 mi in the last 6 months, so the search widened: "
    : "";
  return (
    widened +
    `${s.nearbySales} home${s.nearbySales === 1 ? "" : "s"} sold${area}; ` +
    `${s.matched} ${s.matched === 1 ? "meets" : "meet"} every rule` +
    (excluded.length ? ` (others: ${excluded.join(", ")})` : "") +
    `.${across}${distressed}${outside}${removed}`
  );
}

export function compDetailsText(comp) {
  return [
    `${num(comp.beds)} bd/${num(comp.baths)} ba` +
      (comp.differs ? ` (${comp.differs})` : ""),
    comp.sqft ? num(comp.sqft, " sq ft") : null,
    comp.yearBuilt ? `built ${comp.yearBuilt}` : null,
    comp.soldDate ? `sold ${comp.soldDate}` : null,
    typeof comp.distance === "number" ? `${comp.distance} mi away` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatCompsNote(result, date = new Date()) {
  const p = result.property || {};
  const lines = [
    `Comps (${date.toLocaleDateString("en-US")}):`,
    `ARV estimate: ${money(result.arvEstimate)} · Rent estimate: ${money(result.rentEstimate)}/mo`,
    `Property: ${num(p.beds)} bd · ${num(p.baths)} ba · ${num(p.sqft, " sq ft")} · built ${p.yearBuilt ?? "—"} · tax ${money(p.annualTax)}/yr`,
  ];
  if (result.criteria) lines.push(`Rules: ${compsCriteriaText(result)}`);
  if (result.stats) lines.push(compsStatsText(result));
  (result.topComps || []).forEach((comp, i) => {
    const ppsf = pricePerSqft(comp);
    lines.push(
      `${i + 1}. ${comp.address} — ${money(comp.price)}` +
        `${ppsf ? ` (${money(ppsf)}/sq ft)` : ""}` +
        ` · ${compDetailsText(comp)}` +
        `${comp.url ? ` · ${comp.url}` : ""}`,
    );
  });
  if (result.summary) lines.push(result.summary);
  lines.push(
    result.method === "claude"
      ? "Comps reviewed and picked by Claude."
      : "Comps ordered by distance, then most recent sale.",
  );
  const sourceLinks = Object.entries(result.listingUrls || {})
    .filter(([, url]) => url)
    .map(([, url]) => url);
  if (sourceLinks.length) lines.push(`Sources: ${sourceLinks.join(" · ")}`);
  return lines.join("\n");
}

const METHOD_LINES = [
  "Comps reviewed and picked by Claude.",
  "Comps ordered by distance, then most recent sale.",
];

const COMP_LINE = /^\d+\. (.+?) — (\S+)(?: \((\S+)\/sq ft\))? · (.*)$/;

// Turns one note block written by formatCompsNote back into its parts, or
// null when the block isn't a comps note.
function parseCompsBlock(lines) {
  const head = lines[0].match(/^Comps \((.+)\):$/);
  const est = lines[1]?.match(
    /^ARV estimate: (\S+) · Rent estimate: (\S+)\/mo$/,
  );
  if (!head || !est) return null;
  const note = {
    date: head[1],
    arv: est[1],
    rent: est[2],
    property: "",
    rules: "",
    stats: "",
    comps: [],
    summary: [],
    method: "",
    sources: [],
  };
  for (const line of lines.slice(2)) {
    const comp = line.match(COMP_LINE);
    if (line.startsWith("Property: ")) {
      note.property = line.slice("Property: ".length);
    } else if (line.startsWith("Rules: ")) {
      note.rules = line.slice("Rules: ".length);
    } else if (/ every rule\b/.test(line) && !note.stats) {
      note.stats = line;
    } else if (comp) {
      const parts = comp[4].split(" · ");
      const url = /^https?:\/\//.test(parts.at(-1)) ? parts.pop() : "";
      note.comps.push({
        address: comp[1],
        price: comp[2],
        ppsf: comp[3] || "",
        details: parts.join(" · "),
        url,
      });
    } else if (METHOD_LINES.includes(line)) {
      note.method = line;
    } else if (line.startsWith("Sources: ")) {
      note.sources = line.slice("Sources: ".length).split(" · ");
    } else {
      note.summary.push(line);
    }
  }
  note.summary = note.summary.join("\n");
  return note;
}

// Splits free-form notes into plain-text and comps-note segments, so a
// comps note can be shown laid out instead of as one run of text. Notes
// are separated by blank lines (see handleSaveCompsNote).
export function splitCompsNotes(notes) {
  const segments = [];
  const pushText = (text) => {
    const last = segments.at(-1);
    if (last?.type === "text") last.text += `\n\n${text}`;
    else segments.push({ type: "text", text });
  };
  for (const block of (notes || "").split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const comps = parseCompsBlock(trimmed.split("\n").map((l) => l.trim()));
    if (comps) segments.push({ type: "comps", comps });
    else pushText(trimmed);
  }
  return segments;
}

// The notes with a new comps note in place of any earlier one; other
// notes are kept as they are.
export function withCompsNote(notes, note) {
  const kept = (notes || "").split(/\n\s*\n/).filter(
    (block) =>
      block.trim() &&
      !parseCompsBlock(
        block
          .trim()
          .split("\n")
          .map((l) => l.trim()),
      ),
  );
  return [...kept, note].join("\n\n");
}

export { requestComps } from "../../../../../services/compsService";
