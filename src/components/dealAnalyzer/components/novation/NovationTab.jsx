import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";

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

const CURRENCY_FIELDS = new Set(["arv", "wholesaleFee"]);

const initialForm = { arv: "", wholesaleFee: "" };

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
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const arv = parseCurrency(form.arv);
  const wholesaleFee = parseCurrency(form.wholesaleFee);
  const mao = arv * 0.9 - wholesaleFee;

  const isFormComplete = form.arv?.trim() && form.wholesaleFee?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({ arv, wholesaleFee, mao });
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
            <p>Enter the ARV and your wholesale fee to calculate the MAO.</p>
          </div>
        </div>

        <div className="deal-analyzer-form-grid">
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
                <span>Maximum Allowable Offer (MAO)</span>
                <strong>
                  <AnimatedAmount value={summary.mao} format={fmt} />
                </strong>
              </div>
              <strong>{summary.mao > 0 ? "Viable Deal" : "No Room"}</strong>
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
                <span>90% of ARV </span>
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
                <span>MAO</span>
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
              MAO = ARV × 90% − Wholesale Fee
              <span>
                {fmt(summary.arv)} × 90% − {fmt(summary.wholesaleFee)} ={" "}
                {fmt(summary.mao)}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default NovationTab;
