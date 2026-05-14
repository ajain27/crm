export const REHAB_LOOKUP = {
  light: [30000, 40000, 55000],
  average: [55000, 70000, 85000],
  heavy: [90000, 125000, 150000],
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

export const STATE_OPTIONS = [
  { value: "", label: "Select State..." },
  { value: "AL", label: "Alabama (AL)" },
  { value: "AK", label: "Alaska (AK)" },
  { value: "AZ", label: "Arizona (AZ)" },
  { value: "AR", label: "Arkansas (AR)" },
  { value: "CA", label: "California (CA)" },
  { value: "CO", label: "Colorado (CO)" },
  { value: "CT", label: "Connecticut (CT)" },
  { value: "DE", label: "Delaware (DE)" },
  { value: "FL", label: "Florida (FL)" },
  { value: "GA", label: "Georgia (GA)" },
  { value: "HI", label: "Hawaii (HI)" },
  { value: "ID", label: "Idaho (ID)" },
  { value: "IL", label: "Illinois (IL)" },
  { value: "IN", label: "Indiana (IN)" },
  { value: "IA", label: "Iowa (IA)" },
  { value: "KS", label: "Kansas (KS)" },
  { value: "KY", label: "Kentucky (KY)" },
  { value: "LA", label: "Louisiana (LA)" },
  { value: "ME", label: "Maine (ME)" },
  { value: "MD", label: "Maryland (MD)" },
  { value: "MA", label: "Massachusetts (MA)" },
  { value: "MI", label: "Michigan (MI)" },
  { value: "MN", label: "Minnesota (MN)" },
  { value: "MS", label: "Mississippi (MS)" },
  { value: "MO", label: "Missouri (MO)" },
  { value: "MT", label: "Montana (MT)" },
  { value: "NE", label: "Nebraska (NE)" },
  { value: "NV", label: "Nevada (NV)" },
  { value: "NH", label: "New Hampshire (NH)" },
  { value: "NJ", label: "New Jersey (NJ)" },
  { value: "NM", label: "New Mexico (NM)" },
  { value: "NY", label: "New York (NY)" },
  { value: "NC", label: "North Carolina (NC)" },
  { value: "ND", label: "North Dakota (ND)" },
  { value: "OH", label: "Ohio (OH)" },
  { value: "OK", label: "Oklahoma (OK)" },
  { value: "OR", label: "Oregon (OR)" },
  { value: "PA", label: "Pennsylvania (PA)" },
  { value: "RI", label: "Rhode Island (RI)" },
  { value: "SC", label: "South Carolina (SC)" },
  { value: "SD", label: "South Dakota (SD)" },
  { value: "TN", label: "Tennessee (TN)" },
  { value: "TX", label: "Texas (TX)" },
  { value: "UT", label: "Utah (UT)" },
  { value: "VT", label: "Vermont (VT)" },
  { value: "VA", label: "Virginia (VA)" },
  { value: "WA", label: "Washington (WA)" },
  { value: "WV", label: "West Virginia (WV)" },
  { value: "WI", label: "Wisconsin (WI)" },
  { value: "WY", label: "Wyoming (WY)" },
  { value: "DC", label: "Washington D.C. (DC)" },
];

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

// Rehab cost lookup: [under 1500 sqft, 1500–2500, 2500–3500]
// Returns { cost, estimated } or null (null = manual entry required)
// estimated=true when sqft not provided — uses middle tier as default estimate
export function getAutoRehabCost(rehabType, sqft) {
  if (!rehabType) return null;
  if (rehabType === "no-rehab") return { cost: 0, estimated: false };
  if (sqft > 3500) return null; // too large — user must enter manually
  const estimated = sqft <= 0;
  const tier = estimated ? 1 : sqft < 1500 ? 0 : sqft <= 2500 ? 1 : 2;
  const cost = REHAB_LOOKUP[rehabType]?.[tier] ?? null;
  if (cost === null) return null;
  return { cost, estimated };
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
