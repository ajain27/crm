import { useState, useEffect } from "react";
import { Eye, Upload, Loader2, Pencil, Check } from "lucide-react";
import Modal from "../modal/Modal";
import { fmt, formatDate } from "../../utils/utils";
import "./PMDealsTable.css";

function ReadOnlyField({ label, value }) {
  return (
    <div className="pm-record-detail">
      <span className="pm-detail-label">{label}:</span>
      <span className="pm-detail-value">{value || "—"}</span>
    </div>
  );
}

export default function PMDealEditModal({
  editingDeal,
  editForm,
  editSaving,
  dueDate,
  lateDays = 0,
  interest = 0,
  lateFee = 0,
  totalPayout = 0,
  isUploading,
  onOpenFile,
  onFileUpload,
  onClose,
  onSave,
  onChange,
  onBlur,
  onDelete,
}) {
  const fileCount = editingDeal?.files?.length ?? 0;
  const [isEditing, setIsEditing] = useState(false);

  // PMDealEditModal stays mounted between opens (only the inner <Modal>
  // conditionally renders), so this toggle must be reset explicitly —
  // otherwise re-opening the modal resumes edit mode from last time.
  useEffect(() => {
    setIsEditing(false);
  }, [editingDeal]);

  return (
    <Modal
      isOpen={!!editingDeal}
      onClose={onClose}
      title={
        editForm?.borrowerName || editingDeal?.borrowerName || "Edit PM Deal"
      }
      className="pm-deal-edit-modal"
      style={{ maxWidth: 760, width: "min(760px, 96vw)" }}
      actions={
        <>
          <button className="danger-btn pm-delete-deal-btn" onClick={onDelete}>
            Delete Deal
          </button>
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={onSave}
            disabled={editSaving}
          >
            {editSaving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {editForm && (
        <form
          className="add-form pm-deals-form pm-deal-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="pm-section-header">
            <span className="pm-section-label">Deal Info</span>
            <button
              type="button"
              className="pm-edit-toggle-btn"
              onClick={() => setIsEditing((v) => !v)}
              title={isEditing ? "Done editing" : "Edit"}
            >
              {isEditing ? <Check size={14} /> : <Pencil size={14} />}
            </button>
          </div>

          {isEditing ? (
            <>
              <div className="field">
                <span>Borrower Name</span>
                <input
                  name="borrowerName"
                  value={editForm.borrowerName}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="John Smith"
                />
              </div>
              <div className="field">
                <span>Borrower Company</span>
                <input
                  name="borrowerCompany"
                  value={editForm.borrowerCompany}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Acme LLC"
                />
              </div>
              <div className="field">
                <span>Amount Lent</span>
                <input
                  name="amountLent"
                  value={editForm.amountLent}
                  onChange={onChange}
                  placeholder="$100,000"
                />
              </div>
              <div className="field">
                <span>Interest Rate</span>
                <input
                  name="interestRate"
                  value={editForm.interestRate}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. 22.5%"
                />
              </div>
              <div className="field">
                <span>Months</span>
                <input
                  name="months"
                  value={editForm.months}
                  onChange={onChange}
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
                  onChange={onChange}
                />
              </div>
            </>
          ) : (
            <div className="pm-readonly-card">
              <div className="pm-record-details">
                <ReadOnlyField
                  label="Borrower Name"
                  value={editForm.borrowerName}
                />
                <ReadOnlyField
                  label="Borrower Company"
                  value={editForm.borrowerCompany}
                />
                <ReadOnlyField
                  label="Amount Lent"
                  value={editForm.amountLent}
                />
                <ReadOnlyField
                  label="Interest Rate"
                  value={editForm.interestRate}
                />
                <ReadOnlyField label="Months" value={editForm.months} />
                <ReadOnlyField
                  label="Lend Date"
                  value={editForm.lendDate ? formatDate(editForm.lendDate) : ""}
                />
              </div>
            </div>
          )}

          <label className="field">
            <span>Due Date</span>
            <span
              className="readonly-input"
              style={
                lateDays > 0 ? { color: "#dc2626", fontWeight: 600 } : undefined
              }
            >
              {dueDate ? formatDate(dueDate) : "—"}
            </span>
          </label>
          <label className="field">
            <span>Days Late</span>
            <span
              className="readonly-input"
              style={
                lateDays > 0 ? { color: "#dc2626", fontWeight: 600 } : undefined
              }
            >
              {lateDays}
            </span>
          </label>
          <label className="field">
            <span>Interest</span>
            <span
              className="readonly-input"
              style={{ color: "#16a34a", fontWeight: 600 }}
            >
              {fmt(interest)}
            </span>
          </label>
          <label className="field">
            <span>Late Fee</span>
            <span
              className="readonly-input"
              style={
                lateFee > 0 ? { color: "#dc2626", fontWeight: 600 } : undefined
              }
            >
              {fmt(lateFee)}
            </span>
          </label>
          <label className="field">
            <span>Total Payout</span>
            <span
              className="readonly-input"
              style={{ color: "#16a34a", fontWeight: 600 }}
            >
              {fmt(totalPayout)}
            </span>
          </label>
          <div className="field">
            <span>Files</span>
            <div className="contract-actions">
              {fileCount > 0 && (
                <button
                  type="button"
                  className="secondary-btn contract-action-btn"
                  onClick={() => onOpenFile(editingDeal)}
                  title={`${fileCount} file${fileCount !== 1 ? "s" : ""} uploaded`}
                  aria-label={`View files for ${editingDeal.borrowerName}`}
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
                htmlFor="pm-deal-modal-upload"
                className="secondary-btn contract-action-btn"
                title={isUploading ? "Uploading…" : "Upload file"}
                aria-label={
                  isUploading
                    ? "Uploading…"
                    : `Upload file for ${editingDeal.borrowerName}`
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
                id="pm-deal-modal-upload"
                type="file"
                className="contract-upload-input"
                accept=".pdf,.odt,.odf,image/*"
                disabled={isUploading}
                onChange={(e) => onFileUpload(editingDeal, e)}
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
