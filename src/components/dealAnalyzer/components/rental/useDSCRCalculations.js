import { useState } from "react";
import {
  parseCurrency,
  parsePercent,
  fmtCurrencyInput,
} from "../../../../utils/utils";
import {
  calcLenderMonthlyPayment,
  calcLenderTotal,
} from "../additionalLenders/AdditionalLenders";

export const PROP_MGMT_PCT = 10;
export const INSPECTION_COST = 375;
export const DOWN_OPTIONS = [15, 20, 25];

function calcPMT(annualRatePct, termYears, principal) {
  if (annualRatePct <= 0 || termYears <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "extraDownPayment",
  "underwritingFees",
  "monthlyRent",
  "yearlyInsurance",
  "yearlyTaxes",
  "annualMiscExpense",
  "monthlyHomeWarranty",
  "legalFees",
  "appraisalFees",
  "closingCosts",
]);

const PERCENT_FIELDS = new Set([
  "agentCommission",
  "interestRate",
  "originationFeesPct",
  "sellerCarryback",
  "cashHelocRate",
  "rateBuyDown",
]);

const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  underwritingFees: "",
  interestRate: "",
  loanTermYears: "",
  extraDownPayment: "",
  originationFeesPct: "",
  legalFees: "",
  appraisalFees: "",
  closingCosts: "",
  monthlyRent: "",
  yearlyInsurance: "",
  yearlyTaxes: "",
  annualMiscExpense: "",
  monthlyHomeWarranty: "",
  sellerCarryback: "",
  cashHelocRate: "",
  rateBuyDown: "",
};

export function useDSCRCalculations() {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);
  const [lenders, setLenders] = useState([]);
  const [downPct, setDownPct] = useState(20);
  const [isCashNeededHeloc, setIsCashNeededHeloc] = useState(false);
  const lenderLtc = (100 - downPct) / 100;

  function handleChange(e) {
    const { name, value } = e.target;
    setSummary(null);
    if (CURRENCY_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: fmtCurrencyInput(value) }));
      return;
    }
    if (PERCENT_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, "") }));
      return;
    }
    if (name === "loanTermYears") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (PERCENT_FIELDS.has(name) && value) {
      const numeric = value.replace(/[^0-9.]/g, "");
      if (numeric) setForm((prev) => ({ ...prev, [name]: `${numeric}%` }));
    }
  }

  function setDownPctAndReset(value) {
    setDownPct(value);
    setSummary(null);
  }

  function setIsCashNeededHelocAndReset(value) {
    setIsCashNeededHeloc(value);
    setSummary(null);
  }

  const purchasePrice = parseCurrency(form.purchasePrice);
  const agentCommissionPct = parsePercent(form.agentCommission);
  const agentCommissionAmt = purchasePrice * (agentCommissionPct / 100);
  const closingCosts = parseCurrency(form.closingCosts);
  const underwritingFees = parseCurrency(form.underwritingFees);
  const monthlyRent = parseCurrency(form.monthlyRent);
  const yearlyInsurance = parseCurrency(form.yearlyInsurance);
  const monthlyInsurance = yearlyInsurance / 12;
  const yearlyTaxes = parseCurrency(form.yearlyTaxes);
  const monthlyTaxes = yearlyTaxes / 12;
  const annualMiscExpense = parseCurrency(form.annualMiscExpense);
  const monthlyMiscExpense = annualMiscExpense / 12;
  const monthlyHomeWarranty = parseCurrency(form.monthlyHomeWarranty);
  const propMgmtFee = monthlyRent * (PROP_MGMT_PCT / 100);

  const lenderFunds = purchasePrice * lenderLtc;
  const downPayment = purchasePrice * (1 - lenderLtc);
  const extraDownPaymentAmt = parseCurrency(form.extraDownPayment);
  const effectiveLoanAmount = Math.max(0, lenderFunds - extraDownPaymentAmt);
  const effectiveDownPayment = downPayment + extraDownPaymentAmt;
  const interestRatePct = parsePercent(form.interestRate);
  const loanTermYears = parseInt(form.loanTermYears || "0", 10) || 0;
  const originationFeesPct = parsePercent(form.originationFeesPct);
  const originationFees = effectiveLoanAmount * (originationFeesPct / 100);
  const legalFees = parseCurrency(form.legalFees);
  const appraisalFees = parseCurrency(form.appraisalFees);
  const lenderCosts =
    originationFees + legalFees + appraisalFees + underwritingFees;
  const upfrontLoanCosts = lenderCosts;
  const loanOutOfPocket = effectiveDownPayment + upfrontLoanCosts;
  const loanMortgage = calcPMT(
    interestRatePct,
    loanTermYears,
    effectiveLoanAmount,
  );

  const rateBuyDownPct = parsePercent(form.rateBuyDown);
  const rateBuyDownAmt = effectiveLoanAmount * (rateBuyDownPct / 100);

  const lenderMonthlyPayment = calcLenderMonthlyPayment(lenders);
  const sellerCarrybackPct = parsePercent(form.sellerCarryback);
  const sellerCarryback = purchasePrice * (sellerCarrybackPct / 100);
  const grossCashNeeded =
    loanOutOfPocket +
    closingCosts +
    agentCommissionAmt +
    INSPECTION_COST +
    rateBuyDownAmt;
  const lenderTotal = calcLenderTotal(lenders);
  const totalFundsNeeded = Math.max(
    0,
    grossCashNeeded - sellerCarryback - lenderTotal,
  );

  // If the cash needed to buy is itself drawn from a HELOC, that draw is
  // interest-only (no amortization term), so it's a straight monthly
  // interest charge on the full amount rather than a PMT calculation.
  const cashHelocRatePct = parsePercent(form.cashHelocRate);
  const cashHelocMonthlyPayment = isCashNeededHeloc
    ? totalFundsNeeded * (cashHelocRatePct / 100 / 12)
    : 0;

  const noi =
    monthlyRent -
    propMgmtFee -
    monthlyMiscExpense -
    monthlyInsurance -
    monthlyTaxes -
    monthlyHomeWarranty;
  const totalMonthlyExpenses =
    loanMortgage +
    lenderMonthlyPayment +
    cashHelocMonthlyPayment +
    propMgmtFee +
    monthlyMiscExpense +
    monthlyInsurance +
    monthlyTaxes +
    monthlyHomeWarranty;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const cashOnCash =
    totalFundsNeeded > 0 ? (annualCashFlow / totalFundsNeeded) * 100 : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;
  const totalDebtService =
    loanMortgage + lenderMonthlyPayment + cashHelocMonthlyPayment;
  const dscr = totalDebtService > 0 ? noi / totalDebtService : 0;

  const isFormComplete =
    form.purchasePrice?.trim() &&
    form.monthlyRent?.trim() &&
    form.interestRate?.trim() &&
    form.loanTermYears?.trim() &&
    (!isCashNeededHeloc || form.cashHelocRate?.trim());

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      agentCommissionPct,
      agentCommissionAmt,
      closingCosts,
      underwritingFees,
      monthlyRent,
      propMgmtFee,
      monthlyInsurance,
      monthlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
      monthlyHomeWarranty,
      downPct,
      lenderFunds,
      downPayment,
      extraDownPaymentAmt,
      effectiveLoanAmount,
      effectiveDownPayment,
      interestRatePct,
      loanTermYears,
      loanMortgage,
      lenders,
      lenderMonthlyPayment,
      lenderTotal,
      sellerCarrybackPct,
      sellerCarryback,
      rateBuyDownPct,
      rateBuyDownAmt,
      grossCashNeeded,
      lenderCosts,
      originationFeesPct,
      originationFees,
      legalFees,
      appraisalFees,
      upfrontLoanCosts,
      loanOutOfPocket,
      noi,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      totalFundsNeeded,
      isCashNeededHeloc,
      cashHelocRatePct,
      cashHelocMonthlyPayment,
      cashOnCash,
      capRate,
      dscr,
      inspectionCost: INSPECTION_COST,
    });
  }

  return {
    form,
    setSummary,
    lenders,
    setLenders,
    downPct,
    setDownPct: setDownPctAndReset,
    isCashNeededHeloc,
    setIsCashNeededHeloc: setIsCashNeededHelocAndReset,
    handleChange,
    handleBlur,
    handleCalculate,
    summary,
    isFormComplete,
    agentCommissionAmt,
    downPayment,
    lenderFunds,
    extraDownPaymentAmt,
    effectiveLoanAmount,
    loanMortgage,
    lenderCosts,
    cashHelocMonthlyPayment,
    purchasePrice,
    propMgmtFee,
    monthlyMiscExpense,
    rateBuyDownPct,
    rateBuyDownAmt,
  };
}
