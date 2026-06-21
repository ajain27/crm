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
          <Field
            label="Property Management Company"
            name="pmCompanyName"
            value={editForm.pmCompanyName}
            onChange={onChange}
            placeholder="Acme Property Management"
          />
          <Field
            label="PM Agent Name"
            name="pmAgentName"
            value={editForm.pmAgentName}
            onChange={onChange}
            placeholder="Jane Doe"
          />
          <Field
            label="PM Contact Phone"
            name="pmContactPhone"
            value={editForm.pmContactPhone}
            onChange={onChange}
            placeholder="555-867-5309"
            maxLength={12}
          />
          <Field
            label="PM Contact Email"
            name="pmContactEmail"
            type="email"
            value={editForm.pmContactEmail}
            onChange={onChange}
            placeholder="manager@acmepm.com"
          />
          <label className="field">
            <span>Appliance Insurance</span>
            <select
              name="hasApplianceInsurance"
              value={editForm.hasApplianceInsurance}
              onChange={onChange}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </label>
          {editForm.hasApplianceInsurance === "Yes" && (
            <>
              <Field
                label="Insurance Company"
                name="applianceInsuranceCompany"
                value={editForm.applianceInsuranceCompany}
                onChange={onChange}
                placeholder="Acme Home Warranty"
              />
              <Field
                label="Term (years)"
                name="applianceInsuranceTermYears"
                value={editForm.applianceInsuranceTermYears}
                onChange={onChange}
                placeholder="2"
                inputMode="numeric"
              />
              <Field
                label="Price Paid"
                name="applianceInsurancePricePaid"
                value={editForm.applianceInsurancePricePaid}
                onChange={onChange}
                placeholder="$500"
                inputMode="numeric"
              />
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
