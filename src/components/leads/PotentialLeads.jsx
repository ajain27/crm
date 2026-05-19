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
  Upload,
  Eye,
  Loader2,
} from "lucide-react";
import { formatPhone } from "../../utils/utils";
import { createEmptyDealForm } from "../wholesale/components/wholesaleConfig";
import ContractPreviewModal from "../wholesale/components/data/modals/ContractPreviewModal";
import LeadDetailModal from "./LeadDetailModal";
import "./Leads.css";

const MAX_FILE_SIZE = 750 * 1024;

function getLeadFiles(lead) {
  return Array.isArray(lead?.fileVersions)
    ? lead.fileVersions.filter((f) => f?.id)
    : [];
}

function createLeadFile({ name, type, data }) {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    data,
    uploadedAt: new Date().toISOString(),
  };
}

const SOURCES = [
  "Driving for Dollars",
  "MLS / Zillow",
  "Facebook / Instagram",
  "Direct Mail",
  "Cold Call",
  "Referral",
  "PropStream",
  "Propwire",
  "Auction.com",
  "Other",
];

function createEmptyForm() {
  return {
    address: "",
    source: "",
    agentName: "",
    agentPhone: "",
    url: "",
    followUpDate: "",
    email: "",
    phone: "",
    notes: "",
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
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

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
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
  const [filterStatus, setFilterStatus] = useState("");
  const [detailLead, setDetailLead] = useState(null);

  // File management
  const [uploadingLeadId, setUploadingLeadId] = useState(null);
  const [fileDataCache, setFileDataCache] = useState({});
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const [selectedFileLeadId, setSelectedFileLeadId] = useState(null);
  const [selectedFileVersionId, setSelectedFileVersionId] = useState(null);

  async function openFiles(lead) {
    const versions = getLeadFiles(lead);
    if (versions.length === 0) return;
    setSelectedFileLeadId(lead.id);
    setSelectedFileVersionId(versions[0].id);
    const uncached = versions.filter((v) => !fileDataCache[v.id]);
    if (uncached.length === 0) return;
    setIsFetchingFile(true);
    try {
      const fetched = await Promise.all(
        uncached.map((v) => fetchLeadFile(lead.id, v.id)),
      );
      setFileDataCache((prev) => {
        const next = { ...prev };
        fetched.forEach((doc) => {
          if (doc?.id) next[doc.id] = doc.data || "";
        });
        return next;
      });
    } finally {
      setIsFetchingFile(false);
    }
  }

  function handleFileUpload(lead, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const supported =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      /\.(odt|odf)$/i.test(file.name);
    if (!supported) {
      alert("Please choose a PDF, ODT, or image file.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(
        "File must be smaller than 750 KB (Firestore document size limit).",
      );
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      const newFile = createLeadFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        data,
      });
      const existing = getLeadFiles(lead);
      const nextVersions = [newFile, ...existing];
      setUploadingLeadId(lead.id);
      try {
        await saveLeadFile({
          id: newFile.id,
          leadId: lead.id,
          userId: currentUser.id,
          name: newFile.name,
          type: newFile.type,
          data,
          uploadedAt: newFile.uploadedAt,
        });
        setFileDataCache((prev) => ({ ...prev, [newFile.id]: data }));
        const updated = {
          ...lead,
          fileVersions: nextVersions.map(({ data: _d, ...rest }) => rest),
        };
        await saveLead(updated);
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      } catch (err) {
        alert(`Upload failed. ${err?.message || ""}`);
      } finally {
        setUploadingLeadId(null);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleDeleteLeadFile(lead, versionId) {
    const versions = getLeadFiles(lead);
    const target = versions.find((v) => v.id === versionId);
    if (!target || !window.confirm(`Delete "${target.name}"?`)) return;
    try {
      await deleteLeadFileById(lead.id, versionId);
      setFileDataCache((prev) => {
        const n = { ...prev };
        delete n[versionId];
        return n;
      });
    } catch {
      /* ignore */
    }
    const nextVersions = versions.filter((v) => v.id !== versionId);
    const updated = { ...lead, fileVersions: nextVersions };
    await saveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    if (selectedFileLeadId === lead.id) {
      nextVersions.length > 0
        ? setSelectedFileVersionId((cur) =>
            cur === versionId ? nextVersions[0].id : cur,
          )
        : (setSelectedFileLeadId(null), setSelectedFileVersionId(null));
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhoneChange(e) {
    setForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }));
  }

  async function handleAddLead(e) {
    e.preventDefault();
    if (!form.address.trim()) return;
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
      if (search && !l.address.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filterSource && l.source !== filterSource) return false;
      if (filterStatus) {
        const s = followUpStatus(l.followUpDate);
        if (filterStatus === "none" && l.followUpDate) return false;
        if (filterStatus !== "none" && s !== filterStatus) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (!a.followUpDate) return 1;
      if (!b.followUpDate) return -1;
      return a.followUpDate.localeCompare(b.followUpDate);
    });

  const activeFilters = search || filterSource || filterStatus;
  const usedSources = [...new Set(leads.map((l) => l.source).filter(Boolean))];

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

          <div className="field">
            <span>Follow-Up Date</span>
            <input
              type="date"
              name="followUpDate"
              value={form.followUpDate}
              onChange={handleChange}
              min={minDate}
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

          {formError && (
            <p className="leads-form-error col-span-full">{formError}</p>
          )}

          <button
            className="primary-btn form-btn"
            type="submit"
            disabled={!form.address.trim() || saving}
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
                placeholder="Search address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="leads-search-input"
              />
            </div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="leads-filter-select"
            >
              <option value="">All statuses</option>
              <option value="overdue">Overdue</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">No date set</option>
            </select>
            {activeFilters && (
              <button
                className="leads-clear-filters"
                onClick={() => {
                  setSearch("");
                  setFilterSource("");
                  setFilterStatus("");
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
          <div className="table-wrap leads-table-wrap">
            <table className="compact-table leads-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Address</th>
                  <th>Source</th>
                  <th>Agent</th>
                  <th>Follow-Up</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Added</th>
                  <th>MLS Link</th>
                  <th>Files</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const status = followUpStatus(lead.followUpDate);
                  const leadFiles = getLeadFiles(lead);
                  const isUploading = uploadingLeadId === lead.id;
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
                        <div className="leads-file-actions">
                          {leadFiles.length > 0 && (
                            <button
                              className="secondary-btn contract-action-btn"
                              title="View files"
                              onClick={() => openFiles(lead)}
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <label
                            htmlFor={`lead-file-${lead.id}`}
                            className="secondary-btn contract-action-btn"
                            title={isUploading ? "Uploading…" : "Upload file"}
                            style={
                              isUploading
                                ? { opacity: 0.5, pointerEvents: "none" }
                                : undefined
                            }
                          >
                            {isUploading ? (
                              <Loader2 size={14} className="spin" />
                            ) : (
                              <Upload size={14} />
                            )}
                          </label>
                          <input
                            id={`lead-file-${lead.id}`}
                            type="file"
                            accept=".pdf,.odt,.odf,image/*"
                            className="contract-upload-input"
                            onChange={(e) => handleFileUpload(lead, e)}
                          />
                        </div>
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
        )}
      </section>

      <LeadDetailModal
        isOpen={!!detailLead}
        onClose={() => setDetailLead(null)}
        lead={detailLead}
        onSave={handleLeadSave}
      />

      {(() => {
        const fileLead = leads.find((l) => l.id === selectedFileLeadId);
        const versions = getLeadFiles(fileLead || {});
        const selectedVersion =
          versions.find((v) => v.id === selectedFileVersionId) || null;
        const mimeType = selectedVersion?.type || "";
        return (
          <ContractPreviewModal
            isOpen={!!selectedFileLeadId}
            onClose={() => {
              setSelectedFileLeadId(null);
              setSelectedFileVersionId(null);
            }}
            selectedContractDeal={fileLead || null}
            contractVersions={versions}
            selectedContractVersion={selectedVersion}
            setSelectedContractVersionId={setSelectedFileVersionId}
            isFetchingContract={isFetchingFile}
            selectedContractData={fileDataCache[selectedFileVersionId] || ""}
            isImageContract={mimeType.startsWith("image/")}
            isPdfContract={mimeType === "application/pdf"}
            handleDeleteContractVersion={(deal, versionId) =>
              handleDeleteLeadFile(deal, versionId)
            }
          />
        );
      })()}
    </>
  );
}
