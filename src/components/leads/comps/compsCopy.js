import { medianPricePerSqft } from "./leadComps";

// Formatting shared by the comps panel and its "Copy comps" text.
export const money = (n) =>
  typeof n === "number" && Number.isFinite(n) && n > 0
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";

export const num = (n) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "—";

export const parseMoney = (text) => {
  const n = Number(String(text || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "2026-09-30" → "9/30/26"
export function shortDate(date) {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1].slice(2)}` : date || "";
}

const CONDITION_LABELS = { renovated: "Renovated", "as-is": "As-is" };

const cleanAddress = (address) =>
  String(address || "").replace(/, USA$/, "") || "Unknown address";

const has = (n) => typeof n === "number" && Number.isFinite(n);

const perSqft = (home) =>
  home.price > 0 && home.sqft > 0 ? home.price / home.sqft : null;

// "3 bd / 2 ba · 1,500 sq ft · lot 6,899 sq ft · built 1990", leaving out
// whatever the home doesn't have.
function factsLine(home) {
  const bedBath = [
    has(home.beds) ? `${num(home.beds)} bd` : "",
    has(home.baths) ? `${num(home.baths)} ba` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  return [
    bedBath,
    has(home.sqft) ? `${num(home.sqft)} sq ft` : "",
    has(home.lotSqft) ? `lot ${num(home.lotSqft)} sq ft` : "",
    home.yearBuilt ? `built ${home.yearBuilt}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function saleLine(home) {
  const ppsf = perSqft(home);
  return [
    home.price > 0
      ? `Sold ${money(home.price)}${home.soldDate ? ` on ${shortDate(home.soldDate)}` : ""}`
      : "",
    ppsf ? `${money(ppsf)}/sq ft` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function headline(comps, lead) {
  const arv = parseMoney(lead?.arv) ?? comps.arv;
  const estimates =
    comps.estimates?.average != null
      ? ` (Zestimate ${money(comps.estimates.zestimate)} · Redfin ${money(comps.estimates.redfinEstimate)})`
      : "";
  return [
    arv > 0 ? `ARV: ${money(arv)}${estimates}` : "",
    medianPricePerSqft(comps.comps)
      ? `Median price/sq ft: ${money(medianPricePerSqft(comps.comps))}`
      : "",
    comps.rent > 0 ? `Rent estimate: ${money(comps.rent)}/mo` : "",
  ].filter(Boolean);
}

// The comps as plain text that reads well pasted into a text, email or
// note: the subject and headline figures, then one numbered block per comp.
export function compsToText(comps, lead) {
  const subject = comps.subject || {};
  const lines = [`Comps for ${cleanAddress(subject.address)}`];
  const subjectFacts = factsLine(subject);
  if (subjectFacts) lines.push(`Subject: ${subjectFacts}`);
  lines.push(...headline(comps, lead));

  (comps.comps || []).forEach((home, i) => {
    lines.push("");
    const distance = home.distance != null ? ` — ${home.distance} mi` : "";
    const condition = CONDITION_LABELS[home.condition]
      ? ` [${CONDITION_LABELS[home.condition]}]`
      : "";
    lines.push(
      `${i + 1}. ${cleanAddress(home.address)}${distance}${condition}`,
    );
    const sale = saleLine(home);
    if (sale) lines.push(`   ${sale}`);
    const facts = factsLine(home);
    if (facts) lines.push(`   ${facts}`);
    if (home.differs) lines.push(`   Outside the comp rules: ${home.differs}`);
    if (home.url) lines.push(`   ${home.url}`);
  });

  if (!comps.comps?.length) lines.push("", "No homes sold nearby.");
  if (comps.date) lines.push("", `Comps run ${comps.date}`);
  return lines.join("\n");
}

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// The same comps as an HTML table, so pasting into email, Google Docs or
// Sheets gives a real table (one comp per row) instead of text.
export function compsToHtml(comps, lead) {
  const subject = { ...(comps.subject || {}), isSubject: true };
  const headers = [
    "Property",
    "Dist.",
    "Bd",
    "Ba",
    "Sq ft",
    "Lot",
    "Built",
    "$/sq ft",
    "Last sale",
    "Sold",
  ];
  const cell = (v, bold = false) =>
    `<td style="border:1px solid #ccc;padding:4px 8px">${bold ? `<b>${v}</b>` : v}</td>`;

  const rows = [subject, ...(comps.comps || [])].map((home) => {
    const address = escapeHtml(cleanAddress(home.address));
    const property = home.isSubject
      ? `${address} (subject)`
      : home.url
        ? `<a href="${escapeHtml(home.url)}">${address}</a>`
        : address;
    const condition = CONDITION_LABELS[home.condition]
      ? ` (${CONDITION_LABELS[home.condition]})`
      : "";
    return `<tr>${[
      cell(property + condition, home.isSubject),
      cell(
        home.isSubject || home.distance == null ? "—" : `${home.distance} mi`,
      ),
      cell(num(home.beds)),
      cell(num(home.baths)),
      cell(num(home.sqft)),
      cell(num(home.lotSqft)),
      cell(home.yearBuilt ?? "—"),
      cell(money(perSqft(home))),
      cell(home.isSubject ? "—" : money(home.price)),
      cell(home.isSubject ? "—" : shortDate(home.soldDate) || "—"),
    ].join("")}</tr>`;
  });

  const summary = headline(comps, lead)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  return [
    `<div><b>Comps for ${escapeHtml(cleanAddress(comps.subject?.address))}</b></div>`,
    summary,
    `<table style="border-collapse:collapse;margin-top:8px">`,
    `<tr>${headers
      .map(
        (h) =>
          `<th style="border:1px solid #ccc;padding:4px 8px;text-align:left">${h}</th>`,
      )
      .join("")}</tr>`,
    ...rows,
    `</table>`,
    comps.date ? `<div>Comps run ${escapeHtml(comps.date)}</div>` : "",
  ].join("");
}

// Puts both versions on the clipboard; apps take the one they understand
// (HTML for email/Docs/Sheets, plain text elsewhere).
export async function copyComps(comps, lead) {
  const text = compsToText(comps, lead);
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([compsToHtml(comps, lead)], {
            type: "text/html",
          }),
        }),
      ]);
      return;
    } catch {
      // Fall through to plain text.
    }
  }
  await navigator.clipboard.writeText(text);
}
