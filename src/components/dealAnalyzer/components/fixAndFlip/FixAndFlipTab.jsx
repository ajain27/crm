import { useState } from "react";
import { Field } from "../../../elements/elements";

const initialFixAndFlipForm = {
  arv: "",
  desiredProfit: "",
  rehabCost: "",
  mao: "",
};

function FixAndFlipTab({ tab }) {
  const [form, setForm] = useState(initialFixAndFlipForm);
  const [analysisSummary, setAnalysisSummary] = useState(null);

  function parseAmount(value) {
    const normalized = String(value || "").replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatAmount(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatCurrencyInput(value) {
    const numericValue = String(value || "").replace(/[^0-9]/g, "");
    if (!numericValue) {
      return "";
    }

    return "$" + Number.parseInt(numericValue, 10).toLocaleString("en-US");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setAnalysisSummary(null);

    if (name === "arv" || name === "rehabCost") {
      setForm((prev) => ({ ...prev, [name]: formatCurrencyInput(value) }));
      return;
    }

    if (name === "desiredProfit") {
      const cleaned = value.replace(/[^0-9.%]/g, "");
      setForm((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;

    if (name === "desiredProfit" && value) {
      const numericValue = value.replace(/[^0-9.]/g, "");
      if (!numericValue) {
        return;
      }

      setForm((prev) => ({ ...prev, [name]: `${numericValue}%` }));
    }
  }

  const arvAmount = parseAmount(form.arv);
  const desiredProfitPercent = parseAmount(form.desiredProfit);
  const rehabCostAmount = parseAmount(form.rehabCost);
  const isFormComplete =
    Boolean(form.arv?.trim()) &&
    Boolean(form.desiredProfit?.trim()) &&
    Boolean(form.rehabCost?.trim());
  const financingFeesAmount = arvAmount * 0.06;
  const closingCostAmount = arvAmount * 0.09;
  const adjustedDiscountPercent = 0.15 + desiredProfitPercent / 100;
  const calculatedMao =
    arvAmount - arvAmount * adjustedDiscountPercent - rehabCostAmount;
  const liveMaoValue = isFormComplete ? formatAmount(calculatedMao) : "";

  function handleCalculate() {
    if (!isFormComplete) {
      return;
    }

    setForm((prev) => ({ ...prev, mao: liveMaoValue }));
    setAnalysisSummary({
      arv: formatAmount(arvAmount),
      desiredProfit: form.desiredProfit,
      rehabCost: formatAmount(rehabCostAmount),
      financingFees: formatAmount(financingFeesAmount),
      closingCost: formatAmount(closingCostAmount),
      mao: liveMaoValue,
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
            <h2>Fix N Flip Inputs</h2>
            <p>
              Enter the core acquisition, construction, and financing
              assumptions for this project.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-form-grid">
          <Field
            label="ARV"
            name="arv"
            value={form.arv}
            onChange={handleChange}
            required
          />
          <Field
            label="Desired Profit (%)"
            name="desiredProfit"
            value={form.desiredProfit}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
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
        {analysisSummary ? (
          <div className="deal-analyzer-summary">
            <div className="deal-analyzer-summary-grid">
              <div>
                <span>ARV</span>
                <strong>{analysisSummary.arv}</strong>
              </div>
              <div>
                <span>Desired Profit</span>
                <strong>{analysisSummary.desiredProfit}</strong>
              </div>
              <div>
                <span>Rehab Cost</span>
                <strong>{analysisSummary.rehabCost}</strong>
              </div>
              <div>
                <span>Financing Fees (6%)</span>
                <strong>{analysisSummary.financingFees}</strong>
              </div>
              <div>
                <span>Closing Cost (9%)</span>
                <strong>{analysisSummary.closingCost}</strong>
              </div>
              <div>
                <span>MAO</span>
                <strong className="deal-analyzer-highlight-value">
                  {analysisSummary.mao}
                </strong>
              </div>
            </div>
            <div className="deal-analyzer-calculation">
              MAO = ARV - ((15% + Desired Profit%) x ARV) - Rehab Cost
              <span>
                {analysisSummary.arv} - ((15% + {analysisSummary.desiredProfit})
                x {analysisSummary.arv}) - {analysisSummary.rehabCost} ={" "}
                {analysisSummary.mao}
              </span>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

export default FixAndFlipTab;
