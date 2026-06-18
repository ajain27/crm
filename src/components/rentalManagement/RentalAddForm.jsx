import { Plus } from "lucide-react";
import { Field } from "../elements/elements";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import { TENANT_TYPES } from "./rentalUtils";

export default function RentalAddForm({
  form,
  onChange,
  onBlur,
  onSubmit,
  addressError,
  saving,
  isComplete,
}) {
  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "120ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>Add Rental Property</h2>
          <p>Property address and state are required.</p>
        </div>
      </div>

      <form className="add-form" onSubmit={onSubmit}>
        <Field
          label="Property Address"
          name="address"
          value={form.address}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="123 Main St"
          required
        />
        <Field
          label="City"
          name="city"
          value={form.city}
          onChange={onChange}
          placeholder="Austin"
        />
        <label className="field">
          <span>
            State <span className="required-marker">*</span>
          </span>
          <select name="state" value={form.state} onChange={onChange}>
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Purchase Date"
          name="purchaseDate"
          type="date"
          value={form.purchaseDate}
          onChange={onChange}
        />
        <label className="field">
          <span>Type of Tenant</span>
          <select name="tenantType" value={form.tenantType} onChange={onChange}>
            {TENANT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Tenant Name"
          name="tenantName"
          value={form.tenantName}
          onChange={onChange}
          placeholder="John Smith"
        />
        <Field
          label="Tenant Phone"
          name="tenantPhone"
          value={form.tenantPhone}
          onChange={onChange}
          placeholder="555-867-5309"
          maxLength={12}
        />
        <Field
          label="Tenant Email"
          name="tenantEmail"
          type="email"
          value={form.tenantEmail}
          onChange={onChange}
          placeholder="john@example.com"
        />
        <Field
          label="Monthly Rent"
          name="monthlyRent"
          value={form.monthlyRent}
          onChange={onChange}
          placeholder="$2,000"
          inputMode="numeric"
        />
        <Field
          label="Monthly Mortgage"
          name="monthlyMortgage"
          value={form.monthlyMortgage}
          onChange={onChange}
          placeholder="$1,200"
          inputMode="numeric"
        />
        <Field
          label="Rent Deposit Date"
          name="rentDepositDate"
          type="date"
          value={form.rentDepositDate}
          onChange={onChange}
        />
        <span className="rm-rent-deposit-hint">
          Rent accumulates automatically each month from this date.
        </span>
        <Field
          label="Property Management Company"
          name="pmCompanyName"
          value={form.pmCompanyName}
          onChange={onChange}
          placeholder="Acme Property Management"
        />
        <Field
          label="PM Agent Name"
          name="pmAgentName"
          value={form.pmAgentName}
          onChange={onChange}
          placeholder="Jane Doe"
        />
        <Field
          label="PM Contact Phone"
          name="pmContactPhone"
          value={form.pmContactPhone}
          onChange={onChange}
          placeholder="555-867-5309"
          maxLength={12}
        />
        <Field
          label="PM Contact Email"
          name="pmContactEmail"
          type="email"
          value={form.pmContactEmail}
          onChange={onChange}
          placeholder="manager@acmepm.com"
        />

        {addressError && (
          <span className="field-error rm-address-error">{addressError}</span>
        )}

        <div className="rm-submit-row">
          <button
            className="primary-btn"
            type="submit"
            disabled={!isComplete(form) || !!addressError || saving}
          >
            <Plus size={14} />
            {saving ? "Saving…" : "Add Property"}
          </button>
        </div>
      </form>
    </section>
  );
}
