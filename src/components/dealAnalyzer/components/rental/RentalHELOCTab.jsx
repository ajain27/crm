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

function calcPMT(annualRatePct, termYears, principal) {
  if (annualRatePct <= 0 || termYears <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "monthlyRent",
  "yearlyInsurance",
  "yearlyTaxes",
  "annualMiscExpense",
]);

const PERCENT_FIELDS = new Set(["titleFees", "helocInterestRate"]);

const initialForm = {
  purchasePrice: "",
  titleFees: "",
  helocInterestRate: "",
  helocTermYears: "",
  monthlyRent: "",
  yearlyInsurance: "",
  yearlyTaxes: "",
  annualMiscExpense: "",
};

function RentalHELOCTab() {
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
    if (name === "helocTermYears") {
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
  const closingCosts = purchasePrice * (CLOSING_COSTS_PCT / 100);
  const titleFeesPct = parsePercent(form.titleFees);
  const titleFees = purchasePrice * (titleFeesPct / 100);
  const helocInterestRatePct = parsePercent(form.helocInterestRate);
  const helocTermYears = parseInt(form.helocTermYears || "0", 10) || 0;
  const monthlyRent = parseCurrency(form.monthlyRent);
  const yearlyInsurance = parseCurrency(form.yearlyInsurance);
  const yearlyTaxes = parseCurrency(form.yearlyTaxes);
  const annualMiscExpense = parseCurrency(form.annualMiscExpense);
  const monthlyMiscExpense = annualMiscExpense / 12;
  const monthlyInsurance = yearlyInsurance / 12;
  const monthlyTaxes = yearlyTaxes / 12;
  const propMgmtFee = monthlyRent * (PROP_MGMT_PCT / 100);
  const firstMonthPropMgmtFee = monthlyRent * (FIRST_MONTH_PROP_MGMT_PCT / 100);
  const firstMonthMgmtAdjustment = Math.max(
    0,
    firstMonthPropMgmtFee - propMgmtFee,
  );

  // HELOC finances the full purchase price, amortized over the term.
  const helocPayment = calcPMT(
    helocInterestRatePct,
    helocTermYears,
    purchasePrice,
  );

  const noi =
    monthlyRent -
    propMgmtFee -
    monthlyMiscExpense -
    monthlyInsurance -
    monthlyTaxes;
  const totalMonthlyExpenses =
    helocPayment +
    propMgmtFee +
    monthlyMiscExpense +
    monthlyInsurance +
    monthlyTaxes;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12 - firstMonthMgmtAdjustment;
  // HELOC finances the full purchase price, so cash to close is the upfront
  // acquisition costs rather than the property itself.
  const totalFundsNeeded =
    closingCosts + titleFees + firstMonthPropMgmtFee + INSPECTION_COST;
  const cashOnCash =
    totalFundsNeeded > 0 ? (annualCashFlow / totalFundsNeeded) * 100 : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;
  const dscr = helocPayment > 0 ? noi / helocPayment : 0;

  const isFormComplete =
    form.purchasePrice?.trim() &&
    form.monthlyRent?.trim() &&
    form.helocInterestRate?.trim() &&
    form.helocTermYears?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      closingCosts,
      titleFeesPct,
      titleFees,
      helocInterestRatePct,
      helocTermYears,
      helocPayment,
      monthlyRent,
      propMgmtFee,
      firstMonthPropMgmtFee,
      firstMonthMgmtAdjustment,
      yearlyInsurance,
      yearlyTaxes,
      monthlyInsurance,
      monthlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
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
            Enter purchase details, HELOC terms, and monthly income and expenses
            to calculate cash flow.
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

      <div className="deal-analyzer-section-label">HELOC</div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="HELOC Interest Rate (% / year)"
          name="helocInterestRate"
          value={form.helocInterestRate}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 8"
          required
        />
        <Field
          label="Term (Years)"
          name="helocTermYears"
          value={form.helocTermYears}
          onChange={handleChange}
          placeholder="e.g. 10"
          required
        />
        <label className="field deal-analyzer-output">
          <span>
            Monthly HELOC Payment{" "}
            <span className="deal-analyzer-auto-badge">auto</span>
          </span>
          <input
            value={helocPayment > 0 ? fmt(helocPayment) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
      </div>

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
            {summary.helocPayment > 0 && (
              <div>
                <span>
                  Monthly HELOC Payment ({summary.helocInterestRatePct}%,{" "}
                  {summary.helocTermYears} yr)
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.helocPayment} format={fmt} />
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
                <span>
                  Insurance (Annual {fmt(summary.yearlyInsurance)} ÷ 12)
                </span>
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
                <span>Taxes (Annual {fmt(summary.yearlyTaxes)} ÷ 12)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.monthlyTaxes} format={fmt} />
                </strong>
              </div>
            )}
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
              Cash Needed to Close
            </div>
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
              <span>Inspection Cost</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.inspectionCost} format={fmt} />
              </strong>
            </div>
            <div>
              <span>Total Cash Needed to Close</span>
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
            {summary.helocPayment > 0 && (
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
            Monthly Cash Flow = Rent − HELOC Payment − Prop. Mgmt
            {summary.monthlyInsurance > 0 ? " − Insurance" : ""}
            {summary.monthlyTaxes > 0 ? " − Taxes" : ""}
            {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
            <span>
              {fmt(summary.monthlyRent)}
              {summary.helocPayment > 0
                ? ` − ${fmt(summary.helocPayment)}`
                : ""}{" "}
              − {fmt(summary.propMgmtFee)}
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

          <div
            className="deal-analyzer-calculation"
            style={{ marginTop: "0.75rem" }}
          >
            Annual Cash Flow = (Monthly Cash Flow × 12) − First Month Prop. Mgmt
            Adjustment
            <span>
              ({fmt(summary.monthlyCashFlow)} × 12) −{" "}
              {fmt(summary.firstMonthMgmtAdjustment)} ={" "}
              {fmt(summary.annualCashFlow)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default RentalHELOCTab;
