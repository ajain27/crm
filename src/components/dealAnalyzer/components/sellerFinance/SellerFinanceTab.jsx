import { useState } from "react";
import { Field } from "../../../elements/elements";

const initialSellerFinanceForm = {
  purchasePrice: "",
  principalAmount: "",
  interest: "",
  termYears: "",
  insurance: "",
  estimatedRent: "",
  address: "",
  city: "",
  zip: "",
  state: "",
};

function SellerFinanceTab({ tab }) {
  const [form, setForm] = useState(initialSellerFinanceForm);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
              Capture the deal terms and neighborhood rent assumptions for this
              owner-finance scenario.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-form-grid">
          <Field
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
          />
          <Field
            label="Principal Amount"
            name="principalAmount"
            value={form.principalAmount}
            onChange={handleChange}
          />
          <Field
            label="Interest"
            name="interest"
            value={form.interest}
            onChange={handleChange}
          />
          <Field
            label="Term in Years"
            name="termYears"
            value={form.termYears}
            onChange={handleChange}
          />
          <Field
            label="Insurance"
            name="insurance"
            value={form.insurance}
            onChange={handleChange}
          />
          <Field
            label="Estimated Rent in the Area"
            name="estimatedRent"
            value={form.estimatedRent}
            onChange={handleChange}
          />
          <Field
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            wrapperClassName="deal-analyzer-address"
          />
          <Field
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
          />
          <Field label="Zip" name="zip" value={form.zip} onChange={handleChange} />
          <Field
            label="State"
            name="state"
            value={form.state}
            onChange={handleChange}
          />
        </div>
        <div className="deal-analyzer-actions">
          <button className="primary-btn form-btn" type="button">
            Calculate
          </button>
        </div>
      </section>
    </>
  );
}

export default SellerFinanceTab;
