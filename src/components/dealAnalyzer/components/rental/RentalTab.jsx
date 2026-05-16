import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import { calculateMonthlyPayment } from "../../../../utils/utils";

const PROP_MGMT_PCT = 10;
const FIRST_MONTH_PROP_MGMT_PCT = 50;
const CLOSING_COSTS_PCT = 2;
const INSPECTION_COST = 450;

function parseCurrency(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePercent(value) {
  const n = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmt(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtCurrencyInput(value) {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? "$" + parseInt(numeric, 10).toLocaleString("en-US") : "";
}

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "monthlyRent",
  "monthlyInsurance",
  "monthlyTaxes",
]);

const initialForm = {
  purchasePrice: "",
  downPayment: "",
  agentCommission: "",
  dscrRate: "",
  loanTerm: "30",
  monthlyRent: "",
  monthlyInsurance: "",
  monthlyTaxes: "",
};

function RentalTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setSummary(null);
    if (CURRENCY_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: fmtCurrencyInput(value) }));
      return;
    }
    if (
      name === "downPayment" ||
      name === "agentCommission" ||
      name === "dscrRate"
    ) {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, "") }));
      return;
    }
    if (name === "loanTerm") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (
      (name === "downPayment" ||
        name === "agentCommission" ||
        name === "dscrRate") &&
      value
    ) {
      const numeric = value.replace(/[^0-9.]/g, "");
      if (numeric) setForm((prev) => ({ ...prev, [name]: `${numeric}%` }));
    }
  }

  // — Live derived values
  const purchasePrice = parseCurrency(form.purchasePrice);
  const downPaymentPct = parsePercent(form.downPayment);
  const downPaymentAmt = purchasePrice * (downPaymentPct / 100);
  const agentCommissionPct = parsePercent(form.agentCommission);
  const agentCommissionAmt = purchasePrice * (agentCommissionPct / 100);
  const loanAmount = purchasePrice - downPaymentAmt;
  const dscrRate = parsePercent(form.dscrRate);
  const loanTermYears = parseInt(form.loanTerm || "30", 10) || 30;
  const monthlyRent = parseCurrency(form.monthlyRent);
  const monthlyInsurance = parseCurrency(form.monthlyInsurance);
  const monthlyTaxes = parseCurrency(form.monthlyTaxes);

  const monthlyMortgage = calculateMonthlyPayment(
    loanAmount,
    dscrRate / 100,
    loanTermYears * 12,
  );
  const propMgmtFee = monthlyRent * (PROP_MGMT_PCT / 100);
  const firstMonthPropMgmtFee = monthlyRent * (FIRST_MONTH_PROP_MGMT_PCT / 100);
  const firstMonthMgmtAdjustment = Math.max(
    0,
    firstMonthPropMgmtFee - propMgmtFee,
  );
  const closingCosts = purchasePrice * (CLOSING_COSTS_PCT / 100);
  const totalMonthlyExpenses =
    monthlyMortgage + propMgmtFee + monthlyInsurance + monthlyTaxes;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12 - firstMonthMgmtAdjustment;
  const noi = monthlyRent - propMgmtFee - monthlyInsurance - monthlyTaxes;
  const dscr = monthlyMortgage > 0 ? noi / monthlyMortgage : 0;
  const totalFundsNeeded =
    downPaymentAmt + closingCosts + agentCommissionAmt + INSPECTION_COST;
  const cashOnCash =
    totalFundsNeeded > 0 ? (annualCashFlow / totalFundsNeeded) * 100 : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;

  const isFormComplete =
    form.purchasePrice?.trim() &&
    form.downPayment?.trim() &&
    form.dscrRate?.trim() &&
    form.loanTerm?.trim() &&
    form.monthlyRent?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      downPaymentPct,
      downPaymentAmt,
      agentCommissionPct,
      agentCommissionAmt,
      loanAmount,
      dscrRate,
      loanTermYears,
      monthlyRent,
      monthlyMortgage,
      closingCosts,
      propMgmtFee,
      firstMonthPropMgmtFee,
      firstMonthMgmtAdjustment,
      monthlyInsurance,
      monthlyTaxes,
      totalMonthlyExpenses,
      monthlyCashFlow,
      annualCashFlow,
      inspectionCost: INSPECTION_COST,
      totalFundsNeeded,
      noi,
      dscr,
      cashOnCash,
      capRate,
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
            <h2>Rental Inputs</h2>
            <p>
              Enter purchase details, DSCR financing, and monthly income and
              expenses to calculate cash flow.
            </p>
          </div>
        </div>

        {/* — Financing */}
        <div className="deal-analyzer-section-label">
          Purchase &amp; Financing
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
            label="Down Payment (%)"
            name="downPayment"
            value={form.downPayment}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 20"
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
          <label className="field deal-analyzer-output">
            <span>Down Payment Amount</span>
            <input
              value={downPaymentAmt > 0 ? fmt(downPaymentAmt) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field deal-analyzer-output">
            <span>Agent Commission Amount</span>
            <input
              value={agentCommissionAmt > 0 ? fmt(agentCommissionAmt) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field deal-analyzer-output">
            <span>Loan Amount</span>
            <input
              value={loanAmount > 0 ? fmt(loanAmount) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
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
            label="DSCR Interest Rate (%)"
            name="dscrRate"
            value={form.dscrRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 7.5"
            required
          />
          <Field
            label="Loan Term (Years)"
            name="loanTerm"
            value={form.loanTerm}
            onChange={handleChange}
            placeholder="e.g. 30"
            required
          />
          <label className="field deal-analyzer-output">
            <span>
              Monthly Mortgage{" "}
              <span className="deal-analyzer-auto-badge">auto</span>
            </span>
            <input
              value={monthlyMortgage > 0 ? fmt(monthlyMortgage) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>

        {/* — Income & Expenses */}
        <div className="deal-analyzer-section-label">Monthly Expenses</div>
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
            label="Monthly Home Insurance"
            name="monthlyInsurance"
            value={form.monthlyInsurance}
            onChange={handleChange}
            placeholder="e.g. $100"
          />
          <Field
            label="Monthly Property Taxes"
            name="monthlyTaxes"
            value={form.monthlyTaxes}
            onChange={handleChange}
            placeholder="e.g. $250"
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
                <span>
                  Mortgage (DSCR {summary.dscrRate}%, {summary.loanTermYears}yr)
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.monthlyMortgage}
                    format={fmt}
                  />
                </strong>
              </div>
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
                <span>Closing Costs ({CLOSING_COSTS_PCT}% of price)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.closingCosts} format={fmt} />
                </strong>
              </div>
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
                <span>Inspection Cost</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.inspectionCost} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Total Funds Needed</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalFundsNeeded}
                    format={fmt}
                  />
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
              Monthly Cash Flow = Rent − Mortgage − Prop. Mgmt − Insurance −
              Taxes
              <span>
                {fmt(summary.monthlyRent)} − {fmt(summary.monthlyMortgage)} −{" "}
                {fmt(summary.propMgmtFee)}
                {summary.monthlyInsurance > 0
                  ? ` − ${fmt(summary.monthlyInsurance)}`
                  : ""}
                {summary.monthlyTaxes > 0
                  ? ` − ${fmt(summary.monthlyTaxes)}`
                  : ""}{" "}
                = {fmt(summary.monthlyCashFlow)}
              </span>
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "0.75rem" }}
            >
              Annual Cash Flow = (Monthly Cash Flow × 12) − First Month Prop.
              Mgmt Adjustment
              <span>
                ({fmt(summary.monthlyCashFlow)} × 12) −{" "}
                {fmt(summary.firstMonthMgmtAdjustment)} ={" "}
                {fmt(summary.annualCashFlow)}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default RentalTab;
