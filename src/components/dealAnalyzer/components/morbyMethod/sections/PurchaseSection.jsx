import { Field } from "../../../../elements/elements";
import { fmt } from "../../../../../utils/utils";
import { CLOSING_COSTS_PCT } from "../morbyMethodConfig";

export default function PurchaseSection({
  form,
  onChange,
  onBlur,
  agentCommissionAmt,
  closingCosts,
  titleFees,
}) {
  return (
    <>
      <div className="deal-analyzer-section-label">
        Purchase &amp; Acquisition
      </div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Purchase Price"
          name="purchasePrice"
          value={form.purchasePrice}
          onChange={onChange}
          placeholder="e.g. $300,000"
          required
        />
        <Field
          label="Agent Commission (%)"
          name="agentCommission"
          value={form.agentCommission}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. 3"
        />
        {agentCommissionAmt > 0 && (
          <label className="field deal-analyzer-output">
            <span>Agent Commission Amount</span>
            <input value={fmt(agentCommissionAmt)} readOnly tabIndex={-1} />
          </label>
        )}
        <label className="field deal-analyzer-output">
          <span>
            Closing Costs{" "}
            <span className="deal-analyzer-auto-badge">
              {CLOSING_COSTS_PCT}% of price
            </span>
          </span>
          <input
            value={closingCosts > 0 ? fmt(closingCosts) : ""}
            readOnly
            tabIndex={-1}
          />
        </label>
        <Field
          label="Title Fees (%)"
          name="titleFees"
          value={form.titleFees}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. 1"
        />
        {titleFees > 0 && (
          <label className="field deal-analyzer-output">
            <span>Title Fees Amount</span>
            <input value={fmt(titleFees)} readOnly tabIndex={-1} />
          </label>
        )}
      </div>
    </>
  );
}
