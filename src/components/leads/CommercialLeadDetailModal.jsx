import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import { ExtraDetails, ZillowLink } from "./components/LeadTableCells";
import {
  LeadMainPhotoRow,
  LeadPhotosSection,
  useLeadPhotos,
} from "./components/LeadPhotos";
import { StreetViewButton } from "../elements/StreetView";
import { formatPhone } from "../../utils/utils";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import { COMMERCIAL_PROPERTY_TYPES } from "./leadsConfig";
import { SOURCES, joinName, splitName } from "./leadUtils";
import CompsMap from "./comps/CompsMap";
import { HISTORY_TABS, LeadTabBar } from "./comps/LeadCompsTabs";
import {
  LeadHistoryTab,
  useLeadHistory,
} from "../propertyHistory/LeadHistoryTab";
import "./Leads.css";

function Field({ label, action, children }) {
  return (
    <div className="ldm-field">
      <span className="ldm-label">
        {label}
        {action && <span className="leads-field-action">{action}</span>}
      </span>
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
  photoStore,
  onPhotosChange,
  currentUserId,
  onHistoryLoaded,
}) {
  const [draft, setDraft] = useState({});
  const photosState = useLeadPhotos({
    lead,
    draft,
    setDraft,
    photoStore,
    onPhotosChange,
    currentUserId,
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");
  const historyState = useLeadHistory({
    lead,
    draft,
    setDraft,
    onLoaded: onHistoryLoaded,
  });

  useEffect(() => {
    setTab("details");
    if (lead)
      setDraft({
        // Older leads only have a combined sellerName.
        ...(lead.firstName || lead.lastName ? {} : splitName(lead.sellerName)),
        ...lead,
      });
  }, [lead]);

  if (!lead) return null;

  function set(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await onSave({
        ...draft,
        sellerName: joinName(draft.firstName, draft.lastName),
      });
      // A refused save (e.g. an address already in use) keeps it open.
      if (saved === false) return;
      onClose();
    } catch (error) {
      console.error("Failed to save lead", error);
      alert(
        `Unable to save lead. Check your database connection.${error?.message ? `\n\n${error.message}` : ""}`,
      );
    } finally {
      setSaving(false);
    }
  }

  // The saved address, so editing the field doesn't look up the map on
  // every keystroke.
  const mapAddress = String(lead.address || "").trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={draft.name || draft.address || "Commercial Lead"}
      className="lead-detail-modal"
      style={{ width: "min(1180px, 96vw)", maxWidth: "min(1180px, 96vw)" }}
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
      <LeadTabBar
        tabs={[{ id: "details", label: "Details" }, ...HISTORY_TABS]}
        tab={tab}
        setTab={setTab}
      />
      {tab !== "details" ? (
        <LeadHistoryTab
          view={tab === "price-history" ? "price" : "property"}
          historyState={historyState}
          address={draft.address}
          disabled={saving}
        />
      ) : (
        <div className="cldm-layout">
          <div className="ldm-body">
            <LeadMainPhotoRow photosState={photosState} stacked>
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
                  <Field
                    label="Address"
                    action={
                      <>
                        <ZillowLink address={draft.address} />
                        <StreetViewButton address={draft.address} />
                      </>
                    }
                  >
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
            </LeadMainPhotoRow>

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
              </div>
            </div>

            <div className="ldm-section">
              <div className="ldm-section-label">Seller</div>
              <div className="ldm-grid">
                {["firstName", "lastName"].map((field) => (
                  <Field
                    key={field}
                    label={field === "firstName" ? "First Name" : "Last Name"}
                  >
                    <input
                      className="ldm-input"
                      value={draft[field] || ""}
                      onChange={(e) =>
                        set(field, e.target.value.replace(/[^a-zA-Z\s'.]/g, ""))
                      }
                      placeholder={
                        field === "firstName" ? "First name" : "Last name"
                      }
                    />
                  </Field>
                ))}
                <Field label="Seller Email">
                  <input
                    className="ldm-input"
                    type="email"
                    value={draft.sellerEmail || ""}
                    onChange={(e) => set("sellerEmail", e.target.value)}
                    placeholder="seller@email.com"
                  />
                </Field>
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
                  />
                </Field>
                <Field label="Phone 2">
                  <input
                    className="ldm-input"
                    type="tel"
                    value={draft.phone2 || ""}
                    onChange={(e) => set("phone2", formatPhone(e.target.value))}
                    placeholder="555-000-0000"
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

            <ExtraDetails fields={draft.extraFields} />
            <LeadPhotosSection photosState={photosState} />

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

          <div className="cldm-map">
            <div className="ldm-section-label ldm-notes-label">
              Location
              {mapAddress && (
                <a
                  className="ldm-notes-toggle"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
            {mapAddress ? (
              <CompsMap
                points={[
                  {
                    key: "subject",
                    kind: "subject",
                    address: mapAddress,
                    lat: lead.lat ?? null,
                    lng: lead.lng ?? null,
                  },
                ]}
                mapTypeId="hybrid"
                zoom={17}
              />
            ) : (
              <div className="comps-map cldm-map-empty">
                Add an address to see the property on the map.
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
