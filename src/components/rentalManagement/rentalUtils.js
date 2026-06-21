import { parseCurrency } from "../../utils/utils";

export const TENANT_TYPES = ["Regular", "Section 8"];

export function createEmptyTenant(isCurrent = false) {
  return {
    id: crypto.randomUUID(),
    name: "",
    phone: "",
    email: "",
    type: "Regular",
    monthlyRent: "",
    leaseStartDate: "",
    leaseEndDate: "",
    isCurrent,
  };
}

export function calculateLeaseDurationMonths(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return Math.max(0, months);
}

export function calculateTenantTotalRent(tenant, propertyRentFallback = "0") {
  const monthlyRent = parseCurrency(tenant.monthlyRent || propertyRentFallback);

  // For current tenants without an end date, use today's date
  const endDate =
    tenant.leaseEndDate ||
    (tenant.isCurrent ? new Date().toISOString().split("T")[0] : "");

  const months = calculateLeaseDurationMonths(tenant.leaseStartDate, endDate);
  return monthlyRent * Math.max(1, months);
}

export function getCurrentTenant(tenants) {
  if (!tenants || tenants.length === 0) return null;
  // Find the tenant marked as current
  const current = tenants.find((t) => t.isCurrent);
  if (current) return current;
  // Fallback to most recent if none marked as current
  return tenants.length > 0 ? tenants[tenants.length - 1] : null;
}

export function normalizeRentalForm(form, isAddForm = false) {
  const base = {
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state,
    purchaseDate: form.purchaseDate,
    monthlyMortgage: form.monthlyMortgage,
    monthlyRent: form.monthlyRent,
    pmCompanyName: (form.pmCompanyName || "").trim(),
    pmAgentName: (form.pmAgentName || "").trim(),
    pmContactPhone: form.pmContactPhone || "",
    pmContactEmail: (form.pmContactEmail || "").trim(),
    hasApplianceInsurance: form.hasApplianceInsurance || "No",
    applianceInsuranceCompany:
      form.hasApplianceInsurance === "Yes"
        ? (form.applianceInsuranceCompany || "").trim()
        : "",
    applianceInsuranceTermYears:
      form.hasApplianceInsurance === "Yes"
        ? form.applianceInsuranceTermYears || ""
        : "",
    applianceInsurancePricePaid:
      form.hasApplianceInsurance === "Yes"
        ? form.applianceInsurancePricePaid || ""
        : "",
  };

  if (isAddForm) {
    // For add form, create initial tenant from form fields (marked as current)
    const leaseStartDate = form.rentDepositDate || "";
    return {
      ...base,
      tenants: form.tenantName.trim()
        ? [
            {
              id: crypto.randomUUID(),
              name: form.tenantName.trim(),
              phone: form.tenantPhone,
              email: form.tenantEmail.trim(),
              type: form.tenantType || "Regular",
              monthlyRent: form.monthlyRent,
              leaseStartDate,
              leaseEndDate: "",
              isCurrent: true,
            },
          ]
        : [{ ...createEmptyTenant(true), leaseStartDate }],
    };
  }

  // For edit form, handle tenants array
  return {
    ...base,
    tenants: (form.tenants || []).filter((t) => t.name.trim()),
  };
}
