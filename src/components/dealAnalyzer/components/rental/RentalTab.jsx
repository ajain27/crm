import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";

const PROP_MGMT_PCT = 10;
const FIRST_MONTH_PROP_MGMT_PCT = 50;
const CLOSING_COSTS_PCT = 2;
const TITLE_FEES_PCT = 1;
const INSPECTION_COST = 450;
const LENDER_LTC = 0.8;
const DOWN_PCT = Math.round((1 - LENDER_LTC) * 100);

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
  "monthlyInsurance",
  "monthlyTaxes",
  "annualMiscExpense",
  "originationFees",
  "legalFees",
  "appraisalFees",
]);

const PERCENT_FIELDS = new Set(["agentCommission", "points", "interestRate"]);

const initialForm = {
  purchasePrice: "",
  agentCommission: "",
  // loan-only fields
  points: "",
  interestRate: "",
  loanTermYears: "",
  originationFees: "",
  legalFees: "",
  appraisalFees: "",
  // income & expenses
  monthlyRent: "",
  monthlyInsurance: "",
  monthlyTaxes: "",
  annualMiscExpense: "",
};

function RentalTab({ tab }) {
  const [financeType, setFinanceType] = useState("cash");
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

  function switchFinanceType(type) {
    setFinanceType(type);
    setSummary(null);
  }

  // — Shared derived values
  const purchasePrice = parseCurrency(form.purchasePrice);
  const agentCommissionPct = parsePercent(form.agentCommission);
  const agentCommissionAmt = purchasePrice * (agentCommissionPct / 100);
  const closingCosts = purchasePrice * (CLOSING_COSTS_PCT / 100);
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

  // — Loan-mode derived values (DSCR)
  const lenderFunds = purchasePrice * LENDER_LTC;
  const downPayment = purchasePrice * (1 - LENDER_LTC);
  const pointsPct = parsePercent(form.points);
  const interestRatePct = parsePercent(form.interestRate);
  const loanTermYears = parseInt(form.loanTermYears || "0", 10) || 0;
  const titleFees = purchasePrice * (TITLE_FEES_PCT / 100);
  const originationFees = parseCurrency(form.originationFees);
  const legalFees = parseCurrency(form.legalFees);
  const appraisalFees = parseCurrency(form.appraisalFees);
  const pointsCost = lenderFunds * (pointsPct / 100);
  const miscFees = originationFees + legalFees + appraisalFees;
  const upfrontLoanCosts = pointsCost + miscFees;
  const loanOutOfPocket = downPayment + upfrontLoanCosts;
  const loanMortgage = calcPMT(interestRatePct, loanTermYears, lenderFunds);

  // — Cash-flow calculations
  const monthlyMortgage = financeType === "loan" ? loanMortgage : 0;
  const noi =
    monthlyRent -
    propMgmtFee -
    monthlyInsurance -
    monthlyTaxes -
    monthlyMiscExpense;
  const totalMonthlyExpenses =
    monthlyMortgage +
    propMgmtFee +
    monthlyInsurance +
    monthlyTaxes +
    monthlyMiscExpense;
  const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12 - firstMonthMgmtAdjustment;

  const totalFundsNeeded =
    financeType === "loan"
      ? loanOutOfPocket +
        closingCosts +
        titleFees +
        agentCommissionAmt +
        INSPECTION_COST
      : purchasePrice +
        closingCosts +
        titleFees +
        agentCommissionAmt +
        INSPECTION_COST;

  const cashOnCash =
    totalFundsNeeded > 0 ? (annualCashFlow / totalFundsNeeded) * 100 : 0;
  const capRate = purchasePrice > 0 ? ((noi * 12) / purchasePrice) * 100 : 0;
  const dscr = loanMortgage > 0 ? noi / loanMortgage : 0;

  const isLoanFormComplete =
    form.purchasePrice?.trim() &&
    form.monthlyRent?.trim() &&
    form.interestRate?.trim() &&
    form.loanTermYears?.trim();

  const isCashFormComplete =
    form.purchasePrice?.trim() && form.monthlyRent?.trim();

  const isFormComplete =
    financeType === "loan" ? isLoanFormComplete : isCashFormComplete;

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      financeType,
      purchasePrice,
      agentCommissionPct,
      agentCommissionAmt,
      closingCosts,
      monthlyRent,
      propMgmtFee,
      firstMonthPropMgmtFee,
      firstMonthMgmtAdjustment,
      monthlyInsurance,
      monthlyTaxes,
      annualMiscExpense,
      monthlyMiscExpense,
      // loan
      lenderFunds,
      downPayment,
      pointsPct,
      pointsCost,
      interestRatePct,
      loanTermYears,
      titleFees,
      loanMortgage,
      miscFees,
      originationFees,
      legalFees,
      appraisalFees,
      upfrontLoanCosts,
      loanOutOfPocket,
      // cash flow
      monthlyMortgage,
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
              Enter purchase details, financing type, and monthly income and
              expenses to calculate cash flow.
            </p>
          </div>
        </div>

        {/* — Finance type toggle */}
        <div
          className="deal-analyzer-section-label"
          style={{ textAlign: "center" }}
        >
          Purchase Type
        </div>
        <div
          className="deal-tab-bar"
          style={{
            padding: "0 0 1rem 0",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className={`deal-tab-btn${financeType === "cash" ? " deal-tab-btn--active" : ""}`}
            onClick={() => switchFinanceType("cash")}
          >
            Cash
          </button>
          <button
            type="button"
            className={`deal-tab-btn${financeType === "loan" ? " deal-tab-btn--active" : ""}`}
            onClick={() => switchFinanceType("loan")}
          >
            Loan (DSCR)
          </button>
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
          <label className="field deal-analyzer-output">
            <span>
              Title Fees{" "}
              <span className="deal-analyzer-auto-badge">
                {TITLE_FEES_PCT}% of price
              </span>
            </span>
            <input
              value={titleFees > 0 ? fmt(titleFees) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>

        {/* — DSCR Loan (loan mode only) */}
        {financeType === "loan" && (
          <>
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
                label="Points (%)"
                name="points"
                value={form.points}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. 2"
                required
              />
              <Field
                label="Interest Rate (% / year)"
                name="interestRate"
                value={form.interestRate}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. 12"
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
                label="Origination Fees"
                name="originationFees"
                value={form.originationFees}
                onChange={handleChange}
                placeholder="e.g. $1,500"
              />
              <Field
                label="Legal Fees"
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
              {miscFees > 0 && (
                <label className="field deal-analyzer-output">
                  <span>Total Misc Fees</span>
                  <input value={fmt(miscFees)} readOnly tabIndex={-1} />
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
          </>
        )}

        {/* — Income & Expenses */}
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

              {summary.financeType === "loan" && summary.loanMortgage > 0 && (
                <div>
                  <span>
                    Monthly Mortgage (DSCR {summary.interestRatePct}%,{" "}
                    {summary.loanTermYears} yr)
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.loanMortgage} format={fmt} />
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

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                {summary.financeType === "loan"
                  ? "Total Cash Needed to Buy"
                  : "One-Time Costs"}
              </div>

              {summary.financeType === "cash" && (
                <div>
                  <span>Purchase Price</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.purchasePrice}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.financeType === "loan" && (
                <>
                  <div>
                    <span>Down Payment ({DOWN_PCT}% of purchase)</span>
                    <strong className="deal-analyzer-return-negative">
                      <AnimatedAmount
                        value={summary.downPayment}
                        format={fmt}
                      />
                    </strong>
                  </div>
                  {summary.pointsCost > 0 && (
                    <div>
                      <span>Points ({summary.pointsPct}%)</span>
                      <strong className="deal-analyzer-return-negative">
                        <AnimatedAmount
                          value={summary.pointsCost}
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
                        <AnimatedAmount
                          value={summary.legalFees}
                          format={fmt}
                        />
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
                </>
              )}
              <div>
                <span>Closing Costs ({CLOSING_COSTS_PCT}% of price)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.closingCosts} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Title Fees ({TITLE_FEES_PCT}% of price)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.titleFees} format={fmt} />
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
                <span>
                  {summary.financeType === "loan"
                    ? "Total Cash Needed to Buy"
                    : "Total Funds Needed"}
                </span>
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
              {summary.financeType === "loan" && summary.loanMortgage > 0 && (
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
              Monthly Cash Flow = Rent − Prop. Mgmt
              {summary.financeType === "loan" ? " − Monthly Mortgage" : ""}
              {summary.monthlyInsurance > 0 ? " − Insurance" : ""}
              {summary.monthlyTaxes > 0 ? " − Taxes" : ""}
              {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
              <span>
                {fmt(summary.monthlyRent)} − {fmt(summary.propMgmtFee)}
                {summary.financeType === "loan" && summary.loanMortgage > 0
                  ? ` − ${fmt(summary.loanMortgage)}`
                  : ""}
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
