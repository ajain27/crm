import { useState, useEffect } from "react";
import { Pencil, Check } from "lucide-react";
import Modal from "../modal/Modal";
import { Field } from "../elements/elements";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import { currency } from "../../utils/utils";
import TenantFormSection from "./TenantFormSection";

function formatAddress(form) {
  if (!form) return "";
  const cityState = [
    form.city,
    [form.state, form.zipCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [form.address, cityState].filter(Boolean).join(", ");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function ReadOnlyField({ label, value, wide }) {
  return (
    <div className={`rm-record-detail${wide ? " rm-detail-wide" : ""}`}>
      <span className="rm-detail-label">{label}:</span>
      <span className="rm-detail-value">{value || "—"}</span>
    </div>
  );
}

function EditableSection({
  title,
  isEditing,
  onToggleEdit,
  summary,
  children,
}) {
  return (
    <div className="rm-edit-section">
      <div className="rm-edit-section-label-row">
        <div className="rm-edit-section-label">{title}</div>
        <button
          type="button"
          className="rm-edit-tenant-btn"
          onClick={onToggleEdit}
          title={isEditing ? "Done editing" : "Edit"}
        >
          {isEditing ? <Check size={14} /> : <Pencil size={14} />}
        </button>
      </div>
      {isEditing ? (
        <div className="rm-edit-grid">{children}</div>
      ) : (
        <div className="rm-readonly-card">
          <div className="rm-record-details">{summary}</div>
        </div>
      )}
    </div>
  );
}

export default function RentalEditModal({
  isOpen,
  editingRental,
  editForm,
  editSaving,
  cashflow,
  accumulatedRent,
  onChange,
  onRemoveTenant,
  onAddTenant,
  onClose,
  onSave,
  onDelete,
}) {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [isEditingPM, setIsEditingPM] = useState(false);
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);

  // RentalEditModal stays mounted between opens (only the inner <Modal>
  // conditionally renders), so these toggles must be reset explicitly —
  // otherwise re-opening the modal resumes whichever section was being
  // edited when it was last closed.
  useEffect(() => {
    setIsEditingAddress(false);
    setIsEditingFinancials(false);
    setIsEditingPM(false);
    setIsEditingInsurance(false);
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="rm-title-row">
          {isEditingAddress && editForm ? (
            <div className="rm-title-edit-fields">
              <input
                className="rm-title-input rm-title-input-address"
                name="address"
                value={editForm.address}
                onChange={onChange}
                placeholder="Street address"
              />
              <input
                className="rm-title-input"
                name="city"
                value={editForm.city}
                onChange={onChange}
                placeholder="City"
              />
              <select
                className="rm-title-input"
                name="state"
                value={editForm.state}
                onChange={onChange}
              >
                <option value="">State</option>
                {STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                className="rm-title-input rm-title-input-zip"
                name="zipCode"
                value={editForm.zipCode || ""}
                onChange={onChange}
                placeholder="Zip"
              />
            </div>
          ) : (
            <span className="rm-title-address">
              {editForm
                ? formatAddress(editForm) || "Edit Rental Property"
                : editingRental?.address || "Edit Rental Property"}
            </span>
          )}
          {editForm && (
            <button
              type="button"
              className="rm-edit-tenant-btn rm-title-edit-btn"
              onClick={() => setIsEditingAddress((v) => !v)}
              title={isEditingAddress ? "Done editing" : "Edit address"}
            >
              {isEditingAddress ? <Check size={14} /> : <Pencil size={14} />}
            </button>
          )}
          {!isEditingAddress && editForm?.purchaseDate && (
            <span className="rm-title-purchased">
              Purchased on {formatDate(editForm.purchaseDate)}
            </span>
          )}
        </div>
      }
      className="rental-edit-modal"
      style={{ maxWidth: 900, width: "min(900px, 96vw)" }}
      actions={
        <>
          <button
            className="danger-btn rm-delete-property-btn"
            onClick={onDelete}
          >
            Delete Property
          </button>
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
          <TenantFormSection
            tenants={editForm.tenants}
            onChange={onChange}
            onRemoveTenant={onRemoveTenant}
            onAddTenant={onAddTenant}
            isEditMode={true}
          />

          <EditableSection
            title="Financials"
            isEditing={isEditingFinancials}
            onToggleEdit={() => setIsEditingFinancials((v) => !v)}
            summary={
              <>
                <ReadOnlyField
                  label="Monthly Rent"
                  value={editForm.monthlyRent}
                />
                <ReadOnlyField
                  label="Monthly Mortgage"
                  value={editForm.monthlyMortgage}
                />
                <ReadOnlyField label="Cashflow" value={currency(cashflow)} />
                <ReadOnlyField
                  label="Accumulated Rent"
                  value={currency(accumulatedRent)}
                />
              </>
            }
          >
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
            <label className="field">
              <span>Cashflow</span>
              <span className="readonly-input">{currency(cashflow)}</span>
            </label>
            <label className="field">
              <span>Accumulated Rent</span>
              <span className="readonly-input">
                {currency(accumulatedRent)}
              </span>
            </label>
          </EditableSection>

          <EditableSection
            title="Property Management"
            isEditing={isEditingPM}
            onToggleEdit={() => setIsEditingPM((v) => !v)}
            summary={
              <>
                <ReadOnlyField label="Company" value={editForm.pmCompanyName} />
                <ReadOnlyField
                  label="Agent Name"
                  value={editForm.pmAgentName}
                />
                <ReadOnlyField
                  label="Contact Phone"
                  value={editForm.pmContactPhone}
                />
                <ReadOnlyField
                  label="Contact Email"
                  value={editForm.pmContactEmail}
                />
              </>
            }
          >
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
          </EditableSection>

          <EditableSection
            title="Appliance Insurance"
            isEditing={isEditingInsurance}
            onToggleEdit={() => setIsEditingInsurance((v) => !v)}
            summary={
              <>
                <ReadOnlyField
                  label="Insured"
                  value={editForm.hasApplianceInsurance}
                />
                {editForm.hasApplianceInsurance === "Yes" && (
                  <>
                    <ReadOnlyField
                      label="Insurance Company"
                      value={editForm.applianceInsuranceCompany}
                    />
                    <ReadOnlyField
                      label="Term (years)"
                      value={editForm.applianceInsuranceTermYears}
                    />
                    <ReadOnlyField
                      label="Price Paid"
                      value={editForm.applianceInsurancePricePaid}
                    />
                  </>
                )}
              </>
            }
          >
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
          </EditableSection>
        </div>
      )}
    </Modal>
  );
}
