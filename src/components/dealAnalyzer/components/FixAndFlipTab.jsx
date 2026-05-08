import { useState } from "react";
import { Field } from "../../elements/elements";

const initialFixAndFlipForm = {
  address: "",
  city: "",
  state: "",
  zip: "",
  purchasePrice: "",
  rehabCost: "",
  timeToRehab: "",
  hardMoneyLoanInterest: "",
  profitToMake: "",
};

function FixAndFlipTab({ tab }) {
  const [form, setForm] = useState(initialFixAndFlipForm);

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
            <h2>Fix N Flip Inputs</h2>
            <p>
              Enter the core acquisition, construction, and financing
              assumptions for this project.
            </p>
          </div>
        </div>

        <div className="deal-analyzer-form-grid">
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
          <Field
            label="State"
            name="state"
            value={form.state}
            onChange={handleChange}
          />
          <Field
            label="Zip"
            name="zip"
            value={form.zip}
            onChange={handleChange}
          />
          <Field
            label="Purchase Price"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
          />
          <Field
            label="Time to Rehab"
            name="timeToRehab"
            value={form.timeToRehab}
            onChange={handleChange}
          />
          <Field
            label="Hard Money Loan Interest"
            name="hardMoneyLoanInterest"
            value={form.hardMoneyLoanInterest}
            onChange={handleChange}
          />
          <Field
            label="Profit to Make"
            name="profitToMake"
            value={form.profitToMake}
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

export default FixAndFlipTab;
