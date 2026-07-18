import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, AlertCircle, Loader } from "lucide-react";
import Modal from "../../modal/Modal";

async function sendViaBrevo({
  apiKey,
  senderEmail,
  toEmail,
  toName,
  subject,
  body,
}) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "You Win Estates", email: senderEmail },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      textContent: body,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res;
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

const EMPTY_REGULAR = { subject: "", body: "" };

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

function MailMergeModal({ isOpen, onClose, selectedBuyers }) {
  const brevoApiKey = import.meta.env.VITE_BREVO_API_KEY || "";
  const brevoSenderEmail =
    import.meta.env.VITE_BREVO_SENDER_EMAIL || "ankit4pace@gmail.com";
  const NOT_CONFIGURED = !brevoApiKey;

  const [mode, setMode] = useState("deal"); // "deal" | "regular"
  const [dealTemplate, setDealTemplate] = useState(EMPTY_DEAL);
  const [regularTemplate, setRegularTemplate] = useState(EMPTY_REGULAR);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [sendErrors, setSendErrors] = useState([]);
  const abortRef = useRef(false);

  const recipients = selectedBuyers.filter((b) => b.email?.trim());
  const skipped = selectedBuyers.length - recipients.length;
  const stateLabel = deriveStateLabel(selectedBuyers);

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
    if (NOT_CONFIGURED) return;

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
            ? buildDealBody(dealTemplate, buyer.fullName)
            : regularTemplate.body;

        await sendViaBrevo({
          apiKey: brevoApiKey,
          senderEmail: brevoSenderEmail,
          toEmail: buyer.email.trim(),
          toName: buyer.fullName || "",
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
    setDealTemplate(EMPTY_DEAL);
    setRegularTemplate(EMPTY_REGULAR);
    onClose();
  }

  const isDealReady =
    !NOT_CONFIGURED &&
    recipients.length > 0 &&
    dealTemplate.address.trim() &&
    sendStatus !== "sending";

  const isRegularReady =
    !NOT_CONFIGURED &&
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
  const dealPreviewBody = buildDealBody(dealTemplate, previewBuyer.fullName);

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
            Brevo is not configured. Add <code>VITE_BREVO_API_KEY</code> to your{" "}
            <code>.env.local</code> and redeploy.
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
            recipients.map((b) => (
              <span key={b.id} className="mail-merge-chip">
                {b.fullName}
                {b.email ? ` <${b.email}>` : ""}
              </span>
            ))
          )}
        </div>

        {mode === "deal" ? (
          <>
            <div className="mail-merge-section-label">Property Details</div>
            <div className="mail-merge-grid">
              <label className="field mail-merge-full">
                <span>Property Address *</span>
                <input
                  name="address"
                  value={dealTemplate.address}
                  onChange={handleDealChange}
                  placeholder="e.g. 123 Main St, Atlanta, GA 30301"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>Price</span>
                <input
                  name="price"
                  value={dealTemplate.price}
                  onChange={handleDealChange}
                  placeholder="e.g. $85,000"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>ARV</span>
                <input
                  name="arv"
                  value={dealTemplate.arv}
                  onChange={handleDealChange}
                  placeholder="e.g. $160,000"
                  disabled={sendStatus === "sending"}
                />
              </label>
              <label className="field">
                <span>Repairs</span>
                <input
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
                  (personalized for {getFirstName(previewBuyer.fullName)})
                </span>
              )}
            </div>
            <div className="mail-merge-preview-wrap">
              <div className="mail-merge-preview-subject">
                <span>Subject:</span> {previewSubject}
              </div>
              <pre className="mail-merge-preview">{dealPreviewBody}</pre>
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
      </div>
    </Modal>
  );
}

export default MailMergeModal;
