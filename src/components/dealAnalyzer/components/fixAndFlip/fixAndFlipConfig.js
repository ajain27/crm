export const REHAB_LOOKUP = {
  light: [30000, 40000, 55000],
  average: [55000, 70000, 85000],
  heavy: [90000, 125000, 150000],
};

export const REHAB_OPTIONS = [
  { value: "", label: "Select One..." },
  { value: "light", label: "Light Rehab (carpet and paint)" },
  { value: "average", label: "Average Rehab (carpet/paint/kitchen/baths)" },
  {
    value: "heavy",
    label: "Heavy Rehab (gut job - carpet/paint/roof/siding/windows, etc)",
  },
];

export const initialForm = {
  arv: "",
  purchasePrice: "",
  rehabType: "",
  squareFootage: "",
  rehabCost: "",
  additionalRehabCost: "",
  durationMonths: "",
  points: "",
  interestRate: "",
  originationFees: "",
  legalFees: "",
  appraisalFees: "",
};

export const CURRENCY_FIELDS = new Set([
  "arv",
  "purchasePrice",
  "rehabCost",
  "additionalRehabCost",
  "originationFees",
  "legalFees",
  "appraisalFees",
]);

export const PERCENT_FIELDS = new Set(["points", "interestRate"]);

// Rehab cost lookup: [under 1500 sqft, 1500–2500, 2500–3500]
export function getAutoRehabCost(rehabType, sqft) {
  if (!rehabType || sqft <= 0 || sqft > 3500) return null;
  const tier = sqft < 1500 ? 0 : sqft <= 2500 ? 1 : 2;
  return REHAB_LOOKUP[rehabType]?.[tier] ?? null;
}

export function parseCurrency(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parsePercent(value) {
  const n = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function fmt(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtCurrencyInput(value) {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? "$" + parseInt(numeric, 10).toLocaleString("en-US") : "";
}
