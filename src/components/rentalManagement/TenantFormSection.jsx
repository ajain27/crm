import { Trash2 } from "lucide-react";
import { Field } from "../elements/elements";
import { TENANT_TYPES } from "./rentalUtils";

export default function TenantFormSection({
  tenants,
  onChange,
  onRemoveTenant,
  isEditMode = false,
}) {
  const currentTenant = tenants.find((t) => t.isCurrent);
  const previousTenants = tenants
    .filter((t) => !t.isCurrent)
    .sort(
      (a, b) =>
        new Date(b.leaseEndDate || "").getTime() -
        new Date(a.leaseEndDate || "").getTime(),
    );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="rm-tenants-section">
      <div className="rm-tenants-header">
        <span className="rm-tenants-label">Tenants</span>
      </div>

      {/* Current tenant (editable form) */}
      {currentTenant && (
        <div key={currentTenant.id} className="rm-tenant-card">
          <div className="rm-tenant-card-header">
            <span className="rm-tenant-index">Current Tenant</span>
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

      {/* Previous tenants (read-only records) */}
      {previousTenants.length > 0 && (
        <div className="rm-previous-tenants">
          <div className="rm-previous-tenants-label">Previous Tenants</div>
          {previousTenants.map((tenant) => (
            <div key={tenant.id} className="rm-previous-tenant-record">
              <div className="rm-record-header">
                <div className="rm-record-name">{tenant.name || "—"}</div>
                <button
                  type="button"
                  className="rm-remove-tenant-btn"
                  onClick={() => onRemoveTenant(tenant.id)}
                  title="Remove tenant"
                >
                  <Trash2 size={14} />
                </button>
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
                  <span className="rm-detail-value">
                    {tenant.type || "Regular"}
                  </span>
                </div>
                <div className="rm-record-detail">
                  <span className="rm-detail-label">Monthly Rent:</span>
                  <span className="rm-detail-value">
                    {tenant.monthlyRent || "—"}
                  </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
