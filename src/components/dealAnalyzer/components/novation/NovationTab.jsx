import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import { STATE_OPTIONS } from "../../../../constants/stateOptions";
import {
  REHAB_OPTIONS,
  getAutoRehabCost,
  getRehabMultiplier,
  parseCurrency,
  fmt,
  fmtCurrencyInput,
} from "../fixAndFlip/fixAndFlipConfig";

const CURRENCY_FIELDS = new Set([
  "arv",
  "wholesaleFee",
  "rehabCost",
  "additionalRehabCost",
]);

const initialForm = {
  state: "",
  arv: "",
  wholesaleFee: "",
  rehabType: "",
  squareFootage: "",
  rehabCost: "",
  additionalRehabCost: "",
};

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
    if (name === "squareFootage") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const arv = parseCurrency(form.arv);
  const wholesaleFee = parseCurrency(form.wholesaleFee);
  const sqft = parseInt(form.squareFootage || "0", 10) || 0;
  const rehabMultiplier = getRehabMultiplier(form.state);
  const autoRehabResult = getAutoRehabCost(form.rehabType, sqft);
  const autoRehabCost =
    autoRehabResult !== null
      ? Math.round(autoRehabResult.cost * rehabMultiplier)
      : null;
  const rehabCost =
    autoRehabCost !== null ? autoRehabCost : parseCurrency(form.rehabCost);
  const additionalRehab = parseCurrency(form.additionalRehabCost);
  const totalRehab = rehabCost + additionalRehab;
  const totalExpenses = wholesaleFee + totalRehab;
  const mao = arv * 0.9 - totalExpenses;

  const rehabCostReady =
    form.rehabType === "no-rehab" ||
    autoRehabCost !== null ||
    form.rehabCost?.trim();
  const isManualRehab = sqft > 5500 || !form.rehabType;

  const isFormComplete =
    form.state?.trim() &&
    form.arv?.trim() &&
    form.wholesaleFee?.trim() &&
    rehabCostReady;

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      arv,
      wholesaleFee,
      rehabType: form.rehabType,
      sqft,
      rehabCost,
      additionalRehab,
      totalRehab,
      totalExpenses,
      mao,
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
              Enter the property location, ARV, wholesale fee, and estimated
              rehab costs to calculate the list price profit.
            </p>
          </div>
        </div>

        {/* — Property & Deal */}
        <div className="deal-analyzer-section-label">Property &amp; Deal</div>
        <div className="deal-analyzer-form-grid">
          <label className="field">
            <span>State</span>
            <select name="state" value={form.state} onChange={handleChange}>
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="ARV"
            name="arv"
            value={form.arv}
            onChange={handleChange}
            placeholder="e.g. $250,000"
            required
          />
          <Field
            label="Wholesale Fee"
            name="wholesaleFee"
            value={form.wholesaleFee}
            onChange={handleChange}
            placeholder="e.g. $10,000"
            required
          />
        </div>

        {/* — Rehab */}
        <div className="deal-analyzer-section-label">Rehab Scope</div>
        <div className="deal-analyzer-form-grid">
          <label className="field">
            <span>Rehab Type</span>
            <select
              name="rehabType"
              value={form.rehabType}
              onChange={handleChange}
            >
              {REHAB_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Square Footage"
            name="squareFootage"
            value={form.squareFootage}
            onChange={handleChange}
            placeholder="e.g. 2000"
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={autoRehabCost !== null ? fmt(autoRehabCost) : form.rehabCost}
            onChange={handleChange}
            placeholder="e.g. $50,000"
            disabled={autoRehabCost !== null && !isManualRehab}
            required={rehabCostReady === false}
          />
          <Field
            label="Additional Rehab Costs (optional)"
            name="additionalRehabCost"
            value={form.additionalRehabCost}
            onChange={handleChange}
            placeholder="e.g. $5,000"
          />
        </div>

        <div className="deal-analyzer-actions">
          <button
            className="primary-btn form-btn"
            type="button"
            onClick={handleCalculate}
            disabled={!isFormComplete}
          >
            Calculate MAO
          </button>
        </div>

        {summary && (
          <div className="deal-analyzer-summary">
            <div
              className={`deal-analyzer-verdict ${summary.mao > 0 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <div>
                <span>List Price Profit Potential</span>
                <strong>
                  <AnimatedAmount value={summary.mao} format={fmt} />
                </strong>
              </div>
              <strong>{summary.mao > 0 ? "Profitable" : "No Profit"}</strong>
            </div>

            <div
              className="deal-analyzer-summary-grid"
              style={{ marginTop: "1.25rem" }}
            >
              <div>
                <span>ARV</span>
                <strong>
                  <AnimatedAmount value={summary.arv} format={fmt} />
                </strong>
              </div>
              <div>
                <span>90% of ARV</span>
                <strong>
                  <AnimatedAmount value={summary.arv * 0.9} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Wholesale Fee</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.wholesaleFee} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Total Rehab Cost</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.totalRehab} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Total Expenses</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.totalExpenses} format={fmt} />
                </strong>
              </div>
              <div>
                <span>List Price Profit</span>
                <strong
                  className={
                    summary.mao >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  <AnimatedAmount value={summary.mao} format={fmt} />
                </strong>
              </div>
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              List Price Profit = (ARV × 90%) − Wholesale Fee − Rehab Costs
              <span>
                ({fmt(summary.arv)} × 90%) − {fmt(summary.wholesaleFee)} −{" "}
                {fmt(summary.totalRehab)} = {fmt(summary.mao)}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default NovationTab;
