import { Field } from "../../../../elements/elements";
import { fmt } from "../../../../../utils/utils";

export default function PurchaseSection({
  form,
  onChange,
  onBlur,
  agentCommissionAmt,
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
        <Field
          label="Closing Costs"
          name="closingCosts"
          value={form.closingCosts}
          onChange={onChange}
          placeholder="e.g. $6,000"
        />
      </div>
    </>
  );
}
