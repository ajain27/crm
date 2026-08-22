import { useState, useEffect } from "react";
import { Field, AnimatedAmount } from "../../../elements/elements";
import {
  parseCurrency,
  parsePercent,
  fmtCurrencyInput,
  fmt,
  calculateMonthlyPayment,
  calculateBalloonBalance,
} from "../../../../utils/utils";
import AdditionalLenders, {
  calcLenderTotal,
  createEmptyLender,
} from "../additionalLenders/AdditionalLenders";

const CASH_FLOW_MIN = 400;

// Amortized (P&I) monthly payment for a single lender — always based on the
// standard amortization formula, never an interest-only shortcut. A lender
// with no term contributes $0 until a term is entered.
function calcLenderAmortizedBreakdown(lenders) {
  return lenders.map((l, idx) => {
    const amount = parseCurrency(l.amount);
    const rate = parsePercent(l.rate);
    const termYears = parseInt(l.term || "0", 10) || 0;
    return {
      id: l.id,
      index: idx + 1,
      amount,
      rate,
      term: termYears,
      monthlyPayment: calculateMonthlyPayment(
        amount,
        rate / 100,
        termYears * 12,
      ),
    };
  });
}

const initialForm = {
  purchasePrice: "",
  sellerFinancePct: "",
  sellerFinanceRate: "",
  sellerFinanceTermYears: "",
  sellerFinanceBalloonYears: "",
  originationFeesPct: "",
  legalFees: "",
  appraisalFees: "",
  underwritingFees: "",
  closingCosts: "",
  monthlyRent: "",
  yearlyTaxes: "",
  yearlyInsurance: "",
  applianceInsurance: "",
};

const CURRENCY_FIELDS = new Set([
  "purchasePrice",
  "legalFees",
  "appraisalFees",
  "underwritingFees",
  "closingCosts",
  "monthlyRent",
  "yearlyTaxes",
  "yearlyInsurance",
  "applianceInsurance",
]);
const PERCENT_FIELDS = new Set([
  "sellerFinancePct",
  "sellerFinanceRate",
  "originationFeesPct",
]);
const YEAR_FIELDS = new Set([
  "sellerFinanceTermYears",
  "sellerFinanceBalloonYears",
]);

function SellerFinanceTab({ tab }) {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);
  // Show one lender row on load (instead of an empty state behind an "Add
  // Lender" click) — marked `auto` so it behaves exactly like a
  // freshly-added row and picks up the remaining balance as the user fills
  // in Purchase Price and Seller Financing %.
  const [lenders, setLenders] = useState(() => [
    createEmptyLender("", "", "", true),
  ]);

  function handleChange(e) {
    const { name, value } = e.target;
    setSummary(null);
    if (CURRENCY_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: fmtCurrencyInput(value) }));
      return;
    }
    if (PERCENT_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, "") }));
      return;
    }
    if (YEAR_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (PERCENT_FIELDS.has(name) && value) {
      const numeric = value.replace(/[^0-9.]/g, "");
      if (numeric) setForm((prev) => ({ ...prev, [name]: `${numeric}%` }));
    }
  }

  const purchasePrice = parseCurrency(form.purchasePrice);

  const sellerFinancePct = parsePercent(form.sellerFinancePct);
  const sellerFinanceAmount = purchasePrice * (sellerFinancePct / 100);
  const sellerFinanceRatePct = parsePercent(form.sellerFinanceRate);
  const sellerFinanceTermYears =
    parseInt(form.sellerFinanceTermYears || "0", 10) || 0;
  const sellerFinanceBalloonYears =
    parseInt(form.sellerFinanceBalloonYears || "0", 10) || 0;
  const totalPayments = sellerFinanceTermYears * 12;
  const annualRateDecimal = sellerFinanceRatePct / 100;

  const sellerFinanceMonthly = calculateMonthlyPayment(
    sellerFinanceAmount,
    annualRateDecimal,
    totalPayments,
  );
  const sellerFinanceBalloon =
    sellerFinanceBalloonYears > 0 &&
    sellerFinanceBalloonYears < sellerFinanceTermYears
      ? calculateBalloonBalance(
          sellerFinanceAmount,
          annualRateDecimal,
          totalPayments,
          sellerFinanceBalloonYears * 12,
        )
      : 0;

  const lenderTotal = calcLenderTotal(lenders);
  const remainingForLender = Math.max(
    0,
    purchasePrice - sellerFinanceAmount - lenderTotal,
  );
  const newLenderAmount =
    remainingForLender > 0
      ? fmtCurrencyInput(String(Math.round(remainingForLender)))
      : "";

  // Keep every still-"auto" lender's amount in sync with the purchase price
  // / seller-financing inputs as they change after the row was added —
  // otherwise the seeded amount goes stale the moment the user edits
  // Purchase Price or Seller Financing % afterward. Once the user types
  // into a lender's Amount field directly, AdditionalLenders clears that
  // row's `auto` flag and this effect leaves it alone. Manually-set lenders
  // are treated as fixed and subtracted first; remaining auto lenders (in
  // order) each absorb whatever's left after seller financing and any
  // earlier lenders.
  useEffect(() => {
    setLenders((prev) => {
      let used = sellerFinanceAmount;
      let changed = false;
      const next = prev.map((l) => {
        if (!l.auto) {
          used += parseCurrency(l.amount);
          return l;
        }
        const target = Math.max(0, purchasePrice - used);
        const suggested =
          target > 0 ? fmtCurrencyInput(String(Math.round(target))) : "";
        used += target;
        if (suggested === l.amount) return l;
        changed = true;
        return { ...l, amount: suggested };
      });
      return changed ? next : prev;
    });
  }, [purchasePrice, sellerFinanceAmount]);
  // A lender row always exists in the UI (there's one on load), so filter
  // out empty placeholder rows before computing payments/totals shown in
  // the results — otherwise every deal would show a stray "$0" lender.
  const activeLenders = lenders.filter((l) => parseCurrency(l.amount) > 0);
  const lenderBreakdown = calcLenderAmortizedBreakdown(activeLenders);
  const lenderMonthlyPayment = lenderBreakdown.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0,
  );

  const originationFeesPct = parsePercent(form.originationFeesPct);
  const originationFeesAmt = lenderTotal * (originationFeesPct / 100);
  const legalFeesAmt = parseCurrency(form.legalFees);
  const appraisalFeesAmt = parseCurrency(form.appraisalFees);
  const underwritingFeesAmt = parseCurrency(form.underwritingFees);
  const closingCostsAmt = parseCurrency(form.closingCosts);
  const totalLenderFees =
    originationFeesAmt + legalFeesAmt + appraisalFeesAmt + underwritingFeesAmt;
  const totalCashToClose = totalLenderFees + closingCostsAmt;

  const unfinancedPrincipal = purchasePrice - lenderTotal - sellerFinanceAmount;
  // Once seller financing + lender debt cover the full purchase price, fees
  // are assumed rolled into that financing too — the buyer only ever brings
  // cash to close for an actual down-payment gap, never for fees alone on a
  // fully (or over-)financed deal.
  const buyerCashToClose =
    unfinancedPrincipal > 0 ? unfinancedPrincipal + totalCashToClose : 0;
  const isOverFinanced =
    purchasePrice > 0 && lenderTotal + sellerFinanceAmount > purchasePrice;
  const totalMonthlyPayment = sellerFinanceMonthly + lenderMonthlyPayment;

  const monthlyRentAmount = parseCurrency(form.monthlyRent);
  const yearlyTaxesAmt = parseCurrency(form.yearlyTaxes);
  const monthlyTaxes = yearlyTaxesAmt / 12;
  const yearlyInsuranceAmt = parseCurrency(form.yearlyInsurance);
  const monthlyInsurance = yearlyInsuranceAmt / 12;
  const applianceInsuranceAmt = parseCurrency(form.applianceInsurance);
  const totalMonthlyExpenses =
    totalMonthlyPayment +
    monthlyTaxes +
    monthlyInsurance +
    applianceInsuranceAmt;
  const cashFlow = monthlyRentAmount - totalMonthlyExpenses;
  const isCashFlowLow = cashFlow < CASH_FLOW_MIN;

  const isFormComplete = Boolean(
    form.purchasePrice?.trim() &&
    form.sellerFinancePct?.trim() &&
    form.sellerFinanceRate?.trim() &&
    form.sellerFinanceTermYears?.trim() &&
    form.monthlyRent?.trim(),
  );

  function handleCalculate() {
    if (!isFormComplete) return;
    setSummary({
      purchasePrice,
      sellerFinancePct,
      sellerFinanceAmount,
      sellerFinanceRatePct,
      sellerFinanceTermYears,
      sellerFinanceBalloonYears,
      sellerFinanceBalloon,
      sellerFinanceMonthly,
      lenderCount: activeLenders.length,
      lenderBreakdown,
      lenderTotal,
      lenderMonthlyPayment,
      originationFeesPct,
      originationFeesAmt,
      legalFeesAmt,
      appraisalFeesAmt,
      underwritingFeesAmt,
      totalLenderFees,
      closingCostsAmt,
      totalCashToClose,
      unfinancedPrincipal,
      buyerCashToClose,
      totalMonthlyPayment,
      monthlyRentAmount,
      yearlyTaxesAmt,
      monthlyTaxes,
      yearlyInsuranceAmt,
      monthlyInsurance,
      applianceInsuranceAmt,
      totalMonthlyExpenses,
      cashFlow,
      isOverFinanced,
      isCashFlowLow,
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
            <h2>Seller Finance Inputs</h2>
            <p>
              Enter the purchase price and the seller-financed note first, then
              add any additional lenders — the lender amount will auto-fill with
              whatever's left to finance.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-section-label">Purchase</div>
        <div
          className="deal-analyzer-form-grid"
          style={{ gridTemplateColumns: "minmax(220px, 280px)" }}
        >
          <Field
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $250,000"
            required
          />
        </div>

        <div className="deal-analyzer-section-label">
          Seller Financing — Promissory Note
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Seller Financing (%)"
            name="sellerFinancePct"
            value={form.sellerFinancePct}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 20"
            required
          />
          {sellerFinanceAmount > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Seller Financing Amount{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(sellerFinanceAmount)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Interest Rate (% / year)"
            name="sellerFinanceRate"
            value={form.sellerFinanceRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 6"
            required
          />
          <Field
            label="Note Term (Years)"
            name="sellerFinanceTermYears"
            value={form.sellerFinanceTermYears}
            onChange={handleChange}
            placeholder="e.g. 10"
            required
          />
          <Field
            label="Balloon Payment at (Years)"
            name="sellerFinanceBalloonYears"
            value={form.sellerFinanceBalloonYears}
            onChange={handleChange}
            placeholder="e.g. 5 (optional)"
          />
          {sellerFinanceAmount > 0 && totalPayments > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Monthly Payment{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(sellerFinanceMonthly)} readOnly tabIndex={-1} />
            </label>
          )}
          {sellerFinanceBalloonYears > 0 && sellerFinanceBalloon > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Balloon Payment at Year {sellerFinanceBalloonYears}{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(sellerFinanceBalloon)} readOnly tabIndex={-1} />
            </label>
          )}
        </div>

        <AdditionalLenders
          lenders={lenders}
          setLenders={setLenders}
          onMutate={() => setSummary(null)}
          newLenderAmount={newLenderAmount}
        />

        <div className="deal-analyzer-section-label">
          Lender Fees &amp; Closing Costs
        </div>
        <div className="deal-analyzer-form-grid">
          <Field
            label="Origination Fees (%)"
            name="originationFeesPct"
            value={form.originationFeesPct}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 1.5"
          />
          {originationFeesAmt > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Origination Fees Amount{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(originationFeesAmt)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Doc Fees"
            name="legalFees"
            value={form.legalFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $1,000"
          />
          <Field
            label="Appraisal Fees"
            name="appraisalFees"
            value={form.appraisalFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $500"
          />
          <Field
            label="Underwriting Fees"
            name="underwritingFees"
            value={form.underwritingFees}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $500"
          />
          {totalLenderFees > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Total Lender Fees{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(totalLenderFees)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Closing Costs"
            name="closingCosts"
            value={form.closingCosts}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $2,500"
          />
          {totalCashToClose > 0 && (
            <label className="field deal-analyzer-output deal-analyzer-output-red">
              <span>
                Total Cash to Close Costs{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(totalCashToClose)} readOnly tabIndex={-1} />
            </label>
          )}
        </div>

        {purchasePrice > 0 && (
          <div
            className="deal-analyzer-form-grid"
            style={{ gridTemplateColumns: "minmax(220px, 280px)" }}
          >
            <label
              className={`field deal-analyzer-output ${
                isOverFinanced ? "deal-analyzer-output-red" : ""
              }`}
            >
              <span>Buyer Cash to Close</span>
              <input value={fmt(buyerCashToClose)} readOnly tabIndex={-1} />
            </label>
          </div>
        )}

        <div className="deal-analyzer-section-label">Rent &amp; Cash Flow</div>
        <div className="deal-analyzer-form-grid">
          <div style={{ gridColumn: "1 / -1" }}>
            <a
              href="https://www.huduser.gov/portal/datasets/fmr/fmrs/FY2026_code/select_Geography.odn"
              target="_blank"
              rel="noopener noreferrer"
              className="deal-analyzer-rent-estimate-btn"
            >
              Get Rent Estimate ↗
            </a>
          </div>
          <Field
            label="Monthly Rent"
            name="monthlyRent"
            value={form.monthlyRent}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $2,200"
            required
          />
          <Field
            label="Yearly Property Tax"
            name="yearlyTaxes"
            value={form.yearlyTaxes}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $3,000"
          />
          {monthlyTaxes > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Monthly Property Tax{" "}
                <span className="deal-analyzer-auto-badge">÷ 12</span>
              </span>
              <input value={fmt(monthlyTaxes)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Yearly Insurance"
            name="yearlyInsurance"
            value={form.yearlyInsurance}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $1,200"
          />
          {monthlyInsurance > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Monthly Insurance{" "}
                <span className="deal-analyzer-auto-badge">÷ 12</span>
              </span>
              <input value={fmt(monthlyInsurance)} readOnly tabIndex={-1} />
            </label>
          )}
          <Field
            label="Appliance Insurance (Monthly)"
            name="applianceInsurance"
            value={form.applianceInsurance}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. $50"
          />
          {(sellerFinanceMonthly > 0 || lenderMonthlyPayment > 0) && (
            <label className="field deal-analyzer-output">
              <span>
                Total Monthly Debt Service{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(totalMonthlyPayment)} readOnly tabIndex={-1} />
            </label>
          )}
          {totalMonthlyExpenses > 0 && (
            <label className="field deal-analyzer-output">
              <span>
                Total Monthly Expenses{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(totalMonthlyExpenses)} readOnly tabIndex={-1} />
            </label>
          )}
          {monthlyRentAmount > 0 && (
            <label
              className={`field deal-analyzer-output ${
                isCashFlowLow
                  ? "deal-analyzer-output-red"
                  : "deal-analyzer-output-positive"
              }`}
            >
              <span>
                Cash Flow <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input value={fmt(cashFlow)} readOnly tabIndex={-1} />
            </label>
          )}
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

        {summary ? (
          <div className="deal-analyzer-summary">
            <div
              className={`deal-analyzer-final-verdict ${
                summary.isCashFlowLow
                  ? "deal-analyzer-verdict-negative"
                  : "deal-analyzer-verdict-positive"
              }`}
            >
              <span>Monthly Cash Flow</span>
              <strong>
                <AnimatedAmount value={summary.cashFlow} format={fmt} />
              </strong>
            </div>

            <div
              className="deal-analyzer-summary-grid"
              style={{ marginTop: "1.25rem" }}
            >
              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1", marginTop: 0 }}
              >
                Capital Stack
              </div>
              <div>
                <span>Purchase Price</span>
                <strong>
                  <AnimatedAmount value={summary.purchasePrice} format={fmt} />
                </strong>
              </div>
              <div>
                <span>Seller Financing ({summary.sellerFinancePct}%)</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.sellerFinanceAmount}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.lenderTotal > 0 && (
                <div>
                  <span>
                    Lender Total ({summary.lenderCount} lender
                    {summary.lenderCount !== 1 ? "s" : ""})
                  </span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.lenderTotal} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.originationFeesAmt > 0 && (
                <div>
                  <span>Origination Fees ({summary.originationFeesPct}%)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.originationFeesAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.legalFeesAmt > 0 && (
                <div>
                  <span>Doc Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.legalFeesAmt} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.appraisalFeesAmt > 0 && (
                <div>
                  <span>Appraisal Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.appraisalFeesAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.underwritingFeesAmt > 0 && (
                <div>
                  <span>Underwriting Fees</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.underwritingFeesAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.closingCostsAmt > 0 && (
                <div>
                  <span>Closing Costs</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.closingCostsAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              <div>
                <span>
                  <strong>Buyer Cash to Close</strong>
                </span>
                <strong
                  className={
                    summary.isOverFinanced
                      ? "deal-analyzer-return-negative"
                      : "deal-analyzer-return-positive"
                  }
                >
                  <AnimatedAmount
                    value={summary.buyerCashToClose}
                    format={fmt}
                  />
                </strong>
              </div>

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Seller Note — Promissory Note
              </div>
              <div>
                <span>Note Rate</span>
                <strong>{summary.sellerFinanceRatePct}%</strong>
              </div>
              <div>
                <span>Note Term</span>
                <strong>{summary.sellerFinanceTermYears} years</strong>
              </div>
              <div>
                <span>Seller Note Monthly Payment</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.sellerFinanceMonthly}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Balloon Due</span>
                <strong className="deal-analyzer-return-negative">
                  {summary.sellerFinanceBalloonYears > 0
                    ? `${fmt(summary.sellerFinanceBalloon)} at year ${summary.sellerFinanceBalloonYears}`
                    : "None"}
                </strong>
              </div>

              {summary.lenderBreakdown.length > 0 && (
                <>
                  <div
                    className="deal-analyzer-section-label"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    Lender Payments
                  </div>
                  {summary.lenderBreakdown.map((lender) => (
                    <div key={lender.id}>
                      <span>
                        Lender {lender.index} ({fmt(lender.amount)}
                        {lender.rate > 0 ? ` @ ${lender.rate}%` : ""}
                        {lender.term > 0 ? `, ${lender.term} yr` : ""})
                      </span>
                      {lender.term > 0 ? (
                        <strong className="deal-analyzer-return-negative">
                          <AnimatedAmount
                            value={lender.monthlyPayment}
                            format={fmt}
                          />
                        </strong>
                      ) : (
                        <strong className="deal-analyzer-return-negative">
                          Add a term to amortize
                        </strong>
                      )}
                    </div>
                  ))}
                  <div>
                    <span>Total Lender Payment</span>
                    <strong className="deal-analyzer-return-negative">
                      <AnimatedAmount
                        value={summary.lenderMonthlyPayment}
                        format={fmt}
                      />
                    </strong>
                  </div>
                </>
              )}

              <div
                className="deal-analyzer-section-label"
                style={{ gridColumn: "1 / -1" }}
              >
                Cash Flow
              </div>
              <div>
                <span>Monthly Rent</span>
                <strong className="deal-analyzer-return-positive">
                  <AnimatedAmount
                    value={summary.monthlyRentAmount}
                    format={fmt}
                  />
                </strong>
              </div>
              <div>
                <span>Total Monthly Debt Service</span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalMonthlyPayment}
                    format={fmt}
                  />
                </strong>
              </div>
              {summary.monthlyTaxes > 0 && (
                <div>
                  <span>Property Tax (÷ 12 monthly)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount value={summary.monthlyTaxes} format={fmt} />
                  </strong>
                </div>
              )}
              {summary.monthlyInsurance > 0 && (
                <div>
                  <span>Insurance (÷ 12 monthly)</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.monthlyInsurance}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              {summary.applianceInsuranceAmt > 0 && (
                <div>
                  <span>Appliance Insurance</span>
                  <strong className="deal-analyzer-return-negative">
                    <AnimatedAmount
                      value={summary.applianceInsuranceAmt}
                      format={fmt}
                    />
                  </strong>
                </div>
              )}
              <div>
                <span>
                  <strong>Total Monthly Expenses</strong>
                </span>
                <strong className="deal-analyzer-return-negative">
                  <AnimatedAmount
                    value={summary.totalMonthlyExpenses}
                    format={fmt}
                  />
                </strong>
              </div>
            </div>

            <div
              className="deal-analyzer-calculation"
              style={{ marginTop: "1rem" }}
            >
              Buyer Cash to Close = Purchase Price − Seller Financing − Lender
              Total + Lender Fees + Closing Costs (fees roll into financing
              instead, at $0 cash to close, once seller financing + lender debt
              cover the full purchase price)
              <span>
                {fmt(summary.purchasePrice)} −{" "}
                {fmt(summary.sellerFinanceAmount)} − {fmt(summary.lenderTotal)}{" "}
                {summary.unfinancedPrincipal > 0
                  ? `+ ${fmt(summary.totalLenderFees)} + ${fmt(summary.closingCostsAmt)} `
                  : "(fully financed — fees rolled in) "}
                = {fmt(summary.buyerCashToClose)}
              </span>
              Monthly Cash Flow = Monthly Rent − (Seller Note Payment + Lender
              Payments + Property Tax + Insurance + Appliance Insurance)
              <span>
                {fmt(summary.monthlyRentAmount)} − (
                {fmt(summary.sellerFinanceMonthly)} +{" "}
                {fmt(summary.lenderMonthlyPayment)} +{" "}
                {fmt(summary.monthlyTaxes)} + {fmt(summary.monthlyInsurance)} +{" "}
                {fmt(summary.applianceInsuranceAmt)}) = {fmt(summary.cashFlow)}
              </span>
              <span>
                Cash flow below {fmt(CASH_FLOW_MIN)}/month is flagged red.
              </span>
              <span>
                Seller note and lender payments are fully amortized using `M = P
                x [r(1 + r)^n / ((1 + r)^n - 1)]`, where `r = annual interest /
                12` and `n = term x 12`. A lender without a term contributes $0
                until one is entered.
              </span>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

export default SellerFinanceTab;
