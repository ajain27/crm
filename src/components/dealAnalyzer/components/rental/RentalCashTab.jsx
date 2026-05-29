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

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "monthlyRent",
  "yearlyInsurance",
  "yearlyTaxes",
  "annualMiscExpense",
]);

const PERCENT_FIELDS = new Set(["agentCommission", "titleFees"]);

const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  titleFees: "",
  monthlyRent: "",
  yearlyInsurance: "",
  yearlyTaxes: "",
  annualMiscExpense: "",
};

function RentalCashTab() {
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
  const monthlyRent = parseCurrency(form.monthlyRent);
  const yearlyInsurance = parseCurrency(form.yearlyInsurance);
  const yearlyTaxes = parseCurrency(form.yearlyTaxes);
  const annualMiscExpense = parseCurrency(form.annualMiscExpense);
  const monthlyMiscExpense = annualMiscExpense / 12;
  const propMgmtFee = monthlyRent * (PROP_MGMT_PCT / 100);
  const firstMonthPropMgmtFee = monthlyRent * (FIRST_MONTH_PROP_MGMT_PCT / 100);
  const firstMonthMgmtAdjustment = Math.max(
    0,
    firstMonthPropMgmtFee - propMgmtFee,
  );

  const noi = monthlyRent - propMgmtFee - monthlyMiscExpense;
  const totalMonthlyExpenses = propMgmtFee + monthlyMiscExpense;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12 - firstMonthMgmtAdjustment;
  const totalFundsNeeded =
    purchasePrice +
    closingCosts +
    titleFees +
    yearlyInsurance +
    yearlyTaxes +
    agentCommissionAmt +
    INSPECTION_COST;
  const cashOnCash =
    totalFundsNeeded > 0 ? (annualCashFlow / totalFundsNeeded) * 100 : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;

  const isFormComplete = form.purchasePrice?.trim() && form.monthlyRent?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      agentCommissionPct,
      agentCommissionAmt,
      closingCosts,
      titleFeesPct,
      titleFees,
      monthlyRent,
      propMgmtFee,
      firstMonthPropMgmtFee,
      firstMonthMgmtAdjustment,
      yearlyInsurance,
      yearlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
      noi,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      totalFundsNeeded,
      cashOnCash,
      capRate,
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
            Enter purchase details and monthly income and expenses to calculate
            cash flow.
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
              One-Time Costs
            </div>
            <div>
              <span>Purchase Price</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.purchasePrice} format={fmt} />
              </strong>
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
            {summary.yearlyInsurance > 0 && (
              <div>
                <span>Yearly Home Insurance</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.yearlyInsurance}
                    format={fmt}
                  />
                </strong>
              </div>
            )}
            {summary.yearlyTaxes > 0 && (
              <div>
                <span>Yearly Property Taxes</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.yearlyTaxes} format={fmt} />
                </strong>
              </div>
            )}
            <div>
              <span>Inspection Cost</span>
              <strong className="deal-analyzer-return-negative">
                <AnimatedAmount value={summary.inspectionCost} format={fmt} />
              </strong>
            </div>
            <div>
              <span>Total Funds Needed</span>
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
            Monthly Cash Flow = Rent − Prop. Mgmt
            {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
            <span>
              {fmt(summary.monthlyRent)} − {fmt(summary.propMgmtFee)}
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

export default RentalCashTab;
