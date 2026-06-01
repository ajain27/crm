export const PROP_MGMT_PCT = 10;
export const FIRST_MONTH_PROP_MGMT_PCT = 50;
export const CLOSING_COSTS_PCT = 2;
export const INSPECTION_COST = 450;
export const DSCR_LTV = 0.8;
export const DOWN_PCT = Math.round((1 - DSCR_LTV) * 100);

export function calcPMT(annualRatePct, termYears, principal) {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRatePct <= 0) return principal / (termYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "sellerCarryback",
  "originationFees",
  "legalFees",
  "appraisalFees",
  "underwritingFees",
  "monthlyRent",
  "yearlyInsurance",
  "yearlyTaxes",
  "annualMiscExpense",
]);

export const PERCENT_FIELDS = new Set([
  "agentCommission",
  "titleFees",
  "dscrRate",
  "dscrPoints",
  "sellerCarrybackRate",
]);

export const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  titleFees: "",
  dscrRate: "",
  dscrTermYears: "",
  dscrPoints: "",
  originationFees: "",
  legalFees: "",
  appraisalFees: "",
  underwritingFees: "",
  sellerCarryback: "",
  sellerCarrybackRate: "",
  sellerCarrybackTermYears: "",
  monthlyRent: "",
  yearlyInsurance: "",
  yearlyTaxes: "",
  annualMiscExpense: "",
};
