import { useState } from "react";
import { PhoneCall } from "lucide-react";
import { sellerNameOf } from "../leadUtils";

// Asks how a call went when one is added. Saving counts the call and adds
// what was typed to the lead's notes (with the date); Cancel doesn't
// count it.
export default function CallNotesModal({ lead, callNumber, onSave, onClose }) {
  const [details, setDetails] = useState("");

  function save() {
    onSave(details.trim());
    onClose();
  }

  return (
    <div className="ppc-bad-overlay" onClick={onClose}>
      <div
        className="ppc-bad-popup"
        role="dialog"
        aria-label="Call notes"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="ppc-bad-popup-title">
          <PhoneCall size={15} /> Call {callNumber}
        </h3>
        <p className="ppc-bad-popup-name">
          {sellerNameOf(lead) || lead.address || "This lead"}
        </p>
        <label className="ppc-bad-popup-label" htmlFor="call-notes">
          How did the call go?{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
            (added to the notes)
          </span>
        </label>
        <textarea
          id="call-notes"
          className="ppc-bad-popup-textarea"
          placeholder="e.g. Spoke with the owner, wants $120k, call back next week…"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter saves.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
          autoFocus
        />
        <div className="ppc-bad-popup-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={save}>
            Save call
          </button>
        </div>
      </div>
    </div>
  );
}
