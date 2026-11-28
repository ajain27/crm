import { useState } from "react";
import { CheckCircle, Eye, Plus, Send, Trash2, Upload } from "lucide-react";
import Modal from "../../modal/Modal";
import CurrencyInput from "../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../elements/ModalActions";
import { trimFieldOnBlur } from "../../../utils/utils";
import {
  buildLoiPdf,
  defaultMessage,
  defaultSubject,
  initialLoiForm,
  loadLoiDefaults,
  loiFilename,
  loiPdfBase64,
  loiProblems,
  saveLoiDefaults,
} from "./loiLetter";
import "./LoiModal.css";

// Sends through the app's email API, from the business Gmail, with the
// user as reply-to (and copied, if they ask).
async function sendLoiEmail(payload) {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
  let res = await fetch("/api/send-email", options);
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (res.status === 404 && isLocalhost) {
    res = await fetch("http://localhost:3001/api/send-email", options);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
}

// A logo picked from disk, shrunk to at most 1000px wide so the PDF stays
// small enough to email. PNGs stay PNG (transparency); others become JPEG.
function readLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image."));
      img.onload = () => {
        const scale = Math.min(1, 1000 / img.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        const png = file.type === "image/png";
        if (!png) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(
          png
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.9),
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Field({ label, wide, hint, children }) {
  return (
    <label className={`field loi-field${wide ? " loi-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small className="loi-hint">{hint}</small>}
    </label>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="loi-section">
      <h3 className="loi-section-title">
        {title}
        {note && <span className="loi-section-note">{note}</span>}
      </h3>
      <div className="loi-grid">{children}</div>
    </section>
  );
}

// The letter of intent for one listing: every detail asked for (filled in
// from the listing and the last letter), previewed as a PDF, and emailed
// to the listing agent with the PDF attached.
export default function LoiModal({ listing, contacts = [], onClose, onSent }) {
  const [form, setForm] = useState(() =>
    initialLoiForm(listing, contacts, loadLoiDefaults()),
  );
  // The subject and message follow the form until the user edits them.
  const [edited, setEdited] = useState({ subject: false, message: false });
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  const subject = edited.subject ? form.subject : defaultSubject(form);
  const message = edited.message ? form.message : defaultMessage(form);
  const busy = status === "sending";

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "subject" || name === "message") {
      setEdited((prev) => ({ ...prev, [name]: true }));
    }
    set(name, type === "checkbox" ? checked : value);
  };
  const trim = trimFieldOnBlur(handleChange);
  const input = (name, props = {}) => (
    <input
      name={name}
      value={form[name]}
      onChange={handleChange}
      onBlur={trim}
      disabled={busy}
      {...props}
    />
  );

  const setTerm = (index, key, value) =>
    set(
      "extraTerms",
      form.extraTerms.map((t, i) => (i === index ? { ...t, [key]: value } : t)),
    );

  async function handleLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      set("logo", await readLogo(file));
    } catch (err) {
      setError(err.message);
    }
  }

  const finalForm = { ...form, subject, message };

  async function handlePreview() {
    setError("");
    try {
      const pdf = await buildLoiPdf(finalForm);
      const url = URL.createObjectURL(pdf.output("blob"));
      const opened = window.open(url, "_blank");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = loiFilename(finalForm);
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(`Couldn't make the PDF: ${err.message}`);
    }
  }

  async function handleSend() {
    const problems = loiProblems(finalForm);
    if (problems.length) {
      setError(`Please add ${problems.join(", ")}.`);
      return;
    }
    setError("");
    setStatus("sending");
    try {
      const content = await loiPdfBase64(finalForm);
      const signerEmail = form.signerEmail.trim();
      await sendLoiEmail({
        toEmail: form.toEmail.trim(),
        subject: subject.trim() || defaultSubject(form),
        textContent: message,
        fromName: form.company.trim() || form.signerName.trim(),
        ...(signerEmail ? { replyTo: signerEmail } : {}),
        ...(signerEmail && form.ccMe ? { cc: signerEmail } : {}),
        attachments: [
          {
            filename: loiFilename(finalForm),
            contentType: "application/pdf",
            content,
          },
        ],
      });
      saveLoiDefaults(form);
      setStatus("sent");
      onSent?.({
        sentAt: new Date().toISOString(),
        toEmail: form.toEmail.trim(),
        price: form.price.trim(),
      });
    } catch (err) {
      setStatus("idle");
      setError(`The letter wasn't sent: ${err.message}`);
    }
  }

  const agentEmails = contacts.filter((c) => c.email);

  if (status === "sent") {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Letter of intent sent"
        className="loi-modal"
        style={{ width: "min(480px, 94vw)", height: "auto" }}
        actions={<ActionButton label="Done" tone="primary" onClick={onClose} />}
      >
        <div className="loi-sent">
          <CheckCircle size={28} />
          <p>
            Sent to <strong>{form.toEmail.trim()}</strong>
            {form.signerEmail.trim() && form.ccMe
              ? `, with a copy to ${form.signerEmail.trim()}`
              : ""}
            . Their reply comes to{" "}
            {form.signerEmail.trim() || "the business inbox"}.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={busy ? () => {} : onClose}
      closeOnOverlayClick={false}
      title="Send letter of intent"
      className="loi-modal"
      style={{ width: "min(820px, 96vw)", maxWidth: "min(820px, 96vw)" }}
      actions={
        <ModalActions
          start={
            <ActionButton
              icon={Eye}
              label="Preview PDF"
              onClick={handlePreview}
              disabled={busy}
            />
          }
          end={
            <>
              <ActionButton label="Cancel" onClick={onClose} disabled={busy} />
              <ActionButton
                icon={Send}
                label={busy ? "Sending…" : "Send LOI"}
                tone="primary"
                onClick={handleSend}
                disabled={busy}
              />
            </>
          }
        />
      }
    >
      <div className="loi-body">
        {error && <div className="loi-error">{error}</div>}

        <Section title="Send to">
          <Field label="Agent's email">
            {input("toEmail", {
              type: "email",
              list: "loi-agent-emails",
              placeholder: "agent@example.com",
            })}
            <datalist id="loi-agent-emails">
              {agentEmails.map((c) => (
                <option key={c.email} value={c.email}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Agent's name">
            {input("agentName", { placeholder: "Jane Smith" })}
          </Field>
        </Section>

        <Section title="Property and seller">
          <Field label="Property address" wide>
            {input("address")}
          </Field>
          <Field label="Description" wide>
            {input("description", {
              placeholder: "3 bed / 1 bath single-family residence",
            })}
          </Field>
          <Field label="Seller's name" hint="Leave blank if you don't know it">
            {input("sellerName", { placeholder: "Seller" })}
          </Field>
          <Field label="Letter date">{input("date", { type: "date" })}</Field>
        </Section>

        <Section title="Offer terms" note="Saved for your next letter">
          <Field label="Purchase price">
            <CurrencyInput
              name="price"
              value={form.price}
              onChange={handleChange}
              disabled={busy}
            />
          </Field>
          <Field label="Earnest money">
            <CurrencyInput
              name="earnestMoney"
              value={form.earnestMoney}
              onChange={handleChange}
              disabled={busy}
            />
          </Field>
          <Field label="Earnest money terms" wide>
            {input("earnestTiming")}
          </Field>
          <Field label="Title company">
            {input("titleCompany", { placeholder: "First American Title" })}
          </Field>
          <Field label="Title company city">
            {input("titleCompanyCity", { placeholder: "Edmond, Oklahoma" })}
          </Field>
          <Field label="Inspection period (days)">
            {input("inspectionDays", { inputMode: "numeric" })}
          </Field>
          <Field label="Close within (days)">
            {input("closingDays", { inputMode: "numeric" })}
          </Field>
          <Field label="Closing costs" wide>
            {input("closingCosts")}
          </Field>
          <Field label="Commission" wide>
            {input("commission")}
          </Field>
          <Field label="Condition">{input("condition")}</Field>
          <Field label="Possession">{input("possession")}</Field>

          {form.extraTerms.map((term, i) => (
            <div className="loi-extra-term loi-wide" key={i}>
              <input
                aria-label="Term name"
                placeholder="Term (e.g. Financing)"
                value={term.label}
                onChange={(e) => setTerm(i, "label", e.target.value)}
                disabled={busy}
              />
              <input
                aria-label="Term details"
                placeholder="Details (e.g. Cash, no financing contingency)"
                value={term.value}
                onChange={(e) => setTerm(i, "value", e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="loi-icon-btn"
                aria-label="Remove term"
                onClick={() =>
                  set(
                    "extraTerms",
                    form.extraTerms.filter((_, j) => j !== i),
                  )
                }
                disabled={busy}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="loi-wide">
            <ActionButton
              icon={Plus}
              label="Add a term"
              onClick={() =>
                set("extraTerms", [
                  ...form.extraTerms,
                  { label: "", value: "" },
                ])
              }
              disabled={busy}
            />
          </div>
        </Section>

        <Section
          title="Letter wording"
          note="{company} and {titleCompany} fill in by themselves"
        >
          <Field label="Opening paragraph" wide>
            <textarea
              name="intro"
              rows={3}
              value={form.intro}
              onChange={handleChange}
              disabled={busy}
            />
          </Field>
          <Field label="Closing paragraph" wide>
            <textarea
              name="closingText"
              rows={4}
              value={form.closingText}
              onChange={handleChange}
              disabled={busy}
            />
          </Field>
        </Section>

        <Section title="You (the buyer)" note="Saved for your next letter">
          <Field label="Company" hint='Shown as "Company, and/or assigns"'>
            {input("company", { placeholder: "TurnKey Investments I, LLC" })}
          </Field>
          <Field label="Your name">
            {input("signerName", { placeholder: "Kevin Hanna" })}
          </Field>
          <Field label="Your title">
            {input("signerTitle", { placeholder: "Owner" })}
          </Field>
          <Field label="Phone">
            {input("signerPhone", {
              type: "tel",
              placeholder: "(405) 555-0100",
            })}
          </Field>
          <Field label="Email" hint="The agent's reply comes here">
            {input("signerEmail", {
              type: "email",
              placeholder: "you@company.com",
            })}
          </Field>
          <div className="field loi-field">
            <span>Logo</span>
            <div className="loi-logo">
              {form.logo ? (
                <img src={form.logo} alt="Your logo" />
              ) : (
                <span className="loi-hint">
                  None: the letter starts with its title
                </span>
              )}
              <label className="action-btn loi-upload">
                <Upload size={14} />
                {form.logo ? "Change" : "Upload"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogo}
                  disabled={busy}
                  hidden
                />
              </label>
              {form.logo && (
                <button
                  type="button"
                  className="loi-icon-btn"
                  aria-label="Remove logo"
                  onClick={() => set("logo", "")}
                  disabled={busy}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section title="Email">
          <Field label="Subject" wide>
            <input
              name="subject"
              value={subject}
              onChange={handleChange}
              disabled={busy}
            />
          </Field>
          <Field label="Message" wide>
            <textarea
              name="message"
              rows={9}
              value={message}
              onChange={handleChange}
              disabled={busy}
            />
          </Field>
          <label className="loi-check loi-wide">
            <input
              type="checkbox"
              name="ccMe"
              checked={Boolean(form.ccMe)}
              onChange={handleChange}
              disabled={busy}
            />
            Send me a copy
            {form.signerEmail.trim() ? ` (${form.signerEmail.trim()})` : ""}
          </label>
        </Section>
      </div>
    </Modal>
  );
}
