import { X } from "lucide-react";

export function AddAccountModal({
  isOpen,
  accountName,
  onAccountNameChange,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content add-account-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Add Account to Calendar</h3>
          <button className="ghost-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="add-account-form">
          <div className="field">
            <label>Account Name or Email</label>
            <input
              type="text"
              placeholder="Enter account name or email"
              value={accountName}
              onChange={(e) => onAccountNameChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") onConfirm();
              }}
            />
          </div>

          <div className="modal-actions">
            <button className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary-btn"
              onClick={onConfirm}
              disabled={!accountName.trim()}
            >
              Add Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
