import Modal from "../modal/Modal";
import { Field } from "../elements/elements";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import TenantFormSection from "./TenantFormSection";

export default function RentalEditModal({
  isOpen,
  editingRental,
  editForm,
  editSaving,
  onChange,
  onAddTenant,
  onRemoveTenant,
  onClose,
  onSave,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRental?.address || "Edit Rental Property"}
      style={{ maxWidth: 900 }}
      actions={
        <>
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={onSave}
            disabled={
              editSaving ||
              !editForm?.address?.trim() ||
              !editForm?.state?.trim()
            }
          >
            {editSaving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {editForm && (
        <div className="rm-modal-body">
          <Field
            label="Property Address"
            name="address"
            value={editForm.address}
            onChange={onChange}
            placeholder="123 Main St"
          />
          <Field
            label="City"
            name="city"
            value={editForm.city}
            onChange={onChange}
            placeholder="Austin"
          />
          <label className="field">
            <span>State</span>
            <select name="state" value={editForm.state} onChange={onChange}>
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
            value={editForm.purchaseDate}
            onChange={onChange}
          />
          <TenantFormSection
            tenants={editForm.tenants}
            onChange={onChange}
            onAddTenant={onAddTenant}
            onRemoveTenant={onRemoveTenant}
            isEditMode={true}
          />
          <Field
            label="Monthly Rent"
            name="monthlyRent"
            value={editForm.monthlyRent}
            onChange={onChange}
            placeholder="$2,000"
            inputMode="numeric"
          />
          <Field
            label="Monthly Mortgage"
            name="monthlyMortgage"
            value={editForm.monthlyMortgage}
            onChange={onChange}
            placeholder="$1,200"
            inputMode="numeric"
          />
        </div>
      )}
    </Modal>
  );
}
