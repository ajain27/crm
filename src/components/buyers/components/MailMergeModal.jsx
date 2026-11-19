import { useState, useEffect, useRef } from "react";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
  Pencil,
  Paperclip,
} from "lucide-react";
import Modal from "../../modal/Modal";
import { useAddressAutocomplete } from "../../../hooks/useAddressAutocomplete";
import CurrencyInput from "../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../elements/ModalActions";

// Sends through the app's email API (/api/send-email), which sends from
// youwinestates@gmail.com — the same route account and reset emails use.
async function sendBuyerEmail({ toEmail, subject, body, attachments = [] }) {
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toEmail,
      subject,
      textContent: body,
      fromName: "You Win Estates",
      ...(attachments.length
        ? {
            attachments: attachments.map(
              ({ filename, contentType, content }) => ({
                filename,
                contentType,
                content,
              }),
            ),
          }
        : {}),
    }),
  };
  let res = await fetch("/api/send-email", requestOptions);
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (res.status === 404 && isLocalhost) {
    res = await fetch("http://localhost:3001/api/send-email", requestOptions);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res;
}

// Attachments ride along in each send request, base64-encoded (a third
// bigger than the files), and Vercel caps a request at 4.5 MB — so the
// files together stay under 3 MB.
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// A file as { filename, contentType, size, content } with `content` its
// base64 (no "data:" prefix).
function readAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        content: String(reader.result || "").split(",")[1] || "",
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const EMPTY_DEAL = {
  address: "",
  price: "",
  arv: "",
  repairs: "",
  beds: "",
  baths: "",
  photosLink: "",
  subject: "",
};

const SIGNATURE = "Ankit Jain\nOWNER | YOU WIN ESTATES LLC\nM: 206-822-8019";

const EMPTY_REGULAR = { subject: "", body: "\n\n" + SIGNATURE };

function fmtCurrency(value) {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? "$" + parseInt(numeric, 10).toLocaleString("en-US") : "";
}

function getFirstName(fullName) {
  return fullName?.trim().split(/\s+/)[0] || "Investor";
}

function deriveStateLabel(selectedBuyers) {
  const states = [
    ...new Set(
      selectedBuyers.map((b) => b.state?.trim().toUpperCase()).filter(Boolean),
    ),
  ];
  if (states.length === 0) return "";
  if (states.length === 1) return states[0];
  if (states.length <= 3) return states.join(" & ");
  return `${states.slice(0, 2).join(", ")} +${states.length - 2} more`;
}

function buildSubject(stateLabel) {
  return stateLabel
    ? `Property available in ${stateLabel} — interested?`
    : "Property available — interested?";
}

function buildDealBody(template, buyerFullName) {
  const firstName = getFirstName(buyerFullName);
  const bedsBaths =
    template.beds && template.baths
      ? `${template.beds} Beds / ${template.baths} Baths`
      : template.beds
        ? `${template.beds} Beds`
        : template.baths
          ? `${template.baths} Baths`
          : "[Beds/Baths]";

  return [
    `Hi ${firstName},`,
    "",
    "I wanted to reach out about a property that may be a good fit for you.",
    "",
    `Address: ${template.address || "[Property Address]"}`,
    `Price: ${template.price || "[Price]"}`,
    `ARV: ${template.arv || "[ARV]"}`,
    `Est. Repairs: ${template.repairs || "[Repairs]"}`,
    `Beds/Baths: ${bedsBaths}`,
    "",
    `Photos and details: ${template.photosLink || "[Link]"}`,
    "",
    "Reply if you'd like more info or to schedule a walkthrough.",
    "",
    "Thanks,",
    "You Win Estates",
    "(206) 822-8019",
  ].join("\n");
}

// An edited deal body was written for the buyer shown in the preview
// (`writtenFor`): its greeting line ("Hi Alex,") is re-addressed to each
// recipient, so every buyer gets their own name and the rest of the edits
// stay as typed. A greeting without that name is left alone.
function personalizeEditedBody(body, writtenFor, buyerFullName) {
  if (!writtenFor) return body;
  const lines = body.split("\n");
  const i = lines.findIndex((line) => line.trim());
  if (i === -1) return body;
  const escaped = writtenFor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRe = new RegExp(`(^|[^\\p{L}])${escaped}(?![\\p{L}])`, "u");
  if (!nameRe.test(lines[i])) return body;
  lines[i] = lines[i].replace(
    nameRe,
    (_, before) => `${before}${getFirstName(buyerFullName)}`,
  );
  return lines.join("\n");
}

// Its own component so Places attaches when the input mounts (the modal,
// and the Deal tab, render it only after the modal itself has mounted).
function AddressAutocompleteInput({ onSelect, ...props }) {
  const inputRef = useRef(null);
  useAddressAutocomplete(inputRef, ({ formatted }) => onSelect(formatted));
  return <input ref={inputRef} autoComplete="off" {...props} />;
}

function MailMergeModal({ isOpen, onClose, selectedBuyers }) {
  const [mode, setMode] = useState("deal"); // "deal" | "regular"
  const [dealTemplate, setDealTemplate] = useState(EMPTY_DEAL);
  const [dealBodyOverride, setDealBodyOverride] = useState(null);
  // First name the edited body's greeting was written for (see
  // personalizeEditedBody).
  const [overrideWrittenFor, setOverrideWrittenFor] = useState(null);
  const [regularTemplate, setRegularTemplate] = useState(EMPTY_REGULAR);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [emailOverrides, setEmailOverrides] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [sendStatus, setSendStatus] = useState(null);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [sendErrors, setSendErrors] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef(null);
  const abortRef = useRef(false);

  const attachedBytes = attachments.reduce((sum, a) => sum + a.size, 0);

  async function handleAttach(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setAttachError("");
    const fresh = files.filter(
      (f) =>
        !attachments.some((a) => a.filename === f.name && a.size === f.size),
    );
    const total = attachedBytes + fresh.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ATTACHMENT_BYTES) {
      setAttachError(
        `Attachments can total up to ${formatBytes(MAX_ATTACHMENT_BYTES)} — these come to ${formatBytes(total)}. Share bigger files as a link (e.g. Google Drive).`,
      );
      return;
    }
    try {
      const read = await Promise.all(fresh.map(readAttachment));
      setAttachments((prev) => [...prev, ...read]);
    } catch {
      setAttachError("Couldn't read that file. Try again.");
    }
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachError("");
  }

  const recipients = selectedBuyers
    .filter((b) => !removedIds.has(b.id))
    .map((b) => ({
      ...b,
      email: (emailOverrides[b.id] ?? b.email ?? "").trim(),
    }))
    .filter((b) => b.email);
  const skipped = selectedBuyers.filter(
    (b) => !(emailOverrides[b.id] ?? b.email ?? "").trim(),
  ).length;
  const stateLabel = deriveStateLabel(recipients);

  function startEditingEmail(buyer) {
    setEditingId(buyer.id);
    setEditingValue(emailOverrides[buyer.id] ?? buyer.email ?? "");
  }

  function saveEditingEmail() {
    setEmailOverrides((prev) => ({
      ...prev,
      [editingId]: editingValue.trim(),
    }));
    setEditingId(null);
  }

  useEffect(() => {
    if (isOpen) {
      setDealTemplate((prev) => ({
        ...prev,
        subject: prev.subject || buildSubject(stateLabel),
      }));
    }
  }, [isOpen, stateLabel]);

  useEffect(() => {
    if (sendStatus !== "done") return;
    const timer = setTimeout(handleClose, 3000);
    return () => clearTimeout(timer);
  }, [sendStatus]);

  useEffect(() => {
    if (removedIds.size > 0 && recipients.length === 0) {
      handleClose();
    }
  }, [recipients.length, removedIds.size]);

  function handleDealChange(e) {
    const { name, value } = e.target;
    if (name === "price" || name === "arv" || name === "repairs") {
      setDealTemplate((prev) => ({ ...prev, [name]: fmtCurrency(value) }));
    } else {
      setDealTemplate((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleRegularChange(e) {
    const { name, value } = e.target;
    setRegularTemplate((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSend() {
    abortRef.current = false;
    setSendStatus("sending");
    setSendProgress({ sent: 0, total: recipients.length });
    setSendErrors([]);

    let sent = 0;
    const errors = [];

    for (const buyer of recipients) {
      if (abortRef.current) break;
      try {
        const subject =
          mode === "deal"
            ? dealTemplate.subject || buildSubject(stateLabel)
            : regularTemplate.subject;
        const body =
          mode === "deal"
            ? dealBodyOverride !== null
              ? personalizeEditedBody(
                  dealBodyOverride,
                  overrideWrittenFor,
                  buyer.fullName,
                )
              : buildDealBody(dealTemplate, buyer.fullName)
            : regularTemplate.body;

        await sendBuyerEmail({
          toEmail: buyer.email.trim(),
          attachments,
          subject,
          body,
        });
        sent++;
        setSendProgress({ sent, total: recipients.length });
        if (sent < recipients.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (err) {
        console.error(`Failed to send email to ${buyer.email}:`, err);
        errors.push({
          name: buyer.fullName || buyer.email,
          reason: err.message,
        });
      }
    }

    setSendErrors(errors);
    setSendStatus("done");
  }

  function handleClose() {
    abortRef.current = true;
    setSendStatus(null);
    setSendProgress({ sent: 0, total: 0 });
    setSendErrors([]);
    setDealTemplate(EMPTY_DEAL);
    setDealBodyOverride(null);
    setOverrideWrittenFor(null);
    setRegularTemplate(EMPTY_REGULAR);
    setRemovedIds(new Set());
    setEmailOverrides({});
    setEditingId(null);
    setAttachments([]);
    setAttachError("");
    onClose();
  }

  const isDealReady =
    recipients.length > 0 &&
    dealTemplate.address.trim() &&
    sendStatus !== "sending";

  const isRegularReady =
    recipients.length > 0 &&
    regularTemplate.subject.trim() &&
    regularTemplate.body.trim() &&
    sendStatus !== "sending";

  const isReady = mode === "deal" ? isDealReady : isRegularReady;

  const previewSubject =
    mode === "deal"
      ? dealTemplate.subject || buildSubject(stateLabel)
      : regularTemplate.subject;
  const previewBuyer = recipients[0] || { fullName: "Investor Name" };
  const dealPreviewBody =
    dealBodyOverride !== null
      ? personalizeEditedBody(
          dealBodyOverride,
          overrideWrittenFor,
          previewBuyer.fullName,
        )
      : buildDealBody(dealTemplate, previewBuyer.fullName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={sendStatus === "sending" ? undefined : handleClose}
      title={`Compose Email — ${selectedBuyers.length} buyer${selectedBuyers.length !== 1 ? "s" : ""} selected`}
      style={{ maxWidth: "700px" }}
      closeOnOverlayClick={false}
      actions={
        <ModalActions
          end={
            <>
              <ActionButton
                label={sendStatus === "done" ? "Close" : "Cancel"}
                onClick={handleClose}
                disabled={sendStatus === "sending"}
              />
              {sendStatus !== "done" && (
                <ActionButton
                  tone="primary"
                  onClick={handleSend}
                  disabled={!isReady}
                  icon={sendStatus === "sending" ? undefined : Send}
                  label={
                    sendStatus === "sending" ? (
                      <>
                        <Loader size={14} className="spin-icon" />
                        Sending {sendProgress.sent}/{sendProgress.total}...
                      </>
                    ) : (
                      `Send to ${recipients.length} Buyer${recipients.length !== 1 ? "s" : ""}`
                    )
                  }
                />
              )}
            </>
          }
        />
      }
    >
      <div className="mail-merge-modal">
        {sendStatus === "done" && (
          <div
            className={`mail-merge-send-result ${sendErrors.length ? "mail-merge-warning" : "mail-merge-success"}`}
          >
            {sendErrors.length === 0 ? (
              <>
                <CheckCircle size={15} />
                Successfully sent to {sendProgress.sent} buyer
                {sendProgress.sent !== 1 ? "s" : ""}.
              </>
            ) : (
              <>
                <AlertCircle size={15} />
                Sent to {sendProgress.sent} buyer
                {sendProgress.sent !== 1 ? "s" : ""}. Failed:{" "}
                {sendErrors.map((e) => e.name).join(", ")}.
                {[...new Set(sendErrors.map((e) => e.reason).filter(Boolean))]
                  .map((reason) => ` ${reason}`)
                  .join("")}
              </>
            )}
          </div>
        )}

        {/* Mode toggle */}
        <div className="mail-merge-mode-toggle">
          <button
            type="button"
            className={`mail-merge-mode-btn${mode === "deal" ? " mail-merge-mode-btn--active" : ""}`}
            onClick={() => setMode("deal")}
            disabled={sendStatus === "sending"}
          >
            Deal Email
          </button>
          <button
            type="button"
            className={`mail-merge-mode-btn${mode === "regular" ? " mail-merge-mode-btn--active" : ""}`}
            onClick={() => setMode("regular")}
            disabled={sendStatus === "sending"}
          >
            Regular Email
          </button>
        </div>

        {skipped > 0 && sendStatus !== "done" && (
          <div className="mail-merge-warning">
            {skipped} buyer{skipped !== 1 ? "s have" : " has"} no email address
            and will be skipped.
          </div>
        )}

        <div className="mail-merge-section-label">
          Recipients ({recipients.length})
        </div>
        <div className="mail-merge-recipients">
          {recipients.length === 0 ? (
            <span className="mail-merge-empty">
              No selected buyers have an email address.
            </span>
          ) : (
            recipients.map((b) =>
              editingId === b.id ? (
                <span
                  key={b.id}
                  className="mail-merge-chip mail-merge-chip-editing"
                >
                  {b.fullName}
                  <input
                    type="email"
                    className="mail-merge-chip-email-input"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={saveEditingEmail}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEditingEmail();
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                    placeholder="email@example.com"
                  />
                </span>
              ) : (
                <span key={b.id} className="mail-merge-chip">
                  {b.fullName}
                  {b.email ? ` <${b.email}>` : ""}
                  <button
                    type="button"
                    className="mail-merge-chip-edit"
                    onClick={() => startEditingEmail(b)}
                    title="Edit email"
                    disabled={sendStatus === "sending"}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    className="mail-merge-chip-remove"
                    onClick={() =>
                      setRemovedIds((prev) => new Set([...prev, b.id]))
                    }
                    title="Remove from this send"
                    disabled={sendStatus === "sending"}
                  >
                    <X size={11} />
                  </button>
                </span>
              ),
            )
          )}
        </div>

        {mode === "deal" ? (
          <>
            <div className="mail-merge-section-label">Property Details</div>
            <div className="mail-merge-grid">
              <label className="field mail-merge-full">
                <span>Property Address *</span>
                <AddressAutocompleteInput
                  name="address"
                  value={dealTemplate.address}
                  onChange={handleDealChange}
                  onSelect={(address) =>
                    setDealTemplate((prev) => ({ ...prev, address }))
                  }
                  placeholder="e.g. 123 Main St, Atlanta, GA 30301"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>Price</span>
                <CurrencyInput
                  name="price"
                  value={dealTemplate.price}
                  onChange={handleDealChange}
                  placeholder="e.g. $85,000"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>ARV</span>
                <CurrencyInput
                  name="arv"
                  value={dealTemplate.arv}
                  onChange={handleDealChange}
                  placeholder="e.g. $160,000"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>Repairs</span>
                <CurrencyInput
                  name="repairs"
                  value={dealTemplate.repairs}
                  onChange={handleDealChange}
                  placeholder="e.g. $25,000"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>Beds</span>
                <input
                  name="beds"
                  value={dealTemplate.beds}
                  onChange={handleDealChange}
                  placeholder="e.g. 3"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>Baths</span>
                <input
                  name="baths"
                  value={dealTemplate.baths}
                  onChange={handleDealChange}
                  placeholder="e.g. 2"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field mail-merge-full">
                <span>Photos / Details Link</span>
                <input
                  name="photosLink"
                  value={dealTemplate.photosLink}
                  onChange={handleDealChange}
                  placeholder="e.g. https://drive.google.com/..."
                  disabled={sendStatus === "sending"}
                />
              </label>
            </div>

            <div className="mail-merge-section-label">Subject</div>
            <label className="field mail-merge-full">
              <input
                name="subject"
                value={dealTemplate.subject}
                onChange={handleDealChange}
                placeholder={buildSubject(stateLabel)}
                disabled={sendStatus === "sending"}
              />
            </label>

            <div className="mail-merge-section-label">
              Email Preview
              {recipients.length > 0 && (
                <span
                  style={{
                    fontWeight: 400,
                    textTransform: "none",
                    marginLeft: "0.4rem",
                    color: "var(--muted)",
                  }}
                >
                  {dealBodyOverride !== null
                    ? "(edited — sent to every recipient, greeted by their own first name)"
                    : `(personalized for ${getFirstName(previewBuyer.fullName)})`}
                </span>
              )}
            </div>
            <div className="mail-merge-preview-wrap">
              <div className="mail-merge-preview-subject">
                <span>Subject:</span> {previewSubject}
              </div>
              <textarea
                className="mail-merge-preview mail-merge-preview-editable"
                value={dealPreviewBody}
                onChange={(e) => {
                  setDealBodyOverride(e.target.value);
                  setOverrideWrittenFor(getFirstName(previewBuyer.fullName));
                }}
                disabled={sendStatus === "sending"}
                rows={12}
              />
            </div>
          </>
        ) : (
          <>
            <div className="mail-merge-section-label">Subject *</div>
            <label className="field mail-merge-full">
              <input
                name="subject"
                value={regularTemplate.subject}
                onChange={handleRegularChange}
                placeholder="e.g. Quick question for you"
                disabled={sendStatus === "sending"}
              />
            </label>

            <div className="mail-merge-section-label">Message *</div>
            <label className="field mail-merge-full">
              <textarea
                name="body"
                value={regularTemplate.body}
                onChange={handleRegularChange}
                placeholder="Type your message here…"
                rows={10}
                disabled={sendStatus === "sending"}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            </label>

            {regularTemplate.subject && regularTemplate.body && (
              <>
                <div className="mail-merge-section-label">Preview</div>
                <div className="mail-merge-preview-wrap">
                  <div className="mail-merge-preview-subject">
                    <span>Subject:</span> {regularTemplate.subject}
                  </div>
                  <pre className="mail-merge-preview">
                    {regularTemplate.body}
                  </pre>
                </div>
              </>
            )}
          </>
        )}

        <div className="mail-merge-section-label">
          Attachments
          {attachments.length > 0 && (
            <span className="mail-merge-attach-total">
              {formatBytes(attachedBytes)} of{" "}
              {formatBytes(MAX_ATTACHMENT_BYTES)}
            </span>
          )}
        </div>
        <div className="mail-merge-attachments">
          {attachments.map((a, i) => (
            <span key={`${a.filename}-${i}`} className="mail-merge-attachment">
              <Paperclip size={12} />
              <span className="mail-merge-attachment-name">{a.filename}</span>
              <span className="mail-merge-attachment-size">
                {formatBytes(a.size)}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                disabled={sendStatus === "sending"}
                aria-label={`Remove ${a.filename}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="mail-merge-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendStatus === "sending"}
          >
            <Paperclip size={13} />
            Attach files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleAttach}
            data-testid="mail-merge-file-input"
          />
        </div>
        {attachError && (
          <div className="mail-merge-warning mail-merge-attach-error">
            {attachError}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default MailMergeModal;
