import { useMemo, useState } from "react";
import { calculateMonthlyPayment } from "../../utils/utils";

function sanitizeNumericInput(value, { allowDecimal = false, maxLength } = {}) {
  let s = value.replace(/[^\d.]/g, "");
  if (!allowDecimal) {
    s = s.replace(/\./g, "");
  } else {
    const parts = s.split(".");
    s = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : s;
  }
  if (typeof maxLength === "number") {
    const [whole = "", decimal] = s.split(".");
    const w = whole.slice(0, maxLength);
    s = decimal !== undefined ? `${w}.${decimal}` : w;
  }
  return s;
}

function formatCurrencyInput(value) {
  if (value === "") return "";
  const [whole = "", decimal] = value.split(".");
  const formatted = Number(whole || 0).toLocaleString("en-US");
  return decimal !== undefined ? `$${formatted}.${decimal.slice(0, 2)}` : `$${formatted}`;
}

function parseNum(value) {
  return value === "" ? 0 : parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function fmt(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState("");
  const [downPaymentPercent, setDownPaymentPercent] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [propertyTax, setPropertyTax] = useState("");
  const [homeInsurance, setHomeInsurance] = useState("");
  const [hoa, setHoa] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);

  const downPaymentPreview = useMemo(() => {
    const price = parseFloat(homePrice.replace(/[^0-9.]/g, ""));
    const pct = parseNum(downPaymentPercent);
    if (!homePrice || !downPaymentPercent || isNaN(price) || price <= 0 || pct < 0) return "";
    return fmt((price * pct) / 100);
  }, [homePrice, downPaymentPercent]);

  const validationMessage = useMemo(() => {
    const price = parseFloat(homePrice.replace(/[^0-9.]/g, ""));
    const downPct = parseNum(downPaymentPercent);
    const rate = parseFloat(interestRate.replace(/[^0-9.]/g, ""));
    const years = parseInt(loanTerm.replace(/[^\d]/g, ""), 10);

    if (!homePrice || isNaN(price) || price <= 0) return "Enter a home price greater than 0.";
    if (downPaymentPercent && (isNaN(downPct) || downPct < 0 || downPct > 100))
      return "Down payment must be between 0 and 100.";
    if (!interestRate || isNaN(rate) || rate < 0) return "Enter a valid interest rate.";
    if (!loanTerm || isNaN(years) || years <= 0) return "Enter a loan term greater than 0 years.";
    if (propertyTax && parseNum(propertyTax) < 0) return "Property tax cannot be negative.";
    if (homeInsurance && parseNum(homeInsurance) < 0) return "Home insurance cannot be negative.";
    if (hoa && parseNum(hoa) < 0) return "HOA cannot be negative.";
    return "";
  }, [homePrice, downPaymentPercent, interestRate, loanTerm, propertyTax, homeInsurance, hoa]);

  const breakdown = useMemo(() => {
    if (validationMessage) return null;
    const price = parseFloat(homePrice.replace(/[^0-9.]/g, ""));
    const downPct = parseNum(downPaymentPercent);
    const annualRate = parseFloat(interestRate.replace(/[^0-9.]/g, ""));
    const years = parseInt(loanTerm.replace(/[^\d]/g, ""), 10);
    const annualTax = parseNum(propertyTax);
    const annualIns = parseNum(homeInsurance);
    const monthlyHoa = parseNum(hoa);

    const downAmt = (price * downPct) / 100;
    const loanAmt = price - downAmt;
    const n = years * 12;
    const pi = calculateMonthlyPayment(loanAmt, annualRate / 100, n);

    const monthlyTax = annualTax / 12;
    const monthlyIns = annualIns / 12;
    const total = pi + monthlyTax + monthlyIns + monthlyHoa;
    const totalPI = pi * n;
    const totalExtras = (monthlyTax + monthlyIns + monthlyHoa) * n;

    return {
      downAmt,
      loanAmt,
      pi,
      monthlyTax,
      monthlyIns,
      monthlyHoa,
      total,
      totalPI,
      totalExtras,
      totalMortgage: totalPI + totalExtras,
      totalInterest: totalPI - loanAmt,
      payments: n,
    };
  }, [validationMessage, homePrice, downPaymentPercent, interestRate, loanTerm, propertyTax, homeInsurance, hoa]);

  const canCalculate = !validationMessage;

  function handleCalculate() {
    setHasCalculated(true);
  }

  return (
    <>
      <header className="page-header" data-reveal>
        <div>
          <h1>Mortgage Calculator</h1>
          <span>See the full monthly and lifetime cost breakdown.</span>
        </div>
      </header>

      <section
        className="panel mc-panel"
        data-reveal="left"
        style={{ "--reveal-delay": "80ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Loan Details</h2>
            <p>Enter your purchase price, financing terms, and carrying costs.</p>
          </div>
        </div>

        <div className="mc-section-label">Purchase &amp; Financing</div>
        <div className="mc-form-grid">
          <label className="field">
            <span>Home Price</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatCurrencyInput(homePrice)}
              onChange={(e) => {
                setHomePrice(sanitizeNumericInput(e.target.value, { allowDecimal: true }));
                setHasCalculated(false);
              }}
              placeholder="e.g. $350,000"
            />
          </label>

          <label className="field">
            <span>
              Down Payment (%)
              {downPaymentPreview && (
                <span className="mc-field-hint"> — {downPaymentPreview}</span>
              )}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={downPaymentPercent}
              onChange={(e) => {
                setDownPaymentPercent(sanitizeNumericInput(e.target.value, { maxLength: 2 }));
                setHasCalculated(false);
              }}
              placeholder="e.g. 20"
              maxLength={2}
            />
          </label>

          <label className="field">
            <span>Interest Rate (% / year)</span>
            <input
              type="text"
              inputMode="decimal"
              value={interestRate}
              onChange={(e) => {
                setInterestRate(sanitizeNumericInput(e.target.value, { allowDecimal: true }));
                setHasCalculated(false);
              }}
              placeholder="e.g. 6.5"
            />
          </label>

          <label className="field">
            <span>Loan Term (Years)</span>
            <input
              type="text"
              inputMode="numeric"
              value={loanTerm}
              onChange={(e) => {
                setLoanTerm(sanitizeNumericInput(e.target.value));
                setHasCalculated(false);
              }}
              placeholder="e.g. 30"
            />
          </label>
        </div>

        <div className="mc-section-label">Monthly Carrying Costs</div>
        <div className="mc-form-grid">
          <label className="field">
            <span>Annual Property Tax</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatCurrencyInput(propertyTax)}
              onChange={(e) => {
                setPropertyTax(sanitizeNumericInput(e.target.value, { allowDecimal: true }));
                setHasCalculated(false);
              }}
              placeholder="e.g. $4,200"
            />
          </label>

          <label className="field">
            <span>Annual Home Insurance</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatCurrencyInput(homeInsurance)}
              onChange={(e) => {
                setHomeInsurance(sanitizeNumericInput(e.target.value, { allowDecimal: true }));
                setHasCalculated(false);
              }}
              placeholder="e.g. $1,800"
            />
          </label>

          <label className="field">
            <span>Monthly HOA</span>
            <input
              type="text"
              inputMode="decimal"
              value={formatCurrencyInput(hoa)}
              onChange={(e) => {
                setHoa(sanitizeNumericInput(e.target.value, { allowDecimal: true }));
                setHasCalculated(false);
              }}
              placeholder="e.g. $200"
            />
          </label>
        </div>

        <div className="mc-actions">
          <button
            type="button"
            className="primary-btn form-btn"
            onClick={handleCalculate}
            disabled={!canCalculate}
          >
            Calculate Mortgage
          </button>
          {hasCalculated && !breakdown && (
            <p className="mc-error">{validationMessage}</p>
          )}
        </div>

        {hasCalculated && breakdown && (
          <div className="mc-results">
            {/* Monthly payment banner */}
            <div className="mc-summary-banner">
              <div>
                <span>Estimated Monthly Payment</span>
                <strong>{fmt(breakdown.total)}</strong>
              </div>
              <div className="mc-banner-meta">
                <span>{fmt(breakdown.loanAmt)} loan</span>
                <span>·</span>
                <span>{loanTerm} yr @ {interestRate}%</span>
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="mc-section-label" style={{ padding: "1.25rem 0 0.5rem" }}>
              Monthly Breakdown
            </div>
            <div className="mc-breakdown-grid">
              {[
                { label: "Principal + Interest", value: breakdown.pi },
                { label: "Property Tax / mo",    value: breakdown.monthlyTax },
                { label: "Home Insurance / mo",  value: breakdown.monthlyIns },
                { label: "HOA / mo",             value: breakdown.monthlyHoa },
                { label: "Down Payment",         value: breakdown.downAmt },
                { label: "Loan Amount",          value: breakdown.loanAmt },
              ].map(({ label, value }) => (
                <div key={label} className="mc-breakdown-card">
                  <span>{label}</span>
                  <strong>{fmt(value)}</strong>
                </div>
              ))}
            </div>

            <div className="mc-section-label" style={{ padding: "1.25rem 0 0.5rem" }}>
              Lifetime Totals
            </div>
            <div className="mc-breakdown-grid">
              {[
                { label: "Total Interest Paid",       value: breakdown.totalInterest },
                { label: "Total Principal + Interest", value: breakdown.totalPI },
                { label: "Total Carrying Costs",      value: breakdown.totalExtras },
                { label: "Total Mortgage Paid",       value: breakdown.totalMortgage },
              ].map(({ label, value }) => (
                <div key={label} className="mc-breakdown-card">
                  <span>{label}</span>
                  <strong>{fmt(value)}</strong>
                </div>
              ))}
              <div className="mc-breakdown-card">
                <span>Number of Payments</span>
                <strong>{breakdown.payments}</strong>
              </div>
            </div>

            {/* Monthly cost table */}
            <div className="mc-table">
              <div className="mc-table-header">
                <span>Monthly Cost Breakdown</span>
                <span>Amount</span>
              </div>
              {[
                { label: "Principal + Interest", value: breakdown.pi },
                { label: "Property Tax",         value: breakdown.monthlyTax },
                { label: "Home Insurance",       value: breakdown.monthlyIns },
                { label: "HOA",                  value: breakdown.monthlyHoa },
              ].map(({ label, value }) => (
                <div key={label} className="mc-table-row">
                  <span>{label}</span>
                  <span>{fmt(value)}</span>
                </div>
              ))}
              <div className="mc-table-row mc-table-total">
                <span>Total Monthly Payment</span>
                <span>{fmt(breakdown.total)}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default MortgageCalculator;
