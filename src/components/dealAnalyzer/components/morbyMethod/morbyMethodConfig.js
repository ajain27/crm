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

export function calcBalloonBalance(
  annualRatePct,
  termYears,
  principal,
  balloonYears,
) {
  if (
    principal <= 0 ||
    termYears <= 0 ||
    balloonYears <= 0 ||
    balloonYears > termYears
  )
    return 0;
  if (annualRatePct <= 0) {
    const monthlyPayment = principal / (termYears * 12);
    const balloonMonths = balloonYears * 12;
    return Math.max(0, principal - monthlyPayment * balloonMonths);
  }
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const balloonMonths = balloonYears * 12;
  const factor = Math.pow(1 + r, n);
  const monthlyPayment = (principal * r * factor) / (factor - 1);
  const balloonFactor = Math.pow(1 + r, balloonMonths);
  const remainingBalance =
    principal * balloonFactor - monthlyPayment * ((balloonFactor - 1) / r);
  return Math.max(0, remainingBalance);
}

export const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "sellerCarryback",
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
  "originationFeesPct",
]);

export const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  titleFees: "",
  dscrRate: "",
  dscrTermYears: "",
  dscrPoints: "",
  originationFeesPct: "",
  legalFees: "",
  appraisalFees: "",
  underwritingFees: "",
  sellerCarryback: "",
  sellerCarrybackRate: "",
  sellerCarrybackTermYears: "",
  sellerCarrybackBalloonYears: "",
  monthlyRent: "",
  yearlyInsurance: "",
  yearlyTaxes: "",
  annualMiscExpense: "",
};
