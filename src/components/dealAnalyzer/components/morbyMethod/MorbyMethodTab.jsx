import { useState } from "react";
import {
  parseCurrency,
  parsePercent,
  fmtCurrencyInput,
} from "../../../../utils/utils";
import AdditionalLenders, {
  calcLenderMonthlyPayment,
  calcLenderTotal,
} from "../additionalLenders/AdditionalLenders";
import {
  PROP_MGMT_PCT,
  INSPECTION_COST,
  calcPMT,
  calcBalloonBalance,
  CURRENCY_FIELDS,
  PERCENT_FIELDS,
  initialForm,
} from "./morbyMethodConfig";
import PurchaseSection from "./sections/PurchaseSection";
import DSCRSection from "./sections/DSCRSection";
import SellerCarrybackSection from "./sections/SellerCarrybackSection";
import IncomeExpenseSection from "./sections/IncomeExpenseSection";
import MorbyMethodSummary from "./MorbyMethodSummary";
import { STANDARD_DOWN_PCT_OPTIONS } from "../downPaymentPct/DownPaymentPctField";

const DOWN_OPTIONS = STANDARD_DOWN_PCT_OPTIONS;

function MorbyMethodTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);
  const [lenders, setLenders] = useState([]);
  const [downPct, setDownPct] = useState(20);
  const dscrLtv = (100 - downPct) / 100;

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
    if (
      name === "dscrTermYears" ||
      name === "sellerCarrybackTermYears" ||
      name === "sellerCarrybackBalloonYears"
    ) {
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

  // — Shared
  const purchasePrice = parseCurrency(form.purchasePrice);
  const agentCommissionPct = parsePercent(form.agentCommission);
  const agentCommissionAmt = purchasePrice * (agentCommissionPct / 100);
  const closingCosts = parseCurrency(form.closingCosts);

  // — DSCR first lien
  const dscrLoanAmount = purchasePrice * dscrLtv;
  const downPaymentRequired = purchasePrice * (1 - dscrLtv);
  const extraDownPaymentAmt = parseCurrency(form.extraDownPayment);
  const effectiveDscrLoanAmount = Math.max(
    0,
    dscrLoanAmount - extraDownPaymentAmt,
  );
  const dscrRatePct = parsePercent(form.dscrRate);
  const dscrTermYears = parseInt(form.dscrTermYears || "0", 10) || 0;
  const dscrMonthlyPayment = calcPMT(
    dscrRatePct,
    dscrTermYears,
    effectiveDscrLoanAmount,
  );
  const originationFeesPct = parsePercent(form.originationFeesPct);
  const originationFees = effectiveDscrLoanAmount * (originationFeesPct / 100);
  const legalFees = parseCurrency(form.legalFees);
  const appraisalFees = parseCurrency(form.appraisalFees);
  const underwritingFees = parseCurrency(form.underwritingFees);
  const dscrMiscFees =
    originationFees + legalFees + appraisalFees + underwritingFees;
  const dscrUpfrontCosts = dscrMiscFees;

  // — Seller carryback (2nd lien promissory note)
  const sellerCarrybackPct = parsePercent(form.sellerCarryback);
  const sellerCarryback = purchasePrice * (sellerCarrybackPct / 100);
  const sellerCarrybackRatePct = parsePercent(form.sellerCarrybackRate);
  const sellerCarrybackTermYears =
    parseInt(form.sellerCarrybackTermYears || "0", 10) || 0;
  const sellerCarrybackBalloonYears =
    parseInt(form.sellerCarrybackBalloonYears || "0", 10) || 0;
  const sellerCarrybackMonthly = calcPMT(
    sellerCarrybackRatePct,
    sellerCarrybackTermYears,
    sellerCarryback,
  );
  const sellerCarrybackBalloon =
    sellerCarrybackBalloonYears > 0
      ? calcBalloonBalance(
          sellerCarrybackRatePct,
          sellerCarrybackTermYears,
          sellerCarryback,
          sellerCarrybackBalloonYears,
        )
      : 0;

  // — Income & expenses
  const monthlyRent = parseCurrency(form.monthlyRent);
  const yearlyInsurance = parseCurrency(form.yearlyInsurance);
  const monthlyInsurance = yearlyInsurance / 12;
  const yearlyTaxes = parseCurrency(form.yearlyTaxes);
  const monthlyTaxes = yearlyTaxes / 12;
  const annualMiscExpense = parseCurrency(form.annualMiscExpense);
  const monthlyMiscExpense = annualMiscExpense / 12;
  const monthlyHomeWarranty = parseCurrency(form.monthlyHomeWarranty);
  const propMgmtFee = monthlyRent * (PROP_MGMT_PCT / 100);

  // — What buyer actually brings to close
  const totalUpfrontNeeded =
    downPaymentRequired +
    extraDownPaymentAmt +
    dscrUpfrontCosts +
    closingCosts +
    agentCommissionAmt +
    INSPECTION_COST;
  const lenderTotal = calcLenderTotal(lenders);
  const sellerCovers = Math.min(
    sellerCarryback,
    Math.max(0, totalUpfrontNeeded - lenderTotal),
  );
  const sellerExcess = Math.max(
    0,
    sellerCarryback - (totalUpfrontNeeded - lenderTotal),
  );
  const buyerCashToClose = Math.max(
    0,
    totalUpfrontNeeded - sellerCarryback - lenderTotal,
  );

  const lenderMonthlyPayment = calcLenderMonthlyPayment(lenders);
  const noi =
    monthlyRent -
    propMgmtFee -
    monthlyMiscExpense -
    monthlyInsurance -
    monthlyTaxes -
    monthlyHomeWarranty;
  const totalMonthlyDebtService =
    dscrMonthlyPayment + sellerCarrybackMonthly + lenderMonthlyPayment;
  const totalMonthlyExpenses =
    totalMonthlyDebtService +
    propMgmtFee +
    monthlyMiscExpense +
    monthlyInsurance +
    monthlyTaxes +
    monthlyHomeWarranty;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // — Returns
  const dscr = dscrMonthlyPayment > 0 ? noi / dscrMonthlyPayment : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;
  const cashOnCash =
    buyerCashToClose > 0 ? (annualCashFlow / buyerCashToClose) * 100 : null;

  const isFormComplete =
    form.purchasePrice?.trim() &&
    form.dscrRate?.trim() &&
    form.dscrTermYears?.trim() &&
    form.sellerCarryback?.trim() &&
    form.sellerCarrybackTermYears?.trim() &&
    form.monthlyRent?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      agentCommissionPct,
      agentCommissionAmt,
      closingCosts,
      dscrLoanAmount,
      downPaymentRequired,
      extraDownPaymentAmt,
      effectiveDscrLoanAmount,
      dscrRatePct,
      dscrTermYears,
      dscrMonthlyPayment,
      originationFeesPct,
      originationFees,
      legalFees,
      appraisalFees,
      underwritingFees,
      dscrMiscFees,
      dscrUpfrontCosts,
      sellerCarrybackPct,
      sellerCarryback,
      sellerCarrybackRatePct,
      sellerCarrybackTermYears,
      sellerCarrybackBalloonYears,
      sellerCarrybackBalloon,
      sellerCarrybackMonthly,
      lenders,
      lenderMonthlyPayment,
      lenderTotal,
      totalUpfrontNeeded,
      sellerCovers,
      sellerExcess,
      buyerCashToClose,
      monthlyRent,
      propMgmtFee,
      monthlyInsurance,
      monthlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
      monthlyHomeWarranty,
      noi,
      totalMonthlyDebtService,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      dscr,
      capRate,
      cashOnCash,
      inspectionCost: INSPECTION_COST,
      downPct,
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
            <h2>Morby Method Inputs</h2>
            <p>
              Stack a DSCR first lien with a seller-carried second lien
              (promissory note) to minimize your cash to close.
            </p>
          </div>
        </div>

        <PurchaseSection
          form={form}
          onChange={handleChange}
          onBlur={handleBlur}
          agentCommissionAmt={agentCommissionAmt}
        />

        <DSCRSection
          form={form}
          onChange={handleChange}
          onBlur={handleBlur}
          dscrLoanAmount={dscrLoanAmount}
          downPaymentRequired={downPaymentRequired}
          dscrMonthlyPayment={dscrMonthlyPayment}
          dscrMiscFees={dscrMiscFees}
          downPct={downPct}
          dscrLtv={dscrLtv}
          onDownPctChange={(val) => {
            setDownPct(val);
            setSummary(null);
          }}
          downOptions={DOWN_OPTIONS}
        />

        <SellerCarrybackSection
          form={form}
          onChange={handleChange}
          onBlur={handleBlur}
          sellerCarryback={sellerCarryback}
          sellerCarrybackTermYears={sellerCarrybackTermYears}
          sellerCarrybackBalloonYears={sellerCarrybackBalloonYears}
          sellerCarrybackBalloon={sellerCarrybackBalloon}
          sellerCarrybackMonthly={sellerCarrybackMonthly}
          buyerCashToClose={buyerCashToClose}
          purchasePrice={purchasePrice}
        />

        <AdditionalLenders
          lenders={lenders}
          setLenders={setLenders}
          onMutate={() => setSummary(null)}
        />

        <IncomeExpenseSection
          form={form}
          onChange={handleChange}
          propMgmtFee={propMgmtFee}
          annualMiscExpense={annualMiscExpense}
          monthlyMiscExpense={monthlyMiscExpense}
        />

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

        <MorbyMethodSummary summary={summary} />
      </section>
    </>
  );
}

export default MorbyMethodTab;
