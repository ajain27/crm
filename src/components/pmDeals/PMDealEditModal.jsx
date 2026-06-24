import { Eye, Upload, Loader2 } from "lucide-react";
import Modal from "../modal/Modal";
import { fmt, formatDate } from "../../utils/utils";
import "./PMDealsTable.css";

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

  return (
    <Modal
      isOpen={!!editingDeal}
      onClose={onClose}
      title="Edit PM Deal"
      style={{ maxWidth: 640 }}
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
          className="add-form pm-deals-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="field">
            <span>Property Address</span>
            <input
              name="propertyAddress"
              value={editForm.propertyAddress}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="123 Main St, Austin, TX"
            />
          </div>
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
