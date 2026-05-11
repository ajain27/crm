import { useState } from "react";
import { Field, Select } from "../../../elements/elements";
import { calculateMonthlyPayment } from "../../../../utils/utils";

const initialSubToForm = {
  propertyValue: "",
  entryFee: "",
  rehabCost: "",
  mortgageBalance: "",
  hasArrears: "No",
  arrearsAmount: "",
  interest: "",
  termYears: "",
  insurance: "",
  tax: "",
  rentEstimate: "",
  cashFlow: "",
};

function SubToTab({ tab }) {
  const [form, setForm] = useState(initialSubToForm);
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const currencyFields = [
    "propertyValue",
    "entryFee",
    "rehabCost",
    "mortgageBalance",
    "arrearsAmount",
    "insurance",
    "tax",
    "rentEstimate",
  ];
  const requiredValues = [
    form.propertyValue,
    form.entryFee,
    form.rehabCost,
    form.rentEstimate,
    form.mortgageBalance,
    form.hasArrears,
    form.termYears,
    form.insurance,
    form.tax,
    form.interest,
  ];
  const isFormComplete =
    requiredValues.every((value) => String(value || "").trim()) &&
    (form.hasArrears !== "Yes" || Boolean(form.arrearsAmount?.trim()));

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

    if (currencyFields.includes(name)) {
      setForm((prev) => ({ ...prev, [name]: formatCurrencyInput(value) }));
      return;
    }

    if (name === "interest") {
      const cleaned = value.replace(/[^0-9.%]/g, "");
      setForm((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    if (name === "termYears") {
      const cleaned = value.replace(/[^0-9]/g, "");
      setForm((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    if (name === "hasArrears") {
      setForm((prev) => ({
        ...prev,
        hasArrears: value,
        arrearsAmount: value === "Yes" ? prev.arrearsAmount : "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;

    if (name === "interest" && value) {
      const numericValue = value.replace(/[^0-9.]/g, "");
      if (!numericValue) {
        return;
      }

      setForm((prev) => ({ ...prev, [name]: `${numericValue}%` }));
      return;
    }

    if (name === "termYears") {
      return;
    }

    if (!currencyFields.includes(name) || !value) {
      return;
    }
  }

  const mortgageBalanceAmount = parseAmount(form.mortgageBalance);
  const propertyValueAmount = parseAmount(form.propertyValue);
  const entryFeeAmount = parseAmount(form.entryFee);
  const rehabCostAmount = parseAmount(form.rehabCost);
  const arrearsAmount = parseAmount(form.arrearsAmount);
  const termYearsAmount = parseAmount(form.termYears);
  const insuranceAmount = parseAmount(form.insurance);
  const taxAmount = parseAmount(form.tax);
  const monthlyRentAmount = parseAmount(form.rentEstimate);
  const annualInterestRate = parseAmount(form.interest) / 100;
  const interestRatePercent = parseAmount(form.interest);
  const isEntryFeeHigh =
    propertyValueAmount > 0 && entryFeeAmount > propertyValueAmount * 0.1;
  const isInterestHigh = interestRatePercent > 5;
  const totalPayments = termYearsAmount * 12;
  const amortizedMonthlyPayment = calculateMonthlyPayment(
    mortgageBalanceAmount,
    annualInterestRate,
    totalPayments,
  );
  const monthlyInterestAmount =
    mortgageBalanceAmount > 0
      ? mortgageBalanceAmount * (annualInterestRate / 12)
      : 0;
  const monthlyPrincipalAmount = Math.max(
    amortizedMonthlyPayment - monthlyInterestAmount,
    0,
  );
  const calculatedPrincipalValue =
    mortgageBalanceAmount > 0 && annualInterestRate >= 0 && totalPayments > 0
      ? formatAmount(amortizedMonthlyPayment)
      : "";
  const principalBreakdownValue = calculatedPrincipalValue
    ? `(${formatAmount(monthlyPrincipalAmount)} + ${formatAmount(monthlyInterestAmount)})`
    : "";
  const termMonthsValue = totalPayments > 0 ? `(${totalPayments})` : "";
  const calculatedCashFlow =
    monthlyRentAmount - (amortizedMonthlyPayment + taxAmount + insuranceAmount);
  const liveCashFlowValue = isFormComplete
    ? formatAmount(calculatedCashFlow)
    : "";
  const cashFlowToneClass = isFormComplete
    ? calculatedCashFlow < 0
      ? "deal-analyzer-output-negative"
      : "deal-analyzer-output-positive"
    : "";
  const cashOnCashToneClass =
    analysisSummary?.cashOnCashReturn == null
      ? ""
      : analysisSummary.cashOnCashReturn < 8
        ? "deal-analyzer-output-negative"
        : "deal-analyzer-output-positive";
  const cashFlowBreakdown = isFormComplete
    ? `${formatAmount(monthlyRentAmount)} - (${formatAmount(amortizedMonthlyPayment)} + ${formatAmount(taxAmount)} + ${formatAmount(insuranceAmount)}) = ${liveCashFlowValue}`
    : "";

  function handleCalculate() {
    if (!isFormComplete) {
      return;
    }

    const totalEntryAmount =
      entryFeeAmount + rehabCostAmount + (form.hasArrears === "Yes" ? arrearsAmount : 0);
    const calculatedCashOnCashReturn =
      totalEntryAmount > 0 ? (calculatedCashFlow * 12 * 100) / totalEntryAmount : null;
    const isDeal =
      calculatedCashFlow > 0 &&
      calculatedCashOnCashReturn !== null &&
      calculatedCashOnCashReturn >= 8;

    setForm((prev) => ({
      ...prev,
      cashFlow: liveCashFlowValue,
    }));
    setAnalysisSummary({
      propertyValue: formatAmount(parseAmount(form.propertyValue)),
      entryFee: formatAmount(entryFeeAmount),
      rehabCost: formatAmount(rehabCostAmount),
      mortgageBalance: formatAmount(mortgageBalanceAmount),
      hasArrears: form.hasArrears,
      arrearsAmount:
        form.hasArrears === "Yes" ? formatAmount(arrearsAmount) : "--",
      interest: form.interest,
      termYears: form.termYears,
      totalMonths: totalPayments,
      principalAndInterest: calculatedPrincipalValue,
      principalBreakdown: principalBreakdownValue,
      tax: formatAmount(taxAmount),
      insurance: formatAmount(insuranceAmount),
      rentEstimate: formatAmount(monthlyRentAmount),
      cashFlow: liveCashFlowValue,
      totalEntryAmount: formatAmount(totalEntryAmount),
      cashOnCashReturn: calculatedCashOnCashReturn,
      cashOnCashValue:
        calculatedCashOnCashReturn !== null
          ? `${calculatedCashOnCashReturn.toFixed(2)}%`
          : "--",
      verdict: isDeal ? "DEAL" : "NO DEAL",
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
            <h2>Sub-To Inputs</h2>
            <p>
              Enter the core loan and carry assumptions to evaluate a subject-to
              deal structure.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-form-grid">
          <Field
            label="Property Value"
            name="propertyValue"
            value={form.propertyValue}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Field
            label="Entry Fee"
            name="entryFee"
            value={form.entryFee}
            onChange={handleChange}
            onBlur={handleBlur}
            wrapperClassName={isEntryFeeHigh ? "deal-analyzer-warning" : ""}
            required
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Field
            label="Mortgage Balance"
            name="mortgageBalance"
            value={form.mortgageBalance}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Select
            label="Any Arrears"
            name="hasArrears"
            value={form.hasArrears}
            onChange={handleChange}
            options={["No", "Yes"]}
            required
          />
          {form.hasArrears === "Yes" ? (
            <Field
              label="Arrears Amount"
              name="arrearsAmount"
              value={form.arrearsAmount}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
          ) : null}

          <Field
            label="Interest"
            name="interest"
            value={form.interest}
            onChange={handleChange}
            onBlur={handleBlur}
            wrapperClassName={isInterestHigh ? "deal-analyzer-warning" : ""}
            required
          />
          <label className="field deal-analyzer-term-field">
            <span>
              Term in Years
              <span className="required-marker">*</span>
            </span>
            <div className="deal-analyzer-term-shell">
              <input
                id="termYears"
                name="termYears"
                value={form.termYears}
                onChange={handleChange}
                inputMode="numeric"
                className="deal-analyzer-term-input"
                required
              />
              {termMonthsValue ? (
                <span className="deal-analyzer-term-suffix" aria-hidden="true">
                  <span className="deal-analyzer-term-suffix-label">
                    Total months
                  </span>
                  {termMonthsValue}
                </span>
              ) : null}
            </div>
          </label>
          <Field
            label="Tax"
            name="tax"
            value={form.tax}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Field
            label="Insurance"
            name="insurance"
            value={form.insurance}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />

          <div style={{ gridColumn: "1 / -1" }}>
            <a
              href="https://app.rentcast.io/app"
              target="_blank"
              rel="noopener noreferrer"
              className="deal-analyzer-rent-estimate-btn"
            >
              Get Rent Estimate ↗
            </a>
          </div>

          <Field
            label="Rent Estimate"
            name="rentEstimate"
            value={form.rentEstimate}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Field
            label="Cash Flow"
            name="cashFlow"
            value={liveCashFlowValue}
            readOnly
            wrapperClassName={`deal-analyzer-output ${cashFlowToneClass}`.trim()}
          />
          {cashFlowBreakdown ? (
            <div className="deal-analyzer-calculation">
              Cash Flow = Monthly Rent - (Monthly Principal + Interest Payment +
              Tax + Insurance)
              <span>{cashFlowBreakdown}</span>
              {analysisSummary?.cashOnCashReturn != null ? (
                <span>
                  Cash on Cash Return = ({liveCashFlowValue} x 12) /{" "}
                  {analysisSummary.totalEntryAmount} = {analysisSummary.cashOnCashValue}
                </span>
              ) : null}
              <span>
                Monthly principal + interest is calculated from Mortgage Balance
                using `M = P x [r(1 + r)^n / ((1 + r)^n - 1)]`, where `r =
                annual interest / 12` and `n = term x 12`.
              </span>
            </div>
          ) : null}
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
              <div><span>Property Value</span><strong>{analysisSummary.propertyValue}</strong></div>
              <div><span>Entry Fee</span><strong>{analysisSummary.entryFee}</strong></div>
              <div><span>Rehab Cost</span><strong>{analysisSummary.rehabCost}</strong></div>
              <div><span>Mortgage Balance</span><strong>{analysisSummary.mortgageBalance}</strong></div>
              <div><span>Any Arrears</span><strong>{analysisSummary.hasArrears}</strong></div>
              <div><span>Arrears Amount</span><strong>{analysisSummary.arrearsAmount}</strong></div>
              <div><span>Interest</span><strong>{analysisSummary.interest}</strong></div>
              <div><span>Term</span><strong>{analysisSummary.termYears} years ({analysisSummary.totalMonths} months)</strong></div>
              <div><span>Principal + Interest</span><strong>{analysisSummary.principalAndInterest}</strong></div>
              <div><span>Principal / Interest Split</span><strong>{analysisSummary.principalBreakdown || "--"}</strong></div>
              <div><span>Tax</span><strong>{analysisSummary.tax}</strong></div>
              <div><span>Insurance</span><strong>{analysisSummary.insurance}</strong></div>
              <div><span>Rent Estimate</span><strong>{analysisSummary.rentEstimate}</strong></div>
              <div><span>Cash Flow</span><strong>{analysisSummary.cashFlow}</strong></div>
              <div>
                <span>Total Entry</span>
                <strong
                  className={
                    analysisSummary.verdict === "NO DEAL"
                      ? "deal-analyzer-return-negative"
                      : ""
                  }
                >
                  {analysisSummary.totalEntryAmount}
                </strong>
              </div>
              <div>
                <span>Cash on Cash Return</span>
                <strong
                  className={
                    analysisSummary.cashOnCashReturn != null &&
                    analysisSummary.cashOnCashReturn < 8
                      ? "deal-analyzer-return-negative"
                      : "deal-analyzer-return-positive"
                  }
                >
                  {analysisSummary.cashOnCashValue}
                </strong>
              </div>
            </div>
            <div
              className={`deal-analyzer-verdict ${analysisSummary.verdict === "DEAL" ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
            >
              <span>Final Verdict</span>
              <strong>{analysisSummary.verdict}</strong>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

export default SubToTab;
