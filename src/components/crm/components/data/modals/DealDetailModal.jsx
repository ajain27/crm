import { useState, useEffect } from "react";
import { Upload, Loader2, Trash2, FileText } from "lucide-react";
import Modal from "../../../../modal/Modal";
import { Badge } from "../../../../elements/elements";
import {
  getSuggestedWholesaleMao,
  getContractVersions,
  DEAL_TYPES,
} from "../../crmConfig";

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

function initDraft(deal) {
  const d = { ...deal };
  CURRENCY_FIELDS.forEach((f) => {
    d[f] = d[f] ? fmtCurrency(String(d[f])) : "";
  });
  return d;
}

function Section({ title, children }) {
  return (
    <div className="ddm-section">
      <div className="ddm-section-label">{title}</div>
      <div className="ddm-edit-grid">{children}</div>
    </div>
  );
}

function Field({ label, children, wide, span2 }) {
  const widthClass = wide
    ? " ddm-edit-field-wide"
    : span2
      ? " ddm-edit-field-span2"
      : "";
  return (
    <div className={`ddm-edit-field${widthClass}`}>
      <span className="ddm-edit-label">{label}</span>
      {children}
    </div>
  );
}

function DealDetailModal({
  isOpen,
  onClose,
  deal,
  updateDealPatch,
  deleteDeal,
  convertDealToRental,
  openContract,
  handleContractUpload,
  handleDeleteContractVersion,
  uploadingDealId,
  onReactivate,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deal) setDraft(initDraft(deal));
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

  const offerSent = (draft.offerStatus || "Not Sent") === "Offer Sent";
  const locked = offerSent && (draft.sellerAccepted || "No") === "No";
  const contractVersions = getContractVersions(deal);
  const latestContractVersion = contractVersions[0];
  const isRental = (draft.dealType || "Wholesale") === "Potential Rental";

  async function handleDelete() {
    const deleted = await deleteDeal(deal.id);
    if (deleted) onClose();
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

      const { id, ...rest } = draft;
      await updateDealPatch(deal.id, {
        ...rest,
        ...numeric,
        closedDate,
        closedInMonth,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="ddm-title-row">
          <span>{draft.address || deal.address || "Deal Details"}</span>
          <Badge value={draft.dealType || deal.dealType || "Wholesale"} />
        </span>
      }
      className="deal-detail-modal"
      style={{ width: "min(1040px, 96vw)", maxWidth: "min(1040px, 96vw)" }}
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
          <button className="secondary-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
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
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="ddm-body">
        {locked && (
          <div className="ddm-locked-notice">
            Offer sent but seller has not accepted yet. Update "Seller Accepted"
            to unlock fields.
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
          {!isRental && (
            <>
              <Field label="Seller Phone">
                <input
                  disabled={locked}
                  value={draft.sellerPhone || ""}
                  onChange={(e) => set("sellerPhone", e.target.value)}
                  placeholder="555-000-0000"
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

        {draft.onMarket === "Yes" && (
          <Section title="Listing">
            <Field label="Listed Price">
              <input
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
                onChange={(e) => set("agentPhone", e.target.value)}
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
              <input
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
          <Section title="Deal Numbers">
            <Field label="ARV">
              <input
                disabled={locked}
                value={draft.arv || ""}
                onChange={(e) => set("arv", e.target.value)}
                placeholder="$0"
              />
            </Field>
            <Field label="Rehab Cost">
              <input
                disabled={locked}
                value={draft.rehabCost || ""}
                onChange={(e) => set("rehabCost", e.target.value)}
                placeholder="$0"
              />
            </Field>
            <Field label="Additional Rehab">
              <input
                disabled={locked}
                value={draft.additionalRehabCost || ""}
                onChange={(e) => set("additionalRehabCost", e.target.value)}
                placeholder="$0"
              />
            </Field>
            <Field label="Desired Profit">
              <input
                disabled={locked}
                value={draft.desiredProfit || ""}
                onChange={(e) => set("desiredProfit", e.target.value)}
                placeholder="$0"
              />
            </Field>
            <Field label="MAO (auto)">
              <input
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
          <Field label={isRental ? "Offer Price" : "Contract Price"}>
            <input
              disabled={locked}
              value={draft.contractPrice || ""}
              onChange={(e) => set("contractPrice", e.target.value)}
              placeholder="$0"
            />
          </Field>
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
                        <strong title={version.name}>{version.name}</strong>
                        <span>
                          {version.uploadedAt
                            ? new Date(version.uploadedAt).toLocaleString()
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
            <Field label="Assigned">
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
            <Field label="JV Deal?">
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
                  <input
                    disabled={locked}
                    value={draft.assignedPrice || ""}
                    onChange={(e) => set("assignedPrice", e.target.value)}
                    placeholder="$0"
                  />
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
                    onChange={(e) => set("jvPartnerEmail", e.target.value)}
                    placeholder="partner@email.com"
                  />
                </Field>
                <Field label="JV Split ($)">
                  <input
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
          <div className="ddm-section-label">Notes</div>
          <textarea
            className="ddm-notes-input"
            disabled={locked}
            value={draft.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Add notes about this deal…"
            rows={5}
          />
        </div>
      </div>
    </Modal>
  );
}

export default DealDetailModal;
