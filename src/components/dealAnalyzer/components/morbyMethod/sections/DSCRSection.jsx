import { Field } from "../../../../elements/elements";
import { fmt } from "../../../../../utils/utils";

export default function DSCRSection({
  form,
  onChange,
  onBlur,
  dscrLoanAmount,
  downPaymentRequired,
  dscrMonthlyPayment,
  dscrMiscFees,
  downPct,
  dscrLtv,
  onDownPctChange,
  downOptions,
}) {
  const ltvPct = Math.round(dscrLtv * 100);
  return (
    <>
      <div className="deal-analyzer-section-label">
        DSCR First Lien{" "}
        <span className="deal-analyzer-auto-badge">{ltvPct}% LTV</span>
      </div>
      <div className="deal-analyzer-form-grid">
        <div className="field">
          <span>Down Payment %</span>
          <select
            value={downPct}
            onChange={(e) => onDownPctChange(Number(e.target.value))}
            className="leads-select"
          >
            {downOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}%
              </option>
            ))}
          </select>
        </div>
        <label className="field deal-analyzer-output">
          <span>
            Loan Amount{" "}
            <span className="deal-analyzer-auto-badge">{ltvPct}% of price</span>
          </span>
          <input
            value={dscrLoanAmount > 0 ? fmt(dscrLoanAmount) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <label className="field deal-analyzer-output">
          <span>
            Down Payment Required{" "}
            <span className="deal-analyzer-auto-badge">{downPct}%</span>
          </span>
          <input
            value={downPaymentRequired > 0 ? fmt(downPaymentRequired) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Extra Down Payment"
          name="extraDownPayment"
          value={form.extraDownPayment}
          onChange={onChange}
          placeholder="e.g. $10,000"
        />
        <Field
          label="Interest Rate (% / year)"
          name="dscrRate"
          value={form.dscrRate}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. 7.5"
          required
        />
        <Field
          label="Loan Term (Years)"
          name="dscrTermYears"
          value={form.dscrTermYears}
          onChange={onChange}
          placeholder="e.g. 30"
          required
        />
        <Field
          label="Points (%)"
          name="dscrPoints"
          value={form.dscrPoints}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. 2"
        />
        <Field
          label="Origination Fees %"
          name="originationFeesPct"
          value={form.originationFeesPct}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. 1.5"
        />
        <Field
          label="Doc Fees"
          name="legalFees"
          value={form.legalFees}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. $500"
        />
        <Field
          label="Appraisal Fees"
          name="appraisalFees"
          value={form.appraisalFees}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. $500"
        />
        <Field
          label="Underwriting Fees"
          name="underwritingFees"
          value={form.underwritingFees}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. $500"
        />
        {dscrMiscFees > 0 && (
          <label className="field deal-analyzer-output deal-analyzer-output-red">
            <span>Total Lender Cost</span>
            <input value={fmt(dscrMiscFees)} readOnly tabIndex={-1} />
          </label>
        )}
        <label className="field deal-analyzer-output">
          <span>
            Monthly Payment{" "}
            <span className="deal-analyzer-auto-badge">auto</span>
          </span>
          <input
            value={dscrMonthlyPayment > 0 ? fmt(dscrMonthlyPayment) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
      </div>
    </>
  );
}
