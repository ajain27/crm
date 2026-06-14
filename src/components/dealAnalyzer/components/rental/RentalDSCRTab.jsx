import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import {
  parseCurrency,
  parsePercent,
  fmt,
  fmtCurrencyInput,
} from "../../../../utils/utils";
import AdditionalLenders, {
  calcLenderMonthlyPayment,
  calcLenderTotal,
} from "../additionalLenders/AdditionalLenders";

const PROP_MGMT_PCT = 10;
const FIRST_MONTH_PROP_MGMT_PCT = 50;
const CLOSING_COSTS_PCT = 2;
const INSPECTION_COST = 375;
const LENDER_LTC = 0.8;
const DOWN_PCT = Math.round((1 - LENDER_LTC) * 100);

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
  "sellerCarryback",
]);

const PERCENT_FIELDS = new Set([
  "agentCommission",
  "titleFees",
  "points",
  "interestRate",
  "originationFeesPct",
]);

const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  titleFees: "",
  underwritingFees: "",
  points: "",
  interestRate: "",
  loanTermYears: "",
  extraDownPayment: "",
  originationFeesPct: "",
  legalFees: "",
  appraisalFees: "",
  monthlyRent: "",
  yearlyInsurance: "",
  yearlyTaxes: "",
  annualMiscExpense: "",
  monthlyHomeWarranty: "",
  sellerCarryback: "",
};

function RentalDSCRTab() {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);
  const [lenders, setLenders] = useState([]);

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

  const purchasePrice = parseCurrency(form.purchasePrice);
  const agentCommissionPct = parsePercent(form.agentCommission);
  const agentCommissionAmt = purchasePrice * (agentCommissionPct / 100);
  const closingCosts = purchasePrice * (CLOSING_COSTS_PCT / 100);
  const titleFeesPct = parsePercent(form.titleFees);
  const titleFees = purchasePrice * (titleFeesPct / 100);
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

  const lenderFunds = purchasePrice * LENDER_LTC;
  const downPayment = purchasePrice * (1 - LENDER_LTC);
  const extraDownPaymentAmt = parseCurrency(form.extraDownPayment);
  const effectiveLoanAmount = Math.max(0, lenderFunds - extraDownPaymentAmt);
  const effectiveDownPayment = downPayment + extraDownPaymentAmt;
  const pointsPct = parsePercent(form.points);
  const interestRatePct = parsePercent(form.interestRate);
  const loanTermYears = parseInt(form.loanTermYears || "0", 10) || 0;
  const originationFeesPct = parsePercent(form.originationFeesPct);
  const originationFees = effectiveLoanAmount * (originationFeesPct / 100);
  const legalFees = parseCurrency(form.legalFees);
  const appraisalFees = parseCurrency(form.appraisalFees);
  const pointsCost = effectiveLoanAmount * (pointsPct / 100);
  const lenderCosts =
    pointsCost + originationFees + legalFees + appraisalFees + underwritingFees;
  const upfrontLoanCosts = lenderCosts;
  const loanOutOfPocket = effectiveDownPayment + upfrontLoanCosts;
  const loanMortgage = calcPMT(
    interestRatePct,
    loanTermYears,
    effectiveLoanAmount,
  );

  const lenderMonthlyPayment = calcLenderMonthlyPayment(lenders);
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
    propMgmtFee +
    monthlyMiscExpense +
    monthlyInsurance +
    monthlyTaxes +
    monthlyHomeWarranty;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const sellerCarryback = parseCurrency(form.sellerCarryback);
  const grossCashNeeded =
    loanOutOfPocket +
    closingCosts +
    titleFees +
    agentCommissionAmt +
    INSPECTION_COST;
  const lenderTotal = calcLenderTotal(lenders);
  const totalFundsNeeded = Math.max(
    0,
    grossCashNeeded - sellerCarryback - lenderTotal,
  );
  const cashOnCash =
    totalFundsNeeded > 0 ? (annualCashFlow / totalFundsNeeded) * 100 : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;
  const totalDebtService = loanMortgage + lenderMonthlyPayment;
  const dscr = totalDebtService > 0 ? noi / totalDebtService : 0;

  const isFormComplete =
    form.purchasePrice?.trim() &&
    form.monthlyRent?.trim() &&
    form.interestRate?.trim() &&
    form.loanTermYears?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      agentCommissionPct,
      agentCommissionAmt,
      closingCosts,
      titleFeesPct,
      titleFees,
      underwritingFees,
      monthlyRent,
      propMgmtFee,
      monthlyInsurance,
      monthlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
      monthlyHomeWarranty,
      lenderFunds,
      downPayment,
      extraDownPaymentAmt,
      effectiveLoanAmount,
      effectiveDownPayment,
      pointsPct,
      pointsCost,
      interestRatePct,
      loanTermYears,
      loanMortgage,
      lenders,
      lenderMonthlyPayment,
      lenderTotal,
      sellerCarryback,
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
      cashOnCash,
      capRate,
      dscr,
      inspectionCost: INSPECTION_COST,
    });
  }

  return (
    <section
      className="deal-analyzer-form"
      data-reveal="left"
      style={{ "--reveal-delay": "160ms" }}
    >
      <div className="panel-header deal-analyzer-form-header">
        <div>
          <h2>Rental Inputs</h2>
          <p>
            Enter purchase details, DSCR loan terms, and monthly income and
            expenses to calculate cash flow.
          </p>
        </div>
      </div>

      <div className="deal-analyzer-section-label">
        Purchase &amp; Acquisition
      </div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Purchase Price"
          name="purchasePrice"
          value={form.purchasePrice}
          onChange={handleChange}
          placeholder="e.g. $200,000"
          required
        />
        <Field
          label="Agent Commission (%)"
          name="agentCommission"
          value={form.agentCommission}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 3"
        />
        {agentCommissionAmt > 0 && (
          <label className="field deal-analyzer-output">
            <span>Agent Commission Amount</span>
            <input value={fmt(agentCommissionAmt)} readOnly tabIndex={-1} />
          </label>
        )}
        <label className="field deal-analyzer-output">
          <span>
            Closing Costs{" "}
            <span className="deal-analyzer-auto-badge">
              {CLOSING_COSTS_PCT}% of price
            </span>
          </span>
          <input
            value={closingCosts > 0 ? fmt(closingCosts) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Title Fees (%)"
          name="titleFees"
          value={form.titleFees}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 1"
        />
        {titleFees > 0 && (
          <label className="field deal-analyzer-output">
            <span>Title Fees Amount</span>
            <input value={fmt(titleFees)} readOnly tabIndex={-1} />
          </label>
        )}
        <Field
          label="Seller Credit / Carryback"
          name="sellerCarryback"
          value={form.sellerCarryback}
          onChange={handleChange}
          placeholder="e.g. $50,000"
        />
      </div>

      <div className="deal-analyzer-section-label">DSCR Loan</div>
      <div className="deal-analyzer-form-grid">
        <label className="field deal-analyzer-output">
          <span>
            Down Payment{" "}
            <span className="deal-analyzer-auto-badge">{DOWN_PCT}%</span>
          </span>
          <input
            value={downPayment > 0 ? fmt(downPayment) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Extra Down Payment"
          name="extraDownPayment"
          value={form.extraDownPayment}
          onChange={handleChange}
          placeholder="e.g. $10,000"
        />
        {extraDownPaymentAmt > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Effective Loan Amount{" "}
              <span className="deal-analyzer-auto-badge">auto</span>
            </span>
            <input value={fmt(effectiveLoanAmount)} readOnly tabIndex={-1} />
          </label>
        )}
        <Field
          label="Points (%)"
          name="points"
          value={form.points}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 2"
        />
        <Field
          label="Interest Rate (% / year)"
          name="interestRate"
          value={form.interestRate}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 7"
          required
        />
        <Field
          label="Loan Term (Years)"
          name="loanTermYears"
          value={form.loanTermYears}
          onChange={handleChange}
          placeholder="e.g. 30"
          required
        />
        <Field
          label="Origination Fees %"
          name="originationFeesPct"
          value={form.originationFeesPct}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 1.5"
        />
        <Field
          label="Doc Fees"
          name="legalFees"
          value={form.legalFees}
          onChange={handleChange}
          placeholder="e.g. $1,000"
        />
        <Field
          label="Appraisal Fees"
          name="appraisalFees"
          value={form.appraisalFees}
          onChange={handleChange}
          placeholder="e.g. $500"
        />
        <Field
          label="Underwriting Fees"
          name="underwritingFees"
          value={form.underwritingFees}
          onChange={handleChange}
          placeholder="e.g. $500"
        />
        {lenderCosts > 0 && (
          <label className="field deal-analyzer-output deal-analyzer-output-red">
            <span>Total Lender Cost</span>
            <input value={fmt(lenderCosts)} readOnly tabIndex={-1} />
          </label>
        )}
        <label className="field deal-analyzer-output">
          <span>
            Monthly Mortgage{" "}
            <span className="deal-analyzer-auto-badge">auto</span>
          </span>
          <input
            value={loanMortgage > 0 ? fmt(loanMortgage) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
      </div>

      <AdditionalLenders
        lenders={lenders}
        setLenders={setLenders}
        onMutate={() => setSummary(null)}
      />

      <div className="deal-analyzer-section-label">Income &amp; Expenses</div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Estimated Monthly Rent"
          name="monthlyRent"
          value={form.monthlyRent}
          onChange={handleChange}
          placeholder="e.g. $1,800"
          required
        />
        <label className="field deal-analyzer-output deal-analyzer-inline-badge-output">
          <span>
            Property Management
            <span
              className="deal-analyzer-auto-badge"
              style={{ fontSize: "10px" }}
            >
              {PROP_MGMT_PCT}% (RENT)
            </span>
          </span>
          <input
            value={propMgmtFee > 0 ? fmt(propMgmtFee) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Yearly Home Insurance"
          name="yearlyInsurance"
          value={form.yearlyInsurance}
          onChange={handleChange}
          placeholder="e.g. $1,200"
        />
        <Field
          label="Yearly Property Taxes"
          name="yearlyTaxes"
          value={form.yearlyTaxes}
          onChange={handleChange}
          placeholder="e.g. $3,000"
        />
        <Field
          label="Annual Miscellaneous Expense"
          name="annualMiscExpense"
          value={form.annualMiscExpense}
          onChange={handleChange}
          placeholder="e.g. $1,200"
        />
        {annualMiscExpense > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Misc. Expense / Month{" "}
              <span className="deal-analyzer-auto-badge">÷ 12</span>
            </span>
            <input value={fmt(monthlyMiscExpense)} readOnly tabIndex={-1} />
          </label>
        )}
        <Field
          label="Monthly Home Warranty"
          name="monthlyHomeWarranty"
          value={form.monthlyHomeWarranty}
          onChange={handleChange}
          placeholder="e.g. $50"
        />
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

      {summary && (
        <div className="deal-analyzer-summary">
          <div
            className={`deal-analyzer-final-verdict ${summary.monthlyCashFlow >= 0 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
          >
            <span>Monthly Cash Flow</span>
            <strong>
              <AnimatedAmount value={summary.monthlyCashFlow} format={fmt} />
            </strong>
          </div>

          <div
            className="deal-analyzer-summary-grid"
            style={{ marginTop: "1.25rem" }}
          >
            <div
              className="deal-analyzer-section-label"
              style={{ gridColumn: "1 / -1", marginTop: 0 }}
            >
              Income
            </div>
            <div>
              <span>Monthly Rent</span>
              <strong className="deal-analyzer-return-positive">
                <AnimatedAmount value={summary.monthlyRent} format={fmt} />
              </strong>
            </div>

            <div
              className="deal-analyzer-section-label"
              style={{ gridColumn: "1 / -1" }}
            >
              Monthly Expenses
            </div>
            {summary.loanMortgage > 0 && (
              <div>
                <span>
                  Monthly Mortgage (DSCR {summary.interestRatePct}%,{" "}
                  {summary.loanTermYears} yr
                  {summary.extraDownPaymentAmt > 0
                    ? `, ${fmt(summary.effectiveLoanAmount)} loan`
                    : ""}
                  )
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.loanMortgage} format={fmt} />
                </strong>
              </div>
            )}
            {summary.lenderMonthlyPayment > 0 && (
              <div>
                <span>
                  Additional Lender Payment ({summary.lenders.length} lender
                  {summary.lenders.length !== 1 ? "s" : ""})
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.lenderMonthlyPayment}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            <div>
              <span>Property Management ({PROP_MGMT_PCT}%)</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.propMgmtFee} format={fmt} />
              </strong>
            </div>
            {summary.monthlyMiscExpense > 0 && (
              <div>
                <span>
                  Misc. Expenses (Annual {fmt(summary.annualMiscExpense)} ÷ 12)
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.monthlyMiscExpense}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            {summary.monthlyInsurance > 0 && (
              <div>
                <span>Home Insurance (÷ 12 monthly)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.monthlyInsurance}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            {summary.monthlyTaxes > 0 && (
              <div>
                <span>Property Taxes (÷ 12 monthly)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.monthlyTaxes} format={fmt} />
                </strong>
              </div>
            )}
            {summary.monthlyHomeWarranty > 0 && (
              <div>
                <span>Home Warranty</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.monthlyHomeWarranty}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            <div>
              <span>Total Monthly Expenses</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount
                  value={summary.totalMonthlyExpenses}
                  format={fmt}
                />
              </strong>
            </div>

            <div
              className="deal-analyzer-section-label"
              style={{ gridColumn: "1 / -1" }}
            >
              Total Cash Needed to Buy
            </div>
            <div>
              <span>
                Down Payment ({DOWN_PCT}% of purchase)
                {summary.extraDownPaymentAmt > 0 && (
                  <span
                    className="deal-analyzer-auto-badge"
                    style={{ marginLeft: "0.35rem" }}
                  >
                    base
                  </span>
                )}
              </span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.downPayment} format={fmt} />
              </strong>
            </div>
            {summary.extraDownPaymentAmt > 0 && (
              <div>
                <span>Extra Down Payment</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.extraDownPaymentAmt}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            {summary.pointsCost > 0 && (
              <div>
                <span>Points ({summary.pointsPct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.pointsCost} format={fmt} />
                </strong>
              </div>
            )}
            {summary.originationFees > 0 && (
              <div>
                <span>Origination Fees ({summary.originationFeesPct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.originationFees}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            {summary.legalFees > 0 && (
              <div>
                <span>Doc Fees</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.legalFees} format={fmt} />
                </strong>
              </div>
            )}
            {summary.appraisalFees > 0 && (
              <div>
                <span>Appraisal Fees</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.appraisalFees} format={fmt} />
                </strong>
              </div>
            )}
            <div>
              <span>Closing Costs ({CLOSING_COSTS_PCT}% of price)</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.closingCosts} format={fmt} />
              </strong>
            </div>
            {summary.titleFees > 0 && (
              <div>
                <span>Title Fees ({summary.titleFeesPct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.titleFees} format={fmt} />
                </strong>
              </div>
            )}
            {summary.underwritingFees > 0 && (
              <div>
                <span>Underwriting Fees</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.underwritingFees}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            {summary.agentCommissionAmt > 0 && (
              <div>
                <span>Agent Commission ({summary.agentCommissionPct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.agentCommissionAmt}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            <div>
              <span>Inspection Cost</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.inspectionCost} format={fmt} />
              </strong>
            </div>
            {summary.lenderTotal > 0 && (
              <>
                <div>
                  <span>Subtotal Before Lender Contributions</span>
                  <strong>
                    <AnimatedAmount
                      value={summary.grossCashNeeded}
                      format={fmt}
                    />
                  </strong>
                </div>
                <div>
                  <span>
                    Additional Lender Contributions ({summary.lenders.length}{" "}
                    lender{summary.lenders.length !== 1 ? "s" : ""})
                  </span>
                  <strong className="deal-analyzer-return-positive">
                    −<AnimatedAmount value={summary.lenderTotal} format={fmt} />
                  </strong>
                </div>
              </>
            )}
            {summary.sellerCarryback > 0 && (
              <div>
                <span>Seller Credit / Carryback</span>
                <strong className="deal-analyzer-return-positive">
                  −
                  <AnimatedAmount
                    value={summary.sellerCarryback}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            <div>
              <span>Total Cash Needed to Buy</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.totalFundsNeeded} format={fmt} />
              </strong>
            </div>

            <div
              className="deal-analyzer-section-label"
              style={{ gridColumn: "1 / -1" }}
            >
              Returns
            </div>
            <div>
              <span>Monthly Cash Flow</span>
              <strong
                className={
                  summary.monthlyCashFlow >= 0
                    ? "deal-analyzer-return-positive"
                    : "deal-analyzer-return-negative"
                }
              >
                <AnimatedAmount value={summary.monthlyCashFlow} format={fmt} />
              </strong>
            </div>
            <div>
              <span>Annual Cash Flow</span>
              <strong
                className={
                  summary.annualCashFlow >= 0
                    ? "deal-analyzer-return-positive"
                    : "deal-analyzer-return-negative"
                }
              >
                <AnimatedAmount value={summary.annualCashFlow} format={fmt} />
              </strong>
            </div>
            {summary.loanMortgage > 0 && (
              <div>
                <span>DSCR</span>
                <strong
                  className={
                    summary.dscr >= 1
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  {summary.dscr.toFixed(2)}
                </strong>
              </div>
            )}
            <div>
              <span>Cash-on-Cash Return</span>
              <strong
                className={
                  summary.cashOnCash >= 0
                    ? "deal-analyzer-return-positive"
                    : "deal-analyzer-return-negative"
                }
              >
                {summary.cashOnCash.toFixed(1)}%
              </strong>
            </div>
            <div>
              <span>Cap Rate</span>
              <strong
                className={
                  summary.capRate >= 0
                    ? "deal-analyzer-return-positive"
                    : "deal-analyzer-return-negative"
                }
              >
                {summary.capRate.toFixed(1)}%
              </strong>
            </div>
          </div>

          <div
            className="deal-analyzer-calculation"
            style={{ marginTop: "1rem" }}
          >
            Monthly Cash Flow = Rent − Prop. Mgmt − Monthly Mortgage
            {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
            <span>
              {fmt(summary.monthlyRent)} − {fmt(summary.propMgmtFee)}
              {summary.loanMortgage > 0
                ? ` − ${fmt(summary.loanMortgage)}`
                : ""}
              {summary.monthlyMiscExpense > 0
                ? ` − ${fmt(summary.monthlyMiscExpense)}`
                : ""}{" "}
              = {fmt(summary.monthlyCashFlow)}
            </span>
          </div>

          <div
            className="deal-analyzer-calculation"
            style={{ marginTop: "0.75rem" }}
          >
            Annual Cash Flow = Monthly Cash Flow × 12
            <span>
              {fmt(summary.monthlyCashFlow)} × 12 ={" "}
              {fmt(summary.annualCashFlow)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default RentalDSCRTab;
