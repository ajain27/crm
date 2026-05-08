import { useState } from "react";
import { Field } from "../../elements/elements";

const initialSubToForm = {
  purchasePrice: "",
  entryFee: "",
  rehabCost: "",
  mortgageBalance: "",
  interest: "",
  termYears: "",
  insurance: "",
  tax: "",
  rentEstimate: "",
  cashFlow: "",
};

function SubToTab({ tab }) {
  const [form, setForm] = useState(initialSubToForm);
  const currencyFields = [
    "purchasePrice",
    "entryFee",
    "rehabCost",
    "mortgageBalance",
    "insurance",
    "tax",
    "rentEstimate",
  ];
  const requiredValues = [
    form.rentEstimate,
    form.mortgageBalance,
    form.termYears,
    form.insurance,
    form.tax,
    form.interest,
  ];
  const isReadyToCalculate = requiredValues.every((value) =>
    String(value || "").trim(),
  );

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

  function calculateMonthlyPayment(
    loanPrincipal,
    annualRate,
    totalPaymentCount,
  ) {
    if (loanPrincipal <= 0 || totalPaymentCount <= 0) {
      return 0;
    }

    const monthlyInterestRate = annualRate / 12;
    if (monthlyInterestRate <= 0) {
      return loanPrincipal / totalPaymentCount;
    }

    const growthFactor = (1 + monthlyInterestRate) ** totalPaymentCount;
    return (
      loanPrincipal *
      ((monthlyInterestRate * growthFactor) / (growthFactor - 1))
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (currencyFields.includes(name)) {
      const cleaned = value.replace(/[^0-9$,]/g, "");
      setForm((prev) => ({ ...prev, [name]: cleaned }));
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

    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue) {
      return;
    }

    const formatted =
      "$" + Number.parseInt(numericValue, 10).toLocaleString("en-US");
    setForm((prev) => ({ ...prev, [name]: formatted }));
  }

  const mortgageBalanceAmount = parseAmount(form.mortgageBalance);
  const termYearsAmount = parseAmount(form.termYears);
  const insuranceAmount = parseAmount(form.insurance);
  const taxAmount = parseAmount(form.tax);
  const monthlyRentAmount = parseAmount(form.rentEstimate);
  const annualInterestRate = parseAmount(form.interest) / 100;
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
  const livePrincipalValue =
    mortgageBalanceAmount > 0 && annualInterestRate >= 0 && totalPayments > 0
      ? formatAmount(amortizedMonthlyPayment)
      : "";
  const principalBreakdownValue = livePrincipalValue
    ? `(${formatAmount(monthlyPrincipalAmount)} + ${formatAmount(monthlyInterestAmount)})`
    : "";
  const termMonthsValue = totalPayments > 0 ? `(${totalPayments})` : "";
  const calculatedCashFlow =
    monthlyRentAmount - (amortizedMonthlyPayment + taxAmount + insuranceAmount);
  const liveCashFlowValue = isReadyToCalculate
    ? formatAmount(calculatedCashFlow)
    : "";
  const cashFlowToneClass = isReadyToCalculate
    ? calculatedCashFlow < 0
      ? "deal-analyzer-output-negative"
      : "deal-analyzer-output-positive"
    : "";
  const cashFlowBreakdown = isReadyToCalculate
    ? `${formatAmount(monthlyRentAmount)} - (${formatAmount(amortizedMonthlyPayment)} + ${formatAmount(taxAmount)} + ${formatAmount(insuranceAmount)}) = ${liveCashFlowValue}`
    : "";

  function calculateCashFlow() {
    return calculatedCashFlow;
  }

  function handleCalculate() {
    if (!isReadyToCalculate) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      cashFlow: liveCashFlowValue,
    }));
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
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <Field
            label="Entry Fee"
            name="entryFee"
            value={form.entryFee}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <Field
            label="Mortgage Balance"
            name="mortgageBalance"
            value={form.mortgageBalance}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <Field
            label="Interest"
            name="interest"
            value={form.interest}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <label className="field deal-analyzer-term-field">
            <span>Term in Years</span>
            <div className="deal-analyzer-term-shell">
              <input
                id="termYears"
                name="termYears"
                value={form.termYears}
                onChange={handleChange}
                inputMode="numeric"
                className="deal-analyzer-term-input"
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
          <label className="field deal-analyzer-principal-field">
            <span>Principal + Interest</span>
            <div className="deal-analyzer-principal-shell deal-analyzer-output">
              <input
                id="principal"
                name="principal"
                value={livePrincipalValue}
                readOnly
                className="deal-analyzer-principal-input"
              />
              {principalBreakdownValue ? (
                <span
                  className="deal-analyzer-principal-suffix"
                  aria-hidden="true"
                >
                  {principalBreakdownValue}
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
          />
          <Field
            label="Insurance"
            name="insurance"
            value={form.insurance}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <Field
            label="Rent Estimate"
            name="rentEstimate"
            value={form.rentEstimate}
            onChange={handleChange}
            onBlur={handleBlur}
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
            disabled={!isReadyToCalculate}
          >
            Calculate
          </button>
        </div>
      </section>
    </>
  );
}

export default SubToTab;
