import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";

const AGENT_COMMISSION_PCT = 3;
const CLOSING_COSTS_PCT = 2;

const initialForm = {
  contractPrice: "",
  listPrice: "",
  rehabCost: "",
  holdingMonths: "",
  monthlyHoldingCost: "",
};

const CURRENCY_FIELDS = new Set([
  "contractPrice",
  "listPrice",
  "rehabCost",
  "monthlyHoldingCost",
]);

function parseCurrency(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
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

function NovationTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setSummary(null);
    if (CURRENCY_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "holdingMonths") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // — Live derived values
  const listPrice = parseCurrency(form.listPrice);
  const contractPrice = parseCurrency(form.contractPrice);
  const rehabCost = parseCurrency(form.rehabCost);
  const holdingMonths = parseInt(form.holdingMonths || "0", 10) || 0;
  const monthlyHoldingCost = parseCurrency(form.monthlyHoldingCost);

  const agentCommission = listPrice * (AGENT_COMMISSION_PCT / 100);
  const closingCosts = listPrice * (CLOSING_COSTS_PCT / 100);
  const holdingCosts = holdingMonths * monthlyHoldingCost;
  const totalCosts = rehabCost + agentCommission + closingCosts + holdingCosts;
  const grossSpread = listPrice - contractPrice;
  const netProfit = grossSpread - totalCosts;
  const roi =
    contractPrice + rehabCost > 0
      ? (netProfit / (contractPrice + rehabCost)) * 100
      : 0;
  const profitMargin = listPrice > 0 ? (netProfit / listPrice) * 100 : 0;
  const isDeal = netProfit > 0;

  const isFormComplete = form.contractPrice?.trim() && form.listPrice?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      listPrice,
      contractPrice,
      rehabCost,
      holdingMonths,
      monthlyHoldingCost,
      agentCommission,
      closingCosts,
      holdingCosts,
      totalCosts,
      grossSpread,
      netProfit,
      roi,
      profitMargin,
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
            <h2>Novation Inputs</h2>
            <p>
              Enter the contract price, list price, and selling costs to
              calculate your net profit.
            </p>
          </div>
        </div>

        {/* — Acquisition */}
        <div className="deal-analyzer-section-label">Acquisition</div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Contract Price"
            name="contractPrice"
            value={form.contractPrice}
            onChange={handleChange}
            placeholder="e.g. $150,000"
            required
          />
          <Field
            label="List / Sale Price"
            name="listPrice"
            value={form.listPrice}
            onChange={handleChange}
            placeholder="e.g. $250,000"
            required
          />
          <label className="field deal-analyzer-output">
            <span>Gross Spread</span>
            <input
              value={
                contractPrice && listPrice ? fmt(listPrice - contractPrice) : ""
              }
              readOnly
              tabIndex={-1}
            />
          </label>
          <Field
            label="Rehab / Prep Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
            placeholder="e.g. $10,000"
          />
        </div>

        {/* — Selling Costs */}
        <div className="deal-analyzer-section-label">Selling Costs</div>
        <div className="deal-analyzer-form-grid">
          <label className="field deal-analyzer-output">
            <span>
              Agent Commission{" "}
              <span className="deal-analyzer-auto-badge">
                {AGENT_COMMISSION_PCT}% of list
              </span>
            </span>
            <input
              value={listPrice ? fmt(agentCommission) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field deal-analyzer-output">
            <span>
              Closing Costs{" "}
              <span className="deal-analyzer-auto-badge">
                {CLOSING_COSTS_PCT}% of list
              </span>
            </span>
            <input
              value={listPrice ? fmt(closingCosts) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>

        {/* — Holding Costs */}
        <div className="deal-analyzer-section-label">Holding Costs</div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Holding Period (Months)"
            name="holdingMonths"
            value={form.holdingMonths}
            onChange={handleChange}
            placeholder="e.g. 3"
          />
          <Field
            label="Monthly Holding Cost"
            name="monthlyHoldingCost"
            value={form.monthlyHoldingCost}
            onChange={handleChange}
            placeholder="e.g. $1,500"
          />
          <label className="field deal-analyzer-output">
            <span>Total Holding Costs</span>
            <input
              value={holdingCosts > 0 ? fmt(holdingCosts) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
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
            {/* Net Profit verdict */}
            <div
              className={`deal-analyzer-final-verdict ${summary.isDeal ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <span>Final Verdict</span>
              <strong>{summary.isDeal ? "Deal" : "No Deal"}</strong>
            </div>

            {/* Results grid */}
            <div
              className="deal-analyzer-summary-grid"
              style={{ marginTop: "1.25rem" }}
            >
              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1", marginTop: 0 }}
              >
                Deal Breakdown
              </div>

              <div>
                <span>List / Sale Price</span>
                <strong>
                  <AnimatedAmount value={summary.listPrice} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Contract Price</span>
                <strong>
                  <AnimatedAmount value={summary.contractPrice} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Gross Spread</span>
                <strong>
                  <AnimatedAmount value={summary.grossSpread} format={fmt} />
                </strong>
              </div>

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Costs
              </div>

              {summary.rehabCost > 0 && (
                <div>
                  <span>Rehab / Prep Cost</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.rehabCost} format={fmt} />
                  </strong>
                </div>
              )}
              <div>
                <span>Agent Commission ({AGENT_COMMISSION_PCT}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.agentCommission}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Closing Costs ({CLOSING_COSTS_PCT}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.closingCosts} format={fmt} />
                </strong>
              </div>
              {summary.holdingCosts > 0 && (
                <div>
                  <span>
                    Holding Costs ({summary.holdingMonths} mo ×{" "}
                    {fmt(summary.monthlyHoldingCost)})
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.holdingCosts} format={fmt} />
                  </strong>
                </div>
              )}
              <div>
                <span>Total Costs</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.totalCosts} format={fmt} />
                </strong>
              </div>

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Returns
              </div>

              <div>
                <span>Net Profit</span>
                <strong
                  className={
                    summary.netProfit >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  <AnimatedAmount value={summary.netProfit} format={fmt} />
                </strong>
              </div>
              <div>
                <span>ROI</span>
                <strong
                  className={
                    summary.roi >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  {summary.roi.toFixed(1)}%
                </strong>
              </div>
              <div>
                <span>Profit Margin</span>
                <strong
                  className={
                    summary.profitMargin >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  {summary.profitMargin.toFixed(1)}%
                </strong>
              </div>
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              Net Profit = List Price − Contract Price − Agent Commission −
              Closing Costs − Rehab − Holding Costs
              <span>
                {fmt(summary.listPrice)} − {fmt(summary.contractPrice)} −{" "}
                {fmt(summary.agentCommission)} − {fmt(summary.closingCosts)}
                {summary.rehabCost > 0 ? ` − ${fmt(summary.rehabCost)}` : ""}
                {summary.holdingCosts > 0
                  ? ` − ${fmt(summary.holdingCosts)}`
                  : ""}{" "}
                = {fmt(summary.netProfit)}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default NovationTab;
