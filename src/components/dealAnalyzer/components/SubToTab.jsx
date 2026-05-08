import { useState } from "react";
import { Field } from "../../elements/elements";

const initialSubToForm = {
  purchasePrice: "",
  entryFee: "",
  rehabCost: "",
  mortgageBalance: "",
  interest: "",
  principal: "",
  insurance: "",
  termYears: "",
  rentEstimate: "",
};

function SubToTab({ tab }) {
  const [form, setForm] = useState(initialSubToForm);

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
            <h2>Sub-To Inputs</h2>
            <p>
              Enter the core loan and carry assumptions to evaluate a
              subject-to deal structure.
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
            label="Entry Fee"
            name="entryFee"
            value={form.entryFee}
            onChange={handleChange}
          />
          <Field
            label="Rehab Cost"
            name="rehabCost"
            value={form.rehabCost}
            onChange={handleChange}
          />
          <Field
            label="Mortgage Balance"
            name="mortgageBalance"
            value={form.mortgageBalance}
            onChange={handleChange}
          />
          <Field
            label="Interest"
            name="interest"
            value={form.interest}
            onChange={handleChange}
          />
          <Field
            label="Principal"
            name="principal"
            value={form.principal}
            onChange={handleChange}
          />
          <Field
            label="Insurance"
            name="insurance"
            value={form.insurance}
            onChange={handleChange}
          />
          <Field
            label="Term in Years"
            name="termYears"
            value={form.termYears}
            onChange={handleChange}
          />
          <Field
            label="Rent Estimate"
            name="rentEstimate"
            value={form.rentEstimate}
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

export default SubToTab;
