import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import { formatPhone } from "../../utils/utils";

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

function Field({ label, children }) {
  return (
    <div className="ldm-field">
      <span className="ldm-label">{label}</span>
      {children}
    </div>
  );
}

export default function LeadDetailModal({ isOpen, onClose, lead, onSave }) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) setDraft({ ...lead });
  }, [lead]);

  if (!lead) return null;

  function set(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...draft });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isMLS = draft.source === "MLS / Zillow";
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={draft.address || "Lead Details"}
      className="lead-detail-modal"
      style={{ width: "min(600px, 95vw)", maxWidth: "min(600px, 95vw)" }}
      actions={
        <>
          <button className="secondary-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="ldm-body">
        <div className="ldm-section">
          <div className="ldm-section-label">Property</div>
          <div className="ldm-grid">
            <Field label="Address">
              <input
                className="ldm-input ldm-wide"
                value={draft.address || ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder="e.g. 123 Main St, Dallas, TX 75201"
              />
            </Field>
            <Field label="Source">
              <select
                className="ldm-input"
                value={draft.source || ""}
                onChange={(e) => set("source", e.target.value)}
              >
                <option value="">Select source…</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            {isMLS && (
              <>
                <Field label="Agent Name">
                  <input
                    className="ldm-input"
                    value={draft.agentName || ""}
                    onChange={(e) =>
                      set(
                        "agentName",
                        e.target.value.replace(/[^a-zA-Z\s'.]/g, ""),
                      )
                    }
                    placeholder="Agent name"
                  />
                </Field>
                <Field label="Agent Phone">
                  <input
                    className="ldm-input"
                    type="tel"
                    value={draft.agentPhone || ""}
                    onChange={(e) =>
                      set("agentPhone", formatPhone(e.target.value))
                    }
                    placeholder="555-000-0000"
                    maxLength={12}
                  />
                </Field>
              </>
            )}
            <Field label="Listing URL">
              <input
                className="ldm-input ldm-wide"
                type="url"
                value={draft.url || ""}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </div>

        <div className="ldm-section">
          <div className="ldm-section-label">Follow-Up</div>
          <div className="ldm-grid">
            <Field label="Follow-Up Date">
              <input
                className="ldm-input"
                type="date"
                value={draft.followUpDate || ""}
                min={today}
                onChange={(e) => set("followUpDate", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                className="ldm-input"
                type="email"
                value={draft.email || ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="seller@email.com"
              />
            </Field>
            <Field label="Phone">
              <input
                className="ldm-input"
                type="tel"
                value={draft.phone || ""}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                placeholder="555-000-0000"
                maxLength={12}
              />
            </Field>
          </div>
        </div>

        <div className="ldm-section">
          <div className="ldm-section-label">Notes</div>
          <textarea
            className="ldm-notes"
            value={draft.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Add notes about this lead…"
            rows={5}
          />
        </div>
      </div>
    </Modal>
  );
}
