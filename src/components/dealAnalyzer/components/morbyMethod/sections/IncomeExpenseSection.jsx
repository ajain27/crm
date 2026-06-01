import { Field } from "../../../../elements/elements";
import { fmt } from "../../../../../utils/utils";
import { PROP_MGMT_PCT } from "../morbyMethodConfig";

export default function IncomeExpenseSection({
  form,
  onChange,
  propMgmtFee,
  annualMiscExpense,
  monthlyMiscExpense,
}) {
  return (
    <>
      <div className="deal-analyzer-section-label">Income &amp; Expenses</div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Estimated Monthly Rent"
          name="monthlyRent"
          value={form.monthlyRent}
          onChange={onChange}
          placeholder="e.g. $2,500"
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
          onChange={onChange}
          placeholder="e.g. $1,800"
        />
        <Field
          label="Yearly Property Taxes"
          name="yearlyTaxes"
          value={form.yearlyTaxes}
          onChange={onChange}
          placeholder="e.g. $3,600"
        />
        <Field
          label="Annual Miscellaneous Expense"
          name="annualMiscExpense"
          value={form.annualMiscExpense}
          onChange={onChange}
          placeholder="e.g. $1,200"
        />
        {annualMiscExpense > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Misc. Expense / Month{" "}
              <span className="deal-analyzer-auto-badge">÷ 12</span>
            </span>
            <input value={fmt(monthlyMiscExpense)} readOnly tabIndex={-1} />
          </label>
        )}
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
    </>
  );
}
