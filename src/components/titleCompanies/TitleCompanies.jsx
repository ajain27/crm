import { useState, useEffect } from "react";
import { Trash2, Plus, X, Building2 } from "lucide-react";
import Modal from "../modal/Modal";
import { Select } from "../elements/elements";
import { formatPhone, findDuplicateByField } from "../../utils/utils";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import "./TitleCompanies.css";

function createEmptyForm() {
  return { name: "", phone: "", state: "", emailInput: "", emails: [] };
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
    if (name === "name") setNameError("");
    setForm((p) => ({
      ...p,
      [name]: name === "phone" ? formatPhone(value) : value,
    }));
  }

  function handleNameBlur(e) {
    const value = e.target.value;
    if (!value.trim()) return;
    const dup = findDuplicateByField(companies, "name", value);
    if (dup) setNameError(`"${dup.name}" is already in your list.`);
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
        phone: form.phone,
        state: form.state,
        emails: flushEmails(form),
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
      phone: company.phone || "",
      state: company.state || "",
      emailInput: "",
      emails: Array.isArray(company.emails) ? [...company.emails] : [],
    });
  }

  function closeEdit() {
    setEditingCompany(null);
    setEditForm(null);
    setEditNameError("");
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "name") setEditNameError("");
    setEditForm((p) => ({
      ...p,
      [name]: name === "phone" ? formatPhone(value) : value,
    }));
  }

  function handleEditNameBlur(e) {
    const value = e.target.value;
    if (!value.trim()) return;
    const dup = findDuplicateByField(
      companies,
      "name",
      value,
      editingCompany?.id,
    );
    if (dup) setEditNameError(`"${dup.name}" is already in your list.`);
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
        phone: editForm.phone,
        state: editForm.state,
        emails: flushEmails(editForm),
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

  const filtered =
    filterState === "All"
      ? companies
      : companies.filter((c) => c.state === filterState);

  return (
    <>
      <header className="page-header" data-reveal="left">
        <div>
          <h1>Title Companies</h1>
          <span>Manage your closing contacts by state.</span>
        </div>
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
            {/* Row 1 — labels */}
            <span className="tc-row-label">
              Company Name <span className="required-star">*</span>
            </span>
            <span className="tc-row-label">Phone</span>
            <span className="tc-row-label">
              State <span className="required-star">*</span>
            </span>
            <span className="tc-row-label">Email</span>

            {/* Row 2 — controls */}
            <input
              className="tc-control"
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleNameBlur}
              placeholder="First American Title"
            />
            <input
              className="tc-control"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="555-000-0000"
              maxLength={12}
            />
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
            <Select
              label="Filter by State"
              name="filterState"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              options={stateOptions}
            />
          )}
        </div>

        {companies.length === 0 ? (
          <div className="tc-empty">
            <Building2 size={32} className="tc-empty-icon" />
            <p>No title companies yet.</p>
            <span>Add your first one above.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="tc-empty">
            <p>No companies match the selected state.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>State</th>
                  <th>Phone</th>
                  <th>Emails</th>
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
                    <td className="tc-name">{company.name}</td>
                    <td>
                      <span className="tc-state-badge">
                        {company.state || "—"}
                      </span>
                    </td>
                    <td className="tc-muted">{company.phone || "—"}</td>
                    <td>
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
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="leads-delete-btn"
                        title="Delete company"
                        onClick={() => handleDelete(company.id)}
                      >
                        <Trash2 size={14} />
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
                <span>Phone</span>
                <input
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  placeholder="555-000-0000"
                  maxLength={12}
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
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
