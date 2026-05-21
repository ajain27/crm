export const REHAB_LOOKUP = {
  light: [30000, 40000, 55000, 75000, 100000],
  average: [55000, 70000, 85000, 125000, 175000],
  heavy: [90000, 125000, 150000, 200000, 250000],
};

// Lower labor/material cost markets — rehab at 1/3 of standard rates
const CHEAP_STATES = new Set([
  "AL",
  "AR",
  "GA",
  "IA",
  "ID",
  "IN",
  "KS",
  "KY",
  "LA",
  "MI",
  "MO",
  "MS",
  "MT",
  "ND",
  "NE",
  "NM",
  "OH",
  "OK",
  "SC",
  "SD",
  "TN",
  "WV",
  "WY",
]);

export function getRehabMultiplier(state) {
  const s = String(state || "")
    .trim()
    .toUpperCase();
  return CHEAP_STATES.has(s) ? 1 / 3 : 1;
}

export function isCheapMarket(state) {
  return CHEAP_STATES.has(
    String(state || "")
      .trim()
      .toUpperCase(),
  );
}

export const REHAB_OPTIONS = [
  { value: "", label: "Select One..." },
  { value: "no-rehab", label: "No Rehab Needed" },
  { value: "light", label: "Light Rehab (carpet and paint)" },
  { value: "average", label: "Average Rehab (carpet/paint/kitchen/baths)" },
  {
    value: "heavy",
    label: "Heavy Rehab (gut job - carpet/paint/roof/siding/windows, etc)",
  },
];

export const initialForm = {
  state: "",
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

// Rehab cost lookup: [under 1500 sqft, 1500–2500, 2500–3500, 3500–5000, 5000–5500]
// Returns { cost, estimated } or null (null = manual entry required)
// estimated=true when sqft not provided — uses middle tier as default estimate
export function getAutoRehabCost(rehabType, sqft) {
  if (!rehabType) return null;
  if (rehabType === "no-rehab") return { cost: 0, estimated: false };
  if (sqft > 5500) return null; // too large — user must enter manually
  const estimated = sqft <= 0;
  const tier = estimated
    ? 1
    : sqft < 1500
      ? 0
      : sqft <= 2500
        ? 1
        : sqft <= 3500
          ? 2
          : sqft <= 5000
            ? 3
            : 4;
  const cost = REHAB_LOOKUP[rehabType]?.[tier] ?? null;
  if (cost === null) return null;
  return { cost, estimated };
}

export {
  parseCurrency,
  parsePercent,
  fmt,
  fmtCurrencyInput,
} from "../../../../utils/utils";
