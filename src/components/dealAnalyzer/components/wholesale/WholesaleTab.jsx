import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import { STATE_OPTIONS } from "../../../../constants/stateOptions";
import WholesalePieChart from "./WholesalePieChart";
import {
  REHAB_OPTIONS,
  getAutoRehabCost,
  getRehabMultiplier,
  isCheapMarket,
  parseCurrency,
  fmt,
  fmtCurrencyInput,
} from "../fixAndFlip/fixAndFlipConfig";

const initialForm = {
  state: "",
  arv: "",
  rehabType: "",
  squareFootage: "",
  rehabCost: "",
  additionalRehabCost: "",
  wholesaleFee: "",
};

function WholesaleTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);

  const CURRENCY_FIELDS = new Set([
    "arv",
    "rehabCost",
    "additionalRehabCost",
    "wholesaleFee",
  ]);

  function handleChange(e) {
    const { name, value } = e.target;
    setResult(null);
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

  const sqft = parseInt(form.squareFootage || "0", 10) || 0;
  const rehabMultiplier = getRehabMultiplier(form.state);
  // const cheapMarket = isCheapMarket(form.state);
  const autoRehabResult = getAutoRehabCost(form.rehabType, sqft);
  const autoRehabCost =
    autoRehabResult !== null
      ? Math.round(autoRehabResult.cost * rehabMultiplier)
      : null;
  const autoRehabEstimated = autoRehabResult?.estimated ?? false;
  const isManualRehab = sqft > 5500 || !form.rehabType;
  const rehabCostReady =
    form.rehabType === "no-rehab" ||
    autoRehabCost !== null ||
    form.rehabCost?.trim();

  const isFormComplete =
    form.arv?.trim() && rehabCostReady && form.wholesaleFee?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    const arv = parseCurrency(form.arv);
    const baseRehab =
      autoRehabCost !== null ? autoRehabCost : parseCurrency(form.rehabCost);
    const additionalRehab = parseCurrency(form.additionalRehabCost);
    const rehab = baseRehab + additionalRehab;
    const wholesaleFee = parseCurrency(form.wholesaleFee);
    const mao = arv * 0.7 - rehab - wholesaleFee;

    setResult({
      arv,
      baseRehab,
      additionalRehab,
      rehab,
      wholesaleFee,
      mao,
      assignDeal: mao + wholesaleFee,
      buyerMargin: arv * 0.3,
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
            <h2>Wholesale Inputs</h2>
            <p>
              Enter the deal values to calculate your Maximum Allowable Offer.
            </p>
          </div>
        </div>

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
            label="Square Footage"
            name="squareFootage"
            value={form.squareFootage}
            onChange={handleChange}
            placeholder="e.g. 1,800"
          />

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

          {form.rehabType !== "no-rehab" &&
            (autoRehabCost !== null ? (
              <label className="field deal-analyzer-output">
                <span>
                  Rehab Cost
                  <span className="deal-analyzer-auto-badge">
                    {autoRehabEstimated ? "est. avg sqft" : "auto"}
                  </span>
                  {/* {cheapMarket && (
                    <span className="deal-analyzer-auto-badge">cheap market ÷3</span>
                  )} */}
                </span>
                <input value={fmt(autoRehabCost)} readOnly tabIndex={-1} />
              </label>
            ) : (
              <Field
                label={
                  isManualRehab && form.rehabType && sqft > 5500
                    ? "Rehab Cost (manual — sq ft > 3,500)"
                    : "Rehab Cost"
                }
                name="rehabCost"
                value={form.rehabCost}
                onChange={handleChange}
                placeholder="e.g. $30,000"
                required
              />
            ))}

          {form.rehabType !== "no-rehab" && (
            <Field
              label="Additional Rehab Needed"
              name="additionalRehabCost"
              value={form.additionalRehabCost}
              onChange={handleChange}
              placeholder="e.g. $5,000"
            />
          )}

          <Field
            label="Assignment Fee"
            name="wholesaleFee"
            value={form.wholesaleFee}
            onChange={handleChange}
            placeholder="e.g. $10,000"
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
            Calculate MAO
          </button>
        </div>

        {result && (
          <div className="deal-analyzer-summary">
            <div
              className={`deal-analyzer-verdict ${result.mao > 0 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <div>
                <span>Maximum Allowable Offer (MAO)</span>
                <strong>
                  <AnimatedAmount value={result.mao} format={fmt} />
                </strong>
              </div>
              <strong>{result.mao > 0 ? "Viable Deal" : "No Room"}</strong>
            </div>
            <div
              className="deal-analyzer-verdict deal-analyzer-verdict-positive"
              style={{ marginTop: "0.75rem" }}
            >
              <div>
                <span>Assign Deal (MAO + Assignment Fee)</span>
                <strong>
                  <AnimatedAmount value={result.assignDeal} format={fmt} />
                </strong>
              </div>
            </div>

            <div style={{ marginTop: "1.25rem" }}>
              <WholesalePieChart summary={result} />
            </div>

            <div
              className="deal-analyzer-summary-grid"
              style={{ marginTop: "1.25rem" }}
            >
              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1", marginTop: 0 }}
              >
                Breakdown
              </div>
              <div>
                <span>ARV</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount value={result.arv} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Rehab Cost</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={result.baseRehab} format={fmt} />
                </strong>
              </div>
              {result.additionalRehab > 0 && (
                <div>
                  <span>Additional Rehab</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={result.additionalRehab}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              <div>
                <span>Total Rehab</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={result.rehab} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Assignment Fee</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount value={result.wholesaleFee} format={fmt} />
                </strong>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default WholesaleTab;
