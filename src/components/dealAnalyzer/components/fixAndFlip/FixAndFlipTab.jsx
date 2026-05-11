import { useState } from "react";
import { Field } from "../../../elements/elements";

// Rehab cost lookup: [under 1500 sqft, 1500–2500, 2500–3500]
const REHAB_LOOKUP = {
  light:   [30000,  40000,  55000],
  average: [55000,  70000,  85000],
  heavy:   [90000, 125000, 150000],
};

const REHAB_OPTIONS = [
  { value: "",        label: "Select One..." },
  { value: "light",   label: "Light Rehab (carpet and paint)" },
  { value: "average", label: "Average Rehab (carpet/paint/kitchen/baths)" },
  { value: "heavy",   label: "Heavy Rehab (gut job - carpet/paint/roof/siding/windows, etc)" },
];

function getAutoRehabCost(rehabType, sqft) {
  if (!rehabType || sqft <= 0 || sqft > 3500) return null;
  const tier = sqft < 1500 ? 0 : sqft <= 2500 ? 1 : 2;
  return REHAB_LOOKUP[rehabType]?.[tier] ?? null;
}

const initialForm = {
  arv: "",
  purchasePrice: "",
  rehabType: "",
  squareFootage: "",
  rehabCost: "",
  durationMonths: "",
  points: "",
  interestRate: "",
  originationFees: "",
  legalFees: "",
  appraisalFees: "",
};

const CURRENCY_FIELDS = new Set([
  "arv",
  "purchasePrice",
  "rehabCost",
  "originationFees",
  "legalFees",
  "appraisalFees",
]);

const PERCENT_FIELDS = new Set(["points", "interestRate"]);

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

function FixAndFlipTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setSummary(null);

    if (CURRENCY_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: fmtCurrencyInput(value) }));
      return;
    }
    if (PERCENT_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, "") }));
      return;
    }
    if (name === "durationMonths" || name === "squareFootage") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    if (PERCENT_FIELDS.has(name) && value) {
      const numeric = value.replace(/[^0-9.]/g, "");
      if (numeric) setForm((prev) => ({ ...prev, [name]: `${numeric}%` }));
    }
  }

  // — Live derived values
  const arv = parseCurrency(form.arv);
  const purchasePrice = parseCurrency(form.purchasePrice);
  const sqft = parseInt(form.squareFootage || "0", 10) || 0;
  const autoRehabCost = getAutoRehabCost(form.rehabType, sqft);
  const rehabCost = autoRehabCost !== null ? autoRehabCost : parseCurrency(form.rehabCost);
  const duration = parseInt(form.durationMonths || "0", 10) || 0;
  const pointsPct = parsePercent(form.points);
  const interestRatePct = parsePercent(form.interestRate);
  const originationFees = parseCurrency(form.originationFees);
  const legalFees = parseCurrency(form.legalFees);
  const appraisalFees = parseCurrency(form.appraisalFees);

  const totalCapital = purchasePrice + rehabCost;
  const miscFees = originationFees + legalFees + appraisalFees;
  const ltvPct = arv > 0 ? (purchasePrice / arv) * 100 : 0;
  const ltvQualifies = arv > 0 && purchasePrice > 0 && ltvPct <= 70;
  const lenderFunds = totalCapital * 0.9;
  const pointsCost = lenderFunds * (pointsPct / 100);
  const monthlyInterest = lenderFunds * (interestRatePct / 100 / 12);
  const totalInterest = monthlyInterest * duration;
  const totalFinancingCost = pointsCost + totalInterest + miscFees;
  const outOfPocket = totalCapital - lenderFunds + totalFinancingCost;
  const netProfit = arv - purchasePrice - rehabCost - totalFinancingCost;
  const roi = totalCapital > 0 ? (netProfit / totalCapital) * 100 : 0;
  const isDeal = ltvQualifies && netProfit > 0;

  // Rehab cost is satisfied either by auto-lookup or manual entry
  const rehabCostReady = autoRehabCost !== null || form.rehabCost?.trim();
  // sqft > 3500 with a type selected means user must enter manually
  const isManualRehab = sqft > 3500 || !form.rehabType;

  const isFormComplete =
    form.arv?.trim() &&
    form.purchasePrice?.trim() &&
    rehabCostReady &&
    form.durationMonths?.trim() &&
    form.points?.trim() &&
    form.interestRate?.trim();

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      arv,
      purchasePrice,
      rehabType: form.rehabType,
      sqft,
      rehabCost,
      totalCapital,
      ltvPct,
      ltvQualifies,
      lenderFunds,
      pointsPct,
      pointsCost,
      interestRatePct,
      duration,
      monthlyInterest,
      totalInterest,
      originationFees,
      legalFees,
      appraisalFees,
      miscFees,
      totalFinancingCost,
      outOfPocket,
      netProfit,
      roi,
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
            <h2>Fix N Flip Inputs</h2>
            <p>
              Enter acquisition, rehab, duration, and hard money financing
              assumptions.
            </p>
          </div>
        </div>

        {/* — Property & Deal */}
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
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            placeholder="e.g. $150,000"
            required
          />

          {/* Rehab estimator */}
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
            placeholder="e.g. 1,800"
          />

          {/* Rehab Cost — readonly when auto-computed, editable when manual */}
          {autoRehabCost !== null ? (
            <label className="field deal-analyzer-output">
              <span>
                Rehab Cost
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(autoRehabCost)} readOnly tabIndex={-1} />
            </label>
          ) : (
            <Field
              label={
                isManualRehab && form.rehabType && sqft > 3500
                  ? "Rehab Cost (manual — sq ft > 3,500)"
                  : "Rehab Cost"
              }
              name="rehabCost"
              value={form.rehabCost}
              onChange={handleChange}
              placeholder="e.g. $30,000"
              required
            />
          )}

          <Field
            label="Duration (Months)"
            name="durationMonths"
            value={form.durationMonths}
            onChange={handleChange}
            placeholder="e.g. 6"
            required
          />
          <label className="field deal-analyzer-output">
            <span>Total Capital Needed</span>
            <input
              value={totalCapital > 0 ? fmt(totalCapital) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
        </div>

        {/* — Hard Money Financing */}
        <div className="deal-analyzer-section-label">Hard Money Financing</div>
        <div className="deal-analyzer-form-grid">
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
          <label className="field deal-analyzer-output">
            <span>Total Misc Fees</span>
            <input
              value={miscFees > 0 ? fmt(miscFees) : ""}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field deal-analyzer-output">
            <span>Lender Funds (90% LTC)</span>
            <input
              value={lenderFunds > 0 ? fmt(lenderFunds) : ""}
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
            {/* LTV Verdict banner */}
            <div
              className={`deal-analyzer-verdict ${summary.ltvQualifies ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <div>
                <span>LTV — Purchase Price ÷ ARV</span>
                <strong>{summary.ltvPct.toFixed(1)}%</strong>
              </div>
              <strong>
                {summary.ltvQualifies
                  ? "Qualifies for Loan"
                  : "Does Not Qualify (LTV > 70%)"}
              </strong>
            </div>

            <div
              className="deal-analyzer-summary-grid"
              style={{ marginTop: "1.25rem" }}
            >
              <div>
                <span>ARV</span>
                <strong>{fmt(summary.arv)}</strong>
              </div>
              <div>
                <span>Purchase Price</span>
                <strong>{fmt(summary.purchasePrice)}</strong>
              </div>
              <div>
                <span>Rehab Cost{summary.sqft > 0 && summary.sqft <= 3500 && summary.rehabType ? ` (${summary.sqft.toLocaleString()} sq ft)` : ""}</span>
                <strong>{fmt(summary.rehabCost)}</strong>
              </div>
              <div>
                <span>Total Capital Needed</span>
                <strong>{fmt(summary.totalCapital)}</strong>
              </div>
              <div>
                <span>Lender Funds (90% LTC)</span>
                <strong>{fmt(summary.lenderFunds)}</strong>
              </div>
              <div>
                <span>Points Cost ({summary.pointsPct}%)</span>
                <strong>{fmt(summary.pointsCost)}</strong>
              </div>
              <div>
                <span>
                  Monthly Interest (Loan × {summary.interestRatePct}% ÷ 12)
                </span>
                <strong>{fmt(summary.monthlyInterest)}</strong>
              </div>
              <div>
                <span>Total Interest ({summary.duration} mo × monthly)</span>
                <strong>{fmt(summary.totalInterest)}</strong>
              </div>
              <div>
                <span>Origination Fees</span>
                <strong>{fmt(summary.originationFees)}</strong>
              </div>
              <div>
                <span>Legal Fees</span>
                <strong>{fmt(summary.legalFees)}</strong>
              </div>
              <div>
                <span>Appraisal Fees</span>
                <strong>{fmt(summary.appraisalFees)}</strong>
              </div>
              <div>
                <span>Total Misc Fees</span>
                <strong>{fmt(summary.miscFees)}</strong>
              </div>
              <div>
                <span>Total Financing Cost</span>
                <strong>{fmt(summary.totalFinancingCost)}</strong>
              </div>
              <div>
                <span>Total Out of Pocket</span>
                <strong>{fmt(summary.outOfPocket)}</strong>
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
                  {fmt(summary.netProfit)}
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
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              Net Profit = ARV − Purchase Price − Rehab Cost − Total Financing
              Cost
              <span>
                {fmt(summary.arv)} − {fmt(summary.purchasePrice)} −{" "}
                {fmt(summary.rehabCost)} − {fmt(summary.totalFinancingCost)} ={" "}
                {fmt(summary.netProfit)}
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

export default FixAndFlipTab;
