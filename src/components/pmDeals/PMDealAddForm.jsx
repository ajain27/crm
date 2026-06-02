import { Plus } from "lucide-react";

export default function PMDealAddForm({
  form,
  onChange,
  onBlur,
  onSubmit,
  saving,
  isFormComplete,
}) {
  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "80ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>Add PML Deal</h2>
          <p>
            Payout = principal + flat interest. Late fee is $100/weekday after
            the due date.
          </p>
        </div>
      </div>

      <form className="add-form pm-deals-form" onSubmit={onSubmit}>
        <div className="field">
          <span>
            Property Address <span className="required-star">*</span>
          </span>
          <input
            name="propertyAddress"
            value={form.propertyAddress}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="123 Main St, Austin, TX"
            required
          />
        </div>

        <div className="field">
          <span>Borrower Company</span>
          <input
            name="borrowerCompany"
            value={form.borrowerCompany}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Acme LLC"
          />
        </div>

        <div className="field">
          <span>Borrower Name</span>
          <input
            name="borrowerName"
            value={form.borrowerName}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="John Smith"
          />
        </div>

        <div className="field">
          <span>
            Amount Lent <span className="required-star">*</span>
          </span>
          <input
            name="amountLent"
            value={form.amountLent}
            onChange={onChange}
            placeholder="$100,000"
            required
          />
        </div>

        <div className="field">
          <span>
            Interest Rate <span className="required-star">*</span>
          </span>
          <input
            name="interestRate"
            value={form.interestRate}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="e.g. 22.5%"
            required
          />
        </div>

        <div className="field">
          <span>
            Months <span className="required-star">*</span>
          </span>
          <input
            name="months"
            value={form.months}
            onChange={onChange}
            inputMode="numeric"
            placeholder="e.g. 12"
            required
          />
        </div>

        <div className="field">
          <span>
            Lend Date <span className="required-star">*</span>
          </span>
          <input
            type="date"
            name="lendDate"
            value={form.lendDate}
            onChange={onChange}
            required
          />
        </div>

        <button
          className="primary-btn form-btn"
          type="submit"
          disabled={!isFormComplete || saving}
        >
          <Plus size={14} />
          {saving ? "Saving…" : "Add Deal"}
        </button>
      </form>
    </section>
  );
}
