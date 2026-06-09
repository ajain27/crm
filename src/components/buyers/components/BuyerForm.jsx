import { Field } from "../../elements/elements";
import { formatPhone } from "../../../utils/utils";
import { STATE_OPTIONS } from "../../../constants/stateOptions";

function BuyerForm({
  addBuyer,
  form,
  handleChange,
  onCancel,
  propertyTypes = [],
}) {
  function handlePhoneChange(e) {
    handleChange({
      target: { name: "phone", value: formatPhone(e.target.value) },
    });
  }

  function handleTypeToggle(type) {
    const current = Array.isArray(form.realEstateType)
      ? form.realEstateType
      : [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    handleChange({ target: { name: "realEstateType", value: next } });
  }

  const isFormComplete =
    Boolean(form.fullName?.trim()) && Boolean(form.state?.trim());

  const selected = Array.isArray(form.realEstateType)
    ? form.realEstateType
    : [];

  return (
    <section
      className="panel"
      id="add-buyer"
      data-reveal="left"
      style={{ "--reveal-delay": "120ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>Add Buyer</h2>
          <p>Maintain your list of cash buyers and investors.</p>
        </div>
      </div>

      <form className="add-form buyer-add-form" onSubmit={addBuyer}>
        {/* Row 1 – Full Name (full width) */}
        <Field
          label="Full Name"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          placeholder="John Smith"
          required
        />

        {/* Row 2 – Email | Phone */}
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="john@example.com"
        />
        <Field
          label="Phone Number"
          name="phone"
          value={form.phone}
          onChange={handlePhoneChange}
          placeholder="555-867-5309"
          maxLength="12"
        />

        {/* Row 3 – City | State */}
        <Field
          label="City (They buy in)"
          name="city"
          value={form.city}
          onChange={handleChange}
          placeholder="Austin"
        />
        <label className="field">
          <span>
            State <span className="required-marker">*</span>
          </span>
          <select
            name="state"
            value={form.state}
            onChange={handleChange}
            required
          >
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Row 4 – Buys (full width) */}
        <div className="field buyer-buys-field">
          <span>Property Types They Buy</span>
          <div className="buyer-type-checkboxes">
            {propertyTypes.map((type) => (
              <label
                key={type}
                className={`buyer-type-pill${selected.includes(type) ? " buyer-type-pill--active" : ""}`}
              >
                <input
                  type="checkbox"
                  className="buyer-checkbox"
                  checked={selected.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Row 5 – Notes (full width) */}
        <Field
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Add any notes about this buyer..."
          textarea
        />

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className="secondary-btn form-btn"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="primary-btn form-btn"
            type="submit"
            disabled={!isFormComplete}
          >
            Save Buyer
          </button>
        </div>
      </form>
    </section>
  );
}

export default BuyerForm;
