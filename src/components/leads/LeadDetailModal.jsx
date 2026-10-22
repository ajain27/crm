import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import { Badge } from "../elements/elements";
import { fmtCurrencyInput, formatPhone } from "../../utils/utils";
import { DEAL_TYPES } from "../crm/components/crmConfig";
import { joinName, splitName } from "./leadUtils";
import { ZillowLink } from "./components/LeadTableCells";
import { StreetViewButton } from "../elements/StreetView";
import RunCompsModal from "../crm/components/data/comps/RunCompsModal";
import CompsNoteView from "../crm/components/data/comps/CompsNoteView";
import { withCompsNote } from "../crm/components/data/comps/compsNote";
import { hasFormattedNotes } from "../crm/components/data/comps/notesTable";
import LeadCompsPanel from "./comps/LeadCompsPanel";
import { compsResultToSave, leadComps } from "./comps/leadComps";
import {
  OCCUPANT_OPTIONS,
  SELLER_MOTIVATION_OPTIONS,
  SELLING_URGENCY_OPTIONS,
} from "./leadsConfig";
import CurrencyInput from "../elements/CurrencyInput";

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
  "PPL",
  "Other",
];

function OptionSelect({ value, onChange, options }) {
  return (
    <select
      className="ldm-input"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

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
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [compsOpen, setCompsOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tab, setTab] = useState("details");

  useEffect(() => {
    if (lead)
      setDraft({
        // Older leads only have a combined sellerName.
        ...(lead.firstName || lead.lastName ? {} : splitName(lead.sellerName)),
        ...lead,
        source: isPpc ? "PPC" : isPpl ? "PPL" : lead.source,
      });
    setEditingNotes(false);
    setTab(lead && leadComps(lead) ? "comps" : "details");
  }, [lead, isPpc, isPpl]);

  if (!lead) return null;

  function set(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  // Notes with a comps note or a Question / Answer table in them show laid
  // out until "Edit notes".
  const hasFormatted = hasFormattedNotes(draft.notes);
  const showNotesView = hasFormatted && !editingNotes;

  const isRental = (draft.dealType || "Wholesale") === "Potential Rental";
  // PPL leads are entered with full seller details, so they get the same
  // sections as other residential leads; only website PPC leads stay minimal.
  const hasSellerSection = !isRental && !isPpc;
  // PPC and PPL leads can run comps; they get a wide window with a Comps
  // tab (table and map) beside the lead's details.
  const canRunComps = (isPpl || isPpc) && !isRental;
  const comps = canRunComps ? leadComps(draft) : null;
  const activeTab = canRunComps ? tab : "details";

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

  // Comps results go into the draft; Save Changes keeps them.
  function handleSaveCompsNote(note, result) {
    setDraft((prev) => ({
      ...prev,
      notes: withCompsNote(prev.notes, note),
      ...(result ? { compsResult: compsResultToSave(result) } : {}),
    }));
    setTab("comps");
  }

  function handleApplyComps({ arv }) {
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
              <button
                className="secondary-btn"
                onClick={() => setCompsOpen(true)}
                disabled={saving || !draft.address?.trim()}
                title="Pull comps from Zillow, Redfin and Realtor.com"
              >
                Run comps
              </button>
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
          {canRunComps && (
            <div className="ldm-tabs" role="tablist" aria-label="Lead">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "comps"}
                className={`ldm-tab ${activeTab === "comps" ? "active" : ""}`}
                onClick={() => setTab("comps")}
              >
                Comps
                {comps && (
                  <span className="ldm-tab-count">{comps.comps.length}</span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "details"}
                className={`ldm-tab ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setTab("details")}
              >
                Details
              </button>
            </div>
          )}

          {activeTab === "comps" &&
            (comps ? (
              <LeadCompsPanel comps={comps} lead={draft} />
            ) : (
              <div className="ldm-comps-empty">
                No comps for this lead yet.
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setCompsOpen(true)}
                  disabled={saving || !draft.address?.trim()}
                >
                  Run comps
                </button>
              </div>
            ))}

          {activeTab === "details" && (
            <>
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
                          maxLength={12}
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
                            field === "firstName" ? "First name" : "Last name"
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
                      maxLength={12}
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
                            onChange={(e) => set("offerPrice", e.target.value)}
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
                              field === "firstName" ? "First Name" : "Last Name"
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
                        <Field label="Asking Price">
                          <CurrencyInput
                            className="ldm-input"
                            value={draft.askingPrice || ""}
                            onChange={(e) => set("askingPrice", e.target.value)}
                            placeholder="$0"
                          />
                        </Field>
                        {isPpl && (
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
                        <Field label="Who's Living in the Property">
                          <OptionSelect
                            value={draft.occupant}
                            onChange={(v) => set("occupant", v)}
                            options={OCCUPANT_OPTIONS}
                          />
                        </Field>
                        <Field label="Selling Urgency">
                          <OptionSelect
                            value={draft.sellingUrgency}
                            onChange={(v) => set("sellingUrgency", v)}
                            options={SELLING_URGENCY_OPTIONS}
                          />
                        </Field>
                        <Field label="Seller Motivation">
                          <OptionSelect
                            value={draft.sellerMotivation}
                            onChange={(v) => set("sellerMotivation", v)}
                            options={SELLER_MOTIVATION_OPTIONS}
                          />
                        </Field>
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
      {compsOpen && (
        <RunCompsModal
          address={draft.address.trim()}
          onSaveNote={handleSaveCompsNote}
          // PPC leads have no ARV field to fill.
          onApply={isPpl ? handleApplyComps : undefined}
          onClose={() => setCompsOpen(false)}
          noteSavedLabel="Added to the lead's notes — Save Changes to keep"
          applyLabel="Use ARV"
        />
      )}
    </>
  );
}
