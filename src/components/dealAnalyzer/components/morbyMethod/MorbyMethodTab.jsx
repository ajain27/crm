import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import {
  parseCurrency,
  parsePercent,
  fmt,
  fmtCurrencyInput,
} from "../../../../utils/utils";

const PROP_MGMT_PCT = 10;
const FIRST_MONTH_PROP_MGMT_PCT = 50;
const CLOSING_COSTS_PCT = 2;
const INSPECTION_COST = 450;
const DSCR_LTV = 0.8;
const DOWN_PCT = Math.round((1 - DSCR_LTV) * 100);

function calcPMT(annualRatePct, termYears, principal) {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRatePct <= 0) return principal / (termYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "sellerCarryback",
  "originationFees",
  "legalFees",
  "appraisalFees",
  "underwritingFees",
  "monthlyRent",
  "monthlyInsurance",
  "monthlyTaxes",
  "annualMiscExpense",
]);

const PERCENT_FIELDS = new Set([
  "agentCommission",
  "titleFees",
  "dscrRate",
  "dscrPoints",
  "sellerCarrybackRate",
]);

const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  titleFees: "",
  // DSCR first lien
  dscrRate: "",
  dscrTermYears: "",
  dscrPoints: "",
  originationFees: "",
  legalFees: "",
  appraisalFees: "",
  underwritingFees: "",
  // Seller carryback (2nd lien)
  sellerCarryback: "",
  sellerCarrybackRate: "",
  sellerCarrybackTermYears: "",
  // Income & expenses
  monthlyRent: "",
  monthlyInsurance: "",
  monthlyTaxes: "",
  annualMiscExpense: "",
};

function MorbyMethodTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);

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
    if (name === "dscrTermYears" || name === "sellerCarrybackTermYears") {
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
  const closingCosts = purchasePrice * (CLOSING_COSTS_PCT / 100);
  const titleFeesPct = parsePercent(form.titleFees);
  const titleFees = purchasePrice * (titleFeesPct / 100);

  // — DSCR first lien (80% LTV)
  const dscrLoanAmount = purchasePrice * DSCR_LTV;
  const downPaymentRequired = purchasePrice * (1 - DSCR_LTV);
  const dscrRatePct = parsePercent(form.dscrRate);
  const dscrTermYears = parseInt(form.dscrTermYears || "0", 10) || 0;
  const dscrMonthlyPayment = calcPMT(
    dscrRatePct,
    dscrTermYears,
    dscrLoanAmount,
  );
  const dscrPointsPct = parsePercent(form.dscrPoints);
  const dscrPointsCost = dscrLoanAmount * (dscrPointsPct / 100);
  const originationFees = parseCurrency(form.originationFees);
  const legalFees = parseCurrency(form.legalFees);
  const appraisalFees = parseCurrency(form.appraisalFees);
  const underwritingFees = parseCurrency(form.underwritingFees);
  const dscrMiscFees =
    originationFees + legalFees + appraisalFees + underwritingFees;
  const dscrUpfrontCosts = dscrPointsCost + dscrMiscFees;

  // — Seller carryback (2nd lien promissory note)
  const sellerCarryback = parseCurrency(form.sellerCarryback);
  const sellerCarrybackRatePct = parsePercent(form.sellerCarrybackRate);
  const sellerCarrybackTermYears =
    parseInt(form.sellerCarrybackTermYears || "0", 10) || 0;
  const sellerCarrybackMonthly = calcPMT(
    sellerCarrybackRatePct,
    sellerCarrybackTermYears,
    sellerCarryback,
  );

  // — What buyer actually brings to close
  const totalUpfrontNeeded =
    downPaymentRequired +
    dscrUpfrontCosts +
    closingCosts +
    titleFees +
    agentCommissionAmt +
    INSPECTION_COST;
  const sellerCovers = Math.min(sellerCarryback, totalUpfrontNeeded);
  const buyerCashToClose = Math.max(0, totalUpfrontNeeded - sellerCarryback);
  const sellerExcess = Math.max(0, sellerCarryback - totalUpfrontNeeded);

  // — Income & expenses
  const monthlyRent = parseCurrency(form.monthlyRent);
  const monthlyInsurance = parseCurrency(form.monthlyInsurance);
  const monthlyTaxes = parseCurrency(form.monthlyTaxes);
  const annualMiscExpense = parseCurrency(form.annualMiscExpense);
  const monthlyMiscExpense = annualMiscExpense / 12;
  const propMgmtFee = monthlyRent * (PROP_MGMT_PCT / 100);
  const firstMonthPropMgmtFee = monthlyRent * (FIRST_MONTH_PROP_MGMT_PCT / 100);
  const firstMonthMgmtAdjustment = Math.max(
    0,
    firstMonthPropMgmtFee - propMgmtFee,
  );

  const noi =
    monthlyRent -
    propMgmtFee -
    monthlyInsurance -
    monthlyTaxes -
    monthlyMiscExpense;
  const totalMonthlyDebtService = dscrMonthlyPayment + sellerCarrybackMonthly;
  const totalMonthlyExpenses =
    totalMonthlyDebtService +
    propMgmtFee +
    monthlyInsurance +
    monthlyTaxes +
    monthlyMiscExpense;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12 - firstMonthMgmtAdjustment;

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
      titleFeesPct,
      titleFees,
      // DSCR
      dscrLoanAmount,
      downPaymentRequired,
      dscrRatePct,
      dscrTermYears,
      dscrMonthlyPayment,
      dscrPointsPct,
      dscrPointsCost,
      originationFees,
      legalFees,
      appraisalFees,
      underwritingFees,
      dscrMiscFees,
      dscrUpfrontCosts,
      // Seller carryback
      sellerCarryback,
      sellerCarrybackRatePct,
      sellerCarrybackTermYears,
      sellerCarrybackMonthly,
      // Buyer close
      totalUpfrontNeeded,
      sellerCovers,
      buyerCashToClose,
      sellerExcess,
      // Cash flow
      monthlyRent,
      propMgmtFee,
      firstMonthPropMgmtFee,
      firstMonthMgmtAdjustment,
      monthlyInsurance,
      monthlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
      noi,
      totalMonthlyDebtService,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      // Returns
      dscr,
      capRate,
      cashOnCash,
      inspectionCost: INSPECTION_COST,
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

        {/* — Purchase & Acquisition */}
        <div className="deal-analyzer-section-label">
          Purchase &amp; Acquisition
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            placeholder="e.g. $300,000"
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
        </div>

        {/* — DSCR First Lien */}
        <div className="deal-analyzer-section-label">
          DSCR First Lien{" "}
          <span className="deal-analyzer-auto-badge">
            {DSCR_LTV * 100}% LTV
          </span>
        </div>
        <div className="deal-analyzer-form-grid">
          <label className="field deal-analyzer-output">
            <span>
              Loan Amount{" "}
              <span className="deal-analyzer-auto-badge">
                {DSCR_LTV * 100}% of price
              </span>
            </span>
            <input
              value={dscrLoanAmount > 0 ? fmt(dscrLoanAmount) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field deal-analyzer-output">
            <span>
              Down Payment Required{" "}
              <span className="deal-analyzer-auto-badge">{DOWN_PCT}%</span>
            </span>
            <input
              value={downPaymentRequired > 0 ? fmt(downPaymentRequired) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
          <Field
            label="Interest Rate (% / year)"
            name="dscrRate"
            value={form.dscrRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 7.5"
            required
          />
          <Field
            label="Loan Term (Years)"
            name="dscrTermYears"
            value={form.dscrTermYears}
            onChange={handleChange}
            placeholder="e.g. 30"
            required
          />
          <Field
            label="Points (%)"
            name="dscrPoints"
            value={form.dscrPoints}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 2"
          />
          <Field
            label="Origination Fees"
            name="originationFees"
            value={form.originationFees}
            onChange={handleChange}
            placeholder="e.g. $1,000"
          />
          <Field
            label="Legal Fees"
            name="legalFees"
            value={form.legalFees}
            onChange={handleChange}
            placeholder="e.g. $500"
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
          {dscrMiscFees > 0 && (
            <label className="field deal-analyzer-output">
              <span>Total Misc Fees</span>
              <input value={fmt(dscrMiscFees)} readOnly tabIndex={-1} />
            </label>
          )}
          <label className="field deal-analyzer-output">
            <span>
              Monthly Payment{" "}
              <span className="deal-analyzer-auto-badge">auto</span>
            </span>
            <input
              value={dscrMonthlyPayment > 0 ? fmt(dscrMonthlyPayment) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>

        {/* — Seller Carryback (2nd Lien) */}
        <div className="deal-analyzer-section-label">
          Seller Carryback — 2nd Lien Promissory Note
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Seller Carryback Amount"
            name="sellerCarryback"
            value={form.sellerCarryback}
            onChange={handleChange}
            placeholder="e.g. $60,000"
            required
          />
          <Field
            label="Note Rate (% / year)"
            name="sellerCarrybackRate"
            value={form.sellerCarrybackRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 0 (often interest-free)"
          />
          <Field
            label="Note Term (Years)"
            name="sellerCarrybackTermYears"
            value={form.sellerCarrybackTermYears}
            onChange={handleChange}
            placeholder="e.g. 5 (balloon)"
            required
          />
          {sellerCarryback > 0 && sellerCarrybackTermYears > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Monthly Note Payment{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input
                value={fmt(sellerCarrybackMonthly)}
                readOnly
                tabIndex={-1}
              />
            </label>
          )}
          {sellerCarryback > 0 && (
            <label className="field deal-analyzer-output">
              <span>Seller Covers at Close</span>
              <input value={fmt(sellerCovers)} readOnly tabIndex={-1} />
            </label>
          )}
          {buyerCashToClose >= 0 && purchasePrice > 0 && (
            <label
              className={`field deal-analyzer-output ${buyerCashToClose === 0 ? "deal-analyzer-output-positive" : ""}`}
            >
              <span>Buyer Cash to Close</span>
              <input value={fmt(buyerCashToClose)} readOnly tabIndex={-1} />
            </label>
          )}
          {sellerExcess > 0 && (
            <label className="field deal-analyzer-output deal-analyzer-output-positive">
              <span>Seller Excess (rehab / reserves)</span>
              <input value={fmt(sellerExcess)} readOnly tabIndex={-1} />
            </label>
          )}
        </div>

        {/* — Income & Expenses */}
        <div className="deal-analyzer-section-label">Income &amp; Expenses</div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Estimated Monthly Rent"
            name="monthlyRent"
            value={form.monthlyRent}
            onChange={handleChange}
            placeholder="e.g. $2,500"
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
            label="Monthly Home Insurance"
            name="monthlyInsurance"
            value={form.monthlyInsurance}
            onChange={handleChange}
            placeholder="e.g. $150"
          />
          <Field
            label="Monthly Property Taxes"
            name="monthlyTaxes"
            value={form.monthlyTaxes}
            onChange={handleChange}
            placeholder="e.g. $300"
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
            {/* Cash Flow verdict */}
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
              {/* Capital Stack */}
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
                <span>DSCR Loan ({DSCR_LTV * 100}% LTV — 1st lien)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.dscrLoanAmount} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Seller Carryback (2nd lien)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.sellerCarryback}
                    format={fmt}
                  />
                </strong>
              </div>

              {/* Monthly Expenses */}
              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Monthly Expenses
              </div>
              <div>
                <span>Monthly Rent</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount value={summary.monthlyRent} format={fmt} />
                </strong>
              </div>
              {summary.dscrMonthlyPayment > 0 && (
                <div>
                  <span>
                    DSCR Payment ({summary.dscrRatePct}%,{" "}
                    {summary.dscrTermYears} yr)
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.dscrMonthlyPayment}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.sellerCarrybackMonthly > 0 && (
                <div>
                  <span>
                    Seller Note Payment (
                    {summary.sellerCarrybackRatePct > 0
                      ? `${summary.sellerCarrybackRatePct}%`
                      : "0%"}
                    , {summary.sellerCarrybackTermYears} yr)
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.sellerCarrybackMonthly}
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
              {summary.monthlyInsurance > 0 && (
                <div>
                  <span>Home Insurance</span>
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
                  <span>Property Taxes</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.monthlyTaxes} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.monthlyMiscExpense > 0 && (
                <div>
                  <span>
                    Misc. Expenses (Annual {fmt(summary.annualMiscExpense)} ÷
                    12)
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.monthlyMiscExpense}
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

              {/* Buyer Cash to Close */}
              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Buyer Cash to Close
              </div>
              <div>
                <span>Down Payment ({DOWN_PCT}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.downPaymentRequired}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.dscrPointsCost > 0 && (
                <div>
                  <span>Points ({summary.dscrPointsPct}%)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.dscrPointsCost}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.originationFees > 0 && (
                <div>
                  <span>Origination Fees</span>
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
                  <span>Legal Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.legalFees} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.appraisalFees > 0 && (
                <div>
                  <span>Appraisal Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.appraisalFees}
                      format={fmt}
                    />
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
              <div>
                <span>Closing Costs ({CLOSING_COSTS_PCT}%)</span>
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
                <span>
                  First Month Property Management ({FIRST_MONTH_PROP_MGMT_PCT}%)
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.firstMonthPropMgmtFee}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Inspection</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.inspectionCost} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Total Needed at Close</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalUpfrontNeeded}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Seller Covers (2nd lien)</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount value={summary.sellerCovers} format={fmt} />
                </strong>
              </div>
              {summary.sellerExcess > 0 && (
                <div>
                  <span>Seller Excess (reserves / rehab)</span>
                  <strong className="deal-analyzer-return-positive">
                    <AnimatedAmount value={summary.sellerExcess} format={fmt} />
                  </strong>
                </div>
              )}
              <div>
                <span>
                  <strong>Buyer Cash to Close</strong>
                </span>
                <strong
                  className={
                    summary.buyerCashToClose === 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  <AnimatedAmount
                    value={summary.buyerCashToClose}
                    format={fmt}
                  />
                </strong>
              </div>

              {/* Returns */}
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
                  <AnimatedAmount
                    value={summary.monthlyCashFlow}
                    format={fmt}
                  />
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
              {summary.dscrMonthlyPayment > 0 && (
                <div>
                  <span>DSCR (NOI ÷ 1st lien payment)</span>
                  <strong
                    className={
                      summary.dscr >= 1.25
                        ? "deal-analyzer-return-positive"
                        : "deal-analyzer-return-negative"
                    }
                  >
                    {summary.dscr.toFixed(2)}
                  </strong>
                </div>
              )}
              {summary.cashOnCash !== null && (
                <div>
                  <span>Cash-on-Cash Return</span>
                  <strong
                    className={
                      summary.cashOnCash >= 8
                        ? "deal-analyzer-return-positive"
                        : "deal-analyzer-return-negative"
                    }
                  >
                    {summary.cashOnCash.toFixed(1)}%
                  </strong>
                </div>
              )}
              {summary.buyerCashToClose === 0 && (
                <div>
                  <span>Cash-on-Cash Return</span>
                  <strong className="deal-analyzer-return-positive">
                    ∞ (zero cash in)
                  </strong>
                </div>
              )}
              <div>
                <span>Cap Rate</span>
                <strong
                  className={
                    summary.capRate >= 5
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
              Monthly Cash Flow = Rent − DSCR Payment − Seller Note − Prop. Mgmt
              {summary.monthlyInsurance > 0 ? " − Insurance" : ""}
              {summary.monthlyTaxes > 0 ? " − Taxes" : ""}
              {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
              <span>
                {fmt(summary.monthlyRent)} − {fmt(summary.dscrMonthlyPayment)} −{" "}
                {fmt(summary.sellerCarrybackMonthly)} −{" "}
                {fmt(summary.propMgmtFee)}
                {summary.monthlyInsurance > 0
                  ? ` − ${fmt(summary.monthlyInsurance)}`
                  : ""}
                {summary.monthlyTaxes > 0
                  ? ` − ${fmt(summary.monthlyTaxes)}`
                  : ""}
                {summary.monthlyMiscExpense > 0
                  ? ` − ${fmt(summary.monthlyMiscExpense)}`
                  : ""}{" "}
                = {fmt(summary.monthlyCashFlow)}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default MorbyMethodTab;
