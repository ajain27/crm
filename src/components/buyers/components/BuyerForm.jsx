import { Field } from "../../elements/elements";
import { formatPhone } from "../../../utils/utils";

function BuyerForm({ addBuyer, form, handleChange }) {
  function handlePhoneChange(e) {
    handleChange({
      target: { name: "phone", value: formatPhone(e.target.value) },
    });
  }
  const isFormComplete =
    Boolean(form.fullName?.trim()) &&
    Boolean(form.email?.trim()) &&
    Boolean(form.state?.trim());

  return (
    <section
      className="panel"
      id="add-buyer"
      data-reveal="left"
      style={{ "--reveal-delay": "120ms" }}
    >
      <div>
        <div className="panel-header">
          <div>
            <h2>Add Buyer</h2>
            <p>Maintain your list of cash buyers and investors.</p>
          </div>
        </div>
        <form className="add-form" onSubmit={addBuyer}>
          <Field
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Field
            label="Phone Number"
            name="phone"
            value={form.phone}
            onChange={handlePhoneChange}
            maxLength="12"
          />
          <Field
            label="City (They buy in)"
            name="city"
            value={form.city}
            onChange={handleChange}
          />
          <Field
            label="State (They buy in)"
            name="state"
            value={form.state}
            onChange={handleChange}
            maxLength="2"
            required
          />
          <button
            className="primary-btn form-btn"
            type="submit"
            disabled={!isFormComplete}
          >
            Save Buyer
          </button>
        </form>
      </div>
    </section>
  );
}

export default BuyerForm;
