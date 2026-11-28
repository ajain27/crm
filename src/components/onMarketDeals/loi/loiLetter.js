// A letter of intent (LOI) to buy an on-market home: the form's defaults
// from the listing and the user's last letter, the terms table, the email
// to the listing agent, and the PDF itself (drawn as text with jsPDF, so it
// stays small enough to attach and its words can be copied).
import jsPDF from "jspdf";
import { HOME_TYPES } from "../marketDeals";

// The user's details and standing terms, kept for the next letter.
export const LOI_DEFAULTS_KEY = "omd-loi-defaults";

// Fields remembered between letters; the rest belong to one listing.
const REMEMBERED = [
  "company",
  "signerName",
  "signerTitle",
  "signerPhone",
  "signerEmail",
  "logo",
  "earnestMoney",
  "earnestTiming",
  "titleCompany",
  "titleCompanyCity",
  "inspectionDays",
  "closingDays",
  "closingCosts",
  "commission",
  "condition",
  "possession",
  "extraTerms",
  "intro",
  "closingText",
  "ccMe",
];

const STANDING_TERMS = {
  earnestMoney: "$500",
  earnestTiming:
    "to be deposited with the title company after the inspection period is over",
  titleCompany: "",
  titleCompanyCity: "",
  inspectionDays: "10",
  closingDays: "30",
  closingCosts: "Buyer will pay the seller's standard closing costs",
  commission:
    "Seller to pay the real estate commission for the seller's (listing) side",
  condition: "Property purchased as-is, where-is",
  possession: "At closing and funding",
  extraTerms: [],
  intro:
    "{company} is pleased to present the following terms for the purchase of your property. We are prepared to move directly to a written purchase contract on these terms:",
  closingText:
    "If these terms are acceptable, please sign below and return one copy. On receipt, we will prepare the purchase contract on these same terms and open escrow with {titleCompany}. This letter states our intent to proceed to a written purchase contract; it is not itself a purchase contract.",
  ccMe: true,
};

export function loadLoiDefaults() {
  try {
    return JSON.parse(localStorage.getItem(LOI_DEFAULTS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveLoiDefaults(form) {
  try {
    const kept = Object.fromEntries(REMEMBERED.map((k) => [k, form[k]]));
    localStorage.setItem(LOI_DEFAULTS_KEY, JSON.stringify(kept));
  } catch {
    // Storage full or blocked: the letter still sends.
  }
}

// "$115,000" from a listing price.
const dollars = (n) =>
  typeof n === "number" && n > 0
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "";

// "3 bed / 1 bath single-family residence".
export function propertyDescription(listing) {
  const parts = [];
  if (listing.beds != null) parts.push(`${listing.beds} bed`);
  if (listing.baths != null) parts.push(`${listing.baths} bath`);
  const type = {
    SINGLE_FAMILY: "single-family residence",
    MULTI_FAMILY: "multi-family property",
    CONDO: "condominium",
    TOWNHOUSE: "townhouse",
    MANUFACTURED: "manufactured home",
    LOT: "lot",
    APARTMENT: "apartment",
  }[listing.homeType];
  const size = parts.join(" / ");
  return [size, type || HOME_TYPES[listing.homeType]?.toLowerCase()]
    .filter(Boolean)
    .join(" ");
}

// "November 27, 2026" for an <input type="date"> value.
export function longDate(isoDate) {
  const [y, m, d] = String(isoDate || "")
    .split("-")
    .map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The form for one listing: the listing's details, the agent to send to,
// and everything else from the user's last letter (or the standing terms).
export function initialLoiForm(listing, contacts = [], saved = {}) {
  const agent =
    contacts.find((c) => c.email && /agent/i.test(c.role || "")) ||
    contacts.find((c) => c.email) ||
    null;
  return {
    ...STANDING_TERMS,
    company: "",
    signerName: "",
    signerTitle: "Owner",
    signerPhone: "",
    signerEmail: "",
    logo: "",
    ...Object.fromEntries(
      Object.entries(saved).filter(
        ([k, v]) => REMEMBERED.includes(k) && v != null,
      ),
    ),
    toEmail: agent?.email || "",
    agentName: agent?.name || "",
    date: todayIso(),
    sellerName: "",
    address: listing.address || "",
    description: propertyDescription(listing),
    price: dollars(listing.price),
    subject: "",
    message: "",
  };
}

// Whole numbers to words for "Ten (10) days".
const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100)
    return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  return String(n);
}

// "Ten (10) days"; text that isn't a whole number is used as typed.
export function daysPhrase(value) {
  const text = String(value || "").trim();
  if (!/^\d+$/.test(text)) return text;
  const n = Number(text);
  const words = numberWords(n);
  return `${words[0].toUpperCase()}${words.slice(1)} (${n}) day${n === 1 ? "" : "s"}`;
}

// "{company}" and "{titleCompany}" in the letter's paragraphs.
export function fillPlaceholders(text, form) {
  return String(text || "")
    .replaceAll("{company}", form.company.trim() || "We")
    .replaceAll(
      "{titleCompany}",
      form.titleCompany.trim() || "the title company",
    );
}

// The terms table: [label, value] rows, blank ones left out.
export function loiTerms(form) {
  const title = form.titleCompany.trim();
  const titleWhere = [title, form.titleCompanyCity.trim()]
    .filter(Boolean)
    .join(", ");
  const earnest = [
    form.earnestMoney.trim(),
    form.earnestTiming
      .trim()
      .replace(/\bthe title company\b/i, title || "the title company"),
  ]
    .filter(Boolean)
    .join(", ");
  const inspection = daysPhrase(form.inspectionDays);
  const closingDays = daysPhrase(form.closingDays).toLowerCase();
  const closing = [
    titleWhere,
    closingDays
      ? `on or before ${closingDays} following the executed purchase contract`
      : "",
  ]
    .filter(Boolean)
    .join(" — ");
  const rows = [
    [
      "Buyer",
      form.company.trim() ? `${form.company.trim()}, and/or assigns` : "",
    ],
    ["Purchase price", form.price.trim()],
    ["Earnest money", earnest],
    ["Closing costs", form.closingCosts.trim()],
    ["Commission", form.commission.trim()],
    [
      "Inspection period",
      inspection ? `${inspection} from the executed purchase contract` : "",
    ],
    ["Condition", form.condition.trim()],
    ["Closing", closing],
    ["Possession", form.possession.trim()],
    ...form.extraTerms.map((t) => [t.label.trim(), t.value.trim()]),
  ];
  return rows.filter(([label, value]) => label && value);
}

// "Dear Mr. Rangel:" can't be guessed (no gender), so the full name.
export function greeting(form) {
  return `Dear ${form.sellerName.trim() || "Seller"}:`;
}

// The street alone, for subjects and file names: "5100 S Karen St".
export function streetOf(address) {
  return String(address || "")
    .split(",")[0]
    .trim();
}

export function loiFilename(form) {
  const street = streetOf(form.address)
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${street || "Property"}-LOI-${form.date || todayIso()}.pdf`;
}

export function defaultSubject(form) {
  return `Letter of Intent — ${streetOf(form.address) || "your listing"}`;
}

export function defaultMessage(form) {
  const first = form.agentName.trim().split(/\s+/)[0];
  const signature = [
    form.signerName.trim(),
    [form.signerTitle.trim(), form.company.trim()].filter(Boolean).join(", "),
    form.signerPhone.trim(),
    form.signerEmail.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  return [
    `Hi ${first || "there"},`,
    "",
    `Please find attached our letter of intent to purchase ${form.address.trim() || "your listing"}${form.price.trim() ? ` for ${form.price.trim()}` : ""}.`,
    "",
    "If your seller would like to move forward, please have them sign and return it, and we'll send over the purchase contract on the same terms. Happy to answer any questions.",
    "",
    "Thanks,",
    signature,
  ].join("\n");
}

// What's missing before the letter can go out, or [] when it's ready.
export function loiProblems(form) {
  const problems = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.toEmail.trim())) {
    problems.push("the agent's email");
  }
  if (!form.address.trim()) problems.push("the property address");
  if (!form.price.trim()) problems.push("the purchase price");
  if (!form.company.trim()) problems.push("your company (the buyer)");
  if (!form.signerName.trim()) problems.push("your name");
  return problems;
}

// ---- PDF ---------------------------------------------------------------

const PAGE_W = 612; // US Letter, in points
const PAGE_H = 792;
const MARGIN = 54;
// The letter starts higher than the side margins, as letterheads do.
const TOP = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const GOLD = [176, 141, 62];
const TEXT = [33, 33, 33];
const MUTED = [110, 110, 110];
const SHADE = [244, 244, 242];
const RULE = [221, 221, 221];

// An image data URL's pixel size, to keep the logo's proportions.
function imageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    // An image that never loads leaves the logo out, not the letter hung.
    setTimeout(() => resolve(null), 3000);
    img.src = dataUrl;
  });
}

// The letter as a jsPDF document.
export async function buildLoiPdf(form) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const footerText = [
    form.company.trim(),
    "Letter of Intent",
    streetOf(form.address),
    longDate(form.date),
  ]
    .filter(Boolean)
    .join(" — ");
  let y = TOP;

  const setText = (size, style = "normal", color = TEXT) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };
  // Starts a new page when `height` more won't fit above the footer.
  const room = (height) => {
    if (y + height <= PAGE_H - MARGIN - 4) return;
    pdf.addPage();
    y = TOP;
  };
  const paragraph = (text, size = 10, gap = 8) => {
    setText(size);
    const lines = pdf.splitTextToSize(text, CONTENT_W);
    const lineH = size * 1.35;
    room(lines.length * lineH);
    pdf.text(lines, MARGIN, y + size);
    y += lines.length * lineH + gap;
  };
  // "Label: value" with the label bold, wrapping under itself.
  const labelled = (label, value) => {
    setText(10, "bold");
    const labelW = pdf.getTextWidth(`${label} `);
    setText(10);
    const lines = pdf.splitTextToSize(value, CONTENT_W - labelW);
    room(lines.length * 13.5);
    setText(10, "bold");
    pdf.text(`${label}`, MARGIN, y + 10);
    setText(10);
    pdf.text(lines, MARGIN + labelW, y + 10);
    y += lines.length * 13.5 + 2;
  };

  // Logo, then a gold rule.
  if (form.logo) {
    const size = await imageSize(form.logo);
    if (size?.w && size?.h) {
      const h = Math.min(100, (CONTENT_W * size.h) / size.w);
      const w = (h * size.w) / size.h;
      const format = /^data:image\/png/i.test(form.logo) ? "PNG" : "JPEG";
      pdf.addImage(form.logo, format, MARGIN + (CONTENT_W - w) / 2, y, w, h);
      y += h + 8;
    }
  }
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(1.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;

  setText(15, "bold");
  pdf.text("LETTER OF INTENT TO PURCHASE", MARGIN, y + 12);
  y += 18;
  setText(10);
  pdf.text(longDate(form.date), MARGIN, y + 10);
  y += 20;

  if (form.sellerName.trim()) labelled("Seller:", form.sellerName.trim());
  labelled(
    "Property:",
    [form.address.trim(), form.description.trim()].filter(Boolean).join(" — "),
  );
  y += 6;
  paragraph(greeting(form));
  paragraph(fillPlaceholders(form.intro, form));

  // Terms table: bold label column, wrapped values, every other row shaded.
  const labelW = 150;
  const pad = 5;
  loiTerms(form).forEach(([label, value], i) => {
    setText(10);
    const lines = pdf.splitTextToSize(value, CONTENT_W - labelW - pad * 2);
    const rowH = lines.length * 12.5 + pad * 2;
    room(rowH);
    if (i % 2 === 1) {
      pdf.setFillColor(...SHADE);
      pdf.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH);
    setText(10, label === "Purchase price" ? "bold" : "normal");
    pdf.text(lines, MARGIN + labelW + pad, y + pad + 9);
    setText(10, "bold");
    pdf.text(label, MARGIN + pad, y + pad + 9);
    y += rowH;
  });
  y += 12;

  paragraph(fillPlaceholders(form.closingText, form), 10, 18);

  // Signatures: the seller's on the left, the buyer's on the right.
  const colW = CONTENT_W / 2;
  const signerLines = [
    [form.signerName.trim(), form.signerTitle.trim()]
      .filter(Boolean)
      .join(", "),
    form.company.trim(),
  ].filter(Boolean);
  room(100);
  setText(9.5, "bold");
  pdf.text("AGREED AND ACCEPTED — SELLER:", MARGIN, y + 10);
  pdf.text("BUYER:", MARGIN + colW, y + 10);
  y += 42;
  pdf.setDrawColor(...TEXT);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, MARGIN + colW - 30, y);
  pdf.line(MARGIN + colW, y, PAGE_W - MARGIN, y);
  y += 2;
  setText(10);
  const sellerLines = [
    form.sellerName.trim() ? `${form.sellerName.trim()}, Seller` : "Seller",
    "Date: ______________",
  ];
  const buyerLines = [...signerLines, "Date: ______________"];
  sellerLines.forEach((line, i) => pdf.text(line, MARGIN, y + 11 + i * 13));
  buyerLines.forEach((line, i) =>
    pdf.text(line, MARGIN + colW, y + 11 + i * 13),
  );
  y += Math.max(sellerLines.length, buyerLines.length) * 13 + 14;

  const contact = [
    form.company.trim(),
    [form.signerName.trim(), form.signerTitle.trim()]
      .filter(Boolean)
      .join(", "),
    form.signerPhone.trim(),
    form.signerEmail.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  if (contact) {
    setText(9, "normal", MUTED);
    room(14);
    pdf.text(pdf.splitTextToSize(contact, CONTENT_W), MARGIN, y + 9);
  }

  // Footer on every page.
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...GOLD);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, PAGE_H - MARGIN + 4, PAGE_W - MARGIN, PAGE_H - MARGIN + 4);
    setText(8, "normal", MUTED);
    pdf.text(
      pdf.splitTextToSize(footerText, CONTENT_W - 60)[0] || "",
      MARGIN,
      PAGE_H - MARGIN + 16,
    );
    pdf.text(`Page ${page}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 16, {
      align: "right",
    });
  }
  return pdf;
}

// The PDF as base64, for an email attachment.
export async function loiPdfBase64(form) {
  const pdf = await buildLoiPdf(form);
  return pdf.output("datauristring").split(",")[1];
}
