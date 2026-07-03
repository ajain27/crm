import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import { formatPhone } from "../../utils/utils";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import { COMMERCIAL_PROPERTY_TYPES } from "./leadsConfig";
import "./Leads.css";

const SOURCES = ["MLS / Zillow", "Cold Call", "Propwire", "Auction.com"];

function Field({ label, children }) {
  return (
    <div className="ldm-field">
      <span className="ldm-label">{label}</span>
      {children}
    </div>
  );
}

export default function CommercialLeadDetailModal({
  isOpen,
  onClose,
  lead,
  onSave,
  onDelete,
}) {
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

  const isColdCall = draft.source === "Cold Call";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={draft.name || draft.address || "Commercial Lead"}
      className="lead-detail-modal"
      style={{ width: "min(600px, 95vw)", maxWidth: "min(600px, 95vw)" }}
      actions={
        <>
          {onDelete && (
            <button
              className="danger-btn"
              style={{ marginRight: "auto" }}
              onClick={onDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
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
            <Field label="Name">
              <input
                className="ldm-input ldm-wide"
                value={draft.name || ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Office Building, Retail Strip…"
              />
            </Field>
            <Field label="Address">
              <input
                className="ldm-input ldm-wide"
                value={draft.address || ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder="e.g. 500 Commerce St, Dallas, TX 75201"
              />
            </Field>
            <Field label="Property Type">
              <select
                className="ldm-input"
                value={draft.propertyType || ""}
                onChange={(e) => set("propertyType", e.target.value)}
              >
                <option value="">Select type…</option>
                {COMMERCIAL_PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State">
              <select
                className="ldm-input"
                value={draft.state || ""}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="">Select state…</option>
                {STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="ldm-section">
          <div className="ldm-section-label">Source</div>
          <div className="ldm-grid">
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
            {isColdCall && (
              <>
                <Field label="Seller Name">
                  <input
                    className="ldm-input"
                    value={draft.sellerName || ""}
                    onChange={(e) =>
                      set(
                        "sellerName",
                        e.target.value.replace(/[^a-zA-Z\s'.]/g, ""),
                      )
                    }
                    placeholder="Seller's name"
                  />
                </Field>
                <Field label="Seller Email">
                  <input
                    className="ldm-input"
                    type="email"
                    value={draft.sellerEmail || ""}
                    onChange={(e) => set("sellerEmail", e.target.value)}
                    placeholder="seller@email.com"
                  />
                </Field>
              </>
            )}
          </div>
        </div>

        <div className="ldm-section">
          <div className="ldm-section-label">Contact</div>
          <div className="ldm-grid">
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
            <Field label="Website">
              <input
                className="ldm-input"
                type="url"
                value={draft.website || ""}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://loopnet.com/…"
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
