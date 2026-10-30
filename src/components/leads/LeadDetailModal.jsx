import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import { Badge } from "../elements/elements";
import { fmtCurrencyInput, formatPhone } from "../../utils/utils";
import { DEAL_TYPES } from "../crm/components/crmConfig";
import { joinName, splitName } from "./leadUtils";
import { ExtraDetails, ZillowLink } from "./components/LeadTableCells";
import { LeadMainPhotoRow, useLeadPhotos } from "./components/LeadPhotos";
import { StreetViewButton } from "../elements/StreetView";
import CompsNoteView from "../crm/components/data/comps/CompsNoteView";
import { hasFormattedNotes } from "../crm/components/data/comps/notesTable";
import { useLeadComps } from "./comps/useLeadComps";
import {
  LeadHistoryTab,
  useLeadHistory,
} from "../propertyHistory/LeadHistoryTab";
import { historyToSave } from "../propertyHistory/propertyHistory";
import ArvHighlight from "../elements/ArvHighlight";
import {
  HISTORY_TABS,
  LeadCompsTab,
  LeadCompsTabBar,
  LeadRunCompsModal,
  RunCompsButton,
} from "./comps/LeadCompsTabs";
import { LEAD_SOURCES } from "./leadsConfig";
import SellerDetailsFields, {
  OptionSelect,
} from "./components/SellerDetailsFields";
import CurrencyInput from "../elements/CurrencyInput";

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

export default function LeadDetailModal({
  isOpen,
  onClose,
  lead,
  onSave,
  isPpc = false,
  isPpl = false,
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
  const [editingNotes, setEditingNotes] = useState(false);
  // Every lead except a potential rental can run comps; those get a wide
  // window with a Comps tab (table and map) beside the lead's details.
  const isRental = (draft.dealType || "Wholesale") === "Potential Rental";
  const compsState = useLeadComps({
    lead,
    draft,
    setDraft,
    enabled: Boolean(lead) && !isRental,
    // The history and listing photo a comps run read save to the lead
    // right away.
    onRunSaved: async (note, result) => {
      await photosState.addListingPhoto(result?.photo);
      if (result?.history && onHistoryLoaded) {
        await onHistoryLoaded(lead.id, historyToSave(result.history));
      }
    },
  });
  const historyState = useLeadHistory({
    lead,
    draft,
    setDraft,
    onLoaded: onHistoryLoaded,
  });

  useEffect(() => {
    if (lead)
      setDraft({
        // Older leads only have a combined sellerName.
        ...(lead.firstName || lead.lastName ? {} : splitName(lead.sellerName)),
        ...lead,
        source: isPpc ? "PPC" : isPpl ? "PPL" : lead.source,
      });
    setEditingNotes(false);
  }, [lead, isPpc, isPpl]);

  if (!lead) return null;

  function set(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  // Notes with a comps note or a Question / Answer table in them show laid
  // out until "Edit notes".
  const hasFormatted = hasFormattedNotes(draft.notes);
  const showNotesView = hasFormatted && !editingNotes;

  // PPL leads are entered with full seller details, so they get the same
  // sections as other residential leads; only website PPC leads stay minimal.
  const hasSellerSection = !isRental && !isPpc;
  const canRunComps = compsState.enabled;
  const arvValue = Number(String(draft.arv || "").replace(/[^0-9.]/g, "")) || 0;
  const activeTab = compsState.tab;

  // PPC leads and rentals not on the market ask for the seller's first and
  // last name in the Property section (others have a Seller section).
  const hasNameFields = isPpc || (isRental && draft.onMarket !== "Yes");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(
        hasSellerSection || hasNameFields
          ? {
              ...draft,
              sellerName: joinName(draft.firstName, draft.lastName),
            }
          : { ...draft },
      );
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

  function handleApplyArv(arv) {
    if (arv > 0) set("arv", fmtCurrencyInput(String(Math.round(arv))));
  }

  const isMLS = draft.source === "MLS / Zillow";
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span className="ldm-title">
            <span className="ddm-title-row">
              <span>{draft.address || "Lead Details"}</span>
              <Badge value={draft.dealType || "Wholesale"} />
            </span>
            {/* Here rather than above the Address input, so that field's
                label lines up with the rest of its row. */}
            {draft.address?.trim() && (
              <span className="ldm-title-links">
                <ZillowLink address={draft.address} />
                <StreetViewButton address={draft.address} />
              </span>
            )}
          </span>
        }
        className="lead-detail-modal"
        style={
          canRunComps
            ? { width: "min(1240px, 96vw)", maxWidth: "min(1240px, 96vw)" }
            : { width: "min(600px, 95vw)", maxWidth: "min(600px, 95vw)" }
        }
        actions={
          <>
            <button
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {canRunComps && (
              <RunCompsButton
                compsState={compsState}
                address={draft.address}
                disabled={saving}
              />
            )}
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
          <LeadCompsTabBar compsState={compsState} extraTabs={HISTORY_TABS} />

          {activeTab === "comps" && (
            <LeadCompsTab
              compsState={compsState}
              lead={draft}
              disabled={saving}
            />
          )}

          {(activeTab === "price-history" ||
            activeTab === "property-history") && (
            <LeadHistoryTab
              view={activeTab === "price-history" ? "price" : "property"}
              historyState={historyState}
              address={draft.address}
              disabled={saving}
            />
          )}

          {activeTab === "details" && (
            <>
              <LeadMainPhotoRow
                photosState={photosState}
                withGallery
                aside={
                  arvValue > 0 || compsState.comps?.arv > 0 ? (
                    <ArvHighlight
                      arv={arvValue}
                      compsArv={compsState.comps?.arv}
                      compsDate={compsState.comps?.date}
                    />
                  ) : null
                }
              >
                <div className="main-photo-main">
                  <div className="ldm-section">
                    <div className="ldm-section-label">Property</div>
                    <div className="ldm-grid">
                      <Field label="Deal Type">
                        <select
                          className="ldm-input"
                          value={draft.dealType || "Wholesale"}
                          onChange={(e) => set("dealType", e.target.value)}
                        >
                          {DEAL_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Address">
                        <input
                          className="ldm-input ldm-wide"
                          value={draft.address || ""}
                          onChange={(e) => set("address", e.target.value)}
                          placeholder="e.g. 123 Main St, Dallas, TX 75201"
                        />
                      </Field>
                      <Field label="Source">
                        {isPpc || isPpl ? (
                          <input
                            className="ldm-input"
                            value={isPpc ? "PPC" : "PPL"}
                            disabled
                          />
                        ) : (
                          <OptionSelect
                            className="ldm-input"
                            value={draft.source}
                            onChange={(v) => set("source", v)}
                            options={LEAD_SOURCES}
                            placeholder="Select source…"
                          />
                        )}
                      </Field>
                      {isRental && (
                        <Field label="On Market">
                          <select
                            className="ldm-input"
                            value={draft.onMarket || "No"}
                            onChange={(e) => set("onMarket", e.target.value)}
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </Field>
                      )}
                      {(isRental ? draft.onMarket === "Yes" : isMLS) && (
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
                            />
                          </Field>
                        </>
                      )}
                      {isRental && draft.onMarket === "Yes" && (
                        <Field label="Listed Price">
                          <CurrencyInput
                            className="ldm-input"
                            value={draft.listedPrice || ""}
                            onChange={(e) => set("listedPrice", e.target.value)}
                            placeholder="$0"
                          />
                        </Field>
                      )}
                      {hasNameFields &&
                        ["firstName", "lastName"].map((field) => (
                          <Field
                            key={field}
                            label={
                              field === "firstName"
                                ? "Seller First Name"
                                : "Seller Last Name"
                            }
                          >
                            <input
                              className="ldm-input"
                              value={draft[field] || ""}
                              onChange={(e) =>
                                set(
                                  field,
                                  e.target.value.replace(/[^a-zA-Z\s'.]/g, ""),
                                )
                              }
                              placeholder={
                                field === "firstName"
                                  ? "First name"
                                  : "Last name"
                              }
                            />
                          </Field>
                        ))}
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
                          onChange={(e) =>
                            set("phone", formatPhone(e.target.value))
                          }
                          placeholder="555-000-0000"
                        />
                      </Field>
                      <Field label="Phone 2">
                        <input
                          className="ldm-input"
                          type="tel"
                          value={draft.phone2 || ""}
                          onChange={(e) =>
                            set("phone2", formatPhone(e.target.value))
                          }
                          placeholder="555-000-0000"
                        />
                      </Field>
                    </div>
                  </div>

                  {isRental ? (
                    <div className="ldm-section">
                      <div className="ldm-section-label">Rental Details</div>
                      <div className="ldm-grid">
                        <Field label="Rent">
                          <CurrencyInput
                            className="ldm-input"
                            value={draft.rent || ""}
                            onChange={(e) => set("rent", e.target.value)}
                            placeholder="$0"
                          />
                        </Field>
                        <Field label="Occupied">
                          <select
                            className="ldm-input"
                            value={draft.occupied || "No"}
                            onChange={(e) => set("occupied", e.target.value)}
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </Field>
                        <Field label="Offer Status">
                          <select
                            className="ldm-input"
                            value={draft.offerStatus || "Not Sent"}
                            onChange={(e) => set("offerStatus", e.target.value)}
                          >
                            <option value="Not Sent">Not Sent</option>
                            <option value="Offer Sent">Offer Sent</option>
                          </select>
                        </Field>
                        {draft.offerStatus !== "Not Sent" && (
                          <>
                            <Field label="Offer Price">
                              <CurrencyInput
                                className="ldm-input"
                                value={draft.offerPrice || ""}
                                onChange={(e) =>
                                  set("offerPrice", e.target.value)
                                }
                                placeholder="$0"
                              />
                            </Field>
                            <Field label="Accepted">
                              <select
                                className="ldm-input"
                                value={draft.sellerAccepted || "No"}
                                onChange={(e) =>
                                  set("sellerAccepted", e.target.value)
                                }
                              >
                                <option value="No">No</option>
                                <option value="Waiting">Waiting</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </Field>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {hasSellerSection && (
                        <div className="ldm-section">
                          <div className="ldm-section-label">Seller</div>
                          <div className="ldm-grid">
                            {["firstName", "lastName"].map((field) => (
                              <Field
                                key={field}
                                label={
                                  field === "firstName"
                                    ? "First Name"
                                    : "Last Name"
                                }
                              >
                                <input
                                  className="ldm-input"
                                  value={draft[field] || ""}
                                  onChange={(e) =>
                                    set(
                                      field,
                                      e.target.value.replace(
                                        /[^a-zA-Z\s'.]/g,
                                        "",
                                      ),
                                    )
                                  }
                                  placeholder={
                                    field === "firstName"
                                      ? "First name"
                                      : "Last name"
                                  }
                                />
                              </Field>
                            ))}
                            {hasSellerSection && (
                              <Field label="ARV">
                                <CurrencyInput
                                  className="ldm-input"
                                  value={draft.arv || ""}
                                  onChange={(e) =>
                                    set("arv", fmtCurrencyInput(e.target.value))
                                  }
                                  placeholder="$0"
                                />
                              </Field>
                            )}
                            <SellerDetailsFields
                              values={draft}
                              onChange={set}
                              Field={Field}
                              inputClassName="ldm-input"
                            />
                          </div>
                        </div>
                      )}

                      {!isPpc && (
                        <div className="ldm-section">
                          <div className="ldm-section-label">Follow-Up</div>
                          <div className="ldm-grid">
                            <Field label="Follow-Up Date">
                              <input
                                className="ldm-input"
                                type="date"
                                value={draft.followUpDate || ""}
                                min={today}
                                onChange={(e) =>
                                  set("followUpDate", e.target.value)
                                }
                              />
                            </Field>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </LeadMainPhotoRow>

              <ExtraDetails fields={draft.extraFields} />

              <div className="ldm-section">
                <div className="ldm-section-label ldm-notes-label">
                  Notes
                  {hasFormatted && (
                    <button
                      type="button"
                      className="ldm-notes-toggle"
                      onClick={() => setEditingNotes((v) => !v)}
                    >
                      {editingNotes ? "Show formatted" : "Edit notes"}
                    </button>
                  )}
                </div>
                {showNotesView ? (
                  <CompsNoteView
                    notes={draft.notes}
                    className="ldm-notes-view"
                  />
                ) : (
                  <textarea
                    className="ldm-notes"
                    value={draft.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Add notes about this lead…"
                    rows={hasFormatted ? 12 : 5}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
      <LeadRunCompsModal
        compsState={compsState}
        address={draft.address}
        // PPC leads have no ARV field to fill.
        onApplyArv={isPpc ? undefined : handleApplyArv}
      />
    </>
  );
}
