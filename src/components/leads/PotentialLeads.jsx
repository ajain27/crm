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
} from "lucide-react";
import {
  formatPhone,
  findDuplicateByAddress,
  formatDate,
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
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterState, setFilterState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailLead, setDetailLead] = useState(null);

  function resetPage() {
    setCurrentPage(1);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "address") setFormError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddressBlur(e) {
    const duplicate = findDuplicateByAddress(leads, e.target.value);
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
    const duplicate = findDuplicateByAddress(leads, form.address);
    if (duplicate) {
      setFormError(`"${duplicate.address}" is already in your lead list.`);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const lead = {
        ...form,
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

  const minDate = todayStr();

  const filtered = leads
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

  const activeFilters = search || filterSource || filterState;
  const usedSources = [...new Set(leads.map((l) => l.source).filter(Boolean))];
  const usedStates = [
    ...new Set(leads.map((l) => parseAddress(l.address).state).filter(Boolean)),
  ].sort();

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

      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "80ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Add Lead</h2>
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
                      agentName: e.target.value.replace(/[^a-zA-Z\s'.]/g, ""),
                    }))
                  }
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
                    sellerName: e.target.value.replace(/[^a-zA-Z\s'.]/g, ""),
                  }))
                }
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

          <div className="field">
            <span>Email</span>
            <div className="leads-input-icon-wrap">
              <Mail size={15} className="leads-field-icon" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
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
            <h2>Lead List</h2>
            <p>
              {leads.length === 0
                ? "No leads yet."
                : `${filtered.length} of ${leads.length} lead${leads.length !== 1 ? "s" : ""}`}
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
            {activeFilters && (
              <button
                className="leads-clear-filters"
                onClick={() => {
                  setSearch("");
                  setFilterSource("");
                  setFilterState("");
                  resetPage();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {leads.length === 0 ? (
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
                        <td className="leads-address-cell">{lead.address}</td>
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
                              {lead.agentName && <span>{lead.agentName}</span>}
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
                          {lead.email ? (
                            <a
                              href={`mailto:${lead.email}`}
                              className="leads-contact-link"
                            >
                              {lead.email}
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
                              {lead.source === "MLS / Zillow" ? "MLS" : "Link"}
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

      <LeadDetailModal
        isOpen={!!detailLead}
        onClose={() => setDetailLead(null)}
        lead={detailLead}
        onSave={handleLeadSave}
      />
    </>
  );
}
