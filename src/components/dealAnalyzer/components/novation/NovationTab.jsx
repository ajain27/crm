import { useState } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import {
  parseCurrency,
  fmt,
  fmtCurrencyInput,
} from "../fixAndFlip/fixAndFlipConfig";

const CURRENCY_FIELDS = new Set(["arv", "repairs", "wholesaleFee"]);

const initialForm = {
  arv: "",
  repairs: "",
  wholesaleFee: "",
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
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const arv = parseCurrency(form.arv);
  const repairs = parseCurrency(form.repairs);
  const wholesaleFee = parseCurrency(form.wholesaleFee);
  const offerPrice = arv * 0.9 - repairs - wholesaleFee;

  const isFormComplete =
    form.arv?.trim() && form.repairs?.trim() && form.wholesaleFee?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({ arv, repairs, wholesaleFee, offerPrice });
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
              Enter the ARV, repair costs, and assignment fee to calculate the
              offer price.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-section-label">Property &amp; Deal</div>
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
            label="Repairs"
            name="repairs"
            value={form.repairs}
            onChange={handleChange}
            placeholder="e.g. $20,000"
            required
          />
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
            Calculate Offer Price
          </button>
        </div>

        {summary && (
          <div className="deal-analyzer-summary">
            <div
              className={`deal-analyzer-verdict ${summary.offerPrice > 0 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <div>
                <span>Offer Price</span>
                <strong>
                  <AnimatedAmount value={summary.offerPrice} format={fmt} />
                </strong>
              </div>
              <strong>
                {summary.offerPrice > 0
                  ? "Offer Available"
                  : "No Offer Possible"}
              </strong>
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
                <span>Repairs</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount value={summary.repairs} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Assignment Fee</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount value={summary.wholesaleFee} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Offer Price</span>
                <strong
                  className={
                    summary.offerPrice >= 0
                      ? "deal-analyzer-return-positive"
                      : "deal-analyzer-return-negative"
                  }
                >
                  <AnimatedAmount value={summary.offerPrice} format={fmt} />
                </strong>
              </div>
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              Offer Price = (ARV × 90%) − Repairs − Assignment Fee
              <span>
                ({fmt(summary.arv)} × 90%) − {fmt(summary.repairs)} −{" "}
                {fmt(summary.wholesaleFee)} = {fmt(summary.offerPrice)}
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default NovationTab;
