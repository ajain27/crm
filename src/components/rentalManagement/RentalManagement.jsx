import { useState, useEffect, useMemo } from "react";
import { KeyRound } from "lucide-react";
import { Select, AccordionHeaderCell } from "../elements/elements";
import ClearFiltersButton from "../elements/ClearFiltersButton";
import {
  formatPhone,
  fmtCurrencyInput,
  parseCurrency,
  currency,
  findDuplicateByField,
} from "../../utils/utils";
import {
  TENANT_TYPES,
  createEmptyTenant,
  calculateTenantTotalRent,
  getCurrentTenant,
  normalizeRentalForm,
} from "./rentalUtils";
import RentalStatsGrid from "./RentalStatsGrid";
import RentalAddForm from "./RentalAddForm";
import RentalEditModal from "./RentalEditModal";
import "./RentalManagement.css";

function createEmptyForm() {
  return {
    address: "",
    city: "",
    state: "",
    zipCode: "",
    purchaseDate: "",
    monthlyMortgage: "",
    monthlyRent: "",
    rentDepositDate: "",
    tenantName: "",
    tenantPhone: "",
    tenantEmail: "",
    tenantType: "Regular",
    pmCompanyName: "",
    pmAgentName: "",
    pmContactPhone: "",
    pmContactEmail: "",
    hasApplianceInsurance: "No",
    applianceInsuranceCompany: "",
    applianceInsuranceTermYears: "",
    applianceInsurancePricePaid: "",
  };
}

function isComplete(form) {
  return form.address.trim() && form.state.trim();
}

const normalizeForm = normalizeRentalForm;

function applyFieldChange(prev, name, value, tenantId) {
  // Handle tenant array fields in edit form (check this first)
  if (tenantId && prev.tenants) {
    const updatedTenants = prev.tenants.map((t) => {
      if (t.id !== tenantId) return t;
      if (name === "phone") return { ...t, phone: formatPhone(value) };
      if (name === "monthlyRent")
        return { ...t, monthlyRent: fmtCurrencyInput(value) };
      return { ...t, [name]: value };
    });
    return { ...prev, tenants: updatedTenants };
  }
  // Handle form-level fields
  if (
    name === "monthlyMortgage" ||
    name === "monthlyRent" ||
    name === "applianceInsurancePricePaid"
  ) {
    return { ...prev, [name]: fmtCurrencyInput(value) };
  }
  // Handle single tenant phone field in add form
  if (name === "tenantPhone") {
    return { ...prev, tenantPhone: formatPhone(value) };
  }
  if (name === "pmContactPhone") {
    return { ...prev, pmContactPhone: formatPhone(value) };
  }
  return { ...prev, [name]: value };
}

export default function RentalManagement({
  currentUser,
  fetchRentals,
  saveRental,
  deleteRentalById,
}) {
  const [rentals, setRentals] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [addressError, setAddressError] = useState("");
  const [saving, setSaving] = useState(false);

  const [filterState, setFilterState] = useState("All");
  const [filterCity, setFilterCity] = useState("All");
  const [filterTenantType, setFilterTenantType] = useState("All");
  const [search, setSearch] = useState("");

  const [editingRental, setEditingRental] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!fetchRentals || !currentUser?.id) return;
    fetchRentals(currentUser.id)
      .then(setRentals)
      .catch(() => {});
  }, [currentUser?.id]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "address") setAddressError("");
    const tenantId = e.target.dataset.tenantId;
    setForm((p) => applyFieldChange(p, name, value, tenantId));
  }

  function handleAddressBlur(e) {
    const value = e.target.value;
    if (!value.trim()) return;
    const dup = findDuplicateByField(rentals, "address", value);
    if (dup) setAddressError(`"${dup.address}" is already in your list.`);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!isComplete(form) || addressError) return;
    setSaving(true);
    try {
      const rental = {
        id: crypto.randomUUID(),
        userId: currentUser?.id || "",
        createdAt: new Date().toISOString(),
        ...normalizeForm(form, true),
      };
      await saveRental(rental);
      setRentals((p) => [rental, ...p]);
      setForm(createEmptyForm());
    } catch {
      alert("Failed to save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this rental property?")) return;
    await deleteRentalById(id);
    setRentals((p) => p.filter((r) => r.id !== id));
  }

  async function handleDeleteFromModal() {
    if (!editingRental) return;
    await handleDelete(editingRental.id);
    closeEdit();
  }

  async function handleApplianceInsuranceChange(rental, value) {
    const updated = {
      ...rental,
      hasApplianceInsurance: value,
      applianceInsuranceCompany:
        value === "Yes" ? rental.applianceInsuranceCompany || "" : "",
      applianceInsuranceTermYears:
        value === "Yes" ? rental.applianceInsuranceTermYears || "" : "",
      applianceInsurancePricePaid:
        value === "Yes" ? rental.applianceInsurancePricePaid || "" : "",
    };
    setRentals((p) => p.map((r) => (r.id === updated.id ? updated : r)));
    try {
      await saveRental(updated);
    } catch {
      alert("Failed to save. Check your connection.");
      setRentals((p) => p.map((r) => (r.id === rental.id ? rental : r)));
    }
  }

  function openEdit(rental) {
    setEditingRental(rental);

    // Handle tenants - support both new format (tenants array) and old format (property-level fields)
    let tenants = rental.tenants;
    if (!tenants || tenants.length === 0) {
      // Create tenant from property-level fields (backward compatibility)
      if (rental.tenantName || rental.tenantPhone || rental.tenantEmail) {
        tenants = [
          {
            id: crypto.randomUUID(),
            name: rental.tenantName || "",
            phone: rental.tenantPhone || "",
            email: rental.tenantEmail || "",
            type: rental.tenantType || "Regular",
            monthlyRent: rental.monthlyRent || "",
            leaseStartDate: "",
            leaseEndDate: "",
            isCurrent: true,
          },
        ];
      } else {
        tenants = [createEmptyTenant(true)];
      }
    }

    setEditForm({
      address: rental.address || "",
      city: rental.city || "",
      state: rental.state || "",
      zipCode: rental.zipCode || "",
      purchaseDate: rental.purchaseDate || "",
      monthlyMortgage: rental.monthlyMortgage || "",
      monthlyRent: rental.monthlyRent || "",
      pmCompanyName: rental.pmCompanyName || "",
      pmAgentName: rental.pmAgentName || "",
      pmContactPhone: rental.pmContactPhone || "",
      pmContactEmail: rental.pmContactEmail || "",
      hasApplianceInsurance: rental.hasApplianceInsurance || "No",
      applianceInsuranceCompany: rental.applianceInsuranceCompany || "",
      applianceInsuranceTermYears: rental.applianceInsuranceTermYears || "",
      applianceInsurancePricePaid: rental.applianceInsurancePricePaid || "",
      tenants,
    });
  }

  function closeEdit() {
    setEditingRental(null);
    setEditForm(null);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    const tenantId = e.target.dataset.tenantId;
    setEditForm((p) => applyFieldChange(p, name, value, tenantId));
  }

  function handleEditAddTenant(newTenantData) {
    setEditForm((p) => ({
      ...p,
      tenants: [
        ...p.tenants.map((t) => ({ ...t, isCurrent: false })),
        {
          ...createEmptyTenant(true),
          ...newTenantData,
          id: crypto.randomUUID(),
        },
      ],
    }));
  }

  function handleEditRemoveTenant(tenantId) {
    setEditForm((p) => ({
      ...p,
      tenants: p.tenants.filter((t) => t.id !== tenantId),
    }));
  }

  async function handleEditSave() {
    if (!editingRental) return;
    setEditSaving(true);
    try {
      const updated = { ...editingRental, ...normalizeForm(editForm, false) };
      await saveRental(updated);
      setRentals((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      closeEdit();
    } catch {
      alert("Failed to save changes. Check your connection.");
    } finally {
      setEditSaving(false);
    }
  }

  const stateOptions = useMemo(
    () => [
      "All",
      ...new Set(
        rentals
          .map((r) => r.state)
          .filter(Boolean)
          .sort(),
      ),
    ],
    [rentals],
  );

  const cityOptions = useMemo(
    () => [
      "All",
      ...new Set(
        rentals
          .map((r) => r.city)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)),
      ),
    ],
    [rentals],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rentals.filter((r) => {
      if (filterState !== "All" && r.state !== filterState) return false;
      if (filterCity !== "All" && r.city !== filterCity) return false;
      if (filterTenantType !== "All") {
        const currentTenant = getCurrentTenant(r.tenants);
        if (
          !currentTenant ||
          (currentTenant.type || "Regular") !== filterTenantType
        )
          return false;
      }
      if (term) {
        const tenantNames = (r.tenants || [])
          .map((t) => t.name || "")
          .join(" ");
        const tenantEmails = (r.tenants || [])
          .map((t) => t.email || "")
          .join(" ");
        const haystack =
          `${r.address || ""} ${tenantNames} ${tenantEmails}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [rentals, filterState, filterCity, filterTenantType, search]);

  const hasActiveFilters =
    filterState !== "All" ||
    filterCity !== "All" ||
    filterTenantType !== "All" ||
    search.trim() !== "";

  function clearFilters() {
    setFilterState("All");
    setFilterCity("All");
    setFilterTenantType("All");
    setSearch("");
  }

  // Calculate stats using current tenant for each property
  const totalRent = filtered.reduce((sum, r) => {
    const currentTenant = getCurrentTenant(r.tenants);
    // Use tenant's rent if available, otherwise fall back to property-level rent
    const tenantRent = parseCurrency(
      currentTenant?.monthlyRent || r.monthlyRent || "0",
    );
    return sum + tenantRent;
  }, 0);

  const totalMortgage = filtered.reduce(
    (sum, r) => sum + parseCurrency(r.monthlyMortgage),
    0,
  );
  const netCashflow = totalRent - totalMortgage;
  const section8Count = filtered.filter((r) => {
    const currentTenant = getCurrentTenant(r.tenants);
    return currentTenant && currentTenant.type === "Section 8";
  }).length;
  const regularCount = filtered.filter((r) => {
    const currentTenant = getCurrentTenant(r.tenants);
    return currentTenant && (currentTenant.type || "Regular") === "Regular";
  }).length;

  // Accumulated gross rent collected across all tenants in filtered properties
  const accumulatedRentCollected = filtered.reduce((sum, r) => {
    return (
      sum +
      (r.tenants || []).reduce((tenantSum, tenant) => {
        return tenantSum + calculateTenantTotalRent(tenant, r.monthlyRent);
      }, 0)
    );
  }, 0);

  // Total rent across all rentals (unfiltered, current tenants only)
  const totalRentAllProperties = rentals.reduce((sum, r) => {
    const currentTenant = getCurrentTenant(r.tenants);
    // Use tenant's rent if available, otherwise fall back to property-level rent
    const tenantRent = parseCurrency(
      currentTenant?.monthlyRent || r.monthlyRent || "0",
    );
    return sum + tenantRent;
  }, 0);

  // Net rent across all properties: (monthly rent - monthly mortgage) × months since purchase
  const netCashflowAllProperties = rentals.reduce((sum, r) => {
    const purchaseDate = r.purchaseDate;
    if (!purchaseDate) return sum;

    const startDate = new Date(purchaseDate + "T00:00:00");
    const endDate = new Date();

    // Calculate months from purchase date to today
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      1;

    const monthlyRent = parseCurrency(
      totalRentAllProperties > 0 ? r.monthlyRent : "0",
    );
    const monthlyMortgage = parseCurrency(r.monthlyMortgage || "0");
    const monthlyNet = monthlyRent - monthlyMortgage;

    return sum + monthlyNet * Math.max(1, months);
  }, 0);

  const statsSubtitle = hasActiveFilters ? "Current filters" : "All properties";

  const editingCashflow = editingRental
    ? parseCurrency(editingRental.monthlyRent) -
      parseCurrency(editingRental.monthlyMortgage)
    : 0;
  const editingAccumulatedRent = editingRental
    ? (editingRental.tenants || []).reduce(
        (sum, tenant) =>
          sum + calculateTenantTotalRent(tenant, editingRental.monthlyRent),
        0,
      )
    : 0;

  return (
    <>
      {/* ── Stats ────────────────────────────────────────── */}
      <RentalStatsGrid
        propertiesCount={filtered.length}
        totalRent={totalRent}
        totalMortgage={totalMortgage}
        netCashflow={netCashflow}
        section8Count={section8Count}
        regularCount={regularCount}
        totalRentAllProperties={totalRentAllProperties}
        netCashflowAllProperties={netCashflowAllProperties}
        accumulatedRentCollected={accumulatedRentCollected}
        statsSubtitle={statsSubtitle}
      />

      {/* ── Add form ─────────────────────────────────────── */}
      <RentalAddForm
        form={form}
        onChange={handleChange}
        onBlur={handleAddressBlur}
        onSubmit={handleAdd}
        addressError={addressError}
        saving={saving}
        isComplete={isComplete}
      />

      {/* ── Filters + table ──────────────────────────────── */}
      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "180ms" }}
      >
        <div className="panel-header rm-table-header">
          <div>
            <h2>Properties</h2>
            <p>
              {rentals.length === 0
                ? "No properties yet."
                : filtered.length === rentals.length
                  ? `${rentals.length} propert${rentals.length !== 1 ? "ies" : "y"}`
                  : `${filtered.length} of ${rentals.length} properties`}
            </p>
          </div>
          {rentals.length > 0 && (
            <div className="rm-filters">
              <label className="search-field rm-search">
                <span>Search</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Address, tenant, email…"
                />
              </label>
              <Select
                label="State"
                name="filterState"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                options={stateOptions}
              />
              <Select
                label="City"
                name="filterCity"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                options={cityOptions}
              />
              <Select
                label="Tenant Type"
                name="filterTenantType"
                value={filterTenantType}
                onChange={(e) => setFilterTenantType(e.target.value)}
                options={["All", ...TENANT_TYPES]}
              />
              <ClearFiltersButton
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          )}
        </div>

        {rentals.length === 0 ? (
          <div className="rm-empty">
            <KeyRound size={32} className="rm-empty-icon" />
            <p>No rental properties yet.</p>
            <span>Add your first one above.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rm-empty">
            <p>No properties match your filters.</p>
          </div>
        ) : (
          <div className="table-wrap rm-table-container acc-card-container">
            <table className="compact-table rm-properties-table acc-card">
              <thead>
                <tr>
                  <th className="rm-name rm-col-sticky">Address</th>
                  <th>City, State</th>
                  <th className="rm-col-extra">Phone</th>
                  <th className="rm-col-extra">Email</th>
                  <th className="rm-col-extra">Type</th>
                  <th>Rent</th>
                  <th>Mortgage</th>
                  <th>Cashflow</th>
                  <th className="rm-col-extra">Accumulated Rent</th>
                  <th className="rm-col-extra">Management Details</th>
                  <th className="rm-col-extra">Appliance Insured</th>
                  <th className="acc-col-hide-mobile">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rental) => {
                  const cashflow =
                    parseCurrency(rental.monthlyRent) -
                    parseCurrency(rental.monthlyMortgage);
                  const currentTenant = getCurrentTenant(rental.tenants);
                  const hasMultipleTenants = (rental.tenants || []).length > 1;
                  const propertyAccumulatedRent = (rental.tenants || []).reduce(
                    (sum, tenant) => {
                      return (
                        sum +
                        calculateTenantTotalRent(tenant, rental.monthlyRent)
                      );
                    },
                    0,
                  );
                  return (
                    <tr
                      key={rental.id}
                      className="rm-row"
                      onClick={() => openEdit(rental)}
                      data-status={hasMultipleTenants ? "multiple-tenants" : ""}
                    >
                      <AccordionHeaderCell
                        id={rental.id}
                        label="Address"
                        value={rental.address}
                        className="rm-name rm-col-sticky"
                      />
                      <td className="rm-muted" data-label="City, State">
                        {rental.city && rental.state
                          ? `${rental.city}, ${rental.state}`
                          : rental.city || rental.state || "—"}
                      </td>
                      <td className="rm-muted rm-col-extra" data-label="Phone">
                        {currentTenant?.phone || "—"}
                      </td>
                      <td className="rm-muted rm-col-extra" data-label="Email">
                        {currentTenant?.email || "—"}
                      </td>
                      <td className="rm-col-extra" data-label="Type">
                        <span
                          className={`rm-type-badge${
                            currentTenant?.type === "Section 8"
                              ? " rm-type-badge--section8"
                              : ""
                          }`}
                        >
                          {currentTenant?.type || "Regular"}
                        </span>
                      </td>
                      <td data-label="Rent">
                        {currency(parseCurrency(rental.monthlyRent))}
                      </td>
                      <td data-label="Mortgage">
                        {currency(parseCurrency(rental.monthlyMortgage))}
                      </td>
                      <td
                        className={cashflow < 0 ? "rm-negative" : "rm-positive"}
                        data-label="Cashflow"
                      >
                        {currency(cashflow)}
                      </td>
                      <td
                        className="rm-positive rm-col-extra"
                        data-label="Accumulated Rent"
                      >
                        {currency(propertyAccumulatedRent)}
                      </td>
                      <td
                        className="acc-col-block rm-col-extra"
                        data-label="Management Details"
                      >
                        {rental.pmCompanyName ||
                        rental.pmAgentName ||
                        rental.pmContactPhone ||
                        rental.pmContactEmail ? (
                          <div className="rm-pm-display">
                            {rental.pmCompanyName && (
                              <span className="rm-pm-company">
                                {rental.pmCompanyName}
                              </span>
                            )}
                            {rental.pmAgentName && (
                              <span>{rental.pmAgentName}</span>
                            )}
                            {rental.pmContactPhone && (
                              <a
                                href={`tel:${rental.pmContactPhone}`}
                                className="rm-pm-link"
                              >
                                {rental.pmContactPhone}
                              </a>
                            )}
                            {rental.pmContactEmail && (
                              <a
                                href={`mailto:${rental.pmContactEmail}`}
                                className="rm-pm-link"
                              >
                                {rental.pmContactEmail}
                              </a>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className="rm-col-extra"
                        data-label="Appliance Insured"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          className="rm-inline-select"
                          value={
                            rental.hasApplianceInsurance === "Yes"
                              ? "Yes"
                              : "No"
                          }
                          onChange={(e) =>
                            handleApplianceInsuranceChange(
                              rental,
                              e.target.value,
                            )
                          }
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td
                        className="acc-col-hide-mobile"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="rm-details-link"
                          onClick={() => openEdit(rental)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Edit modal ───────────────────────────────────── */}
      <RentalEditModal
        isOpen={!!editingRental}
        editingRental={editingRental}
        editForm={editForm}
        editSaving={editSaving}
        cashflow={editingCashflow}
        accumulatedRent={editingAccumulatedRent}
        onChange={handleEditChange}
        onRemoveTenant={handleEditRemoveTenant}
        onAddTenant={handleEditAddTenant}
        onClose={closeEdit}
        onSave={handleEditSave}
        onDelete={handleDeleteFromModal}
      />
    </>
  );
}
