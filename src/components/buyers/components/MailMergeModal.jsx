import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, AlertCircle, Loader } from "lucide-react";
import emailjs from "@emailjs/browser";
import Modal from "../../modal/Modal";

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

const EMPTY_TEMPLATE = {
  address: "",
  price: "",
  arv: "",
  repairs: "",
  beds: "",
  baths: "",
  photosLink: "",
  subject: "",
};

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

function buildBody(template, buyerFullName) {
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

const NOT_CONFIGURED =
  !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY;

function MailMergeModal({ isOpen, onClose, selectedBuyers }) {
  const [template, setTemplate] = useState(EMPTY_TEMPLATE);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [sendErrors, setSendErrors] = useState([]);
  const abortRef = useRef(false);

  const recipients = selectedBuyers.filter((b) => b.email?.trim());
  const skipped = selectedBuyers.length - recipients.length;
  const stateLabel = deriveStateLabel(selectedBuyers);

  useEffect(() => {
    if (isOpen) {
      setTemplate((prev) => ({
        ...prev,
        subject: prev.subject || buildSubject(stateLabel),
      }));
    }
  }, [isOpen, stateLabel]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "price" || name === "arv" || name === "repairs") {
      setTemplate((prev) => ({ ...prev, [name]: fmtCurrency(value) }));
    } else {
      setTemplate((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSend() {
    if (NOT_CONFIGURED) return;
    if (!recipients.length || !template.address.trim()) return;

    abortRef.current = false;
    setSendStatus("sending");
    setSendProgress({ sent: 0, total: recipients.length });
    setSendErrors([]);

    let sent = 0;
    const errors = [];
    const subject = template.subject || buildSubject(stateLabel);

    for (const buyer of recipients) {
      if (abortRef.current) break;
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: buyer.email.trim(),
            to_name: buyer.fullName || "",
            subject,
            message: buildBody(template, buyer.fullName),
            reply_to: "ankit4pace@gmail.com",
          },
          EMAILJS_PUBLIC_KEY,
        );
        sent++;
        setSendProgress({ sent, total: recipients.length });
        if (sent < recipients.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        errors.push(buyer.fullName || buyer.email);
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
    setTemplate(EMPTY_TEMPLATE);
    onClose();
  }

  const isReady =
    !NOT_CONFIGURED &&
    recipients.length > 0 &&
    template.address.trim() &&
    sendStatus !== "sending";

  const previewSubject = template.subject || buildSubject(stateLabel);
  const previewBuyer = recipients[0] || { fullName: "Investor Name" };
  const previewBody = buildBody(template, previewBuyer.fullName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={sendStatus === "sending" ? undefined : handleClose}
      title={`Compose Email — ${selectedBuyers.length} buyer${selectedBuyers.length !== 1 ? "s" : ""} selected`}
      style={{ maxWidth: "700px" }}
      actions={
        <div className="profile-modal-actions">
          <button
            className="secondary-btn profile-modal-btn"
            onClick={handleClose}
            disabled={sendStatus === "sending"}
          >
            {sendStatus === "done" ? "Close" : "Cancel"}
          </button>
          {sendStatus !== "done" && (
            <button
              className="primary-btn profile-modal-btn"
              onClick={handleSend}
              disabled={!isReady}
            >
              {sendStatus === "sending" ? (
                <>
                  <Loader size={15} className="spin-icon" />
                  Sending {sendProgress.sent}/{sendProgress.total}...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send to {recipients.length} Buyer
                  {recipients.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="mail-merge-modal">
        {NOT_CONFIGURED && (
          <div className="mail-merge-warning mail-merge-warning-error">
            <AlertCircle size={15} />
            EmailJS is not configured. Add <code>
              VITE_EMAILJS_SERVICE_ID
            </code>, <code>VITE_EMAILJS_TEMPLATE_ID</code>, and{" "}
            <code>VITE_EMAILJS_PUBLIC_KEY</code> to your <code>.env.local</code>
            .
          </div>
        )}

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
                {sendErrors.join(", ")}.
              </>
            )}
          </div>
        )}

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
            recipients.map((b) => (
              <span key={b.id} className="mail-merge-chip">
                {b.fullName}
                {b.email ? ` <${b.email}>` : ""}
              </span>
            ))
          )}
        </div>

        <div className="mail-merge-section-label">Property Details</div>
        <div className="mail-merge-grid">
          <label className="field mail-merge-full">
            <span>Property Address *</span>
            <input
              name="address"
              value={template.address}
              onChange={handleChange}
              placeholder="e.g. 123 Main St, Atlanta, GA 30301"
              disabled={sendStatus === "sending"}
            />
          </label>
          <label className="field">
            <span>Price</span>
            <input
              name="price"
              value={template.price}
              onChange={handleChange}
              placeholder="e.g. $85,000"
              disabled={sendStatus === "sending"}
            />
          </label>
          <label className="field">
            <span>ARV</span>
            <input
              name="arv"
              value={template.arv}
              onChange={handleChange}
              placeholder="e.g. $160,000"
              disabled={sendStatus === "sending"}
            />
          </label>
          <label className="field">
            <span>Repairs</span>
            <input
              name="repairs"
              value={template.repairs}
              onChange={handleChange}
              placeholder="e.g. $25,000"
              disabled={sendStatus === "sending"}
            />
          </label>
          <label className="field">
            <span>Beds</span>
            <input
              name="beds"
              value={template.beds}
              onChange={handleChange}
              placeholder="e.g. 3"
              disabled={sendStatus === "sending"}
            />
          </label>
          <label className="field">
            <span>Baths</span>
            <input
              name="baths"
              value={template.baths}
              onChange={handleChange}
              placeholder="e.g. 2"
              disabled={sendStatus === "sending"}
            />
          </label>
          <label className="field mail-merge-full">
            <span>Photos / Details Link</span>
            <input
              name="photosLink"
              value={template.photosLink}
              onChange={handleChange}
              placeholder="e.g. https://drive.google.com/..."
              disabled={sendStatus === "sending"}
            />
          </label>
        </div>

        <div className="mail-merge-section-label">Subject</div>
        <label className="field mail-merge-full">
          <input
            name="subject"
            value={template.subject}
            onChange={handleChange}
            placeholder={previewSubject}
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
              (personalized for {getFirstName(previewBuyer.fullName)})
            </span>
          )}
        </div>
        <div className="mail-merge-preview-wrap">
          <div className="mail-merge-preview-subject">
            <span>Subject:</span> {previewSubject}
          </div>
          <pre className="mail-merge-preview">{previewBody}</pre>
        </div>
      </div>
    </Modal>
  );
}

export default MailMergeModal;
