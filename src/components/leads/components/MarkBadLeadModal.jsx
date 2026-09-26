import { useState } from "react";
import { ThumbsDown } from "lucide-react";

// Confirms marking a PPC/PPL lead as bad, with an optional reason. Starts
// from the lead's previous reason if it had one.
export default function MarkBadLeadModal({ lead, onConfirm, onClose }) {
  const [reason, setReason] = useState(lead.ppcBadReason || "");

  return (
    <div className="ppc-bad-overlay" onClick={onClose}>
      <div className="ppc-bad-popup" onClick={(e) => e.stopPropagation()}>
        <h3 className="ppc-bad-popup-title">
          <ThumbsDown size={15} /> Mark Lead as Bad
        </h3>
        <p className="ppc-bad-popup-name">{lead.sellerName || "This lead"}</p>
        <label className="ppc-bad-popup-label">
          Why is this lead bad?{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
            (optional)
          </span>
        </label>
        <textarea
          className="ppc-bad-popup-textarea"
          placeholder="e.g. Not motivated, wrong price range, unreachable…"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="ppc-bad-popup-actions">
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="danger-btn ppc-bad-confirm-btn"
            onClick={() => {
              onConfirm(reason);
              onClose();
            }}
          >
            Confirm Bad Lead
          </button>
        </div>
      </div>
    </div>
  );
}
