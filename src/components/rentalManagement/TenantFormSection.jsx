import { useState } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Field } from "../elements/elements";
import { TENANT_TYPES } from "./rentalUtils";
import { formatPhone, fmtCurrencyInput } from "../../utils/utils";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function emptyDraft() {
  return {
    name: "",
    phone: "",
    email: "",
    type: "Regular",
    monthlyRent: "",
    leaseStartDate: "",
    leaseEndDate: "",
  };
}

function TenantRecord({ tenant, current, onEdit, onRemove }) {
  return (
    <div
      className={`rm-tenant-record${current ? " rm-tenant-record--current" : ""}`}
    >
      <div className="rm-record-header">
        <div className="rm-record-name">
          {tenant.name || "—"}
          {current && <span className="rm-current-badge">Current</span>}
        </div>
        <div className="rm-record-actions">
          {onEdit && (
            <button
              type="button"
              className="rm-edit-tenant-btn"
              onClick={onEdit}
              title="Edit tenant"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            type="button"
            className="rm-remove-tenant-btn"
            onClick={onRemove}
            title="Remove tenant"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="rm-record-details">
        <div className="rm-record-detail">
          <span className="rm-detail-label">Phone:</span>
          <span className="rm-detail-value">{tenant.phone || "—"}</span>
        </div>
        <div className="rm-record-detail">
          <span className="rm-detail-label">Email:</span>
          <span className="rm-detail-value">{tenant.email || "—"}</span>
        </div>
        <div className="rm-record-detail">
          <span className="rm-detail-label">Type:</span>
          <span className="rm-detail-value">{tenant.type || "Regular"}</span>
        </div>
        <div className="rm-record-detail">
          <span className="rm-detail-label">Monthly Rent:</span>
          <span className="rm-detail-value">{tenant.monthlyRent || "—"}</span>
        </div>
        <div className="rm-record-detail">
          <span className="rm-detail-label">Lease:</span>
          <span className="rm-detail-value">
            {formatDate(tenant.leaseStartDate)} to{" "}
            {formatDate(tenant.leaseEndDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TenantFormSection({
  tenants,
  onChange,
  onRemoveTenant,
  onAddTenant,
  isEditMode = false,
}) {
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [draft, setDraft] = useState(null);
  const currentTenant = tenants.find((t) => t.isCurrent);
  const previousTenants = tenants
    .filter((t) => !t.isCurrent)
    .sort(
      (a, b) =>
        new Date(b.leaseEndDate || "").getTime() -
        new Date(a.leaseEndDate || "").getTime(),
    );

  function handleDraftChange(e) {
    const { name, value } = e.target;
    setDraft((prev) => {
      if (name === "phone") return { ...prev, phone: formatPhone(value) };
      if (name === "monthlyRent")
        return { ...prev, monthlyRent: fmtCurrencyInput(value) };
      return { ...prev, [name]: value };
    });
  }

  function handleDraftSave() {
    if (!draft.name.trim()) return;
    onAddTenant(draft);
    setDraft(null);
  }

  const isBusy = isEditingCurrent || !!draft;

  return (
    <div className="rm-tenants-section">
      <div className="rm-tenants-header">
        <span className="rm-tenants-label">Tenants</span>
        {onAddTenant && !isBusy && (
          <button
            type="button"
            className="rm-add-tenant-btn"
            onClick={() => setDraft(emptyDraft())}
          >
            <Plus size={14} />
            Add Tenant
          </button>
        )}
      </div>

      {currentTenant && !isEditingCurrent && (
        <TenantRecord
          tenant={currentTenant}
          current
          onEdit={draft ? undefined : () => setIsEditingCurrent(true)}
          onRemove={() => onRemoveTenant(currentTenant.id)}
        />
      )}

      {/* Current tenant (editable form, in place) */}
      {currentTenant && isEditingCurrent && (
        <div key={currentTenant.id} className="rm-tenant-card">
          <div className="rm-tenant-card-header">
            <span className="rm-tenant-index">Current Tenant</span>
            <div className="rm-record-actions">
              <button
                type="button"
                className="rm-edit-tenant-btn"
                onClick={() => setIsEditingCurrent(false)}
                title="Done editing"
              >
                <Check size={14} />
              </button>
              {tenants.length > 1 && (
                <button
                  type="button"
                  className="rm-remove-tenant-btn"
                  onClick={() => onRemoveTenant(currentTenant.id)}
                  title="Remove tenant"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          <Field
            label="Tenant Name"
            name="name"
            value={currentTenant.name}
            onChange={onChange}
            placeholder="John Smith"
            data-tenant-id={currentTenant.id}
          />
          <Field
            label="Tenant Phone"
            name="phone"
            value={currentTenant.phone}
            onChange={onChange}
            placeholder="555-867-5309"
            maxLength={12}
            data-tenant-id={currentTenant.id}
          />
          <Field
            label="Tenant Email"
            name="email"
            type="email"
            value={currentTenant.email}
            onChange={onChange}
            placeholder="john@example.com"
            data-tenant-id={currentTenant.id}
          />
          <label className="field">
            <span>Type</span>
            <select
              name="type"
              value={currentTenant.type}
              onChange={onChange}
              data-tenant-id={currentTenant.id}
            >
              {TENANT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Monthly Rent"
            name="monthlyRent"
            value={currentTenant.monthlyRent}
            onChange={onChange}
            placeholder="$1,500"
            inputMode="numeric"
            data-tenant-id={currentTenant.id}
          />
          <Field
            label="Lease Start Date"
            name="leaseStartDate"
            type="date"
            value={currentTenant.leaseStartDate}
            onChange={onChange}
            data-tenant-id={currentTenant.id}
          />
          <Field
            label="Lease End Date"
            name="leaseEndDate"
            type="date"
            value={currentTenant.leaseEndDate}
            onChange={onChange}
            data-tenant-id={currentTenant.id}
          />
        </div>
      )}

      {/* New tenant draft — not committed until saved */}
      {draft && (
        <div className="rm-tenant-card">
          <div className="rm-tenant-card-header">
            <span className="rm-tenant-index">New Tenant</span>
            <div className="rm-record-actions">
              <button
                type="button"
                className="rm-edit-tenant-btn"
                onClick={handleDraftSave}
                disabled={!draft.name.trim()}
                title="Save tenant"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                className="rm-remove-tenant-btn"
                onClick={() => setDraft(null)}
                title="Discard"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <Field
            label="Tenant Name"
            name="name"
            value={draft.name}
            onChange={handleDraftChange}
            placeholder="John Smith"
            required
          />
          <Field
            label="Tenant Phone"
            name="phone"
            value={draft.phone}
            onChange={handleDraftChange}
            placeholder="555-867-5309"
            maxLength={12}
          />
          <Field
            label="Tenant Email"
            name="email"
            type="email"
            value={draft.email}
            onChange={handleDraftChange}
            placeholder="john@example.com"
          />
          <label className="field">
            <span>Type</span>
            <select name="type" value={draft.type} onChange={handleDraftChange}>
              {TENANT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Monthly Rent"
            name="monthlyRent"
            value={draft.monthlyRent}
            onChange={handleDraftChange}
            placeholder="$1,500"
            inputMode="numeric"
          />
          <Field
            label="Lease Start Date"
            name="leaseStartDate"
            type="date"
            value={draft.leaseStartDate}
            onChange={handleDraftChange}
          />
          <Field
            label="Lease End Date"
            name="leaseEndDate"
            type="date"
            value={draft.leaseEndDate}
            onChange={handleDraftChange}
          />
        </div>
      )}

      {/* Previous tenants (read-only records) */}
      {previousTenants.length > 0 && (
        <div className="rm-previous-tenants">
          <div className="rm-previous-tenants-label">Previous Tenants</div>
          {previousTenants.map((tenant) => (
            <TenantRecord
              key={tenant.id}
              tenant={tenant}
              onRemove={() => onRemoveTenant(tenant.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
