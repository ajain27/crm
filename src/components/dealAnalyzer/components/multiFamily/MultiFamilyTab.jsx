import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import {
  parseCurrency,
  parsePercent,
  fmt,
  fmtCurrencyInput,
} from "../fixAndFlip/fixAndFlipConfig";
import { calculateMonthlyPayment } from "../../../../utils/utils";

const CLOSING_COSTS_PCT = 2; // 2% of purchase price
const AGENT_COMMISSION_PCT = 3; // 3% of purchase price

const initialForm = {
  purchasePrice: "",
  numUnits: "",
  rentPerUnit: "",
  otherIncome: "",
  vacancyRate: "",
  rehabCost: "",
  additionalExpenses: "",
  downPayment: "",
  interestRate: "",
  loanTermYears: "",
};

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "rentPerUnit",
  "otherIncome",
  "rehabCost",
  "additionalExpenses",
]);

const PERCENT_FIELDS = new Set(["vacancyRate", "downPayment", "interestRate"]);

function MultiFamilyTab({ tab }) {
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
    if (name === "numUnits" || name === "loanTermYears") {
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

  const isFormComplete =
    form.purchasePrice?.trim() &&
    form.numUnits?.trim() &&
    form.rentPerUnit?.trim() &&
    form.vacancyRate?.trim() &&
    form.downPayment?.trim() &&
    form.interestRate?.trim() &&
    form.loanTermYears?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;

    const purchasePrice = parseCurrency(form.purchasePrice);
    const numUnits = parseInt(form.numUnits || "0", 10) || 0;
    const rentPerUnit = parseCurrency(form.rentPerUnit);
    const otherIncome = parseCurrency(form.otherIncome);
    const vacancyPct = parsePercent(form.vacancyRate);
    const expenseRatioPct = 35;
    const additionalExpenses = parseCurrency(form.additionalExpenses);
    const rehabCost = parseCurrency(form.rehabCost);
    const closingCosts = purchasePrice * (CLOSING_COSTS_PCT / 100);
    const agentCommission = purchasePrice * (AGENT_COMMISSION_PCT / 100);
    const downPaymentPct = parsePercent(form.downPayment);
    const annualInterestRate = parsePercent(form.interestRate) / 100;
    const loanTermYears = parseInt(form.loanTermYears || "0", 10) || 0;

    const grossMonthlyRent = rentPerUnit * numUnits;
    const grossMonthlyIncome = grossMonthlyRent + otherIncome;
    const vacancyLoss = grossMonthlyIncome * (vacancyPct / 100);
    const effectiveGrossIncome = grossMonthlyIncome - vacancyLoss;
    const totalMonthlyExpenses =
      effectiveGrossIncome * (expenseRatioPct / 100) + additionalExpenses;
    const monthlyNOI = effectiveGrossIncome - totalMonthlyExpenses;
    const annualNOI = monthlyNOI * 12;
    const capRate = purchasePrice > 0 ? (annualNOI / purchasePrice) * 100 : 0;
    const downPaymentAmount = purchasePrice * (downPaymentPct / 100);
    const loanAmount = purchasePrice - downPaymentAmount;
    const totalMonths = loanTermYears * 12;
    const monthlyMortgage = calculateMonthlyPayment(
      loanAmount,
      annualInterestRate,
      totalMonths,
    );
    const monthlyCashFlow = monthlyNOI - monthlyMortgage;
    const annualCashFlow = monthlyCashFlow * 12;
    const totalCashInvested =
      downPaymentAmount + closingCosts + agentCommission + rehabCost;
    const cocReturn =
      totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : null;
    const grm =
      grossMonthlyRent > 0 ? purchasePrice / (grossMonthlyRent * 12) : null;
    const pricePerUnit = numUnits > 0 ? purchasePrice / numUnits : 0;
    const isDeal =
      monthlyCashFlow > 0 &&
      cocReturn !== null &&
      cocReturn >= 8 &&
      capRate >= 5;

    setSummary({
      purchasePrice,
      numUnits,
      grossMonthlyRent,
      otherIncome,
      grossMonthlyIncome,
      vacancyPct,
      vacancyLoss,
      effectiveGrossIncome,
      expenseRatioPct,
      additionalExpenses,
      totalMonthlyExpenses,
      monthlyNOI,
      annualNOI,
      capRate,
      downPaymentPct,
      downPaymentAmount,
      closingCosts,
      agentCommission,
      loanAmount,
      loanTermYears,
      monthlyMortgage,
      monthlyCashFlow,
      annualCashFlow,
      totalCashInvested,
      cocReturn,
      grm,
      pricePerUnit,
      isDeal,
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
            <h2>Multi-Family Inputs</h2>
            <p>
              Enter acquisition, income, expense, and financing details to
              analyze cash flow and returns.
            </p>
          </div>
        </div>

        {/* — Property & Acquisition */}
        <div className="deal-analyzer-section-label">
          Property &amp; Acquisition
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            placeholder="e.g. $500,000"
            required
          />
          <Field
            label="Number of Units"
            name="numUnits"
            value={form.numUnits}
            onChange={handleChange}
            placeholder="e.g. 4"
            required
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
            placeholder="e.g. $20,000"
          />
          <label className="field deal-analyzer-output">
            <span>
              Closing Costs{" "}
              <span className="deal-analyzer-auto-badge">
                {CLOSING_COSTS_PCT}% of price
              </span>
            </span>
            <input
              value={
                form.purchasePrice
                  ? fmt(
                      parseCurrency(form.purchasePrice) *
                        (CLOSING_COSTS_PCT / 100),
                    )
                  : ""
              }
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field deal-analyzer-output">
            <span>
              Agent Commission{" "}
              <span className="deal-analyzer-auto-badge">
                {AGENT_COMMISSION_PCT}% of price
              </span>
            </span>
            <input
              value={
                form.purchasePrice
                  ? fmt(
                      parseCurrency(form.purchasePrice) *
                        (AGENT_COMMISSION_PCT / 100),
                    )
                  : ""
              }
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>

        {/* — Rental Income */}
        <div className="deal-analyzer-section-label">Rental Income</div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Monthly Rent Per Unit"
            name="rentPerUnit"
            value={form.rentPerUnit}
            onChange={handleChange}
            placeholder="e.g. $1,200"
            required
          />
          <Field
            label="Other Monthly Income"
            name="otherIncome"
            value={form.otherIncome}
            onChange={handleChange}
            placeholder="e.g. $200 (parking, laundry)"
          />
          <Field
            label="Vacancy Rate (%)"
            name="vacancyRate"
            value={form.vacancyRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 5"
            required
          />
        </div>

        {/* — Expenses */}
        <div className="deal-analyzer-section-label">Expenses</div>
        <div className="deal-analyzer-form-grid">
          <label className="field deal-analyzer-output">
            <span>Expense Ratio (%)</span>
            <input value="35%" readOnly tabIndex={-1} />
          </label>
          <Field
            label="Additional Expenses (monthly)"
            name="additionalExpenses"
            value={form.additionalExpenses}
            onChange={handleChange}
            placeholder="e.g. $300"
          />
        </div>

        {/* — Financing */}
        <div className="deal-analyzer-section-label">Financing</div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Down Payment (%)"
            name="downPayment"
            value={form.downPayment}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 25"
            required
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
              className={`deal-analyzer-verdict ${summary.capRate >= 5 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <div>
                <span>Cap Rate</span>
                <strong
                  className={
                    summary.capRate >= 5
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  {summary.capRate.toFixed(2)}%
                </strong>
              </div>
              <strong>
                {summary.capRate >= 5
                  ? "Meets Threshold (≥ 5%)"
                  : "Below Threshold (< 5%)"}
              </strong>
            </div>

            <div
              className={`deal-analyzer-verdict ${summary.monthlyCashFlow >= 0 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
              style={{ marginTop: "0.75rem" }}
            >
              <div>
                <span>Monthly Cash Flow</span>
                <strong>
                  <AnimatedAmount
                    value={summary.monthlyCashFlow}
                    format={fmt}
                  />
                </strong>
              </div>
              <strong>
                {summary.monthlyCashFlow >= 0
                  ? "Positive Cash Flow"
                  : "Negative Cash Flow"}
              </strong>
            </div>

            {/* Monthly */}
            <div
              className="deal-analyzer-section-label"
              style={{ marginTop: "2rem" }}
            >
              Monthly
            </div>
            <div className="deal-analyzer-summary-grid">
              <div>
                <span>Gross Rent ({summary.numUnits} units)</span>
                <strong>
                  <AnimatedAmount
                    value={summary.grossMonthlyRent}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Other Income</span>
                <strong>
                  <AnimatedAmount value={summary.otherIncome} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Gross Income</span>
                <strong>
                  <AnimatedAmount
                    value={summary.grossMonthlyIncome}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Vacancy Loss ({summary.vacancyPct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.vacancyLoss} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Effective Gross Income</span>
                <strong>
                  <AnimatedAmount
                    value={summary.effectiveGrossIncome}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>
                  Operating Expenses ({summary.expenseRatioPct}% of EGI)
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalMonthlyExpenses}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>NOI</span>
                <strong
                  className={
                    summary.monthlyNOI >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  <AnimatedAmount value={summary.monthlyNOI} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Mortgage (P&amp;I)</span>
                <strong>
                  <AnimatedAmount
                    value={summary.monthlyMortgage}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Cash Flow</span>
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
            </div>

            {/* Annual */}
            <div
              className="deal-analyzer-section-label"
              style={{ marginTop: "2rem" }}
            >
              Annual
            </div>
            <div className="deal-analyzer-summary-grid">
              <div>
                <span>NOI</span>
                <strong
                  className={
                    summary.annualNOI >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  <AnimatedAmount value={summary.annualNOI} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Cash Flow</span>
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
            </div>

            {/* Acquisition & Returns */}
            <div
              className="deal-analyzer-section-label"
              style={{ marginTop: "2rem" }}
            >
              Acquisition &amp; Returns
            </div>
            <div className="deal-analyzer-summary-grid">
              <div>
                <span>Purchase Price</span>
                <strong>
                  <AnimatedAmount value={summary.purchasePrice} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Price Per Unit</span>
                <strong>
                  <AnimatedAmount value={summary.pricePerUnit} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Down Payment ({summary.downPaymentPct}%)</span>
                <strong>
                  <AnimatedAmount
                    value={summary.downPaymentAmount}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Closing Costs ({CLOSING_COSTS_PCT}% of price)</span>
                <strong>
                  <AnimatedAmount value={summary.closingCosts} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Agent Commission ({AGENT_COMMISSION_PCT}% of price)</span>
                <strong>
                  <AnimatedAmount
                    value={summary.agentCommission}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Loan Amount</span>
                <strong>
                  <AnimatedAmount value={summary.loanAmount} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Total Cash Invested</span>
                <strong>
                  <AnimatedAmount
                    value={summary.totalCashInvested}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Cap Rate</span>
                <strong
                  className={
                    summary.capRate >= 5
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  {summary.capRate.toFixed(2)}%
                </strong>
              </div>
              <div>
                <span>Cash on Cash Return</span>
                <strong
                  className={
                    summary.cocReturn !== null && summary.cocReturn >= 8
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  {summary.cocReturn !== null
                    ? `${summary.cocReturn.toFixed(2)}%`
                    : "--"}
                </strong>
              </div>
              {summary.grm !== null && (
                <div>
                  <span>Gross Rent Multiplier</span>
                  <strong>{summary.grm.toFixed(2)}x</strong>
                </div>
              )}
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              Cash on Cash Return = Annual Cash Flow ÷ Total Cash Invested
              <span>
                <AnimatedAmount value={summary.annualCashFlow} format={fmt} /> ÷{" "}
                <AnimatedAmount
                  value={summary.totalCashInvested}
                  format={fmt}
                />{" "}
                ={" "}
                {summary.cocReturn !== null
                  ? `${summary.cocReturn.toFixed(2)}%`
                  : "--"}
              </span>
            </div>

            <div
              className={`deal-analyzer-final-verdict ${summary.isDeal ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <span>Final Verdict</span>
              <strong>{summary.isDeal ? "Deal" : "No Deal"}</strong>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default MultiFamilyTab;
