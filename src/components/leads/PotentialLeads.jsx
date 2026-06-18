import { useState } from "react";
import {
  MapPin,
  Link2,
  Phone,
  Mail,
  Trash2,
  CheckCheck,
  ExternalLink,
  Plus,
  Tag,
  Search,
  Globe,
} from "lucide-react";
import ClearFiltersButton from "../elements/ClearFiltersButton";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import {
  formatPhone,
  findDuplicateByAddress,
  formatDate,
  trimFieldOnBlur,
} from "../../utils/utils";
import { createEmptyDealForm } from "../crm/components/crmConfig";
import LeadDetailModal from "./LeadDetailModal";
import Pagination from "../pagination/Pagination";
import "./Leads.css";

const ITEMS_PER_PAGE = 10;

const SOURCES = ["MLS / Zillow", "Cold Call", "Propwire", "Auction.com"];

function createEmptyForm() {
  return {
    address: "",
    source: "",
    agentName: "",
    agentPhone: "",
    sellerName: "",
    url: "",
    followUpDate: "",
    email: "",
    phone: "",
    notes: "",
  };
}

function createEmptyCommercialForm() {
  return {
    name: "",
    address: "",
    source: "",
    state: "",
    website: "",
    phone: "",
    link: "",
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parses "123 Main St, Dallas, TX 75201" → { address, city, state, zipCode }
function parseAddress(full) {
  const parts = full
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZipRaw = parts.slice(2).join(" ").trim();
    const [state = "", zipCode = ""] = stateZipRaw.split(/\s+/);
    return { address: street, city, state, zipCode };
  }
  if (parts.length === 2) {
    const street = parts[0];
    const [state = "", zipCode = ""] = parts[1].split(/\s+/);
    return { address: street, city: "", state, zipCode };
  }
  return { address: full, city: "", state: "", zipCode: "" };
}

function followUpStatus(dateStr) {
  if (!dateStr) return null;
  const today = todayStr();
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  return "upcoming";
}

export default function PotentialLeads({
  currentUser,
  leads,
  setLeads,
  saveLead,
  deleteLeadById,
  saveLeadFile,
  fetchLeadFile,
  deleteLeadFileById,
  saveDeal,
  setDeals,
  setActiveView,
}) {
  const [activeTab, setActiveTab] = useState("residential");

  // ── Residential state ──────────────────────────────────────────────────────
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterFollowUpStatus, setFilterFollowUpStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailLead, setDetailLead] = useState(null);

  // ── Commercial state ───────────────────────────────────────────────────────
  const [commercialForm, setCommercialForm] = useState(
    createEmptyCommercialForm,
  );
  const [commercialSaving, setCommercialSaving] = useState(false);
  const [commercialError, setCommercialError] = useState("");
  const [commercialSearch, setCommercialSearch] = useState("");
  const [commercialPage, setCommercialPage] = useState(1);

  // ── Split leads by type ────────────────────────────────────────────────────
  const residentialLeads = leads.filter(
    (l) => !l.leadType || l.leadType === "residential",
  );
  const commercialLeads = leads.filter((l) => l.leadType === "commercial");

  function resetPage() {
    setCurrentPage(1);
  }

  // ── Residential handlers ───────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "address") setFormError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddressBlur(e) {
    trimFieldOnBlur(handleChange)(e);
    const duplicate = findDuplicateByAddress(
      residentialLeads,
      e.target.value.trim(),
    );
    if (duplicate) {
      setFormError(`"${duplicate.address}" is already in your lead list.`);
    }
  }

  function handlePhoneChange(e) {
    setForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }));
  }

  async function handleAddLead(e) {
    e.preventDefault();
    if (!form.address.trim()) return;
    const duplicate = findDuplicateByAddress(residentialLeads, form.address);
    if (duplicate) {
      setFormError(`"${duplicate.address}" is already in your lead list.`);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const lead = {
        ...form,
        leadType: "residential",
        address: form.address.trim(),
        id: crypto.randomUUID(),
        userId: currentUser.id,
        dateAdded: todayStr(),
      };
      await saveLead(lead);
      setLeads((prev) => [lead, ...prev]);
      setForm(createEmptyForm());
    } catch {
      setFormError("Failed to save lead. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this lead?")) return;
    await deleteLeadById(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleLeadSave(updated) {
    await saveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleAddedToCRM(leadId) {
    if (
      !window.confirm(
        "Add this lead to the CRM pipeline? It will be removed from Potential Leads.",
      )
    )
      return;

    const lead = leads.find((l) => l.id === leadId);
    const { address, city, state, zipCode } = parseAddress(lead.address);
    const deal = {
      ...createEmptyDealForm(),
      id: crypto.randomUUID(),
      userId: currentUser.id,
      address,
      city,
      state,
      zipCode,
      listingUrl: lead.url || "",
      agentName: lead.agentName || "",
      agentPhone: lead.agentPhone || "",
      onMarket: lead.source === "MLS / Zillow" ? "Yes" : "No",
      sellerPhone: lead.phone || "",
      notes: [lead.source ? `Source: ${lead.source}` : "", lead.notes || ""]
        .filter(Boolean)
        .join("\n"),
    };

    await saveDeal(deal);
    setDeals((prev) => [deal, ...prev]);
    await deleteLeadById(leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setActiveView("dashboard");
  }

  // ── Commercial handlers ────────────────────────────────────────────────────
  function handleCommercialChange(e) {
    const { name, value } = e.target;
    if (name === "address") setCommercialError("");
    setCommercialForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCommercialPhoneChange(e) {
    setCommercialForm((prev) => ({
      ...prev,
      phone: formatPhone(e.target.value),
    }));
  }

  async function handleAddCommercialLead(e) {
    e.preventDefault();
    if (!commercialForm.address.trim()) return;
    setCommercialSaving(true);
    setCommercialError("");
    try {
      const lead = {
        ...commercialForm,
        leadType: "commercial",
        address: commercialForm.address.trim(),
        id: crypto.randomUUID(),
        userId: currentUser.id,
        dateAdded: todayStr(),
      };
      await saveLead(lead);
      setLeads((prev) => [lead, ...prev]);
      setCommercialForm(createEmptyCommercialForm());
    } catch {
      setCommercialError("Failed to save lead. Please try again.");
    } finally {
      setCommercialSaving(false);
    }
  }

  // ── Residential filtering / pagination ─────────────────────────────────────
  const minDate = todayStr();

  const filtered = residentialLeads
    .filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          l.address.toLowerCase().includes(q) ||
          (l.phone || "").toLowerCase().includes(q) ||
          (l.agentPhone || "").toLowerCase().includes(q) ||
          (l.sellerName || "").toLowerCase().includes(q) ||
          (l.agentName || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterSource && l.source !== filterSource) return false;
      if (filterState && parseAddress(l.address).state !== filterState)
        return false;
      if (
        filterFollowUpStatus &&
        followUpStatus(l.followUpDate) !== filterFollowUpStatus
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.followUpDate) return 1;
      if (!b.followUpDate) return -1;
      return a.followUpDate.localeCompare(b.followUpDate);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const activeFilters =
    search || filterSource || filterState || filterFollowUpStatus;
  const usedSources = [
    ...new Set(residentialLeads.map((l) => l.source).filter(Boolean)),
  ];
  const usedStates = [
    ...new Set(
      residentialLeads
        .map((l) => parseAddress(l.address).state)
        .filter(Boolean),
    ),
  ].sort();

  // ── Commercial filtering / pagination ──────────────────────────────────────
  const filteredCommercial = commercialLeads.filter((l) => {
    if (!commercialSearch) return true;
    const q = commercialSearch.toLowerCase();
    return (
      l.address.toLowerCase().includes(q) ||
      (l.source || "").toLowerCase().includes(q) ||
      (l.phone || "").toLowerCase().includes(q)
    );
  });

  const commercialTotalPages = Math.max(
    1,
    Math.ceil(filteredCommercial.length / ITEMS_PER_PAGE),
  );
  const safeCommercialPage = Math.min(commercialPage, commercialTotalPages);
  const paginatedCommercial = filteredCommercial.slice(
    (safeCommercialPage - 1) * ITEMS_PER_PAGE,
    safeCommercialPage * ITEMS_PER_PAGE,
  );

  return (
    <>
      <header className="page-header" data-reveal>
        <div>
          <h1>Potential Leads</h1>
          <span>
            Track properties you&apos;re monitoring before they enter your
            pipeline.
          </span>
        </div>
      </header>

      <div
        className="deal-tab-bar"
        style={{ padding: "0 0 1rem 0" }}
        data-reveal
      >
        <button
          type="button"
          className={`deal-tab-btn${activeTab === "residential" ? " deal-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("residential")}
        >
          Residential
        </button>
        <button
          type="button"
          className={`deal-tab-btn${activeTab === "commercial" ? " deal-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("commercial")}
        >
          Commercial
        </button>
      </div>

      {activeTab === "residential" ? (
        <>
          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "80ms" }}
          >
            <div className="panel-header">
              <div>
                <h2>Add Residential Lead</h2>
                <p>Log a property you want to follow up on.</p>
              </div>
            </div>

            <form className="add-form leads-add-form" onSubmit={handleAddLead}>
              <div className="field leads-address-field">
                <span>
                  Property Address <span className="required-star">*</span>
                </span>
                <div className="leads-input-icon-wrap">
                  <MapPin size={15} className="leads-field-icon" />
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    onBlur={handleAddressBlur}
                    placeholder="e.g. 123 Main St, Dallas, TX 75201"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <span>Source</span>
                <div className="leads-input-icon-wrap">
                  <Tag size={15} className="leads-field-icon" />
                  <select
                    name="source"
                    value={form.source}
                    onChange={handleChange}
                    className="leads-select"
                  >
                    <option value="">Select source…</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.source === "MLS / Zillow" && (
                <>
                  <div className="field">
                    <span>Agent Name</span>
                    <input
                      type="text"
                      name="agentName"
                      value={form.agentName || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          agentName: e.target.value.replace(
                            /[^a-zA-Z\s'.]/g,
                            "",
                          ),
                        }))
                      }
                      onBlur={trimFieldOnBlur(handleChange)}
                      placeholder="Listing agent's name"
                    />
                  </div>
                  <div className="field">
                    <span>Agent Phone</span>
                    <div className="leads-input-icon-wrap">
                      <Phone size={15} className="leads-field-icon" />
                      <input
                        type="tel"
                        name="agentPhone"
                        value={form.agentPhone || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            agentPhone: formatPhone(e.target.value),
                          }))
                        }
                        placeholder="555-000-0000"
                        maxLength={12}
                      />
                    </div>
                  </div>
                </>
              )}

              {form.source === "Cold Call" && (
                <div className="field">
                  <span>Seller Name</span>
                  <input
                    type="text"
                    name="sellerName"
                    value={form.sellerName || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sellerName: e.target.value.replace(
                          /[^a-zA-Z\s'.]/g,
                          "",
                        ),
                      }))
                    }
                    onBlur={trimFieldOnBlur(handleChange)}
                    placeholder="Seller's name"
                  />
                </div>
              )}

              {form.source !== "Cold Call" && (
                <div className="field">
                  <span>Listing URL</span>
                  <div className="leads-input-icon-wrap">
                    <Link2 size={15} className="leads-field-icon" />
                    <input
                      type="url"
                      name="url"
                      value={form.url}
                      onChange={handleChange}
                      onBlur={trimFieldOnBlur(handleChange)}
                      placeholder="https://zillow.com/…"
                    />
                  </div>
                </div>
              )}

              <div className="field">
                <span>
                  Follow-Up Date <span className="required-star">*</span>
                </span>
                <input
                  type="date"
                  name="followUpDate"
                  value={form.followUpDate}
                  onChange={handleChange}
                  min={minDate}
                  required
                />
              </div>

              {form.source !== "MLS / Zillow" && (
                <>
                  <div className="field">
                    <span>Email</span>
                    <div className="leads-input-icon-wrap">
                      <Mail size={15} className="leads-field-icon" />
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={trimFieldOnBlur(handleChange)}
                        placeholder="seller@email.com"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <span>Phone</span>
                    <div className="leads-input-icon-wrap">
                      <Phone size={15} className="leads-field-icon" />
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handlePhoneChange}
                        placeholder="555-000-0000"
                        maxLength={12}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="field leads-notes-field">
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Any initial notes about this lead…"
                  rows={3}
                />
              </div>

              {formError && (
                <p className="leads-form-error col-span-full">{formError}</p>
              )}

              <button
                className="primary-btn form-btn"
                type="submit"
                disabled={
                  !form.address.trim() ||
                  !form.followUpDate ||
                  !!formError ||
                  saving
                }
              >
                <Plus size={15} />
                {saving ? "Saving…" : "Add Lead"}
              </button>
            </form>
          </section>

          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "140ms" }}
          >
            <div className="panel-header leads-list-header">
              <div>
                <h2>Residential Lead List</h2>
                <p>
                  {residentialLeads.length === 0
                    ? "No leads yet."
                    : `${filtered.length} of ${residentialLeads.length} lead${residentialLeads.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="leads-filters">
                <div className="leads-search-wrap">
                  <Search size={13} className="leads-search-icon" />
                  <input
                    type="text"
                    placeholder="Search address, name or phone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="leads-search-input"
                  />
                </div>
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    resetPage();
                  }}
                  className="leads-filter-select"
                >
                  <option value="">All sources</option>
                  {usedSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    resetPage();
                  }}
                  className="leads-filter-select"
                >
                  <option value="">All states</option>
                  {usedStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div
                  className="leads-status-filter"
                  role="group"
                  aria-label="Filter by follow-up status"
                >
                  {[
                    { status: "overdue", label: "Overdue" },
                    { status: "today", label: "Today" },
                    { status: "upcoming", label: "Upcoming" },
                  ].map(({ status, label }) => (
                    <button
                      key={status}
                      type="button"
                      title={label}
                      aria-pressed={filterFollowUpStatus === status}
                      className={`leads-status-dot leads-status-dot-${status}${
                        filterFollowUpStatus === status
                          ? " leads-status-dot--active"
                          : ""
                      }`}
                      onClick={() => {
                        setFilterFollowUpStatus((prev) =>
                          prev === status ? "" : status,
                        );
                        resetPage();
                      }}
                    />
                  ))}
                </div>
                <ClearFiltersButton
                  onClear={() => {
                    setSearch("");
                    setFilterSource("");
                    setFilterState("");
                    setFilterFollowUpStatus("");
                    resetPage();
                  }}
                  hasActiveFilters={Boolean(activeFilters)}
                  className="leads-clear-filters"
                  iconSize={13}
                />
              </div>
            </div>

            {residentialLeads.length === 0 ? (
              <div className="leads-empty">
                <p>Add your first lead above to get started.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="leads-empty">
                <p>No leads match the current filters.</p>
              </div>
            ) : (
              <>
                <div
                  className="table-wrap leads-table-wrap"
                  style={{ overflowX: "auto" }}
                >
                  <table className="compact-table leads-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Address</th>
                        <th>Source</th>
                        <th>Seller</th>
                        <th>Agent</th>
                        <th>Follow-Up</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Notes</th>
                        <th>Added</th>
                        <th>MLS Link</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((lead) => {
                        const status = followUpStatus(lead.followUpDate);
                        return (
                          <tr
                            key={lead.id}
                            className="clickable-row"
                            onClick={() => setDetailLead(lead)}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              <button
                                className="leads-delete-btn"
                                title="Delete lead"
                                onClick={() => handleDelete(lead.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                            <td className="leads-address-cell">
                              {lead.address}
                            </td>
                            <td>
                              {lead.source ? (
                                <span className="leads-source-badge">
                                  {lead.source}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{lead.sellerName || "—"}</td>
                            <td>
                              {lead.agentName || lead.agentPhone ? (
                                <div className="leads-agent-cell">
                                  {lead.agentName && (
                                    <span>{lead.agentName}</span>
                                  )}
                                  {lead.agentPhone && (
                                    <a
                                      href={`tel:${lead.agentPhone}`}
                                      className="leads-contact-link"
                                    >
                                      {lead.agentPhone}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {lead.followUpDate ? (
                                <span
                                  className={`leads-followup-badge leads-followup-${status}`}
                                >
                                  {formatDate(lead.followUpDate)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {lead.source !== "MLS / Zillow" ? (
                                lead.email ? (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="leads-contact-link"
                                  >
                                    {lead.email}
                                  </a>
                                ) : (
                                  "—"
                                )
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {lead.source !== "MLS / Zillow" ? (
                                lead.phone ? (
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="leads-contact-link"
                                  >
                                    {lead.phone}
                                  </a>
                                ) : (
                                  "—"
                                )
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="leads-notes-cell">
                              {lead.notes ? (
                                <span
                                  className="leads-notes-preview"
                                  title={lead.notes}
                                >
                                  {lead.notes}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="leads-date-cell">
                              {formatDate(lead.dateAdded)}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              {lead.url ? (
                                <a
                                  href={lead.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="leads-mls-link"
                                  title={lead.url}
                                >
                                  <ExternalLink size={12} />
                                  {lead.source === "MLS / Zillow"
                                    ? "MLS"
                                    : "Link"}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <button
                                className="leads-crm-btn"
                                title="Add to CRM pipeline"
                                onClick={() => handleAddedToCRM(lead.id)}
                              >
                                <CheckCheck size={14} />
                                CRM
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                >
                  <span className="pagination-summary">
                    {filtered.length === 0
                      ? "No leads"
                      : `${(safePage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`}
                  </span>
                </Pagination>
              </>
            )}
          </section>
        </>
      ) : (
        <>
          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "80ms" }}
          >
            <div className="panel-header">
              <div>
                <h2>Add Commercial Lead</h2>
                <p>Log a commercial property you want to track.</p>
              </div>
            </div>

            <form
              className="add-form leads-add-form"
              onSubmit={handleAddCommercialLead}
            >
              <div className="field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={commercialForm.name}
                  onChange={handleCommercialChange}
                  onBlur={trimFieldOnBlur(handleCommercialChange)}
                  placeholder="e.g. Office Building, Retail Strip…"
                />
              </div>

              <div className="field leads-address-field">
                <span>
                  Property Address <span className="required-star">*</span>
                </span>
                <div className="leads-input-icon-wrap">
                  <MapPin size={15} className="leads-field-icon" />
                  <input
                    type="text"
                    name="address"
                    value={commercialForm.address}
                    onChange={handleCommercialChange}
                    onBlur={trimFieldOnBlur(handleCommercialChange)}
                    placeholder="e.g. 500 Commerce St, Dallas, TX 75201"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <span>Source</span>
                <div className="leads-input-icon-wrap">
                  <Tag size={15} className="leads-field-icon" />
                  <input
                    type="text"
                    name="source"
                    value={commercialForm.source}
                    onChange={handleCommercialChange}
                    onBlur={trimFieldOnBlur(handleCommercialChange)}
                    placeholder="e.g. LoopNet, CoStar…"
                  />
                </div>
              </div>

              <div className="field">
                <span>State</span>
                <select
                  name="state"
                  value={commercialForm.state}
                  onChange={handleCommercialChange}
                  className="leads-select"
                >
                  <option value="">Select state…</option>
                  {STATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Website</span>
                <div className="leads-input-icon-wrap">
                  <Globe size={15} className="leads-field-icon" />
                  <input
                    type="url"
                    name="website"
                    value={commercialForm.website}
                    onChange={handleCommercialChange}
                    onBlur={trimFieldOnBlur(handleCommercialChange)}
                    placeholder="https://loopnet.com/…"
                  />
                </div>
              </div>

              <div className="field">
                <span>Phone</span>
                <div className="leads-input-icon-wrap">
                  <Phone size={15} className="leads-field-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={commercialForm.phone}
                    onChange={handleCommercialPhoneChange}
                    placeholder="555-000-0000"
                    maxLength={12}
                  />
                </div>
              </div>

              <div className="field">
                <span>Source Link</span>
                <div className="leads-input-icon-wrap">
                  <Link2 size={15} className="leads-field-icon" />
                  <input
                    type="url"
                    name="link"
                    value={commercialForm.link}
                    onChange={handleCommercialChange}
                    onBlur={trimFieldOnBlur(handleCommercialChange)}
                    placeholder="Direct link to listing…"
                  />
                </div>
              </div>

              {commercialError && (
                <p className="leads-form-error col-span-full">
                  {commercialError}
                </p>
              )}

              <button
                className="primary-btn form-btn"
                type="submit"
                disabled={!commercialForm.address.trim() || commercialSaving}
              >
                <Plus size={15} />
                {commercialSaving ? "Saving…" : "Add Lead"}
              </button>
            </form>
          </section>

          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "140ms" }}
          >
            <div className="panel-header leads-list-header">
              <div>
                <h2>Commercial Lead List</h2>
                <p>
                  {commercialLeads.length === 0
                    ? "No commercial leads yet."
                    : `${filteredCommercial.length} of ${commercialLeads.length} lead${commercialLeads.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="leads-filters">
                <div className="leads-search-wrap">
                  <Search size={13} className="leads-search-icon" />
                  <input
                    type="text"
                    placeholder="Search address, source or phone…"
                    value={commercialSearch}
                    onChange={(e) => {
                      setCommercialSearch(e.target.value);
                      setCommercialPage(1);
                    }}
                    className="leads-search-input"
                  />
                </div>
                <ClearFiltersButton
                  onClear={() => {
                    setCommercialSearch("");
                    setCommercialPage(1);
                  }}
                  hasActiveFilters={Boolean(commercialSearch)}
                  className="leads-clear-filters"
                  iconSize={13}
                />
              </div>
            </div>

            {commercialLeads.length === 0 ? (
              <div className="leads-empty">
                <p>Add your first commercial lead above to get started.</p>
              </div>
            ) : filteredCommercial.length === 0 ? (
              <div className="leads-empty">
                <p>No leads match the current search.</p>
              </div>
            ) : (
              <>
                <div
                  className="table-wrap leads-table-wrap"
                  style={{ overflowX: "auto" }}
                >
                  <table className="compact-table leads-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Address</th>
                        <th>State</th>
                        <th>Source</th>
                        <th>Website</th>
                        <th>Phone</th>
                        <th>Link</th>
                        <th>Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCommercial.map((lead) => (
                        <tr key={lead.id}>
                          <td>
                            <button
                              className="leads-delete-btn"
                              title="Delete lead"
                              onClick={() => handleDelete(lead.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                          <td>{lead.name || "—"}</td>
                          <td className="leads-address-cell">{lead.address}</td>
                          <td>{lead.state || "—"}</td>
                          <td>
                            {lead.source ? (
                              <span className="leads-source-badge">
                                {lead.source}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            {lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="leads-mls-link"
                                title={lead.website}
                              >
                                <Globe size={12} />
                                Site
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="leads-contact-link"
                              >
                                {lead.phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            {lead.link ? (
                              <a
                                href={lead.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="leads-mls-link"
                                title={lead.link}
                              >
                                <ExternalLink size={12} />
                                Link
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="leads-date-cell">
                            {formatDate(lead.dateAdded)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={safeCommercialPage}
                  totalPages={commercialTotalPages}
                  setCurrentPage={setCommercialPage}
                >
                  <span className="pagination-summary">
                    {filteredCommercial.length === 0
                      ? "No leads"
                      : `${(safeCommercialPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safeCommercialPage * ITEMS_PER_PAGE, filteredCommercial.length)} of ${filteredCommercial.length} lead${filteredCommercial.length !== 1 ? "s" : ""}`}
                  </span>
                </Pagination>
              </>
            )}
          </section>
        </>
      )}

      <LeadDetailModal
        isOpen={!!detailLead}
        onClose={() => setDetailLead(null)}
        lead={detailLead}
        onSave={handleLeadSave}
      />
    </>
  );
}
