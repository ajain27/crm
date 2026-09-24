import { useState, useEffect, useRef } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import { useAddressAutocomplete } from "../../../../hooks/useAddressAutocomplete";
import {
  parseCurrency,
  parsePercent,
  fmtCurrencyInput,
  fmt,
  calculateMonthlyPayment,
  calculateBalloonBalance,
} from "../../../../utils/utils";
import AdditionalLenders, {
  calcLenderTotal,
  createEmptyLender,
} from "../additionalLenders/AdditionalLenders";
import SellerFinancePieChart from "./SellerFinancePieChart";
import SellerFinancePdfTemplate from "./SellerFinancePdfTemplate";
import SellerFinanceSellerReportPdfTemplate from "./SellerFinanceSellerReportPdfTemplate";
import { useGenerateReport } from "../pdfExport/useGenerateReport";
import GenerateReportButton from "../pdfExport/GenerateReportButton";
import PdfReportPreviewModal from "../pdfExport/PdfReportPreviewModal";

const PROP_MGMT_PCT = 10;

const DEFAULT_LENDER_FEES = {
  originationFees: "$2,500",
  legalFees: "$3,000",
  appraisalFees: "$750",
  underwritingFees: "$1,600",
};

// Models the seller note's payment schedule for all three payment types:
//   - amortized: level P&I payments for the whole term, with an optional
//     balloon of the remaining balance.
//   - interestOnly: interest-only payments; the full principal comes due as
//     a balloon — at the balloon year if one is set, otherwise at term end.
//   - hybrid: interest-only for `ioMonths`, then the full principal
//     amortizes over whatever term remains — self-paying off by term end
//     unless a balloon year cuts it short.
// `earlyBalloonMonths` is 0 when no balloon year is set (or it's >= the
// term, which isn't an "early" balloon).
function computeSellerNote({
  amount,
  annualRateDecimal,
  termMonths,
  paymentType,
  ioMonths,
  earlyBalloonMonths,
}) {
  const zero = {
    monthly: 0,
    phase2Monthly: null,
    ioMonths: 0,
    monthsElapsed: 0,
    balloon: 0,
    balloonDueMonths: 0,
    balloonIsFullPrincipal: false,
    totalReceived: 0,
    totalInterest: 0,
  };
  if (amount <= 0 || termMonths <= 0) return zero;

  if (paymentType === "interestOnly") {
    const monthly = (amount * annualRateDecimal) / 12;
    const balloonDueMonths = earlyBalloonMonths || termMonths;
    const totalReceived = monthly * balloonDueMonths + amount;
    return {
      ...zero,
      monthly,
      monthsElapsed: balloonDueMonths,
      balloon: amount,
      balloonDueMonths,
      balloonIsFullPrincipal: true,
      totalReceived,
      totalInterest: totalReceived - amount,
    };
  }

  if (paymentType === "hybrid") {
    // Need at least one amortized month after the interest-only period.
    const clampedIoMonths = Math.min(
      Math.max(ioMonths, 0),
      Math.max(termMonths - 1, 0),
    );
    const monthly = (amount * annualRateDecimal) / 12;
    const remainingTermMonths = termMonths - clampedIoMonths;
    const phase2Monthly = calculateMonthlyPayment(
      amount,
      annualRateDecimal,
      remainingTermMonths,
    );

    if (earlyBalloonMonths > 0 && earlyBalloonMonths <= clampedIoMonths) {
      // Balloon falls inside the interest-only period — no principal has
      // been paid down yet, so the full amount is due.
      const totalReceived = monthly * earlyBalloonMonths + amount;
      return {
        ...zero,
        monthly,
        phase2Monthly,
        ioMonths: clampedIoMonths,
        monthsElapsed: earlyBalloonMonths,
        balloon: amount,
        balloonDueMonths: earlyBalloonMonths,
        balloonIsFullPrincipal: true,
        totalReceived,
        totalInterest: totalReceived - amount,
      };
    }

    if (earlyBalloonMonths > clampedIoMonths) {
      // Balloon falls inside the amortized period — the remaining balance
      // is whatever's left of the phase-2 amortization schedule.
      const monthsIntoPhase2 = earlyBalloonMonths - clampedIoMonths;
      const balloon = calculateBalloonBalance(
        amount,
        annualRateDecimal,
        remainingTermMonths,
        monthsIntoPhase2,
      );
      const totalReceived =
        monthly * clampedIoMonths + phase2Monthly * monthsIntoPhase2 + balloon;
      return {
        ...zero,
        monthly,
        phase2Monthly,
        ioMonths: clampedIoMonths,
        monthsElapsed: earlyBalloonMonths,
        balloon,
        balloonDueMonths: earlyBalloonMonths,
        balloonIsFullPrincipal: false,
        totalReceived,
        totalInterest: totalReceived - amount,
      };
    }

    // No early balloon — the phase-2 schedule is sized to the remaining
    // term, so it pays itself off completely by the end of the note.
    const totalReceived =
      monthly * clampedIoMonths + phase2Monthly * remainingTermMonths;
    return {
      ...zero,
      monthly,
      phase2Monthly,
      ioMonths: clampedIoMonths,
      monthsElapsed: termMonths,
      balloon: 0,
      balloonDueMonths: 0,
      balloonIsFullPrincipal: false,
      totalReceived,
      totalInterest: totalReceived - amount,
    };
  }

  // Amortized (default).
  const monthly = calculateMonthlyPayment(
    amount,
    annualRateDecimal,
    termMonths,
  );
  const balloonDueMonths = earlyBalloonMonths;
  const balloon = balloonDueMonths
    ? calculateBalloonBalance(
        amount,
        annualRateDecimal,
        termMonths,
        balloonDueMonths,
      )
    : 0;
  const monthsElapsed = balloonDueMonths || termMonths;
  const totalReceived = monthly * monthsElapsed + balloon;
  return {
    ...zero,
    monthly,
    monthsElapsed,
    balloon,
    balloonDueMonths,
    balloonIsFullPrincipal: false,
    totalReceived,
    totalInterest: totalReceived - amount,
  };
}

const RENT_INCREMENTS = [0, 50, 100, 150, 200, 250];

// Cash flow at each rent increment, holding debt service, taxes, insurance
// and appliance insurance fixed — only rent and the property-management fee
// (which is a % of rent) move. `debtService` is the seller note + lender
// payment for whichever phase is being modeled; pass `debtServiceAfterIo`
// for a hybrid note to get a second column for after the interest-only
// period ends.
function computeRentSensitivity({
  monthlyRentAmount,
  debtService,
  debtServiceAfterIo,
  monthlyTaxes,
  monthlyInsurance,
  applianceInsuranceAmt,
}) {
  const fixedCosts = monthlyTaxes + monthlyInsurance + applianceInsuranceAmt;
  return RENT_INCREMENTS.map((increment) => {
    const rent = monthlyRentAmount + increment;
    const propMgmtFee = rent * (PROP_MGMT_PCT / 100);
    const cashFlow = rent - (debtService + fixedCosts + propMgmtFee);
    const cashFlowAfterIo =
      debtServiceAfterIo > 0
        ? rent - (debtServiceAfterIo + fixedCosts + propMgmtFee)
        : null;
    return { increment, rent, propMgmtFee, cashFlow, cashFlowAfterIo };
  });
}

// Amortized (P&I) monthly payment for a single lender — always based on the
// standard amortization formula, never an interest-only shortcut. A lender
// with no term contributes $0 until a term is entered.
function calcLenderAmortizedBreakdown(lenders) {
  return lenders.map((l, idx) => {
    const amount = parseCurrency(l.amount);
    const rate = parsePercent(l.rate);
    const termYears = parseInt(l.term || "0", 10) || 0;
    return {
      id: l.id,
      index: idx + 1,
      amount,
      rate,
      term: termYears,
      monthlyPayment: calculateMonthlyPayment(
        amount,
        rate / 100,
        termYears * 12,
      ),
    };
  });
}

const initialForm = {
  propertyAddress: "",
  purchasePrice: "",
  sellerFinancePct: "",
  sellerFinanceRate: "",
  sellerFinancePaymentType: "amortized",
  sellerFinanceTermYears: "",
  sellerFinanceHybridMonths: "",
  sellerFinanceBalloonYears: "",
  originationFees: "",
  legalFees: "",
  appraisalFees: "",
  underwritingFees: "",
  closingCosts: "",
  monthlyRent: "",
  yearlyTaxes: "",
  yearlyInsurance: "",
  applianceInsurance: "",
};

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "originationFees",
  "legalFees",
  "appraisalFees",
  "underwritingFees",
  "closingCosts",
  "monthlyRent",
  "yearlyTaxes",
  "yearlyInsurance",
  "applianceInsurance",
]);
const PERCENT_FIELDS = new Set(["sellerFinancePct", "sellerFinanceRate"]);
// Digits-only fields — years and the hybrid interest-only month count.
const YEAR_FIELDS = new Set([
  "sellerFinanceTermYears",
  "sellerFinanceBalloonYears",
  "sellerFinanceHybridMonths",
]);

function SellerFinanceTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);
  const {
    printRef: fullReportRef,
    exporting: exportingFullReport,
    handleGenerateReport: handleGenerateFullReport,
    previewImage: fullReportPreviewImage,
    closePreview: closeFullReportPreview,
    downloadReport: downloadFullReport,
  } = useGenerateReport("seller-finance-report");
  const {
    printRef: sellerReportRef,
    exporting: exportingSellerReport,
    handleGenerateReport: handleGenerateSellerReport,
    previewImage: sellerReportPreviewImage,
    closePreview: closeSellerReportPreview,
    downloadReport: downloadSellerReport,
  } = useGenerateReport("seller-finance-seller-copy");
  // Show one lender row on load (instead of an empty state behind an "Add
  // Lender" click) — marked `auto` so it behaves exactly like a
  // freshly-added row and picks up the remaining balance as the user fills
  // in Purchase Price and Seller Financing %.
  const [lenders, setLenders] = useState(() => [
    createEmptyLender("", "", "", true),
  ]);

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
    if (YEAR_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const addressInputRef = useRef(null);
  useAddressAutocomplete(addressInputRef, ({ formatted }) => {
    handleChange({ target: { name: "propertyAddress", value: formatted } });
  });

  function handleBlur(e) {
    const { name, value } = e.target;
    if (PERCENT_FIELDS.has(name) && value) {
      const numeric = value.replace(/[^0-9.]/g, "");
      if (numeric) setForm((prev) => ({ ...prev, [name]: `${numeric}%` }));
    }
  }

  const purchasePrice = parseCurrency(form.purchasePrice);

  const sellerFinancePct = parsePercent(form.sellerFinancePct);
  const sellerFinanceAmount = purchasePrice * (sellerFinancePct / 100);
  const sellerFinanceRatePct = parsePercent(form.sellerFinanceRate);
  const sellerFinanceTermYears =
    parseInt(form.sellerFinanceTermYears || "0", 10) || 0;
  const sellerFinanceBalloonYears =
    parseInt(form.sellerFinanceBalloonYears || "0", 10) || 0;
  const totalPayments = sellerFinanceTermYears * 12;
  const annualRateDecimal = sellerFinanceRatePct / 100;

  const isInterestOnly = form.sellerFinancePaymentType === "interestOnly";
  const isHybrid = form.sellerFinancePaymentType === "hybrid";
  const hasEarlyBalloon =
    sellerFinanceBalloonYears > 0 &&
    sellerFinanceBalloonYears < sellerFinanceTermYears;
  const sellerFinanceHybridMonths =
    parseInt(form.sellerFinanceHybridMonths || "0", 10) || 0;

  // Interest-only: the seller collects just the interest each month and the
  // entire principal comes due as a balloon — at the balloon year if one is
  // set, otherwise at the end of the note term. Hybrid: interest-only for
  // the chosen number of months, then the remaining principal amortizes
  // over the rest of the term (self-paying off by term end unless a
  // balloon year cuts it short). Amortized: level P&I payments for the
  // whole term, with an optional balloon of the remaining balance.
  const sellerNote = computeSellerNote({
    amount: sellerFinanceAmount,
    annualRateDecimal,
    termMonths: totalPayments,
    paymentType: form.sellerFinancePaymentType,
    ioMonths: sellerFinanceHybridMonths,
    earlyBalloonMonths: hasEarlyBalloon ? sellerFinanceBalloonYears * 12 : 0,
  });
  const sellerFinanceMonthly = sellerNote.monthly;
  const sellerFinanceHybridPhase2Monthly = sellerNote.phase2Monthly;
  const sellerFinanceHybridIoMonths = sellerNote.ioMonths;
  const sellerFinanceBalloon = sellerNote.balloon;
  const sellerFinanceBalloonDueYears = sellerNote.balloonDueMonths / 12;
  const sellerFinanceBalloonIsFullPrincipal = sellerNote.balloonIsFullPrincipal;

  // Total interest the seller earns by carrying the note: the sum of every
  // payment they actually collect (across both phases, up to the balloon or
  // the full term) plus the balloon itself, minus the principal financed.
  const downPaymentAmount = purchasePrice - sellerFinanceAmount;
  const sellerNoteMonthsElapsed = sellerNote.monthsElapsed;
  const sellerNoteTotalReceived = sellerNote.totalReceived;
  const sellerNoteTotalInterest = sellerNote.totalInterest;

  const lenderTotal = calcLenderTotal(lenders);
  const remainingForLender = Math.max(
    0,
    purchasePrice - sellerFinanceAmount - lenderTotal,
  );
  const newLenderAmount =
    remainingForLender > 0
      ? fmtCurrencyInput(String(Math.round(remainingForLender)))
      : "";

  // Keep every still-"auto" lender's amount in sync with the purchase price
  // / seller-financing inputs as they change after the row was added —
  // otherwise the seeded amount goes stale the moment the user edits
  // Purchase Price or Seller Financing % afterward. Once the user types
  // into a lender's Amount field directly, AdditionalLenders clears that
  // row's `auto` flag and this effect leaves it alone. Manually-set lenders
  // are treated as fixed and subtracted first; remaining auto lenders (in
  // order) each absorb whatever's left after seller financing and any
  // earlier lenders.
  useEffect(() => {
    setLenders((prev) => {
      let used = sellerFinanceAmount;
      let changed = false;
      const next = prev.map((l) => {
        if (!l.auto) {
          used += parseCurrency(l.amount);
          return l;
        }
        const target = Math.max(0, purchasePrice - used);
        const suggested =
          target > 0 ? fmtCurrencyInput(String(Math.round(target))) : "";
        used += target;
        if (suggested === l.amount) return l;
        changed = true;
        return { ...l, amount: suggested };
      });
      return changed ? next : prev;
    });
  }, [purchasePrice, sellerFinanceAmount]);
  // A lender row always exists in the UI (there's one on load), so filter
  // out empty placeholder rows before computing payments/totals shown in
  // the results — otherwise every deal would show a stray "$0" lender.
  // Once seller financing leaves a gap for a lender, seed the typical
  // lender fees once. After that the fields are the user's to edit or clear.
  const feeDefaultsApplied = useRef(false);
  useEffect(() => {
    if (feeDefaultsApplied.current) return;
    if (!form.sellerFinancePct.trim()) return;
    if (lenderTotal <= 0 || sellerFinancePct >= 100) return;
    feeDefaultsApplied.current = true;
    setForm((prev) => ({
      ...prev,
      originationFees:
        prev.originationFees || DEFAULT_LENDER_FEES.originationFees,
      legalFees: prev.legalFees || DEFAULT_LENDER_FEES.legalFees,
      appraisalFees: prev.appraisalFees || DEFAULT_LENDER_FEES.appraisalFees,
      underwritingFees:
        prev.underwritingFees || DEFAULT_LENDER_FEES.underwritingFees,
    }));
  }, [lenderTotal, sellerFinancePct, form.sellerFinancePct]);
  const activeLenders = lenders.filter((l) => parseCurrency(l.amount) > 0);
  const lenderBreakdown = calcLenderAmortizedBreakdown(activeLenders);
  const lenderMonthlyPayment = lenderBreakdown.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0,
  );

  const originationFeesAmt = parseCurrency(form.originationFees);
  const legalFeesAmt = parseCurrency(form.legalFees);
  const appraisalFeesAmt = parseCurrency(form.appraisalFees);
  const underwritingFeesAmt = parseCurrency(form.underwritingFees);
  const closingCostsAmt = parseCurrency(form.closingCosts);
  const totalLenderFees =
    originationFeesAmt + legalFeesAmt + appraisalFeesAmt + underwritingFeesAmt;
  const totalCashToClose = totalLenderFees + closingCostsAmt;

  const unfinancedPrincipal = purchasePrice - lenderTotal - sellerFinanceAmount;
  // Once seller financing + lender debt cover the full purchase price, fees
  // are assumed rolled into that financing too — the buyer only ever brings
  // cash to close for an actual down-payment gap, never for fees alone on a
  // fully (or over-)financed deal.
  const buyerCashToClose =
    unfinancedPrincipal > 0 ? unfinancedPrincipal + totalCashToClose : 0;
  const isOverFinanced =
    purchasePrice > 0 && lenderTotal + sellerFinanceAmount > purchasePrice;
  const totalMonthlyPayment = sellerFinanceMonthly + lenderMonthlyPayment;

  const monthlyRentAmount = parseCurrency(form.monthlyRent);
  const yearlyTaxesAmt = parseCurrency(form.yearlyTaxes);
  const monthlyTaxes = yearlyTaxesAmt / 12;
  const yearlyInsuranceAmt = parseCurrency(form.yearlyInsurance);
  const monthlyInsurance = yearlyInsuranceAmt / 12;
  const applianceInsuranceAmt = parseCurrency(form.applianceInsurance);
  const propMgmtFee = monthlyRentAmount * (PROP_MGMT_PCT / 100);
  const totalMonthlyExpenses =
    totalMonthlyPayment +
    monthlyTaxes +
    monthlyInsurance +
    applianceInsuranceAmt +
    propMgmtFee;
  const cashFlow = monthlyRentAmount - totalMonthlyExpenses;
  const isCashFlowNegative = cashFlow < 0;

  // Once the hybrid note's interest-only period ends, the seller note
  // payment steps up to the amortized amount — recompute cash flow with
  // that higher payment so the drop is visible instead of hiding behind
  // the interest-only figure for the life of the deal.
  const hasHybridPhase2 = isHybrid && sellerFinanceHybridPhase2Monthly > 0;
  const totalMonthlyPaymentAfterIo = hasHybridPhase2
    ? sellerFinanceHybridPhase2Monthly + lenderMonthlyPayment
    : 0;
  const totalMonthlyExpensesAfterIo = hasHybridPhase2
    ? totalMonthlyPaymentAfterIo +
      monthlyTaxes +
      monthlyInsurance +
      applianceInsuranceAmt +
      propMgmtFee
    : 0;
  const cashFlowAfterIo = hasHybridPhase2
    ? monthlyRentAmount - totalMonthlyExpensesAfterIo
    : 0;
  const isCashFlowAfterIoNegative = cashFlowAfterIo < 0;

  // Predictive analysis: how cash flow moves if achieved rent comes in
  // higher than what's entered, in $50 steps up to +$250.
  const rentSensitivity = computeRentSensitivity({
    monthlyRentAmount,
    debtService: totalMonthlyPayment,
    debtServiceAfterIo: totalMonthlyPaymentAfterIo,
    monthlyTaxes,
    monthlyInsurance,
    applianceInsuranceAmt,
  });

  const isFormComplete = Boolean(
    form.purchasePrice?.trim() &&
    form.sellerFinancePct?.trim() &&
    form.sellerFinanceRate?.trim() &&
    form.sellerFinanceTermYears?.trim() &&
    (!isHybrid || form.sellerFinanceHybridMonths?.trim()) &&
    form.monthlyRent?.trim(),
  );

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      propertyAddress: form.propertyAddress.trim(),
      purchasePrice,
      sellerFinancePct,
      sellerFinanceAmount,
      sellerFinanceRatePct,
      sellerFinanceTermYears,
      sellerFinanceBalloonYears: sellerFinanceBalloonDueYears,
      sellerFinanceBalloon,
      sellerFinanceBalloonIsFullPrincipal,
      sellerFinanceMonthly,
      sellerFinanceHybridPhase2Monthly,
      sellerFinanceHybridIoMonths,
      sellerFinancePaymentType: form.sellerFinancePaymentType,
      isInterestOnly,
      isHybrid,
      downPaymentAmount,
      sellerNoteMonthsElapsed,
      sellerNoteTotalReceived,
      sellerNoteTotalInterest,
      lenderCount: activeLenders.length,
      lenderBreakdown,
      lenderTotal,
      lenderMonthlyPayment,
      originationFeesAmt,
      legalFeesAmt,
      appraisalFeesAmt,
      underwritingFeesAmt,
      totalLenderFees,
      closingCostsAmt,
      totalCashToClose,
      unfinancedPrincipal,
      buyerCashToClose,
      totalMonthlyPayment,
      monthlyRentAmount,
      yearlyTaxesAmt,
      monthlyTaxes,
      yearlyInsuranceAmt,
      monthlyInsurance,
      applianceInsuranceAmt,
      propMgmtFee,
      totalMonthlyExpenses,
      cashFlow,
      hasHybridPhase2,
      totalMonthlyPaymentAfterIo,
      totalMonthlyExpensesAfterIo,
      cashFlowAfterIo,
      rentSensitivity,
      isOverFinanced,
      isCashFlowNegative,
      isCashFlowAfterIoNegative,
    });
  }

  return (
    <>
      <div className="deal-analyzer-hero">
        <span className="deal-analyzer-eyebrow">{tab.eyebrow}</span>
        <h2>{tab.title}</h2>
        <p>{tab.description}</p>
      </div>

      <div
        className="deal-analyzer-cards"
        data-reveal-group
        style={{ "--reveal-delay": "120ms" }}
      >
        {tab.prompts.map((prompt) => (
          <article key={prompt} className="deal-analyzer-card">
            <strong>Review Focus</strong>
            <p>{prompt}</p>
          </article>
        ))}
      </div>

      <section
        className="deal-analyzer-form"
        data-reveal="left"
        style={{ "--reveal-delay": "160ms" }}
      >
        <div className="panel-header deal-analyzer-form-header">
          <div>
            <h2>Seller Finance Inputs</h2>
            <p>
              Enter the purchase price and the seller-financed note first, then
              add any additional lenders — the lender amount will auto-fill with
              whatever's left to finance.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-section-label">Property</div>
        <div className="deal-analyzer-form-grid seller-finance-property-grid">
          <Field
            ref={addressInputRef}
            label="Property Address"
            name="propertyAddress"
            value={form.propertyAddress}
            onChange={handleChange}
            placeholder="e.g. 123 Main St, Austin, TX"
          />
          <Field
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $250,000"
            required
          />
        </div>

        <div className="deal-analyzer-section-label">
          Seller Financing — Promissory Note
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Seller Financing (%)"
            name="sellerFinancePct"
            value={form.sellerFinancePct}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 20"
            required
          />
          {sellerFinanceAmount > 0 && (
            <label className="field deal-analyzer-output">
              <span>Seller Financing Amount</span>
              <input value={fmt(sellerFinanceAmount)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Interest Rate (% / year)"
            name="sellerFinanceRate"
            value={form.sellerFinanceRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 6"
            required
          />
          <label className="field">
            <span>Payment Type</span>
            <select
              name="sellerFinancePaymentType"
              value={form.sellerFinancePaymentType}
              onChange={handleChange}
            >
              <option value="amortized">
                Amortized (principal + interest)
              </option>
              <option value="interestOnly">Interest only</option>
              <option value="hybrid">
                Hybrid (interest only, then amortized)
              </option>
            </select>
          </label>
          <Field
            label="Note Term (Years)"
            name="sellerFinanceTermYears"
            value={form.sellerFinanceTermYears}
            onChange={handleChange}
            placeholder="e.g. 10"
            required
          />
          {isHybrid && (
            <Field
              label="Interest-Only Period (Months)"
              name="sellerFinanceHybridMonths"
              value={form.sellerFinanceHybridMonths}
              onChange={handleChange}
              placeholder="e.g. 12"
              required
            />
          )}
          <Field
            label={
              isInterestOnly
                ? "Principal Due at (Years)"
                : "Balloon Payment at (Years)"
            }
            name="sellerFinanceBalloonYears"
            value={form.sellerFinanceBalloonYears}
            onChange={handleChange}
            placeholder={
              isInterestOnly
                ? "Defaults to note term (optional)"
                : "e.g. 5 (optional)"
            }
          />
          {sellerFinanceAmount > 0 && totalPayments > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                {isHybrid
                  ? `Monthly Payment (Months 1–${sellerFinanceHybridIoMonths || "N"}, Interest Only)`
                  : `Monthly Payment${isInterestOnly ? " (interest only)" : ""}`}
              </span>
              <input value={fmt(sellerFinanceMonthly)} readOnly tabIndex={-1} />
            </label>
          )}
          {isHybrid &&
            sellerFinanceAmount > 0 &&
            sellerFinanceHybridPhase2Monthly > 0 && (
              <label className="field deal-analyzer-output">
                <span>
                  Monthly Payment (Month {sellerFinanceHybridIoMonths + 1}+,
                  Amortized)
                </span>
                <input
                  value={fmt(sellerFinanceHybridPhase2Monthly)}
                  readOnly
                  tabIndex={-1}
                />
              </label>
            )}
          {sellerFinanceBalloonDueYears > 0 && sellerFinanceBalloon > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                {sellerFinanceBalloonIsFullPrincipal
                  ? "Principal Due"
                  : "Balloon Payment"}{" "}
                at Year {sellerFinanceBalloonDueYears}
              </span>
              <input value={fmt(sellerFinanceBalloon)} readOnly tabIndex={-1} />
            </label>
          )}
        </div>

        <AdditionalLenders
          lenders={lenders}
          setLenders={setLenders}
          onMutate={() => setSummary(null)}
          newLenderAmount={newLenderAmount}
        />

        <div className="deal-analyzer-section-label">
          Lender Fees &amp; Closing Costs
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Origination Fees"
            name="originationFees"
            value={form.originationFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $2,500"
          />
          <Field
            label="Doc Fees"
            name="legalFees"
            value={form.legalFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $1,000"
          />
          <Field
            label="Appraisal Fees"
            name="appraisalFees"
            value={form.appraisalFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $500"
          />
          <Field
            label="Underwriting Fees"
            name="underwritingFees"
            value={form.underwritingFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $500"
          />
          {totalLenderFees > 0 && (
            <label className="field deal-analyzer-output">
              <span>Total Lender Fees</span>
              <input value={fmt(totalLenderFees)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Closing Costs"
            name="closingCosts"
            value={form.closingCosts}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $2,500"
          />
          {totalCashToClose > 0 && (
            <label className="field deal-analyzer-output deal-analyzer-output-red">
              <span>Total Cash to Close Costs</span>
              <input value={fmt(totalCashToClose)} readOnly tabIndex={-1} />
            </label>
          )}
        </div>

        {purchasePrice > 0 && (
          <div className="deal-analyzer-form-grid seller-finance-cash-grid">
            <label
              className={`field deal-analyzer-output ${
                isOverFinanced ? "deal-analyzer-output-red" : ""
              }`}
            >
              <span>Buyer Cash to Close</span>
              <input value={fmt(buyerCashToClose)} readOnly tabIndex={-1} />
            </label>
          </div>
        )}

        <div className="deal-analyzer-section-label">Rent &amp; Cash Flow</div>
        <div className="deal-analyzer-form-grid">
          <div style={{ gridColumn: "1 / -1" }}>
            <a
              href="https://www.huduser.gov/portal/datasets/fmr/fmrs/FY2026_code/select_Geography.odn"
              target="_blank"
              rel="noopener noreferrer"
              className="deal-analyzer-rent-estimate-btn"
            >
              Get Rent Estimate ↗
            </a>
          </div>
          <Field
            label="Monthly Rent"
            name="monthlyRent"
            value={form.monthlyRent}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $2,200"
            required
          />
          <Field
            label="Yearly Property Tax"
            name="yearlyTaxes"
            value={form.yearlyTaxes}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $3,000"
          />
          {monthlyTaxes > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Monthly Property Tax{" "}
                <span className="deal-analyzer-auto-badge">÷ 12</span>
              </span>
              <input value={fmt(monthlyTaxes)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Yearly Insurance"
            name="yearlyInsurance"
            value={form.yearlyInsurance}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $1,200"
          />
          {monthlyInsurance > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Monthly Insurance{" "}
                <span className="deal-analyzer-auto-badge">÷ 12</span>
              </span>
              <input value={fmt(monthlyInsurance)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Appliance Insurance (Monthly)"
            name="applianceInsurance"
            value={form.applianceInsurance}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $50"
          />
          {propMgmtFee > 0 && (
            <label className="field deal-analyzer-output">
              <span>Property Management ({PROP_MGMT_PCT}%)</span>
              <input value={fmt(propMgmtFee)} readOnly tabIndex={-1} />
            </label>
          )}
          {(sellerFinanceMonthly > 0 || lenderMonthlyPayment > 0) && (
            <label className="field deal-analyzer-output">
              <span>Total Monthly Debt Service</span>
              <input value={fmt(totalMonthlyPayment)} readOnly tabIndex={-1} />
            </label>
          )}
          {totalMonthlyExpenses > 0 && (
            <label className="field deal-analyzer-output">
              <span>Total Monthly Expenses</span>
              <input value={fmt(totalMonthlyExpenses)} readOnly tabIndex={-1} />
            </label>
          )}
          {monthlyRentAmount > 0 && (
            <label
              className={`field deal-analyzer-output ${
                isCashFlowNegative
                  ? "deal-analyzer-output-red"
                  : "deal-analyzer-output-positive"
              }`}
            >
              <span>
                Cash Flow
                {isHybrid ? ` (Months 1–${sellerFinanceHybridIoMonths})` : ""}
              </span>
              <input value={fmt(cashFlow)} readOnly tabIndex={-1} />
            </label>
          )}
          {hasHybridPhase2 && monthlyRentAmount > 0 && (
            <label
              className={`field deal-analyzer-output ${
                isCashFlowAfterIoNegative
                  ? "deal-analyzer-output-red"
                  : "deal-analyzer-output-positive"
              }`}
            >
              <span>Cash Flow (Month {sellerFinanceHybridIoMonths + 1}+)</span>
              <input value={fmt(cashFlowAfterIo)} readOnly tabIndex={-1} />
            </label>
          )}
        </div>

        <div className="deal-analyzer-actions">
          <button
            className="primary-btn form-btn"
            type="button"
            onClick={handleCalculate}
            disabled={!isFormComplete}
          >
            Calculate
          </button>
        </div>

        {summary ? (
          <div className="deal-analyzer-summary">
            <div
              className={`deal-analyzer-final-verdict ${
                summary.isCashFlowNegative
                  ? "deal-analyzer-verdict-negative"
                  : "deal-analyzer-verdict-positive"
              }`}
            >
              <span>
                Monthly Cash Flow
                {summary.isHybrid
                  ? ` (Months 1–${summary.sellerFinanceHybridIoMonths})`
                  : ""}
              </span>
              <strong>
                <AnimatedAmount value={summary.cashFlow} format={fmt} />
              </strong>
              {summary.hasHybridPhase2 && (
                <p className="deal-analyzer-verdict-reason">
                  Drops to {fmt(summary.cashFlowAfterIo)}/mo from month{" "}
                  {summary.sellerFinanceHybridIoMonths + 1} on, once the note
                  amortizes.
                </p>
              )}
            </div>

            <div
              className="deal-analyzer-summary-grid"
              style={{ marginTop: "1.25rem" }}
            >
              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1", marginTop: 0 }}
              >
                Capital Stack
              </div>
              <div>
                <span>Purchase Price</span>
                <strong>
                  <AnimatedAmount value={summary.purchasePrice} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Seller Financing ({summary.sellerFinancePct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.sellerFinanceAmount}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.lenderTotal > 0 && (
                <div>
                  <span>
                    Lender Total ({summary.lenderCount} lender
                    {summary.lenderCount !== 1 ? "s" : ""})
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.lenderTotal} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.originationFeesAmt > 0 && (
                <div>
                  <span>Origination Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.originationFeesAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.legalFeesAmt > 0 && (
                <div>
                  <span>Doc Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.legalFeesAmt} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.appraisalFeesAmt > 0 && (
                <div>
                  <span>Appraisal Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.appraisalFeesAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.underwritingFeesAmt > 0 && (
                <div>
                  <span>Underwriting Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.underwritingFeesAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.closingCostsAmt > 0 && (
                <div>
                  <span>Closing Costs</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.closingCostsAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              <div>
                <span>
                  <strong>Buyer Cash to Close</strong>
                </span>
                <strong
                  className={
                    summary.isOverFinanced
                      ? "deal-analyzer-return-negative"
                      : "deal-analyzer-return-positive"
                  }
                >
                  <AnimatedAmount
                    value={summary.buyerCashToClose}
                    format={fmt}
                  />
                </strong>
              </div>

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Seller Note — Promissory Note
              </div>
              <div>
                <span>Note Rate</span>
                <strong>{summary.sellerFinanceRatePct}%</strong>
              </div>
              <div>
                <span>Note Term</span>
                <strong>{summary.sellerFinanceTermYears} years</strong>
              </div>
              <div>
                <span>
                  Seller Note Monthly Payment
                  {summary.isInterestOnly
                    ? " (Interest Only)"
                    : summary.isHybrid
                      ? ` (Months 1–${summary.sellerFinanceHybridIoMonths}, Interest Only)`
                      : ""}
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.sellerFinanceMonthly}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.isHybrid &&
                summary.sellerFinanceHybridPhase2Monthly > 0 && (
                  <div>
                    <span>
                      Seller Note Monthly Payment (Month{" "}
                      {summary.sellerFinanceHybridIoMonths + 1}+, Amortized)
                    </span>
                    <strong className="deal-analyzer-return-negative">
                      <AnimatedAmount
                        value={summary.sellerFinanceHybridPhase2Monthly}
                        format={fmt}
                      />
                    </strong>
                  </div>
                )}
              <div>
                <span>
                  {summary.sellerFinanceBalloonIsFullPrincipal
                    ? "Principal Due"
                    : "Balloon Due"}
                </span>
                <strong className="deal-analyzer-return-negative">
                  {summary.sellerFinanceBalloonYears > 0
                    ? `${fmt(summary.sellerFinanceBalloon)} at year ${summary.sellerFinanceBalloonYears}`
                    : "None"}
                </strong>
              </div>

              {summary.lenderBreakdown.length > 0 && (
                <>
                  <div
                    className="deal-analyzer-section-label"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    Lender Payments
                  </div>
                  {summary.lenderBreakdown.map((lender) => (
                    <div key={lender.id}>
                      <span>
                        Lender {lender.index} ({fmt(lender.amount)}
                        {lender.rate > 0 ? ` @ ${lender.rate}%` : ""}
                        {lender.term > 0 ? `, ${lender.term} yr` : ""})
                      </span>
                      {lender.term > 0 ? (
                        <strong className="deal-analyzer-return-negative">
                          <AnimatedAmount
                            value={lender.monthlyPayment}
                            format={fmt}
                          />
                        </strong>
                      ) : (
                        <strong className="deal-analyzer-return-negative">
                          Add a term to amortize
                        </strong>
                      )}
                    </div>
                  ))}
                  <div>
                    <span>Total Lender Payment</span>
                    <strong className="deal-analyzer-return-negative">
                      <AnimatedAmount
                        value={summary.lenderMonthlyPayment}
                        format={fmt}
                      />
                    </strong>
                  </div>
                </>
              )}

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Cash Flow
              </div>
              <div>
                <span>Monthly Rent</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount
                    value={summary.monthlyRentAmount}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Total Monthly Debt Service</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalMonthlyPayment}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.monthlyTaxes > 0 && (
                <div>
                  <span>Property Tax (÷ 12 monthly)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.monthlyTaxes} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.monthlyInsurance > 0 && (
                <div>
                  <span>Insurance (÷ 12 monthly)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.monthlyInsurance}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.applianceInsuranceAmt > 0 && (
                <div>
                  <span>Appliance Insurance</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.applianceInsuranceAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.propMgmtFee > 0 && (
                <div>
                  <span>Property Management ({PROP_MGMT_PCT}%)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.propMgmtFee} format={fmt} />
                  </strong>
                </div>
              )}
              <div>
                <span>
                  <strong>Total Monthly Expenses</strong>
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalMonthlyExpenses}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.hasHybridPhase2 && (
                <div>
                  <span>
                    Cash Flow (Month {summary.sellerFinanceHybridIoMonths + 1}
                    +)
                  </span>
                  <strong
                    className={
                      summary.isCashFlowAfterIoNegative
                        ? "deal-analyzer-return-negative"
                        : "deal-analyzer-return-positive"
                    }
                  >
                    <AnimatedAmount
                      value={summary.cashFlowAfterIo}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
            </div>

            {summary.monthlyRentAmount > 0 && (
              <>
                <div
                  className="deal-analyzer-section-label"
                  style={{ marginTop: "1.25rem" }}
                >
                  Rent Sensitivity — If Achieved Rent Is Higher
                </div>
                <div className="deal-analyzer-summary-grid">
                  {summary.rentSensitivity.map((row) => (
                    <div key={row.increment}>
                      <span>
                        {row.increment === 0
                          ? "Current Rent"
                          : `Rent +$${row.increment}`}{" "}
                        ({fmt(row.rent)})
                      </span>
                      <strong
                        className={
                          row.cashFlow < 0
                            ? "deal-analyzer-return-negative"
                            : "deal-analyzer-return-positive"
                        }
                      >
                        <AnimatedAmount value={row.cashFlow} format={fmt} />
                      </strong>
                      {row.cashFlowAfterIo !== null && (
                        <strong
                          className={
                            row.cashFlowAfterIo < 0
                              ? "deal-analyzer-return-negative"
                              : "deal-analyzer-return-positive"
                          }
                          style={{ fontSize: "0.8rem", opacity: 0.85 }}
                        >
                          {fmt(row.cashFlowAfterIo)} after month{" "}
                          {summary.sellerFinanceHybridIoMonths + 1}
                        </strong>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <SellerFinancePieChart
              title={`Monthly Expenses Breakdown${
                summary.isHybrid
                  ? ` (Months 1–${summary.sellerFinanceHybridIoMonths})`
                  : ""
              }`}
              sellerNotePayment={summary.sellerFinanceMonthly}
              lenderMonthlyPayment={summary.lenderMonthlyPayment}
              monthlyTaxes={summary.monthlyTaxes}
              monthlyInsurance={summary.monthlyInsurance}
              applianceInsuranceAmt={summary.applianceInsuranceAmt}
              propMgmtFee={summary.propMgmtFee}
              cashFlow={summary.cashFlow}
            />

            {summary.hasHybridPhase2 && (
              <SellerFinancePieChart
                title={`Monthly Expenses Breakdown (Month ${
                  summary.sellerFinanceHybridIoMonths + 1
                }+, Amortized)`}
                sellerNotePayment={summary.sellerFinanceHybridPhase2Monthly}
                lenderMonthlyPayment={summary.lenderMonthlyPayment}
                monthlyTaxes={summary.monthlyTaxes}
                monthlyInsurance={summary.monthlyInsurance}
                applianceInsuranceAmt={summary.applianceInsuranceAmt}
                propMgmtFee={summary.propMgmtFee}
                cashFlow={summary.cashFlowAfterIo}
              />
            )}

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              Buyer Cash to Close = Purchase Price − Seller Financing − Lender
              Total + Lender Fees + Closing Costs (fees roll into financing
              instead, at $0 cash to close, once seller financing + lender debt
              cover the full purchase price)
              <span>
                {fmt(summary.purchasePrice)} −{" "}
                {fmt(summary.sellerFinanceAmount)} − {fmt(summary.lenderTotal)}{" "}
                {summary.unfinancedPrincipal > 0
                  ? `+ ${fmt(summary.totalLenderFees)} + ${fmt(summary.closingCostsAmt)} `
                  : "(fully financed — fees rolled in) "}
                = {fmt(summary.buyerCashToClose)}
              </span>
              Monthly Cash Flow = Monthly Rent − (Seller Note Payment + Lender
              Payments + Property Tax + Insurance + Appliance Insurance +
              Property Management)
              <span>
                {fmt(summary.monthlyRentAmount)} − (
                {fmt(summary.sellerFinanceMonthly)} +{" "}
                {fmt(summary.lenderMonthlyPayment)} +{" "}
                {fmt(summary.monthlyTaxes)} + {fmt(summary.monthlyInsurance)} +{" "}
                {fmt(summary.applianceInsuranceAmt)} +{" "}
                {fmt(summary.propMgmtFee)}) = {fmt(summary.cashFlow)}
              </span>
              <span>
                Negative cash flow is flagged red; positive cash flow is flagged
                green.
              </span>
              <span>
                {summary.isInterestOnly
                  ? "The seller note is interest only (M = P x annual rate / 12), with the full principal due as a balloon. "
                  : summary.isHybrid
                    ? `The seller note is interest only for the first ${summary.sellerFinanceHybridIoMonths} months, then amortizes the full principal over the remaining term (fully paying off by term end unless a balloon cuts it short). `
                    : "The seller note is fully amortized. "}
                Amortized payments use `M = P x [r(1 + r)^n / ((1 + r)^n - 1)]`,
                where `r = annual interest / 12` and `n = term x 12`. A lender
                without a term contributes $0 until one is entered.
              </span>
              {summary.monthlyRentAmount > 0 && (
                <span>
                  Rent Sensitivity holds debt service, taxes, insurance and
                  appliance insurance fixed and re-runs cash flow at $50
                  increments of achieved rent — property management (10%) moves
                  with rent since it's a percentage of it.
                </span>
              )}
            </div>

            <div
              className="deal-analyzer-actions"
              style={{ marginTop: "1.25rem", gap: "0.75rem" }}
            >
              <GenerateReportButton
                onClick={handleGenerateFullReport}
                exporting={exportingFullReport}
                label="Generate Full Report"
                bare
              />
              <GenerateReportButton
                onClick={handleGenerateSellerReport}
                exporting={exportingSellerReport}
                label="Generate Seller Copy"
                bare
              />
            </div>

            {exportingFullReport && (
              <SellerFinancePdfTemplate ref={fullReportRef} summary={summary} />
            )}
            {exportingSellerReport && (
              <SellerFinanceSellerReportPdfTemplate
                ref={sellerReportRef}
                summary={summary}
              />
            )}
          </div>
        ) : null}
      </section>

      <PdfReportPreviewModal
        previewImage={fullReportPreviewImage}
        onClose={closeFullReportPreview}
        onDownload={downloadFullReport}
      />
      <PdfReportPreviewModal
        previewImage={sellerReportPreviewImage}
        onClose={closeSellerReportPreview}
        onDownload={downloadSellerReport}
      />
    </>
  );
}

export default SellerFinanceTab;
