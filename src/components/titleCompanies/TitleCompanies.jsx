import { useState, useEffect } from "react";
import { Trash2, Plus, X, Building2, Download } from "lucide-react";
import Modal from "../modal/Modal";
import { Select, AccordionHeaderCell } from "../elements/elements";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import { TITLE_COMPANY_DIRECTORY } from "./titleCompanyDirectory";
import "./TitleCompanies.css";

function createEmptyForm() {
  return {
    name: "",
    contact: "",
    phone: "",
    state: "",
    emailInput: "",
    emails: [],
    notes: "",
  };
}

const norm = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// The same company can serve several states, so a duplicate is the same
// name in the same state (or in any state, until one is picked).
function findDuplicateCompany(companies, name, state, excludeId = null) {
  if (!norm(name)) return null;
  return (
    companies.find(
      (c) =>
        c.id !== excludeId &&
        norm(c.name) === norm(name) &&
        (!state || c.state === state),
    ) ?? null
  );
}

function duplicateMessage(dup) {
  return `"${dup.name}"${dup.state ? ` (${dup.state})` : ""} is already in your list.`;
}

const SEARCH_FIELDS = ["name", "contact", "phone", "notes", "state"];

function matchesSearch(company, query) {
  const q = norm(query);
  if (!q) return true;
  return (
    SEARCH_FIELDS.some((f) => norm(company[f]).includes(q)) ||
    (company.emails || []).some((e) => norm(e).includes(q))
  );
}

function isComplete(form) {
  return form.name.trim() && form.state.trim();
}

function flushEmails(form) {
  const pending = form.emailInput.trim().toLowerCase();
  return pending && !form.emails.includes(pending)
    ? [...form.emails, pending]
    : form.emails;
}

export default function TitleCompanies({
  currentUser,
  fetchTitleCompanies,
  saveTitleCompany,
  deleteTitleCompanyById,
}) {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterState, setFilterState] = useState("All");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editNameError, setEditNameError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!fetchTitleCompanies || !currentUser?.id) return;
    fetchTitleCompanies(currentUser.id)
      .then(setCompanies)
      .catch(() => {});
  }, [currentUser?.id]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "name" || name === "state") setNameError("");
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "state") {
      const dup = findDuplicateCompany(companies, form.name, value);
      if (dup) setNameError(duplicateMessage(dup));
    }
  }

  function handleNameBlur(e) {
    const dup = findDuplicateCompany(companies, e.target.value, form.state);
    if (dup) setNameError(duplicateMessage(dup));
  }

  function handleAddEmail() {
    const email = form.emailInput.trim().toLowerCase();
    if (!email || form.emails.includes(email)) return;
    setForm((p) => ({ ...p, emails: [...p.emails, email], emailInput: "" }));
  }

  function handleRemoveEmail(email) {
    setForm((p) => ({ ...p, emails: p.emails.filter((e) => e !== email) }));
  }

  function handleEmailKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!isComplete(form)) return;
    setSaving(true);
    try {
      const company = {
        id: crypto.randomUUID(),
        userId: currentUser?.id || "",
        name: form.name.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim(),
        state: form.state,
        emails: flushEmails(form),
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
      };
      await saveTitleCompany(company);
      setCompanies((p) => [company, ...p]);
      setForm(createEmptyForm());
    } catch {
      alert("Failed to save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this title company?")) return;
    await deleteTitleCompanyById(id);
    setCompanies((p) => p.filter((c) => c.id !== id));
  }

  function openEdit(company) {
    setEditingCompany(company);
    setEditNameError("");
    setEditForm({
      name: company.name || "",
      contact: company.contact || "",
      phone: company.phone || "",
      state: company.state || "",
      emailInput: "",
      emails: Array.isArray(company.emails) ? [...company.emails] : [],
      notes: company.notes || "",
    });
  }

  function closeEdit() {
    setEditingCompany(null);
    setEditForm(null);
    setEditNameError("");
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "name" || name === "state") setEditNameError("");
    setEditForm((p) => ({ ...p, [name]: value }));
    if (name === "state") {
      const dup = findDuplicateCompany(
        companies,
        editForm.name,
        value,
        editingCompany?.id,
      );
      if (dup) setEditNameError(duplicateMessage(dup));
    }
  }

  function handleEditNameBlur(e) {
    const dup = findDuplicateCompany(
      companies,
      e.target.value,
      editForm.state,
      editingCompany?.id,
    );
    if (dup) setEditNameError(duplicateMessage(dup));
  }

  function handleEditAddEmail() {
    const email = editForm.emailInput.trim().toLowerCase();
    if (!email || editForm.emails.includes(email)) return;
    setEditForm((p) => ({
      ...p,
      emails: [...p.emails, email],
      emailInput: "",
    }));
  }

  function handleEditRemoveEmail(email) {
    setEditForm((p) => ({ ...p, emails: p.emails.filter((e) => e !== email) }));
  }

  function handleEditEmailKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditAddEmail();
    }
  }

  async function handleEditSave() {
    if (!editingCompany) return;
    setEditSaving(true);
    try {
      const updated = {
        ...editingCompany,
        name: editForm.name.trim(),
        contact: editForm.contact.trim(),
        phone: editForm.phone.trim(),
        state: editForm.state,
        emails: flushEmails(editForm),
        notes: editForm.notes.trim(),
      };
      await saveTitleCompany(updated);
      setCompanies((p) => p.map((c) => (c.id === updated.id ? updated : c)));
      closeEdit();
    } catch {
      alert("Failed to save changes. Check your connection.");
    } finally {
      setEditSaving(false);
    }
  }

  const stateOptions = [
    "All",
    ...new Set(
      companies
        .map((c) => c.state)
        .filter(Boolean)
        .sort(),
    ),
  ];

  const filtered = companies
    .filter((c) => filterState === "All" || c.state === filterState)
    .filter((c) => matchesSearch(c, search))
    .sort(
      (a, b) =>
        (a.state || "").localeCompare(b.state || "") ||
        (a.name || "").localeCompare(b.name || ""),
    );

  // Directory entries not yet in the user's list (same name + state).
  const missingDirectoryEntries = TITLE_COMPANY_DIRECTORY.filter(
    (entry) => !findDuplicateCompany(companies, entry.name, entry.state),
  );

  async function handleImportDirectory() {
    const count = missingDirectoryEntries.length;
    if (!count) return;
    if (
      !window.confirm(
        `Add ${count} recommended title compan${count !== 1 ? "ies" : "y"} to your list?`,
      )
    )
      return;
    setImporting(true);
    const now = new Date().toISOString();
    const added = [];
    try {
      for (const entry of missingDirectoryEntries) {
        const company = {
          ...entry,
          id: crypto.randomUUID(),
          userId: currentUser?.id || "",
          createdAt: now,
        };
        await saveTitleCompany(company);
        added.push(company);
      }
    } catch {
      alert(
        `Imported ${added.length} of ${count}. Check your connection and try again to add the rest.`,
      );
    } finally {
      setCompanies((p) => [...added, ...p]);
      setImporting(false);
    }
  }

  const hasFilters = filterState !== "All" || norm(search) !== "";

  return (
    <>
      <header className="page-header" data-reveal="left">
        <div>
          <h1>Title Companies</h1>
          <span>Manage your closing contacts by state.</span>
        </div>
        {missingDirectoryEntries.length > 0 && (
          <button
            type="button"
            className="secondary-btn"
            onClick={handleImportDirectory}
            disabled={importing}
          >
            <Download size={14} />
            {importing
              ? "Importing…"
              : `Import Directory (${missingDirectoryEntries.length})`}
          </button>
        )}
      </header>

      {/* ── Add form ─────────────────────────────────────── */}
      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "80ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Add Title Company</h2>
            <p>Name and state are required.</p>
          </div>
        </div>

        <form className="tc-add-form" onSubmit={handleAdd}>
          <div className="tc-inline-row">
            <div className="tc-field">
              <span className="tc-row-label">
                Company Name <span className="required-star">*</span>
              </span>
              <input
                className="tc-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
                placeholder="First American Title"
              />
            </div>
            <div className="tc-field">
              <span className="tc-row-label">Point of Contact</span>
              <input
                className="tc-control"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Escrow officer"
              />
            </div>
            <div className="tc-field">
              <span className="tc-row-label">Phone</span>
              <input
                className="tc-control"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="555-000-0000"
              />
            </div>
            <div className="tc-field">
              <span className="tc-row-label">
                State <span className="required-star">*</span>
              </span>
              <select
                className="tc-control tc-control--select"
                name="state"
                value={form.state}
                onChange={handleChange}
              >
                {STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tc-field">
              <span className="tc-row-label">Email</span>
              <div className="tc-email-input-row">
                <input
                  name="emailInput"
                  type="text"
                  value={form.emailInput}
                  onChange={handleChange}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="closing@titleco.com"
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleAddEmail}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          </div>

          {nameError && (
            <span className="field-error tc-name-error">{nameError}</span>
          )}

          {form.emails.length > 0 && (
            <div className="tc-email-chips tc-chips-below">
              {form.emails.map((email) => (
                <span key={email} className="tc-email-chip">
                  {email}
                  <button
                    type="button"
                    className="tc-chip-remove"
                    onClick={() => handleRemoveEmail(email)}
                    aria-label={`Remove ${email}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="tc-field tc-notes-field">
            <span className="tc-row-label">Notes</span>
            <textarea
              className="tc-control tc-notes-input"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="How was it working with them?"
              rows={2}
            />
          </div>

          <div className="tc-submit-row">
            <button
              className="primary-btn"
              type="submit"
              disabled={!isComplete(form) || !!nameError || saving}
            >
              <Plus size={14} />
              {saving ? "Saving…" : "Add Company"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Table ────────────────────────────────────────── */}
      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "140ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Title Companies</h2>
            <p>
              {companies.length === 0
                ? "No companies yet."
                : filtered.length === companies.length
                  ? `${companies.length} compan${companies.length !== 1 ? "ies" : "y"}`
                  : `${filtered.length} of ${companies.length} companies`}
            </p>
          </div>
          {companies.length > 0 && (
            <div className="tc-filters">
              <label className="tc-search">
                <span className="tc-row-label">Search</span>
                <input
                  className="tc-control"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Company, contact, email, notes…"
                />
              </label>
              <Select
                label="Filter by State"
                name="filterState"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                options={stateOptions}
              />
              {hasFilters && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSearch("");
                    setFilterState("All");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {companies.length === 0 ? (
          <div className="tc-empty">
            <Building2 size={32} className="tc-empty-icon" />
            <p>No title companies yet.</p>
            <span>
              Add your first one above, or use Import Directory to load the
              recommended list.
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="tc-empty">
            <p>No companies match your filters.</p>
          </div>
        ) : (
          <div className="table-wrap acc-card-container">
            <table className="compact-table acc-card">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>State</th>
                  <th>Point of Contact</th>
                  <th>Phone</th>
                  <th>Emails</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr
                    key={company.id}
                    className="tc-row"
                    onClick={() => openEdit(company)}
                  >
                    <AccordionHeaderCell
                      id={company.id}
                      label="Company Name"
                      value={company.name}
                      className="tc-name"
                    />
                    <td data-label="State">
                      <span className="tc-state-badge">
                        {company.state || "—"}
                      </span>
                    </td>
                    <td data-label="Point of Contact">
                      {company.contact || <span className="tc-muted">—</span>}
                    </td>
                    <td className="tc-muted tc-phone" data-label="Phone">
                      {company.phone || "—"}
                    </td>
                    <td className="acc-col-block" data-label="Emails">
                      {company.emails?.length ? (
                        <div className="tc-email-chips tc-email-chips--table">
                          {company.emails.map((email) => (
                            <span key={email} className="tc-email-chip">
                              {email}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="tc-muted">—</span>
                      )}
                    </td>
                    <td className="acc-col-block" data-label="Notes">
                      {company.notes ? (
                        <span className="tc-notes" title={company.notes}>
                          {company.notes}
                        </span>
                      ) : (
                        <span className="tc-muted">—</span>
                      )}
                    </td>
                    <td
                      className="acc-col-action-mobile"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="leads-delete-btn acc-delete-btn"
                        title="Delete company"
                        onClick={() => handleDelete(company.id)}
                      >
                        <Trash2 size={14} />
                        <span className="acc-delete-label">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Edit modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!editingCompany}
        onClose={closeEdit}
        title={editingCompany?.name || "Edit Title Company"}
        style={{ maxWidth: 640, height: "auto", minHeight: 320 }}
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
                !editForm?.name?.trim() ||
                !editForm?.state?.trim() ||
                !!editNameError
              }
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </button>
          </>
        }
      >
        {editForm && (
          <div className="tc-modal-body">
            <div className="tc-form--modal">
              <label className="field">
                <span>Company Name</span>
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  onBlur={handleEditNameBlur}
                  placeholder="First American Title"
                />
                {editNameError && (
                  <span className="field-error">{editNameError}</span>
                )}
              </label>

              <label className="field">
                <span>Point of Contact</span>
                <input
                  name="contact"
                  value={editForm.contact}
                  onChange={handleEditChange}
                  placeholder="Escrow officer"
                />
              </label>

              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  placeholder="555-000-0000"
                />
              </label>

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

              <div className="field tc-email-field">
                <span>Emails</span>
                <div className="tc-email-input-row">
                  <input
                    name="emailInput"
                    type="text"
                    value={editForm.emailInput}
                    onChange={handleEditChange}
                    onKeyDown={handleEditEmailKeyDown}
                    placeholder="closing@titleco.com"
                  />
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleEditAddEmail}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                {editForm.emails.length > 0 && (
                  <div className="tc-email-chips">
                    {editForm.emails.map((email) => (
                      <span key={email} className="tc-email-chip">
                        {email}
                        <button
                          type="button"
                          className="tc-chip-remove"
                          onClick={() => handleEditRemoveEmail(email)}
                          aria-label={`Remove ${email}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="field tc-email-field">
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  placeholder="How was it working with them?"
                  rows={5}
                />
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
