import { useState, useEffect, useMemo, useRef } from "react";
import { Upload, Loader2, Trash2, FileText, Plus, X } from "lucide-react";
import Modal from "../../../../modal/Modal";
import { Badge } from "../../../../elements/elements";
import { STATE_OPTIONS } from "../../../../../constants/stateOptions";
import {
  dealLeadTab,
  joinName,
  LEAD_TAB_IDS,
  leadTabLabel,
  splitName,
} from "../../../../leads/leadUtils";
import MenuButton from "../../../../elements/MenuButton";
import {
  addressConflictMessage,
  findAddressConflict,
  sameAddress,
} from "../../../../leads/leadDuplicates";
import { formatPhone } from "../../../../../utils/utils";
import { useGenerateReport } from "../../../../dealAnalyzer/components/pdfExport/useGenerateReport";
import PdfReportPreviewModal from "../../../../dealAnalyzer/components/pdfExport/PdfReportPreviewModal";
import WholesaleOfferPdfTemplate, {
  DEFAULT_OFFER_OPTIONS,
} from "./WholesaleOfferPdfTemplate";
import OfferOptionsModal from "./OfferOptionsModal";
import JvAgreementPdfTemplate from "./JvAgreementPdfTemplate";
import AssignmentPdfTemplate from "./AssignmentPdfTemplate";
import AssignmentOptionsModal from "./AssignmentOptionsModal";
import RunCompsModal from "../comps/RunCompsModal";
import CompsNoteView from "../comps/CompsNoteView";
import { withCompsNote } from "../comps/compsNote";
import { hasFormattedNotes } from "../comps/notesTable";
import PhotoGallery from "../../../../elements/photos/PhotoGallery";
import MainPhoto from "../../../../elements/photos/MainPhoto";
import ArvHighlight from "../../../../elements/ArvHighlight";
import { compsResultToSave } from "../../../../leads/comps/leadComps";
import { useLeadComps } from "../../../../leads/comps/useLeadComps";
import {
  HISTORY_TABS,
  LeadCompsTab,
  LeadCompsTabBar,
} from "../../../../leads/comps/LeadCompsTabs";
import {
  LeadHistoryTab,
  useLeadHistory,
} from "../../../../propertyHistory/LeadHistoryTab";
import { historyToSave } from "../../../../propertyHistory/propertyHistory";
import {
  ExtraDetails,
  ZillowLink,
} from "../../../../leads/components/LeadTableCells";
import { LEAD_SOURCES } from "../../../../leads/leadsConfig";
import SellerDetailsFields, {
  OptionSelect,
} from "../../../../leads/components/SellerDetailsFields";
import { StreetViewButton } from "../../../../elements/StreetView";
import {
  getSuggestedWholesaleMao,
  getContractVersions,
  DEAL_TYPES,
  ASSIGNED_PRICE_ERROR,
  isAssignedPriceTooLow,
  DEAL_LEAD_DETAILS,
  dealLeadDetail,
} from "../../crmConfig";
import CurrencyInput from "../../../../elements/CurrencyInput";

function formatFullAddress(deal) {
  const stateZip = [deal?.state, deal?.zipCode].filter(Boolean).join(" ");
  return [deal?.address, deal?.city, stateZip].filter(Boolean).join(", ");
}

const PROPERTY_TYPES = ["Single Family", "Multi Family", "Land"];
const OFFER_STATUSES = ["Not Sent", "Offer Sent", "Offer Withdrawn"];
const YES_NO = ["No", "Yes"];
const ACCEPTED_OPTS = ["No", "Waiting", "Yes"];

const CURRENCY_FIELDS = [
  "arv",
  "listedPrice",
  "rehabCost",
  "additionalRehabCost",
  "desiredProfit",
  "mao",
  "contractPrice",
  "assignedPrice",
  "jvSplit",
  "rent",
];

function fmtCurrency(raw) {
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return "$" + parseInt(digits, 10).toLocaleString("en-US");
}

function parseCurrency(val) {
  return parseInt(String(val ?? "").replace(/[^0-9]/g, ""), 10) || 0;
}

// Deals added from leads before the seller name fields existed only have
// the name in their notes, as a "Seller: Jane Doe" line.
function sellerNameFromNotes(notes) {
  const match = String(notes || "").match(/^Seller:\s*(.+)$/m);
  return splitName(match ? match[1] : "");
}

function initDraft(deal) {
  const d = { ...deal };
  if (!d.sellerFirstName && !d.sellerLastName) {
    const { firstName, lastName } = sellerNameFromNotes(d.notes);
    d.sellerFirstName = firstName;
    d.sellerLastName = lastName;
  }
  DEAL_LEAD_DETAILS.forEach((field) => {
    d[field] = dealLeadDetail(d, field);
  });
  // The comps and history of the lead a deal was made from show on the
  // deal until it has its own.
  if (!d.compsResult && d.fromLead?.compsResult) {
    d.compsResult = d.fromLead.compsResult;
  }
  if (!d.propertyHistory && d.fromLead?.propertyHistory) {
    d.propertyHistory = d.fromLead.propertyHistory;
  }
  // Phones past the first; older deals may have a second on their lead.
  if (!Array.isArray(d.sellerPhones)) {
    d.sellerPhones = d.fromLead?.phone2 ? [d.fromLead.phone2] : [];
  }
  CURRENCY_FIELDS.forEach((f) => {
    d[f] = d[f] ? fmtCurrency(String(d[f])) : "";
  });
  // The MAO as the form will calculate it, so opening a deal doesn't count
  // as a change.
  if (parseCurrency(d.arv) > 0) {
    const mao = getSuggestedWholesaleMao(d);
    d.mao = mao > 0 ? fmtCurrency(String(mao)) : "";
  }
  return d;
}

// A field's value for comparing the form with the saved deal: blank and
// missing are the same, and blank extra phones aren't saved.
function comparable(key, value) {
  if (key === "sellerPhones") return (value || []).filter((p) => p.trim());
  return value ?? "";
}

// Whether the form differs from the deal as it was opened. Photos save on
// their own, so they don't count.
function isDraftChanged(draft, saved) {
  return Object.keys({ ...draft, ...saved }).some((key) => {
    if (key === "photos") return false;
    const a = comparable(key, draft[key]);
    const b = comparable(key, saved[key]);
    return a !== b && JSON.stringify(a) !== JSON.stringify(b);
  });
}

function Section({ title, children }) {
  return (
    <div className="ddm-section">
      <div className="ddm-section-label">{title}</div>
      <div className="ddm-edit-grid">{children}</div>
    </div>
  );
}

function Field({ label, action, children, wide, span2 }) {
  const widthClass = wide
    ? " ddm-edit-field-wide"
    : span2
      ? " ddm-edit-field-span2"
      : "";
  return (
    <div className={`ddm-edit-field${widthClass}`}>
      <span className="ddm-edit-label">
        {label}
        {action && <span className="leads-field-action">{action}</span>}
      </span>
      {children}
    </div>
  );
}

// A small link beside a field's label that generates a document.
function DocLink({ onClick, busy, children }) {
  return (
    <button
      type="button"
      className="leads-mls-link ddm-doc-link"
      onClick={onClick}
      disabled={busy}
    >
      <FileText size={12} />
      {busy ? "Generating…" : children}
    </button>
  );
}

function DealDetailModal({
  isOpen,
  onClose,
  deal,
  updateDealPatch,
  deleteDeal,
  convertDealToRental,
  moveDealToLeads,
  openContract,
  handleContractUpload,
  handleDeleteContractVersion,
  uploadingDealId,
  onReactivate,
  onMakeInactive,
  photoStore,
  currentUserId,
  existingDeals = [],
  existingLeads = [],
}) {
  const [draft, setDraft] = useState({});
  // The form as the deal was opened (or last saved), for Save Changes.
  const [savedDraft, setSavedDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const {
    printRef: offerRef,
    exporting: exportingOffer,
    handleGenerateReport: handleGenerateOffer,
    previewImage: offerPreviewImage,
    closePreview: closeOfferPreview,
    downloadReport: downloadOffer,
  } = useGenerateReport("purchase-and-sale-agreement");
  const {
    printRef: jvRef,
    exporting: exportingJv,
    handleGenerateReport: handleGenerateJv,
    previewImage: jvPreviewImage,
    closePreview: closeJvPreview,
    downloadReport: downloadJv,
  } = useGenerateReport("jv-agreement");
  const {
    printRef: assignmentRef,
    exporting: exportingAssignment,
    handleGenerateReport: handleGenerateAssignment,
    previewImage: assignmentPreviewImage,
    closePreview: closeAssignmentPreview,
    downloadReport: downloadAssignment,
  } = useGenerateReport("assignment-of-contract");
  const [offerOptionsOpen, setOfferOptionsOpen] = useState(false);
  const [assignmentOptionsOpen, setAssignmentOptionsOpen] = useState(false);
  const [assignmentInspection, setAssignmentInspection] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  // The notes Run comps is saving: when the deal comes back with exactly
  // these notes, only the notes are taken in, so unsaved edits survive.
  const pendingCompsNotes = useRef(null);
  const prevDeal = useRef(null);
  const [offerOptions, setOfferOptions] = useState(DEFAULT_OFFER_OPTIONS);

  // The Comps, Price History and Property History tabs, as in the lead
  // window. They read the deal with its full address; `dealForTabs` only
  // changes when another deal opens, so saving photos or comps doesn't
  // switch tabs.
  const withFullAddress = (d) => ({ ...d, address: formatFullAddress(d) });
  const dealForTabs = useMemo(
    () => (deal ? withFullAddress(initDraft(deal)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deal?.id],
  );
  const tabsDraft = withFullAddress(draft);
  const compsState = useLeadComps({
    lead: dealForTabs,
    draft: tabsDraft,
    setDraft,
    enabled:
      Boolean(deal) &&
      (draft.dealType || deal?.dealType || "Wholesale") !== "Potential Rental",
  });
  // A history looked up on opening saves to the deal straight away.
  const historyState = useLeadHistory({
    lead: dealForTabs,
    draft: tabsDraft,
    setDraft,
    onLoaded: (_, propertyHistory) =>
      updateDealPatch(deal.id, { propertyHistory }),
  });

  // Run comps saves its note (in place of any earlier comps note, keeping
  // notes typed but not yet saved), its result and the history it read to
  // the deal straight away, then shows the Comps tab.
  async function handleSaveCompsNote(note, result) {
    const notes = withCompsNote(draft.notes, note);
    const patch = {
      notes,
      ...(result ? { compsResult: compsResultToSave(result) } : {}),
      ...(result?.history
        ? { propertyHistory: historyToSave(result.history) }
        : {}),
    };
    pendingCompsNotes.current = notes;
    await updateDealPatch(deal.id, patch);
    setDraft((prev) => ({ ...prev, ...patch }));
    compsState.setTab("comps");
  }

  function handleApplyComps({ arv, squareFootage }) {
    if (arv > 0) set("arv", String(Math.round(arv)));
    if (squareFootage > 0) set("squareFootage", String(squareFootage));
  }

  // The options are committed together with the print template's mount, so
  // the template renders with what was just chosen.
  // The seller name typed there is written back to the deal's name fields,
  // so Save Changes keeps it.
  function handleOfferOptionsSubmit({ sellerName, ...options }) {
    const { firstName, lastName } = splitName(sellerName);
    setDraft((prev) => ({
      ...prev,
      sellerFirstName: firstName,
      sellerLastName: lastName,
    }));
    setOfferOptions(options);
    setOfferOptionsOpen(false);
    handleGenerateOffer();
  }

  // Like the offer options: the choice is committed together with the
  // print template's mount.
  function handleAssignmentOptionsSubmit({ inspectionPeriod }) {
    setAssignmentInspection(inspectionPeriod);
    setAssignmentOptionsOpen(false);
    handleGenerateAssignment();
  }

  useEffect(() => {
    if (!deal) return;
    // Photos and a looked-up history save on their own, so a deal update
    // that only changes them leaves unsaved edits alone.
    const previous = prevDeal.current;
    prevDeal.current = deal;
    const takeIn = (keys) => {
      const fields = Object.fromEntries(keys.map((key) => [key, deal[key]]));
      setDraft((prev) => ({ ...prev, ...fields }));
      setSavedDraft((prev) => ({ ...prev, ...fields }));
    };
    const onlySavedOnTheirOwn =
      previous?.id === deal.id &&
      Object.keys({ ...previous, ...deal }).every(
        (key) =>
          key === "photos" ||
          key === "propertyHistory" ||
          previous[key] === deal[key],
      );
    if (onlySavedOnTheirOwn) {
      if (previous.propertyHistory !== deal.propertyHistory) {
        takeIn(["propertyHistory"]);
      }
      return;
    }
    const isCompsNoteUpdate =
      pendingCompsNotes.current !== null &&
      deal.notes === pendingCompsNotes.current;
    pendingCompsNotes.current = null;
    if (isCompsNoteUpdate) {
      takeIn(
        ["notes", "compsResult", "propertyHistory"].filter(
          (key) => deal[key] !== undefined,
        ),
      );
      return;
    }
    const initial = initDraft(deal);
    setDraft(initial);
    setSavedDraft(initial);
    if (previous?.id !== deal.id) setEditingNotes(false);
  }, [deal]);

  // Auto-calculate MAO when inputs change (mirrors the add-form formula)
  useEffect(() => {
    const arv = parseCurrency(draft.arv);
    if (arv <= 0) return;
    const mao = getSuggestedWholesaleMao(draft);
    setDraft((prev) => ({
      ...prev,
      mao: mao > 0 ? fmtCurrency(String(mao)) : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.arv,
    draft.rehabCost,
    draft.additionalRehabCost,
    draft.desiredProfit,
  ]);

  if (!deal) return null;

  // Photos save on their own, straight away.
  const savePhotos = (photos) => updateDealPatch(deal.id, { photos });
  // The main photo frame shows whenever photos are on (empty until one is
  // added), so the layout stays the same.
  const hasMainPhoto = Boolean(photoStore);
  // The latest comps run, for the big ARV.
  const dealComps = compsState.comps;
  const activeTab = compsState.tab;
  const hasArv = parseCurrency(draft.arv) > 0 || dealComps?.arv > 0;
  const hasSide = hasMainPhoto || hasArv;
  const offerSent = (draft.offerStatus || "Not Sent") === "Offer Sent";
  const locked = offerSent && (draft.sellerAccepted || "No") === "No";
  // Notes with a comps note or a Question / Answer table in them show laid
  // out until "Edit notes"
  // (always laid out while the deal is locked).
  const hasFormatted = hasFormattedNotes(draft.notes);
  const showNotesView = hasFormatted && (locked || !editingNotes);
  const contractVersions = getContractVersions(deal);
  const latestContractVersion = contractVersions[0];
  const isRental = (draft.dealType || "Wholesale") === "Potential Rental";
  const sellerPhones = draft.sellerPhones || [];
  const hasChanges = isDraftChanged(draft, savedDraft);
  const assignedPriceTooLow = isAssignedPriceTooLow(
    parseCurrency(draft.contractPrice),
    parseCurrency(draft.assignedPrice),
  );

  async function handleDelete() {
    const deleted = await deleteDeal(deal.id);
    if (deleted) onClose();
  }

  async function handleMoveToLeads(tab) {
    if (await moveDealToLeads(deal, tab)) onClose();
  }

  function set(field, value) {
    if (CURRENCY_FIELDS.includes(field)) {
      setDraft((prev) => ({ ...prev, [field]: fmtCurrency(value) }));
    } else if (
      field === "offerStatus" &&
      (value === "Not Sent" || value === "Offer Withdrawn")
    ) {
      setDraft((prev) => ({
        ...prev,
        offerStatus: value,
        sellerAccepted: "No",
      }));
    } else if (field === "offerStatus" && value === "Offer Sent") {
      setDraft((prev) => ({
        ...prev,
        offerStatus: value,
        ...((prev.sellerAccepted || "No") === "No"
          ? { sellerAccepted: "Waiting" }
          : {}),
      }));
    } else {
      setDraft((prev) => ({ ...prev, [field]: value }));
    }
  }

  async function handleSave() {
    const closing = draft.closed === "Yes" && deal.closed !== "Yes";

    // A changed address can't be one already in the CRM or Leads.
    const newAddress = formatFullAddress(draft);
    if (!sameAddress(formatFullAddress(deal), newAddress)) {
      const conflict = findAddressConflict({
        address: newAddress,
        deals: existingDeals,
        leads: existingLeads,
        excludeId: deal.id,
      });
      if (conflict) {
        alert(addressConflictMessage(newAddress, conflict));
        return;
      }
    }

    if (!isRental && closing) {
      if (draft.sellerAccepted !== "Yes" || draft.assigned !== "Yes") {
        alert(
          "Cannot close: Seller must have Accepted and deal must be Assigned first.",
        );
        return;
      }
    }

    const numeric = {};
    CURRENCY_FIELDS.forEach((f) => {
      numeric[f] = parseCurrency(draft[f]);
    });

    if (isAssignedPriceTooLow(numeric.contractPrice, numeric.assignedPrice)) {
      alert(ASSIGNED_PRICE_ERROR);
      return;
    }

    let closedDate = draft.closedDate || "";
    let closedInMonth = draft.closedInMonth || "";
    if (closing && !closedDate) {
      if (isRental) {
        alert("Please select a Closed Date before saving.");
        return;
      }
      const d = window.prompt("Enter the close date (YYYY-MM-DD).", "");
      if (!d) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        alert("Please enter a valid close date in YYYY-MM-DD format.");
        return;
      }
      closedDate = d;
      closedInMonth = d.slice(5, 7);
    }
    if (closing && closedDate) {
      closedInMonth = closedDate.slice(5, 7);
    }

    setSaving(true);
    try {
      if (isRental && closing) {
        await convertDealToRental({
          ...deal,
          ...draft,
          closedDate,
          closedInMonth,
        });
        onClose();
        return;
      }

      // Photos are saved as they're added; the draft's copy may be stale.
      const { id, photos, ...rest } = draft;
      await updateDealPatch(deal.id, {
        ...rest,
        ...numeric,
        sellerPhones: (rest.sellerPhones || []).filter((p) => p.trim()),
        closedDate,
        closedInMonth,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // The offer uses what's in the form right now, saved or not. Purchase
  // Price is the Contract Price, falling back to the MAO.
  const offerPurchasePrice =
    parseCurrency(draft.contractPrice) || parseCurrency(draft.mao);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span className="ldm-title">
            <span className="ddm-title-row">
              <span>
                {formatFullAddress(draft) ||
                  formatFullAddress(deal) ||
                  "Deal Details"}
              </span>
              <Badge value={draft.dealType || deal.dealType || "Wholesale"} />
            </span>
            {formatFullAddress(draft) && (
              <span className="ldm-title-links">
                <ZillowLink address={formatFullAddress(draft)} />
                <StreetViewButton address={formatFullAddress(draft)} />
              </span>
            )}
          </span>
        }
        className="deal-detail-modal"
        style={{ width: "min(1240px, 96vw)", maxWidth: "min(1240px, 96vw)" }}
        actions={
          <>
            {deleteDeal && (
              <button
                className="danger-btn ddm-delete-btn"
                onClick={handleDelete}
                disabled={saving}
              >
                Delete
              </button>
            )}
            {moveDealToLeads && (
              <MenuButton
                label="Move to Leads"
                placement="top"
                disabled={saving}
                title="Take this deal off the CRM and put it in a Leads tab"
                items={LEAD_TAB_IDS.map((tab) => ({
                  id: tab,
                  label: leadTabLabel(tab),
                  hint: tab === dealLeadTab(deal) ? "Came from" : undefined,
                }))}
                onSelect={handleMoveToLeads}
              />
            )}
            <button
              className="secondary-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {!isRental && (
              <button
                className="secondary-btn"
                onClick={compsState.openRun}
                disabled={saving || !formatFullAddress(draft)}
                title="Pull comps from Zillow, Redfin and Realtor.com"
              >
                Run comps
              </button>
            )}
            {!isRental && (
              <button
                className="secondary-btn ddm-offer-btn"
                onClick={() => setOfferOptionsOpen(true)}
                disabled={saving || exportingOffer}
              >
                {exportingOffer ? "Generating…" : "Generate Offer"}
              </button>
            )}
            {onMakeInactive && (
              <button
                className="secondary-btn"
                onClick={onMakeInactive}
                disabled={saving}
              >
                Make Inactive
              </button>
            )}
            {onReactivate && (
              <button
                className="secondary-btn"
                onClick={onReactivate}
                disabled={saving}
              >
                Make Active
              </button>
            )}
            <button
              className="primary-btn"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </>
        }
      >
        <div className="ddm-body">
          <LeadCompsTabBar compsState={compsState} extraTabs={HISTORY_TABS} />

          {activeTab === "comps" && (
            <LeadCompsTab
              compsState={compsState}
              lead={tabsDraft}
              disabled={saving}
            />
          )}

          {(activeTab === "price-history" ||
            activeTab === "property-history") && (
            <LeadHistoryTab
              view={activeTab === "price-history" ? "price" : "property"}
              historyState={historyState}
              address={tabsDraft.address}
              disabled={saving}
            />
          )}

          {activeTab === "details" && (
            <>
              {locked && (
                <div className="ddm-locked-notice">
                  Offer sent but seller has not accepted yet. Update "Seller
                  Accepted" to unlock fields.
                </div>
              )}

              {/* The main photo, large, beside the property details. */}
              <div className={`main-photo-row${hasSide ? " has-photo" : ""}`}>
                {hasSide && (
                  <div className="main-photo-side">
                    {hasMainPhoto && (
                      <MainPhoto
                        ownerId={deal.id}
                        photos={deal.photos}
                        photoStore={photoStore}
                        onChange={savePhotos}
                      />
                    )}
                    <ArvHighlight
                      arv={parseCurrency(draft.arv)}
                      compsArv={dealComps?.arv}
                      compsDate={dealComps?.date}
                    />
                  </div>
                )}
                <Section title="Property">
                  <Field label="Deal Type">
                    <select
                      disabled={locked}
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
                  <Field label="Address" span2>
                    <input
                      disabled={locked}
                      value={draft.address || ""}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Street address"
                    />
                  </Field>
                  <Field label="City">
                    <input
                      disabled={locked}
                      value={draft.city || ""}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="City"
                    />
                  </Field>
                  <Field label="State">
                    <select
                      disabled={locked}
                      value={draft.state || ""}
                      onChange={(e) => set("state", e.target.value)}
                    >
                      {STATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Zip Code">
                    <input
                      disabled={locked}
                      value={draft.zipCode || ""}
                      onChange={(e) => set("zipCode", e.target.value)}
                      placeholder="Zip code"
                    />
                  </Field>
                  <Field label="Property Type">
                    <select
                      disabled={locked}
                      value={draft.propertyType || "Single Family"}
                      onChange={(e) => set("propertyType", e.target.value)}
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sq Ft">
                    <input
                      disabled={locked}
                      type="number"
                      value={draft.squareFootage || ""}
                      onChange={(e) => set("squareFootage", e.target.value)}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Source">
                    <OptionSelect
                      disabled={locked}
                      value={draft.source}
                      onChange={(v) => set("source", v)}
                      options={LEAD_SOURCES}
                    />
                  </Field>
                  {!isRental && (
                    <>
                      <Field label="Seller First Name">
                        <input
                          disabled={locked}
                          value={draft.sellerFirstName || ""}
                          onChange={(e) =>
                            set("sellerFirstName", e.target.value)
                          }
                          placeholder="First name"
                        />
                      </Field>
                      <Field label="Seller Last Name">
                        <input
                          disabled={locked}
                          value={draft.sellerLastName || ""}
                          onChange={(e) =>
                            set("sellerLastName", e.target.value)
                          }
                          placeholder="Last name"
                        />
                      </Field>
                      <Field
                        label="Seller Phone"
                        action={
                          !locked && (
                            <button
                              type="button"
                              className="leads-mls-link ddm-doc-link"
                              onClick={() =>
                                set("sellerPhones", [...sellerPhones, ""])
                              }
                            >
                              <Plus size={12} />
                              Add phone
                            </button>
                          )
                        }
                      >
                        <input
                          disabled={locked}
                          type="tel"
                          value={draft.sellerPhone || ""}
                          onChange={(e) =>
                            set("sellerPhone", formatPhone(e.target.value))
                          }
                          placeholder="555-000-0000"
                        />
                      </Field>
                      {sellerPhones.map((phone, i) => (
                        <Field
                          key={i}
                          label={`Seller Phone ${i + 2}`}
                          action={
                            !locked && (
                              <button
                                type="button"
                                className="leads-mls-link ddm-doc-link"
                                onClick={() =>
                                  set(
                                    "sellerPhones",
                                    sellerPhones.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                <X size={12} />
                                Remove
                              </button>
                            )
                          }
                        >
                          <input
                            disabled={locked}
                            type="tel"
                            value={phone}
                            onChange={(e) =>
                              set(
                                "sellerPhones",
                                sellerPhones.map((p, j) =>
                                  j === i ? formatPhone(e.target.value) : p,
                                ),
                              )
                            }
                            placeholder="555-000-0000"
                          />
                        </Field>
                      ))}
                      <Field label="Seller Email">
                        <input
                          disabled={locked}
                          type="email"
                          value={draft.sellerEmail || ""}
                          onChange={(e) => set("sellerEmail", e.target.value)}
                          onBlur={(e) =>
                            set("sellerEmail", e.target.value.trim())
                          }
                          placeholder="seller@email.com"
                        />
                      </Field>
                      <Field label="On Market">
                        <select
                          disabled={locked}
                          value={draft.onMarket || "No"}
                          onChange={(e) => set("onMarket", e.target.value)}
                        >
                          {YES_NO.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  )}
                </Section>
              </div>

              {draft.onMarket === "Yes" && (
                <Section title="Listing">
                  <Field label="Listed Price">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.listedPrice || ""}
                      onChange={(e) => set("listedPrice", e.target.value)}
                      placeholder="$0"
                    />
                  </Field>
                  <Field label="Agent Name">
                    <input
                      disabled={locked}
                      value={draft.agentName || ""}
                      onChange={(e) => set("agentName", e.target.value)}
                      placeholder="Agent name"
                    />
                  </Field>
                  <Field label="Agent Phone">
                    <input
                      disabled={locked}
                      value={draft.agentPhone || ""}
                      onChange={(e) =>
                        set("agentPhone", formatPhone(e.target.value))
                      }
                      placeholder="555-000-0000"
                    />
                  </Field>
                  <Field label="Listing URL" wide>
                    <input
                      disabled={locked}
                      type="url"
                      value={draft.listingUrl || ""}
                      onChange={(e) => set("listingUrl", e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                </Section>
              )}

              {isRental && (
                <Section title="Rental Details">
                  <Field label="Rent">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.rent || ""}
                      onChange={(e) => set("rent", e.target.value)}
                      placeholder="$0"
                    />
                  </Field>
                  <Field label="Occupied">
                    <select
                      disabled={locked}
                      value={draft.occupied || "No"}
                      onChange={(e) => set("occupied", e.target.value)}
                    >
                      {YES_NO.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </Section>
              )}

              {!isRental && (
                <Section title="Seller Details">
                  <SellerDetailsFields
                    values={draft}
                    onChange={set}
                    Field={Field}
                    disabled={locked}
                  />
                  <Field label="Follow-Up Date">
                    <input
                      disabled={locked}
                      type="date"
                      value={draft.followUpDate || ""}
                      onChange={(e) => set("followUpDate", e.target.value)}
                    />
                  </Field>
                </Section>
              )}

              {/* Extra columns the lead was imported with. */}
              <ExtraDetails
                fields={deal.fromLead?.extraFields}
                className="ddm-section"
                labelClassName="ddm-section-label"
              />

              {!isRental && (
                <Section title="Deal Numbers">
                  <Field label="ARV">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.arv || ""}
                      onChange={(e) => set("arv", e.target.value)}
                      placeholder="$0"
                    />
                  </Field>
                  <Field label="Rehab Cost">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.rehabCost || ""}
                      onChange={(e) => set("rehabCost", e.target.value)}
                      placeholder="$0"
                    />
                  </Field>
                  <Field label="Additional Rehab">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.additionalRehabCost || ""}
                      onChange={(e) =>
                        set("additionalRehabCost", e.target.value)
                      }
                      placeholder="$0"
                    />
                  </Field>
                  <Field label="Desired Profit">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.desiredProfit || ""}
                      onChange={(e) => set("desiredProfit", e.target.value)}
                      placeholder="$0"
                    />
                  </Field>
                  <Field label="MAO (auto)">
                    <CurrencyInput
                      disabled={locked}
                      value={draft.mao || ""}
                      onChange={(e) => set("mao", e.target.value)}
                      placeholder="$0"
                      className="ddm-mao-input"
                    />
                  </Field>
                </Section>
              )}

              <Section title="Offer & Contract">
                <Field label="Offer Status">
                  <select
                    disabled={locked}
                    value={draft.offerStatus || "Not Sent"}
                    onChange={(e) => set("offerStatus", e.target.value)}
                  >
                    {OFFER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Offer Date">
                  <input
                    disabled={locked}
                    type="date"
                    value={draft.offerDate || ""}
                    onChange={(e) => set("offerDate", e.target.value)}
                  />
                </Field>
                {offerSent && (
                  <Field label={isRental ? "Accepted" : "Seller Accepted"}>
                    <select
                      value={draft.sellerAccepted || "No"}
                      onChange={(e) => set("sellerAccepted", e.target.value)}
                    >
                      {ACCEPTED_OPTS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {offerSent && (
                  <Field label={isRental ? "Offer Price" : "Contract Price"}>
                    <CurrencyInput
                      disabled={locked}
                      value={draft.contractPrice || ""}
                      onChange={(e) => set("contractPrice", e.target.value)}
                      placeholder="$0"
                    />
                  </Field>
                )}
                {openContract && handleContractUpload && (
                  <Field label="Contract File">
                    <div className="contract-actions">
                      <label
                        htmlFor={`contract-upload-modal-${deal.id}`}
                        className="secondary-btn contract-action-btn"
                        title={
                          uploadingDealId === deal.id
                            ? "Uploading…"
                            : deal.closed === "Yes"
                              ? "This deal is closed — reopen it to upload or replace the contract"
                              : latestContractVersion
                                ? "Replace uploaded contract"
                                : "Upload contract"
                        }
                        aria-label={
                          uploadingDealId === deal.id
                            ? "Uploading contract…"
                            : latestContractVersion
                              ? `Replace contract for ${deal.address}`
                              : `Upload contract for ${deal.address}`
                        }
                        aria-disabled={
                          deal.closed === "Yes" || uploadingDealId === deal.id
                        }
                        style={
                          deal.closed === "Yes" || uploadingDealId === deal.id
                            ? { opacity: 0.5 }
                            : undefined
                        }
                        onClick={(e) => {
                          if (deal.closed === "Yes") {
                            e.preventDefault();
                            alert(
                              "This deal is closed. Reopen it to upload or replace the contract.",
                            );
                          } else if (uploadingDealId === deal.id) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {uploadingDealId === deal.id ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                      </label>
                      <input
                        id={`contract-upload-modal-${deal.id}`}
                        className="contract-upload-input"
                        type="file"
                        multiple
                        accept="application/pdf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.formula,.odt,.odf,image/*"
                        disabled={
                          deal.closed === "Yes" || uploadingDealId === deal.id
                        }
                        onChange={(event) => handleContractUpload(deal, event)}
                      />
                    </div>
                  </Field>
                )}
              </Section>

              {openContract && handleDeleteContractVersion && (
                <Section title="Documents">
                  <div className="ddm-edit-field-wide">
                    {contractVersions.length > 0 ? (
                      <div className="ddm-documents-grid">
                        {contractVersions.map((version) => (
                          <div
                            key={version.id}
                            className="ddm-document-card"
                            onClick={() => openContract(deal, version.id)}
                          >
                            <FileText size={16} className="ddm-document-icon" />
                            <div className="ddm-document-copy">
                              <strong title={version.name}>
                                {version.name}
                              </strong>
                              <span>
                                {version.uploadedAt
                                  ? new Date(
                                      version.uploadedAt,
                                    ).toLocaleString()
                                  : "Uploaded contract"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="ddm-document-delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContractVersion(deal, version.id);
                              }}
                              aria-label={`Delete ${version.name}`}
                              title={`Delete ${version.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ddm-documents-empty">
                        No documents uploaded yet.
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {photoStore && (
                <Section title="Photos">
                  <div className="ddm-edit-field-wide">
                    <PhotoGallery
                      ownerId={deal.id}
                      photos={deal.photos}
                      photoStore={photoStore}
                      currentUserId={currentUserId}
                      onChange={savePhotos}
                    />
                  </div>
                </Section>
              )}

              {isRental && (
                <Section title="Closing">
                  <Field label="Closed">
                    <select
                      value={draft.closed || "No"}
                      onChange={(e) => set("closed", e.target.value)}
                    >
                      {YES_NO.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {draft.closed === "Yes" && (
                    <Field label="Closed Date">
                      <input
                        type="date"
                        value={draft.closedDate || ""}
                        onChange={(e) => set("closedDate", e.target.value)}
                      />
                    </Field>
                  )}
                </Section>
              )}

              {!isRental && (
                <Section title="Assignment & Closing">
                  <Field
                    label="Assigned"
                    action={
                      draft.assigned === "Yes" && (
                        <DocLink
                          onClick={() => setAssignmentOptionsOpen(true)}
                          busy={exportingAssignment}
                        >
                          Create assignment
                        </DocLink>
                      )
                    }
                  >
                    <select
                      disabled={locked}
                      value={draft.assigned || "No"}
                      onChange={(e) => set("assigned", e.target.value)}
                    >
                      {YES_NO.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="JV Deal?"
                    action={
                      draft.jvDeal === "Yes" && (
                        <DocLink onClick={handleGenerateJv} busy={exportingJv}>
                          Create JV agreement
                        </DocLink>
                      )
                    }
                  >
                    <select
                      disabled={locked}
                      value={draft.jvDeal || "No"}
                      onChange={(e) => set("jvDeal", e.target.value)}
                    >
                      {YES_NO.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Closed">
                    <select
                      disabled={locked}
                      value={draft.closed || "No"}
                      onChange={(e) => set("closed", e.target.value)}
                    >
                      {YES_NO.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {draft.assigned === "Yes" && (
                    <>
                      <Field label="Assigned Price">
                        <CurrencyInput
                          disabled={locked}
                          value={draft.assignedPrice || ""}
                          onChange={(e) => set("assignedPrice", e.target.value)}
                          placeholder="$0"
                        />
                        {assignedPriceTooLow && (
                          <span className="field-error">
                            {ASSIGNED_PRICE_ERROR}
                          </span>
                        )}
                      </Field>
                      <Field label="Buyer Name">
                        <input
                          disabled={locked}
                          value={draft.buyerName || ""}
                          onChange={(e) => set("buyerName", e.target.value)}
                          placeholder="Buyer name"
                        />
                      </Field>
                      <Field label="Buyer Email">
                        <input
                          disabled={locked}
                          type="email"
                          value={draft.buyerEmail || ""}
                          onChange={(e) => set("buyerEmail", e.target.value)}
                          placeholder="buyer@email.com"
                        />
                      </Field>
                    </>
                  )}
                  {draft.jvDeal === "Yes" && (
                    <>
                      <Field label="Partner Name">
                        <input
                          disabled={locked}
                          value={draft.jvPartnerName || ""}
                          onChange={(e) => set("jvPartnerName", e.target.value)}
                          placeholder="Partner name"
                        />
                      </Field>
                      <Field label="Partner Email">
                        <input
                          disabled={locked}
                          type="email"
                          value={draft.jvPartnerEmail || ""}
                          onChange={(e) =>
                            set("jvPartnerEmail", e.target.value)
                          }
                          placeholder="partner@email.com"
                        />
                      </Field>
                      <Field label="JV Split ($)">
                        <CurrencyInput
                          disabled={locked}
                          value={draft.jvSplit || ""}
                          onChange={(e) => set("jvSplit", e.target.value)}
                          placeholder="$0"
                        />
                      </Field>
                    </>
                  )}
                  {draft.closed === "Yes" && (
                    <Field label="Closed Date">
                      <input
                        disabled={locked}
                        type="date"
                        value={draft.closedDate || ""}
                        onChange={(e) => set("closedDate", e.target.value)}
                      />
                    </Field>
                  )}
                </Section>
              )}

              <div className="ddm-section">
                <div className="ddm-section-label ldm-notes-label">
                  Notes
                  {hasFormatted && !locked && (
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
                    className="ddm-notes-input"
                    disabled={locked}
                    value={draft.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Add notes about this deal…"
                    rows={hasFormatted ? 12 : 5}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {exportingOffer && (
        <WholesaleOfferPdfTemplate
          ref={offerRef}
          sellerName={joinName(draft.sellerFirstName, draft.sellerLastName)}
          propertyAddress={formatFullAddress(draft)}
          purchasePrice={offerPurchasePrice}
          {...offerOptions}
        />
      )}
      {exportingJv && (
        <JvAgreementPdfTemplate
          ref={jvRef}
          partnerName={draft.jvPartnerName?.trim() || ""}
          propertyAddress={formatFullAddress(draft)}
          contractPrice={parseCurrency(draft.contractPrice)}
          assignedPrice={parseCurrency(draft.assignedPrice)}
          jvSplit={parseCurrency(draft.jvSplit)}
        />
      )}
      {exportingAssignment && (
        <AssignmentPdfTemplate
          ref={assignmentRef}
          assigneeName={draft.buyerName?.trim() || ""}
          sellerName={joinName(draft.sellerFirstName, draft.sellerLastName)}
          propertyAddress={formatFullAddress(draft)}
          assignedPrice={parseCurrency(draft.assignedPrice)}
          originalAgreementDate={draft.offerDate}
          inspectionPeriod={assignmentInspection}
        />
      )}
      <AssignmentOptionsModal
        isOpen={assignmentOptionsOpen}
        onClose={() => setAssignmentOptionsOpen(false)}
        onGenerate={handleAssignmentOptionsSubmit}
        initialInspectionPeriod={assignmentInspection}
      />
      <OfferOptionsModal
        isOpen={offerOptionsOpen}
        onClose={() => setOfferOptionsOpen(false)}
        onGenerate={handleOfferOptionsSubmit}
        initialOptions={offerOptions}
        sellerName={joinName(draft.sellerFirstName, draft.sellerLastName)}
      />
      {compsState.runOpen && (
        <RunCompsModal
          address={formatFullAddress(draft)}
          onSaveNote={handleSaveCompsNote}
          onApply={handleApplyComps}
          onClose={compsState.closeRun}
        />
      )}
      <PdfReportPreviewModal
        previewImage={offerPreviewImage}
        onClose={closeOfferPreview}
        onDownload={downloadOffer}
      />
      <PdfReportPreviewModal
        previewImage={jvPreviewImage}
        onClose={closeJvPreview}
        onDownload={downloadJv}
      />
      <PdfReportPreviewModal
        previewImage={assignmentPreviewImage}
        onClose={closeAssignmentPreview}
        onDownload={downloadAssignment}
      />
    </>
  );
}

export default DealDetailModal;
