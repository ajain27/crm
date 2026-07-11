import { Field, Select } from "../../../elements/elements";
import { fmt } from "../../../../utils/utils";
import AdditionalLenders from "../additionalLenders/AdditionalLenders";
import { SellerCreditCarrybackField } from "./SellerCreditCarryback";
import RentalDSCRSummary from "./RentalDSCRSummary";
import {
  useDSCRCalculations,
  PROP_MGMT_PCT,
  DOWN_OPTIONS,
} from "./useDSCRCalculations";

function RentalDSCRTab() {
  const {
    form,
    setSummary,
    lenders,
    setLenders,
    downPct,
    setDownPct,
    isCashNeededHeloc,
    setIsCashNeededHeloc,
    handleChange,
    handleBlur,
    handleCalculate,
    summary,
    isFormComplete,
    agentCommissionAmt,
    downPayment,
    lenderFunds,
    extraDownPaymentAmt,
    effectiveLoanAmount,
    loanMortgage,
    lenderCosts,
    cashHelocMonthlyPayment,
    purchasePrice,
    propMgmtFee,
    monthlyMiscExpense,
    rateBuyDownPct,
    rateBuyDownAmt,
  } = useDSCRCalculations();

  return (
    <section
      className="deal-analyzer-form"
      data-reveal="left"
      style={{ "--reveal-delay": "160ms" }}
    >
      <div className="panel-header deal-analyzer-form-header">
        <div>
          <h2>Rental Inputs</h2>
          <p>
            Enter purchase details, DSCR loan terms, and monthly income and
            expenses to calculate cash flow.
          </p>
        </div>
      </div>

      <div className="deal-analyzer-section-label">
        Purchase &amp; Acquisition
      </div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Purchase Price"
          name="purchasePrice"
          value={form.purchasePrice}
          onChange={handleChange}
          placeholder="e.g. $200,000"
          required
        />
        <Field
          label="Agent Commission (%)"
          name="agentCommission"
          value={form.agentCommission}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 3"
        />
        {agentCommissionAmt > 0 && (
          <label className="field deal-analyzer-output">
            <span>Agent Commission Amount</span>
            <input value={fmt(agentCommissionAmt)} readOnly tabIndex={-1} />
          </label>
        )}
        <Field
          label="Closing Costs"
          name="closingCosts"
          value={form.closingCosts}
          onChange={handleChange}
          placeholder="e.g. $4,000"
        />
        <SellerCreditCarrybackField
          value={form.sellerCarryback}
          purchasePrice={purchasePrice}
          onChange={handleChange}
          onBlur={handleBlur}
          fmt={fmt}
        />
      </div>

      <div className="deal-analyzer-section-label">DSCR Loan</div>
      <div className="deal-analyzer-form-grid">
        <div className="field">
          <span>Down Payment %</span>
          <select
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="leads-select"
          >
            {DOWN_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}%
              </option>
            ))}
          </select>
        </div>
        <label className="field deal-analyzer-output">
          <span>
            Down Payment{" "}
            <span className="deal-analyzer-auto-badge">{downPct}%</span>
          </span>
          <input
            value={downPayment > 0 ? fmt(downPayment) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <label
          className={`field deal-analyzer-output${lenderFunds > 0 && lenderFunds < 50000 ? " deal-analyzer-output-red" : ""}`}
        >
          <span>Loan Amount</span>
          <input
            value={lenderFunds > 0 ? fmt(lenderFunds) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Extra Down Payment"
          name="extraDownPayment"
          value={form.extraDownPayment}
          onChange={handleChange}
          placeholder="e.g. $10,000"
        />
        {extraDownPaymentAmt > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Effective Loan Amount{" "}
              <span className="deal-analyzer-auto-badge">auto</span>
            </span>
            <input value={fmt(effectiveLoanAmount)} readOnly tabIndex={-1} />
          </label>
        )}
        <Field
          label="Interest Rate (% / year)"
          name="interestRate"
          value={form.interestRate}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 7"
          required
        />
        <Field
          label="Loan Term (Years)"
          name="loanTermYears"
          value={form.loanTermYears}
          onChange={handleChange}
          placeholder="e.g. 30"
          required
        />
        <Field
          label="Origination Fees %"
          name="originationFeesPct"
          value={form.originationFeesPct}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 1.5"
        />
        <Field
          label="Doc Fees"
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
        <Field
          label="Underwriting Fees"
          name="underwritingFees"
          value={form.underwritingFees}
          onChange={handleChange}
          placeholder="e.g. $500"
        />
        <Field
          label="Rate Buy Down (%)"
          name="rateBuyDown"
          value={form.rateBuyDown}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. 1"
        />
        <label className="field deal-analyzer-output">
          <span>
            Rate Buy Down Amount{" "}
            <span className="deal-analyzer-auto-badge">auto</span>
          </span>
          <input
            value={rateBuyDownAmt > 0 ? fmt(rateBuyDownAmt) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        {lenderCosts > 0 && (
          <label className="field deal-analyzer-output deal-analyzer-output-red">
            <span>Total Lender Cost</span>
            <input value={fmt(lenderCosts)} readOnly tabIndex={-1} />
          </label>
        )}
        <label className="field deal-analyzer-output">
          <span>
            Monthly Mortgage{" "}
            <span className="deal-analyzer-auto-badge">auto</span>
          </span>
          <input
            value={loanMortgage > 0 ? fmt(loanMortgage) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
      </div>

      <AdditionalLenders
        lenders={lenders}
        setLenders={setLenders}
        onMutate={() => setSummary(null)}
      />

      <div className="deal-analyzer-section-label">
        Cash Needed to Buy Financing
      </div>
      <div className="deal-analyzer-form-grid">
        <Select
          label="Is Total Cash Needed to Buy a HELOC?"
          value={isCashNeededHeloc ? "Yes" : "No"}
          onChange={(e) => setIsCashNeededHeloc(e.target.value === "Yes")}
          options={["No", "Yes"]}
        />
        {isCashNeededHeloc && (
          <Field
            label="HELOC Interest Rate (% / year)"
            name="cashHelocRate"
            value={form.cashHelocRate}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. 8"
            required
          />
        )}
        {isCashNeededHeloc && cashHelocMonthlyPayment > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Monthly HELOC Payment (Interest-Only){" "}
              <span className="deal-analyzer-auto-badge">auto</span>
            </span>
            <input
              value={fmt(cashHelocMonthlyPayment)}
              readOnly
              tabIndex={-1}
            />
          </label>
        )}
      </div>

      <div className="deal-analyzer-section-label">Income &amp; Expenses</div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Estimated Monthly Rent"
          name="monthlyRent"
          value={form.monthlyRent}
          onChange={handleChange}
          placeholder="e.g. $1,800"
          required
        />
        <label className="field deal-analyzer-output deal-analyzer-inline-badge-output">
          <span>
            Property Management
            <span
              className="deal-analyzer-auto-badge"
              style={{ fontSize: "10px" }}
            >
              {PROP_MGMT_PCT}% (RENT)
            </span>
          </span>
          <input
            value={propMgmtFee > 0 ? fmt(propMgmtFee) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Yearly Home Insurance"
          name="yearlyInsurance"
          value={form.yearlyInsurance}
          onChange={handleChange}
          placeholder="e.g. $1,200"
        />
        <Field
          label="Yearly Property Taxes"
          name="yearlyTaxes"
          value={form.yearlyTaxes}
          onChange={handleChange}
          placeholder="e.g. $3,000"
        />
        <Field
          label="Annual Miscellaneous Expense"
          name="annualMiscExpense"
          value={form.annualMiscExpense}
          onChange={handleChange}
          placeholder="e.g. $1,200"
        />
        {monthlyMiscExpense > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Misc. Expense / Month{" "}
              <span className="deal-analyzer-auto-badge">÷ 12</span>
            </span>
            <input value={fmt(monthlyMiscExpense)} readOnly tabIndex={-1} />
          </label>
        )}
        <Field
          label="Monthly Home Warranty"
          name="monthlyHomeWarranty"
          value={form.monthlyHomeWarranty}
          onChange={handleChange}
          placeholder="e.g. $50"
        />
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

      {summary && <RentalDSCRSummary summary={summary} />}
    </section>
  );
}

export default RentalDSCRTab;
