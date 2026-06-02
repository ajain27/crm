import { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  Plus,
  KeyRound,
  Home,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import Modal from "../modal/Modal";
import { Field, Select, SimpleStat } from "../elements/elements";
import ClearFiltersButton from "../elements/ClearFiltersButton";
import {
  formatPhone,
  fmtCurrencyInput,
  parseCurrency,
  currency,
  findDuplicateByField,
} from "../../utils/utils";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import "./RentalManagement.css";

const TENANT_TYPES = ["Regular", "Section 8"];

function createEmptyForm() {
  return {
    address: "",
    city: "",
    state: "",
    tenantName: "",
    tenantPhone: "",
    tenantEmail: "",
    monthlyMortgage: "",
    monthlyRent: "",
    tenantType: "Regular",
  };
}

function isComplete(form) {
  return form.address.trim() && form.state.trim();
}

function normalizeForm(form) {
  return {
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state,
    tenantName: form.tenantName.trim(),
    tenantPhone: form.tenantPhone,
    tenantEmail: form.tenantEmail.trim(),
    monthlyMortgage: form.monthlyMortgage,
    monthlyRent: form.monthlyRent,
    tenantType: form.tenantType || "Regular",
  };
}

function applyFieldChange(prev, name, value) {
  if (name === "tenantPhone")
    return { ...prev, tenantPhone: formatPhone(value) };
  if (name === "monthlyMortgage" || name === "monthlyRent") {
    return { ...prev, [name]: fmtCurrencyInput(value) };
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
  const [form, setForm] = useState(createEmptyForm);
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
    setForm((p) => applyFieldChange(p, name, value));
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
        ...normalizeForm(form),
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

  function openEdit(rental) {
    setEditingRental(rental);
    setEditForm({
      address: rental.address || "",
      city: rental.city || "",
      state: rental.state || "",
      tenantName: rental.tenantName || "",
      tenantPhone: rental.tenantPhone || "",
      tenantEmail: rental.tenantEmail || "",
      monthlyMortgage: rental.monthlyMortgage || "",
      monthlyRent: rental.monthlyRent || "",
      tenantType: rental.tenantType || "Regular",
    });
  }

  function closeEdit() {
    setEditingRental(null);
    setEditForm(null);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((p) => applyFieldChange(p, name, value));
  }

  async function handleEditSave() {
    if (!editingRental) return;
    setEditSaving(true);
    try {
      const updated = { ...editingRental, ...normalizeForm(editForm) };
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
      if (
        filterTenantType !== "All" &&
        (r.tenantType || "Regular") !== filterTenantType
      )
        return false;
      if (term) {
        const haystack =
          `${r.address || ""} ${r.tenantName || ""} ${r.tenantEmail || ""}`.toLowerCase();
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

  const totalRent = filtered.reduce(
    (sum, r) => sum + parseCurrency(r.monthlyRent),
    0,
  );
  const totalMortgage = filtered.reduce(
    (sum, r) => sum + parseCurrency(r.monthlyMortgage),
    0,
  );
  const netCashflow = totalRent - totalMortgage;
  const section8Count = filtered.filter(
    (r) => r.tenantType === "Section 8",
  ).length;
  const regularCount = filtered.filter(
    (r) => (r.tenantType || "Regular") === "Regular",
  ).length;

  const statsSubtitle = hasActiveFilters ? "Current filters" : "All properties";

  return (
    <>
      <header className="page-header" data-reveal="left">
        <div>
          <h1>Rental Management</h1>
          <span>Track your rental portfolio, tenants and cashflow.</span>
        </div>
      </header>

      {/* ── Stats ────────────────────────────────────────── */}
      <section
        className="stats-grid"
        data-reveal-group
        style={{ "--reveal-delay": "60ms" }}
      >
        <SimpleStat
          icon={<Home size={20} />}
          label="Properties"
          subtitle={statsSubtitle}
          value={filtered.length}
          colorTheme="green"
        />
        <SimpleStat
          icon={<DollarSign size={20} />}
          label="Monthly Rent"
          subtitle={statsSubtitle}
          numericValue={totalRent}
          format={currency}
          colorTheme="green"
        />
        <SimpleStat
          icon={<DollarSign size={20} />}
          label="Monthly Mortgage"
          subtitle={statsSubtitle}
          numericValue={totalMortgage}
          format={currency}
          colorTheme="orange"
        />
        <SimpleStat
          icon={<TrendingUp size={20} />}
          label="Net Cashflow"
          subtitle="Rent − mortgage"
          numericValue={netCashflow}
          format={currency}
          colorTheme={netCashflow < 0 ? "red" : "green"}
          valueClassName={netCashflow < 0 ? "rm-negative" : undefined}
        />
        <SimpleStat
          icon={<Users size={20} />}
          label="Section 8"
          subtitle={statsSubtitle}
          value={section8Count}
          colorTheme="orange"
        />
        <SimpleStat
          icon={<Users size={20} />}
          label="Regular"
          subtitle={statsSubtitle}
          value={regularCount}
          colorTheme="green"
        />
      </section>

      {/* ── Add form ─────────────────────────────────────── */}
      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "120ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Add Rental Property</h2>
            <p>Property address and state are required.</p>
          </div>
        </div>

        <form className="add-form" onSubmit={handleAdd}>
          <Field
            label="Property Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            onBlur={handleAddressBlur}
            placeholder="123 Main St"
            required
          />
          <Field
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Austin"
          />
          <label className="field">
            <span>
              State <span className="required-marker">*</span>
            </span>
            <select name="state" value={form.state} onChange={handleChange}>
              {STATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Type of Tenant</span>
            <select
              name="tenantType"
              value={form.tenantType}
              onChange={handleChange}
            >
              {TENANT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <Field
            label="Tenant Name"
            name="tenantName"
            value={form.tenantName}
            onChange={handleChange}
            placeholder="John Smith"
          />
          <Field
            label="Tenant Phone"
            name="tenantPhone"
            value={form.tenantPhone}
            onChange={handleChange}
            placeholder="555-867-5309"
            maxLength={12}
          />
          <Field
            label="Tenant Email"
            name="tenantEmail"
            type="email"
            value={form.tenantEmail}
            onChange={handleChange}
            placeholder="john@example.com"
          />
          <Field
            label="Monthly Rent"
            name="monthlyRent"
            value={form.monthlyRent}
            onChange={handleChange}
            placeholder="$2,000"
            inputMode="numeric"
          />
          <Field
            label="Monthly Mortgage"
            name="monthlyMortgage"
            value={form.monthlyMortgage}
            onChange={handleChange}
            placeholder="$1,200"
            inputMode="numeric"
          />

          {addressError && (
            <span className="field-error rm-address-error">{addressError}</span>
          )}

          <div className="rm-submit-row">
            <button
              className="primary-btn"
              type="submit"
              disabled={!isComplete(form) || !!addressError || saving}
            >
              <Plus size={14} />
              {saving ? "Saving…" : "Add Property"}
            </button>
          </div>
        </form>
      </section>

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
          <div className="table-wrap">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Tenant</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Rent</th>
                  <th>Mortgage</th>
                  <th>Cashflow</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rental) => {
                  const cashflow =
                    parseCurrency(rental.monthlyRent) -
                    parseCurrency(rental.monthlyMortgage);
                  return (
                    <tr
                      key={rental.id}
                      className="rm-row"
                      onClick={() => openEdit(rental)}
                    >
                      <td className="rm-name">{rental.address}</td>
                      <td className="rm-muted">{rental.city || "—"}</td>
                      <td>
                        <span className="rm-state-badge">
                          {rental.state || "—"}
                        </span>
                      </td>
                      <td>{rental.tenantName || "—"}</td>
                      <td className="rm-muted">{rental.tenantPhone || "—"}</td>
                      <td className="rm-muted">{rental.tenantEmail || "—"}</td>
                      <td>
                        <span
                          className={`rm-type-badge${
                            rental.tenantType === "Section 8"
                              ? " rm-type-badge--section8"
                              : ""
                          }`}
                        >
                          {rental.tenantType || "Regular"}
                        </span>
                      </td>
                      <td>{currency(parseCurrency(rental.monthlyRent))}</td>
                      <td>{currency(parseCurrency(rental.monthlyMortgage))}</td>
                      <td
                        className={cashflow < 0 ? "rm-negative" : "rm-positive"}
                      >
                        {currency(cashflow)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="leads-delete-btn"
                          title="Delete property"
                          onClick={() => handleDelete(rental.id)}
                        >
                          <Trash2 size={14} />
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
      <Modal
        isOpen={!!editingRental}
        onClose={closeEdit}
        title={editingRental?.address || "Edit Rental Property"}
        style={{ maxWidth: 560 }}
        actions={
          <>
            <button className="secondary-btn" onClick={closeEdit}>
              Cancel
            </button>
            <button
              className="primary-btn"
              onClick={handleEditSave}
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
              onChange={handleEditChange}
              placeholder="123 Main St"
            />
            <Field
              label="City"
              name="city"
              value={editForm.city}
              onChange={handleEditChange}
              placeholder="Austin"
            />
            <label className="field">
              <span>State</span>
              <select
                name="state"
                value={editForm.state}
                onChange={handleEditChange}
              >
                {STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Type of Tenant</span>
              <select
                name="tenantType"
                value={editForm.tenantType}
                onChange={handleEditChange}
              >
                {TENANT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Tenant Name"
              name="tenantName"
              value={editForm.tenantName}
              onChange={handleEditChange}
              placeholder="John Smith"
            />
            <Field
              label="Tenant Phone"
              name="tenantPhone"
              value={editForm.tenantPhone}
              onChange={handleEditChange}
              placeholder="555-867-5309"
              maxLength={12}
            />
            <Field
              label="Tenant Email"
              name="tenantEmail"
              type="email"
              value={editForm.tenantEmail}
              onChange={handleEditChange}
              placeholder="john@example.com"
            />
            <Field
              label="Monthly Rent"
              name="monthlyRent"
              value={editForm.monthlyRent}
              onChange={handleEditChange}
              placeholder="$2,000"
              inputMode="numeric"
            />
            <Field
              label="Monthly Mortgage"
              name="monthlyMortgage"
              value={editForm.monthlyMortgage}
              onChange={handleEditChange}
              placeholder="$1,200"
              inputMode="numeric"
            />
          </div>
        )}
      </Modal>
    </>
  );
}
