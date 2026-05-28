import Modal from "../modal/Modal";

export default function PMDealEditModal({
  editingDeal,
  editForm,
  editSaving,
  onClose,
  onSave,
  onChange,
  onBlur,
}) {
  return (
    <Modal
      isOpen={!!editingDeal}
      onClose={onClose}
      title="Edit PM Deal"
      style={{ maxWidth: 640 }}
      actions={
        <>
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={onSave}
            disabled={editSaving}
          >
            {editSaving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {editForm && (
        <form
          className="add-form pm-deals-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="field">
            <span>Property Address</span>
            <input
              name="propertyAddress"
              value={editForm.propertyAddress}
              onChange={onChange}
              placeholder="123 Main St, Austin, TX"
            />
          </div>
          <div className="field">
            <span>Borrower Name</span>
            <input
              name="borrowerName"
              value={editForm.borrowerName}
              onChange={onChange}
              placeholder="John Smith"
            />
          </div>
          <div className="field">
            <span>Borrower Company</span>
            <input
              name="borrowerCompany"
              value={editForm.borrowerCompany}
              onChange={onChange}
              placeholder="Acme LLC"
            />
          </div>
          <div className="field">
            <span>Amount Lent</span>
            <input
              name="amountLent"
              value={editForm.amountLent}
              onChange={onChange}
              placeholder="$100,000"
            />
          </div>
          <div className="field">
            <span>Interest Rate</span>
            <input
              name="interestRate"
              value={editForm.interestRate}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="e.g. 22.5%"
            />
          </div>
          <div className="field">
            <span>Months</span>
            <input
              name="months"
              value={editForm.months}
              onChange={onChange}
              inputMode="numeric"
              placeholder="e.g. 12"
            />
          </div>
          <div className="field">
            <span>Lend Date</span>
            <input
              type="date"
              name="lendDate"
              value={editForm.lendDate}
              onChange={onChange}
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
