import { useState, useEffect } from "react";
import { Trash2, Plus, Eye, Upload, Loader2 } from "lucide-react";
import ContractPreviewModal from "../crm/components/data/modals/ContractPreviewModal";
import Modal from "../modal/Modal";
import {
  fmt,
  fmtCurrencyInput,
  parseCurrency,
  formatDate,
} from "../../utils/utils";

const MAX_FILE_SIZE = 700 * 1024;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(dateStr, months) {
  if (!dateStr || months <= 0) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdaysBetween(fromStr, toStr) {
  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T00:00:00");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return 0;
  let count = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + 1);
  while (cur <= to) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function computeDeal(deal, today) {
  const principal = parseCurrency(deal.amountLent);
  const rate = parseCurrency(deal.interestRate);
  const monthsNum = parseCurrency(deal.months);
  const dueDate =
    deal.lendDate && monthsNum > 0 ? addMonths(deal.lendDate, monthsNum) : "";
  const lateDays = dueDate ? weekdaysBetween(dueDate, today) : 0;
  const interest = principal > 0 && rate > 0 ? principal * (rate / 100) : 0;
  const lateFee = lateDays * 100;
  const totalPayout = principal + interest + lateFee;
  return { principal, dueDate, lateDays, interest, lateFee, totalPayout };
}

// Backward-compat: old deals stored a single file on the deal itself
function normalizeDeal(deal) {
  if (Array.isArray(deal.files)) return deal;
  const files = deal.fileId
    ? [
        {
          id: deal.fileId,
          name: deal.fileName || "File",
          type: deal.fileType || "",
          uploadedAt: deal.fileUploadedAt || "",
        },
      ]
    : [];
  return { ...deal, files };
}

function createEmptyForm() {
  return {
    borrowerName: "",
    borrowerCompany: "",
    propertyAddress: "",
    amountLent: "",
    interestRate: "",
    months: "",
    lendDate: "",
  };
}

export default function PMDealsTab({
  tab,
  currentUser,
  fetchPmDeals,
  savePmDeal,
  deletePmDealById,
  savePmDealFile,
  fetchPmDealFile,
  deletePmDealFileById,
}) {
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [fileDataCache, setFileDataCache] = useState({});
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const [today, setToday] = useState(todayStr);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [filterBorrower, setFilterBorrower] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  // Advance `today` exactly at midnight so late-day counts stay current
  useEffect(() => {
    function scheduleNextMidnight() {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
      return setTimeout(() => {
        setToday(todayStr());
        timerId = scheduleNextMidnight();
      }, msUntilMidnight);
    }
    let timerId = scheduleNextMidnight();
    return () => clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!fetchPmDeals || !currentUser?.id) return;
    fetchPmDeals(currentUser.id)
      .then((loaded) => setDeals(loaded.map(normalizeDeal)))
      .catch(() => {});
  }, [currentUser?.id]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "amountLent") {
      setForm((p) => ({ ...p, amountLent: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "interestRate") {
      setForm((p) => ({ ...p, interestRate: value.replace(/[^0-9.%]/g, "") }));
      return;
    }
    if (name === "months") {
      setForm((p) => ({ ...p, months: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (name === "interestRate" && value) {
      const n = value.replace(/[^0-9.]/g, "");
      if (n) setForm((p) => ({ ...p, interestRate: `${n}%` }));
    }
  }

  const isFormComplete =
    form.borrowerName.trim() &&
    form.amountLent &&
    form.interestRate &&
    form.months &&
    form.lendDate;

  async function handleAdd(e) {
    e.preventDefault();
    if (!isFormComplete) return;
    setSaving(true);
    try {
      const deal = {
        ...form,
        id: crypto.randomUUID(),
        userId: currentUser?.id || "",
        createdAt: today,
        files: [],
      };
      await savePmDeal(deal);
      setDeals((p) => [deal, ...p]);
      setForm(createEmptyForm());
    } catch {
      alert("Failed to save deal. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this PM deal?")) return;
    await deletePmDealById(id);
    setDeals((p) => p.filter((d) => d.id !== id));
  }

  async function handleFileUpload(deal, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("File must be smaller than 700 KB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      const fileId = crypto.randomUUID();
      const uploadedAt = new Date().toISOString();
      setUploadingId(deal.id);
      try {
        await savePmDealFile({
          id: fileId,
          pmDealId: deal.id,
          userId: currentUser?.id || "",
          name: file.name,
          type: file.type || "application/octet-stream",
          data,
          uploadedAt,
        });
        const newEntry = {
          id: fileId,
          name: file.name,
          type: file.type || "application/octet-stream",
          uploadedAt,
        };
        const updated = {
          ...deal,
          files: [...(deal.files || []), newEntry],
        };
        await savePmDeal(updated);
        setDeals((p) => p.map((d) => (d.id === deal.id ? updated : d)));
        setFileDataCache((p) => ({ ...p, [fileId]: data }));
      } catch {
        alert("Failed to upload file.");
      } finally {
        setUploadingId(null);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  async function openFile(deal) {
    if (!deal.files?.length) return;
    setSelectedDealId(deal.id);
    const first = deal.files[0];
    setSelectedFileId(first.id);
    if (fileDataCache[first.id]) return;
    setIsFetchingFile(true);
    try {
      const fetched = await fetchPmDealFile(deal.id, first.id);
      if (fetched?.data) {
        setFileDataCache((p) => ({ ...p, [first.id]: fetched.data }));
      }
    } catch {
      alert("Failed to load file.");
    } finally {
      setIsFetchingFile(false);
    }
  }

  async function handleSelectFileVersion(fileId) {
    setSelectedFileId(fileId);
    if (fileDataCache[fileId]) return;
    setIsFetchingFile(true);
    try {
      const fetched = await fetchPmDealFile(selectedDealId, fileId);
      if (fetched?.data) {
        setFileDataCache((p) => ({ ...p, [fileId]: fetched.data }));
      }
    } catch {
      alert("Failed to load file.");
    } finally {
      setIsFetchingFile(false);
    }
  }

  async function handleDeleteFile(modalDeal, fileId) {
    const deal = deals.find((d) => d.id === modalDeal.id);
    if (!deal) return;
    try {
      await deletePmDealFileById(deal.id, fileId);
      const updatedFiles = (deal.files || []).filter((f) => f.id !== fileId);
      const updated = { ...deal, files: updatedFiles };
      await savePmDeal(updated);
      setDeals((p) => p.map((d) => (d.id === deal.id ? updated : d)));
      setFileDataCache((p) => {
        const next = { ...p };
        delete next[fileId];
        return next;
      });
      if (updatedFiles.length === 0) {
        setSelectedDealId(null);
        setSelectedFileId(null);
      } else {
        setSelectedFileId(updatedFiles[0].id);
      }
    } catch {
      alert("Failed to delete file.");
    }
  }

  function closeModal() {
    setSelectedDealId(null);
    setSelectedFileId(null);
  }

  function handleRowClick(deal) {
    setEditingDeal(deal);
    setEditForm({
      borrowerName: deal.borrowerName || "",
      borrowerCompany: deal.borrowerCompany || "",
      propertyAddress: deal.propertyAddress || "",
      amountLent: deal.amountLent || "",
      interestRate: deal.interestRate || "",
      months: deal.months || "",
      lendDate: deal.lendDate || "",
    });
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "amountLent") {
      setEditForm((p) => ({ ...p, amountLent: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "interestRate") {
      setEditForm((p) => ({
        ...p,
        interestRate: value.replace(/[^0-9.%]/g, ""),
      }));
      return;
    }
    if (name === "months") {
      setEditForm((p) => ({ ...p, months: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setEditForm((p) => ({ ...p, [name]: value }));
  }

  function handleEditBlur(e) {
    const { name, value } = e.target;
    if (name === "interestRate" && value) {
      const n = value.replace(/[^0-9.]/g, "");
      if (n) setEditForm((p) => ({ ...p, interestRate: `${n}%` }));
    }
  }

  async function handleEditSave() {
    if (!editingDeal) return;
    setEditSaving(true);
    try {
      const updated = { ...editingDeal, ...editForm };
      await savePmDeal(updated);
      setDeals((p) => p.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDeal(null);
      setEditForm(null);
    } catch {
      alert("Failed to save changes. Check your connection.");
    } finally {
      setEditSaving(false);
    }
  }

  function closeEditModal() {
    setEditingDeal(null);
    setEditForm(null);
  }

  const filteredDeals = deals.filter((d) => {
    const bq = filterBorrower.trim().toLowerCase();
    const cq = filterCompany.trim().toLowerCase();
    if (bq && !d.borrowerName?.toLowerCase().includes(bq)) return false;
    if (cq && !d.borrowerCompany?.toLowerCase().includes(cq)) return false;
    return true;
  });

  // Build modal props from the selected deal
  const selectedDeal = deals.find((d) => d.id === selectedDealId) || null;
  const modalDeal = selectedDeal
    ? { id: selectedDeal.id, address: selectedDeal.borrowerName }
    : null;
  const fileVersions = selectedDeal?.files ?? [];
  const selectedFileVersion =
    fileVersions.find((f) => f.id === selectedFileId) ||
    fileVersions[0] ||
    null;
  const fileData = fileDataCache[selectedFileId] || "";
  const mimeType = selectedFileVersion?.type || "";

  return (
    <>
      <div className="deal-analyzer-hero">
        <span className="deal-analyzer-eyebrow">{tab.eyebrow}</span>
        <h2>{tab.title}</h2>
        <p>{tab.description}</p>
      </div>

      {/* ── Add form ─────────────────────────────────────────── */}
      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "80ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Add PML Deal</h2>
            <p>
              Payout = principal + flat interest. Late fee is $100/weekday after
              the due date.
            </p>
          </div>
        </div>

        <form className="add-form pm-deals-form" onSubmit={handleAdd}>
          <div className="field">
            <span>
              Property Address <span className="required-star">*</span>
            </span>
            <input
              name="propertyAddress"
              value={form.propertyAddress}
              onChange={handleChange}
              placeholder="123 Main St, Austin, TX"
              required
            />
          </div>

          <div className="field">
            <span>Borrower Company</span>
            <input
              name="borrowerCompany"
              value={form.borrowerCompany}
              onChange={handleChange}
              placeholder="Acme LLC"
            />
          </div>

          <div className="field">
            <span>Borrower Name</span>
            <input
              name="borrowerName"
              value={form.borrowerName}
              onChange={handleChange}
              placeholder="John Smith"
            />
          </div>

          <div className="field">
            <span>
              Amount Lent <span className="required-star">*</span>
            </span>
            <input
              name="amountLent"
              value={form.amountLent}
              onChange={handleChange}
              placeholder="$100,000"
              required
            />
          </div>

          <div className="field">
            <span>
              Interest Rate <span className="required-star">*</span>
            </span>
            <input
              name="interestRate"
              value={form.interestRate}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 22.5%"
              required
            />
          </div>

          <div className="field">
            <span>
              Months <span className="required-star">*</span>
            </span>
            <input
              name="months"
              value={form.months}
              onChange={handleChange}
              inputMode="numeric"
              placeholder="e.g. 12"
              required
            />
          </div>

          <div className="field">
            <span>
              Lend Date <span className="required-star">*</span>
            </span>
            <input
              type="date"
              name="lendDate"
              value={form.lendDate}
              onChange={handleChange}
              required
            />
          </div>

          <button
            className="primary-btn form-btn"
            type="submit"
            disabled={!isFormComplete || saving}
          >
            <Plus size={14} />
            {saving ? "Saving…" : "Add Deal"}
          </button>
        </form>
      </section>

      {/* ── Deals table ──────────────────────────────────────── */}
      <section
        className="panel"
        data-reveal="left"
        style={{ "--reveal-delay": "140ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>PML Deals</h2>
            <p>
              {deals.length === 0
                ? "No deals yet."
                : filteredDeals.length === deals.length
                  ? `${deals.length} deal${deals.length !== 1 ? "s" : ""}`
                  : `${filteredDeals.length} of ${deals.length} deal${deals.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {deals.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                value={filterBorrower}
                onChange={(e) => setFilterBorrower(e.target.value)}
                placeholder="Filter by borrower…"
                style={{
                  minWidth: 160,
                  border: "1px solid var(--input-border)",
                  borderRadius: 8,
                  padding: "0.4rem 0.65rem",
                  fontSize: "0.85rem",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              <input
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                placeholder="Filter by company…"
                style={{
                  minWidth: 160,
                  border: "1px solid var(--input-border)",
                  borderRadius: 8,
                  padding: "0.4rem 0.65rem",
                  fontSize: "0.85rem",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              {(filterBorrower || filterCompany) && (
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setFilterBorrower("");
                    setFilterCompany("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {deals.length === 0 ? (
          <div className="leads-empty">
            <p>Add your first PM deal above.</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="leads-empty">
            <p>No deals match your filters.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Borrower Name</th>
                  <th>Company</th>
                  <th>Property Address</th>
                  <th>Amount Lent</th>
                  <th>Rate</th>
                  <th>Term</th>
                  <th>Lend Date</th>
                  <th>Due Date</th>
                  <th>Days Late</th>
                  <th>Interest</th>
                  <th>Late Fee</th>
                  <th>Total Payout</th>
                  <th>Files</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => {
                  const {
                    principal,
                    dueDate,
                    lateDays,
                    interest,
                    lateFee,
                    totalPayout,
                  } = computeDeal(deal, today);
                  const isUploading = uploadingId === deal.id;
                  const fileCount = deal.files?.length ?? 0;

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => handleRowClick(deal)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{deal.borrowerName}</td>
                      <td>{deal.borrowerCompany || "—"}</td>
                      <td>{deal.propertyAddress || "—"}</td>
                      <td>{fmt(principal)}</td>
                      <td>{deal.interestRate}</td>
                      <td>{deal.months}</td>
                      <td>{formatDate(deal.lendDate)}</td>
                      <td>{dueDate ? formatDate(dueDate) : "—"}</td>
                      <td>
                        {dueDate ? (
                          <span
                            style={{
                              color: lateDays > 0 ? "#dc2626" : "inherit",
                              fontWeight: lateDays > 0 ? 600 : "inherit",
                            }}
                          >
                            {lateDays}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ color: "#16a34a", fontWeight: 600 }}>
                        {fmt(interest)}
                      </td>
                      <td
                        style={{
                          color: lateFee > 0 ? "#dc2626" : "inherit",
                          fontWeight: lateFee > 0 ? 600 : "inherit",
                        }}
                      >
                        {fmt(lateFee)}
                      </td>
                      <td style={{ color: "#16a34a", fontWeight: 600 }}>
                        {fmt(totalPayout)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="contract-actions">
                          {fileCount > 0 && (
                            <button
                              type="button"
                              className="secondary-btn contract-action-btn"
                              onClick={() => openFile(deal)}
                              title={`${fileCount} file${fileCount !== 1 ? "s" : ""} uploaded`}
                              aria-label={`View files for ${deal.borrowerName}`}
                            >
                              <Eye size={16} />
                              {fileCount > 1 && (
                                <span style={{ fontSize: 11, marginLeft: 2 }}>
                                  {fileCount}
                                </span>
                              )}
                            </button>
                          )}
                          <label
                            htmlFor={`pm-upload-${deal.id}`}
                            className="secondary-btn contract-action-btn"
                            title={isUploading ? "Uploading…" : "Upload file"}
                            aria-label={
                              isUploading
                                ? "Uploading…"
                                : `Upload file for ${deal.borrowerName}`
                            }
                            style={
                              isUploading
                                ? { opacity: 0.5, pointerEvents: "none" }
                                : undefined
                            }
                          >
                            {isUploading ? (
                              <Loader2 size={16} className="spin" />
                            ) : (
                              <Upload size={16} />
                            )}
                          </label>
                          <input
                            id={`pm-upload-${deal.id}`}
                            type="file"
                            className="contract-upload-input"
                            accept=".pdf,.odt,.odf,image/*"
                            disabled={isUploading}
                            onChange={(e) => handleFileUpload(deal, e)}
                          />
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="leads-delete-btn"
                          title="Delete deal"
                          onClick={() => handleDelete(deal.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const totals = filteredDeals.reduce(
                    (acc, d) => {
                      const { principal, interest, lateFee, totalPayout } =
                        computeDeal(d, today);
                      return {
                        principal: acc.principal + principal,
                        interest: acc.interest + interest,
                        lateFee: acc.lateFee + lateFee,
                        totalPayout: acc.totalPayout + totalPayout,
                      };
                    },
                    { principal: 0, interest: 0, lateFee: 0, totalPayout: 0 },
                  );
                  return (
                    <tr
                      style={{
                        fontWeight: 700,
                        borderTop: "2px solid var(--line)",
                      }}
                    >
                      <td
                        colSpan={3}
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Totals ({filteredDeals.length})
                      </td>
                      <td>{fmt(totals.principal)}</td>
                      <td colSpan={4} />
                      <td />
                      <td style={{ color: "#16a34a" }}>
                        {fmt(totals.interest)}
                      </td>
                      <td
                        style={{
                          color: totals.lateFee > 0 ? "#dc2626" : "inherit",
                        }}
                      >
                        {fmt(totals.lateFee)}
                      </td>
                      <td style={{ color: "#16a34a" }}>
                        {fmt(totals.totalPayout)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <ContractPreviewModal
        isOpen={!!selectedDeal}
        onClose={closeModal}
        selectedContractDeal={modalDeal}
        contractVersions={fileVersions}
        selectedContractVersion={selectedFileVersion}
        setSelectedContractVersionId={handleSelectFileVersion}
        isFetchingContract={isFetchingFile}
        selectedContractData={fileData}
        isImageContract={mimeType.startsWith("image/")}
        isPdfContract={mimeType === "application/pdf"}
        handleDeleteContractVersion={handleDeleteFile}
      />

      <Modal
        isOpen={!!editingDeal}
        onClose={closeEditModal}
        title="Edit PM Deal"
        style={{ maxWidth: 640 }}
        actions={
          <>
            <button className="secondary-btn" onClick={closeEditModal}>
              Cancel
            </button>
            <button
              className="primary-btn"
              onClick={handleEditSave}
              disabled={editSaving}
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </button>
          </>
        }
      >
        {editForm && (
          <form
            className="add-form pm-deals-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleEditSave();
            }}
          >
            <div className="field">
              <span>Property Address</span>
              <input
                name="propertyAddress"
                value={editForm.propertyAddress}
                onChange={handleEditChange}
                placeholder="123 Main St, Austin, TX"
              />
            </div>
            <div className="field">
              <span>Borrower Name</span>
              <input
                name="borrowerName"
                value={editForm.borrowerName}
                onChange={handleEditChange}
                placeholder="John Smith"
              />
            </div>
            <div className="field">
              <span>Borrower Company</span>
              <input
                name="borrowerCompany"
                value={editForm.borrowerCompany}
                onChange={handleEditChange}
                placeholder="Acme LLC"
              />
            </div>
            <div className="field">
              <span>Amount Lent</span>
              <input
                name="amountLent"
                value={editForm.amountLent}
                onChange={handleEditChange}
                placeholder="$100,000"
              />
            </div>
            <div className="field">
              <span>Interest Rate</span>
              <input
                name="interestRate"
                value={editForm.interestRate}
                onChange={handleEditChange}
                onBlur={handleEditBlur}
                placeholder="e.g. 22.5%"
              />
            </div>
            <div className="field">
              <span>Months</span>
              <input
                name="months"
                value={editForm.months}
                onChange={handleEditChange}
                inputMode="numeric"
                placeholder="e.g. 12"
              />
            </div>
            <div className="field">
              <span>Lend Date</span>
              <input
                type="date"
                name="lendDate"
                value={editForm.lendDate}
                onChange={handleEditChange}
              />
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
