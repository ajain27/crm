import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Printer,
  RefreshCw,
  FileText,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  saveInvoice,
  fetchInvoices,
  deleteInvoiceById,
} from "../../firebase/firestoreService";
import "./InvoiceGenerator.css";

const SELLER = {
  name: "You Win Concepts",
  tagline: "PROFESSIONAL AI & DIGITAL SOLUTIONS",
  address: "1309 Coffeen Avenue STE 1200",
  city: "Sheridan, Wyoming 82801",
  website: "youwinconcepts.com",
  email: "info@youwinconcepts.com",
  phone: "347-450-3572",
};

const BANK = {
  accountNumber: "200001376409",
  routingNumber: "064209588",
  beneficiary: "You Win Concepts",
};

function genInvoiceNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `YWC-${year}-${rand}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function emptyLine() {
  return {
    id: crypto.randomUUID(),
    title: "",
    subtitle: "",
    amount: "", // base value: flat fee OR per-month rate
    months: "", // multiplier; when set → lineTotal = amount × months
  };
}

// Line contribution to subtotal
function lineTotal(line) {
  const a = parseAmt(line.amount);
  const m = parseAmt(line.months);
  return m > 0 ? a * m : a;
}

function parseAmt(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmt(n) {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function buildInvoiceHtml({
  invoiceNum,
  date,
  dueDate,
  clientName,
  clientWebsite,
  lines,
  total,
}) {
  const lineRows = lines
    .map((line, i) => {
      const lt = lineTotal(line);
      return `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <strong style="color:#1a1a2e;display:block">${line.title || "—"}</strong>
          ${line.subtitle ? `<span style="font-size:11px;color:#6b7280">${line.subtitle}</span>` : ""}
        </td>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb">${line.amount || "—"}</td>
        <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb">${line.months || "—"}</td>
        <td style="padding:10px 16px;color:#1a1a2e;font-weight:600;text-align:right;border-bottom:1px solid #e5e7eb">${lt > 0 ? fmt(lt) : "—"}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:700px;margin:0 auto;background:#fff;border:1px solid #d1d5db;border-radius:8px;overflow:hidden">
  <div style="background:#1a3560;padding:28px 32px">
    <table width="100%"><tr>
      <td><h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#fff">${SELLER.name}</h1>
        <p style="margin:0;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.65)">${SELLER.tagline}</p></td>
      <td style="text-align:right">
        <p style="margin:0 0 10px;font-size:26px;font-weight:800;letter-spacing:3px;color:#fff">INVOICE</p>
        <table style="border-collapse:collapse;font-size:12px;color:rgba(255,255,255,.9);margin-left:auto">
          <tr><td style="padding:2px 12px 2px 0;color:rgba(255,255,255,.6)">Invoice #:</td><td style="font-weight:700">${invoiceNum}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:rgba(255,255,255,.6)">Date:</td><td style="font-weight:700">${fmtDate(date)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:rgba(255,255,255,.6)">Due Date:</td><td style="font-weight:700">${dueDate}</td></tr>
        </table>
      </td>
    </tr></table>
  </div>
  <div style="height:3px;background:#2563eb"></div>
  <table width="100%" style="border-collapse:collapse"><tr>
    <td width="50%" style="padding:20px 32px 20px 32px;border-right:1px solid #e5e7eb;vertical-align:top">
      <p style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#2563eb;margin:0 0 8px">BILLED FROM (SELLER)</p>
      <p style="font-size:15px;font-weight:700;color:#1a3560;margin:0 0 6px">${SELLER.name}</p>
      <p style="margin:2px 0;font-size:12px;color:#374151">${SELLER.address}</p>
      <p style="margin:2px 0;font-size:12px;color:#374151">${SELLER.city}</p>
      <p style="margin:2px 0;font-size:12px;color:#374151"><strong>Website:</strong> ${SELLER.website}</p>
      <p style="margin:2px 0;font-size:12px;color:#374151"><strong>Email:</strong> ${SELLER.email}</p>
      <p style="margin:2px 0;font-size:12px;color:#374151"><strong>Phone:</strong> ${SELLER.phone}</p>
    </td>
    <td width="50%" style="padding:20px 32px;vertical-align:top">
      <p style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#2563eb;margin:0 0 8px">BILLED TO (CLIENT)</p>
      <p style="font-size:15px;font-weight:700;color:#1a3560;margin:0 0 6px">${clientName || "—"}</p>
      ${clientWebsite ? `<p style="margin:2px 0;font-size:12px;color:#374151"><strong>Website:</strong> ${clientWebsite}</p>` : ""}
    </td>
  </tr></table>
  <table width="100%" style="border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#1a3560">
      <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff">DESCRIPTION</th>
      <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff">AMOUNT / RATE</th>
      <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff">MONTHS</th>
      <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff">TOTAL</th>
    </tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table width="100%" style="border-collapse:collapse;border-top:2px solid #1a3560"><tr>
    <td style="padding:20px 32px;vertical-align:top">
      <p style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;margin:0 0 10px;border-left:3px solid #2563eb;padding-left:10px">DIRECT WIRE / ACH PAYMENT DETAILS</p>
      <table style="border-collapse:collapse;font-size:12px">
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Account Number:</td><td><strong>${BANK.accountNumber}</strong></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Routing Number:</td><td><strong>${BANK.routingNumber}</strong></td></tr>
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280">Beneficiary:</td><td><strong>${BANK.beneficiary}</strong></td></tr>
      </table>
    </td>
    <td style="padding:20px 32px;vertical-align:top;width:250px;border-left:1px solid #e5e7eb">
      <div style="border-top:1px solid #e5e7eb;padding-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#1a3560;border-top:2px solid #1a3560;margin-top:8px;padding-top:10px">
          <span>Total Due:</span><span style="color:#2563eb;font-size:18px">${fmt(total)}</span>
        </div>
      </div>
    </td>
  </tr></table>
  <div style="margin:0 32px 20px;padding:14px 16px;background:#f8fafc;border-left:3px solid #1a3560">
    <p style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1a3560;margin:0 0 8px">NOTES &amp; TERMS</p>
    <p style="font-size:11px;color:#4b5563;margin:3px 0">• Payment is due upon receipt. Please reference Invoice # ${invoiceNum} on all wire/ACH remittance transfers.</p>
    <p style="font-size:11px;color:#4b5563;margin:3px 0">• For billing questions, contact ${SELLER.email} or call ${SELLER.phone}.</p>
  </div>
  <p style="text-align:right;padding:0 32px 16px;font-size:10px;color:#9ca3af;margin:0">Page 1 of 1</p>
</div>
</body></html>`;
}

async function sendViaResend({
  toEmail,
  subject,
  htmlContent,
  pdfBase64,
  invoiceNum,
}) {
  const res = await fetch("/api/send-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toEmail,
      subject,
      htmlContent,
      pdfBase64,
      invoiceNum,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

export default function InvoiceGenerator({ currentUser }) {
  const [invoiceNum, setInvoiceNum] = useState(genInvoiceNumber);
  const [date, setDate] = useState(todayISO);
  const [dueDate, setDueDate] = useState("Due Upon Receipt");
  const [clientName, setClientName] = useState("");
  const [clientWebsite, setClientWebsite] = useState("");
  const [lines, setLines] = useState([emptyLine()]);

  const [sentInvoices, setSentInvoices] = useState([]);

  // Send email modal state
  const [modal, setModal] = useState({
    open: false,
    email: "",
    status: "idle",
    error: "",
  });
  const emailInputRef = useRef(null);
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchInvoices(currentUser.id)
      .then(setSentInvoices)
      .catch(() => {});
  }, [currentUser?.id]);

  function refreshNum() {
    setInvoiceNum(genInvoiceNumber());
  }

  function addLine() {
    setLines((p) => [...p, emptyLine()]);
  }

  function removeLine(id) {
    setLines((p) => (p.length > 1 ? p.filter((l) => l.id !== id) : p));
  }

  function updateLine(id, field, value) {
    setLines((p) => p.map((l) => (l.id !== id ? l : { ...l, [field]: value })));
  }

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const total = subtotal;

  const canSend = clientName.trim().length > 0 && date.length > 0 && total > 0;

  async function generatePdfBase64() {
    const el = invoiceRef.current;
    if (!el) return null;
    const canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.82);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgH = pageW * ratio;
    let yOffset = 0;
    let remaining = imgH;
    while (remaining > 0) {
      pdf.addImage(imgData, "JPEG", 0, -yOffset, pageW, imgH);
      remaining -= pageH;
      if (remaining > 0) {
        pdf.addPage();
        yOffset += pageH;
      }
    }
    return pdf.output("datauristring").split(",")[1];
  }

  async function handleSendInvoice() {
    const toEmail = modal.email.trim();
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      setModal((m) => ({ ...m, error: "Please enter a valid email address." }));
      return;
    }
    setModal((m) => ({ ...m, status: "sending", error: "" }));
    try {
      const [html, pdfBase64] = await Promise.all([
        Promise.resolve(
          buildInvoiceHtml({
            invoiceNum,
            date,
            dueDate,
            clientName,
            clientWebsite,
            lines,
            total,
          }),
        ),
        generatePdfBase64(),
      ]);
      await sendViaResend({
        toEmail,
        subject: `Invoice ${invoiceNum} from ${SELLER.name}`,
        htmlContent: html,
        pdfBase64,
        invoiceNum,
      });
      const record = {
        id: crypto.randomUUID(),
        userId: currentUser?.id || "",
        invoiceNum,
        clientName,
        clientWebsite,
        toEmail,
        date,
        total,
        sentAt: new Date().toISOString(),
      };
      await saveInvoice(record);
      setSentInvoices((prev) => [record, ...prev]);
      setModal((m) => ({ ...m, status: "success" }));
    } catch (err) {
      setModal((m) => ({ ...m, status: "error", error: err.message }));
    }
  }

  return (
    <div className="ig-root">
      <header className="page-header" data-reveal="left">
        <div>
          <h1>Invoice Generator</h1>
          <span className="page-header-sub">
            Fill in client details and line items, then print or send.
          </span>
        </div>
        <div className="ig-header-actions">
          <button
            className="secondary-btn ig-header-print-btn"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print / PDF
          </button>
          <button
            className="primary-btn"
            onClick={() =>
              setModal({ open: true, email: "", status: "idle", error: "" })
            }
            disabled={!canSend}
            title={
              !canSend
                ? "Enter client name, date, and at least one line item with an amount"
                : undefined
            }
          >
            <Send size={15} />
            Send Invoice
          </button>
        </div>
      </header>

      {/* ─── Email modal ─── */}
      {modal.open && (
        <div
          className="ig-email-overlay"
          onClick={() =>
            modal.status !== "sending" &&
            setModal((m) => ({ ...m, open: false }))
          }
        >
          <div className="ig-email-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="ig-email-close"
              onClick={() => setModal((m) => ({ ...m, open: false }))}
              disabled={modal.status === "sending"}
            >
              <X size={16} />
            </button>

            {modal.status === "success" ? (
              <div className="ig-email-success">
                <CheckCircle size={40} className="ig-email-success-icon" />
                <p className="ig-email-success-title">Invoice sent!</p>
                <p className="ig-email-success-sub">
                  Sent to <strong>{modal.email}</strong> from {SELLER.email}
                </p>
                <button
                  className="primary-btn"
                  onClick={() => setModal((m) => ({ ...m, open: false }))}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="ig-email-modal-header">
                  <Send size={18} />
                  <h3>Send Invoice</h3>
                </div>
                <p className="ig-email-modal-sub">
                  The invoice will be emailed as a styled HTML document from{" "}
                  <strong>{SELLER.email}</strong>.
                </p>
                <label className="field">
                  <span>Client Email Address</span>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={modal.email}
                    onChange={(e) =>
                      setModal((m) => ({
                        ...m,
                        email: e.target.value,
                        error: "",
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSendInvoice()}
                    placeholder="client@example.com"
                    autoFocus
                    disabled={modal.status === "sending"}
                  />
                </label>
                {modal.error && (
                  <p className="ig-email-error">
                    <AlertCircle size={13} /> {modal.error}
                  </p>
                )}
                <div className="ig-email-modal-actions">
                  <button
                    className="secondary-btn"
                    onClick={() => setModal((m) => ({ ...m, open: false }))}
                    disabled={modal.status === "sending"}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-btn"
                    onClick={handleSendInvoice}
                    disabled={modal.status === "sending"}
                  >
                    {modal.status === "sending" ? (
                      <>
                        <Loader size={14} className="ig-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Form ─── */}
      <section className="panel ig-form-panel" data-reveal>
        <div className="panel-header">
          <FileText size={16} />
          <h2>Invoice Details</h2>
        </div>

        <div className="ig-meta-grid">
          <label className="field">
            <span>Invoice #</span>
            <div className="ig-num-row">
              <input
                value={invoiceNum}
                readOnly
                disabled
                className="ig-num-disabled"
              />
              <button
                type="button"
                className="secondary-btn ig-refresh"
                onClick={refreshNum}
                title="Generate new number"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Due Date</span>
            <input
              value={dueDate}
              readOnly
              disabled
              className="ig-num-disabled"
            />
          </label>
        </div>

        <div className="ig-client-grid">
          <label className="field">
            <span>Client / Company Name *</span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Cloud Med Spas"
            />
          </label>
          <label className="field">
            <span>Client Website</span>
            <input
              value={clientWebsite}
              onChange={(e) => setClientWebsite(e.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        {/* Line items */}
        <div className="ig-lines-block">
          <div className="ig-lines-top">
            <h3>Line Items</h3>
            <button
              type="button"
              className="secondary-btn ig-add-btn"
              onClick={addLine}
            >
              <Plus size={13} /> Add Line
            </button>
          </div>
          <div className="ig-lines-head">
            <span className="igc-desc">Description</span>
            <span className="igc-amt">Amount / Rate</span>
            <span className="igc-months">Months</span>
            <span className="igc-total">Line Total</span>
            <span className="igc-del" />
          </div>
          {lines.map((line) => {
            const lt = lineTotal(line);
            return (
              <div key={line.id} className="ig-line-row">
                <div className="igc-desc ig-desc-cell">
                  <input
                    value={line.title}
                    onChange={(e) =>
                      updateLine(line.id, "title", e.target.value)
                    }
                    placeholder="e.g. Setup Fee  /  Monthly Maintenance"
                    className="ig-line-title-input"
                  />
                  <input
                    value={line.subtitle}
                    onChange={(e) =>
                      updateLine(line.id, "subtitle", e.target.value)
                    }
                    placeholder="Additional description (optional)"
                    className="ig-line-sub-input"
                  />
                </div>
                <div className="igc-amt">
                  <input
                    value={line.amount}
                    onChange={(e) =>
                      updateLine(line.id, "amount", e.target.value)
                    }
                    placeholder="$0.00"
                  />
                </div>
                <div className="igc-months">
                  <input
                    value={line.months}
                    onChange={(e) =>
                      updateLine(line.id, "months", e.target.value)
                    }
                    placeholder="—"
                  />
                </div>
                <div className="igc-total">
                  <span className="ig-line-total-val">
                    {lt > 0 ? fmt(lt) : "—"}
                  </span>
                  {parseAmt(line.months) > 0 && parseAmt(line.amount) > 0 && (
                    <span className="igc-hint">
                      {line.amount} × {line.months} mo
                    </span>
                  )}
                </div>
                <div className="igc-del">
                  <button
                    type="button"
                    className="ig-del-btn"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Invoice Preview (print target) ─── */}
      <section
        className="panel ig-preview-panel"
        data-reveal
        style={{ "--reveal-delay": "80ms" }}
      >
        <div className="panel-header ig-preview-header">
          <h2>Preview</h2>
          <button className="primary-btn" onClick={() => window.print()}>
            <Printer size={14} />
            Print / Save PDF
          </button>
        </div>

        <div className="ig-invoice" id="ig-invoice-printable" ref={invoiceRef}>
          {/* Header band */}
          <div className="ig-inv-header">
            <div className="ig-inv-brand">
              <p className="ig-inv-company-name">{SELLER.name}</p>
              <p className="ig-inv-tagline">{SELLER.tagline}</p>
            </div>
            <div className="ig-inv-title-block">
              <p className="ig-inv-title-word">INVOICE</p>
              <table className="ig-inv-meta-tbl">
                <tbody>
                  <tr>
                    <td>Invoice #:</td>
                    <td>{invoiceNum}</td>
                  </tr>
                  <tr>
                    <td>Date:</td>
                    <td>{fmtDate(date)}</td>
                  </tr>
                  <tr>
                    <td>Due Date:</td>
                    <td>{dueDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="ig-inv-rule" />

          {/* Billing addresses */}
          <div className="ig-inv-billing">
            <div className="ig-inv-from">
              <p className="ig-inv-billing-label">BILLED FROM (SELLER)</p>
              <p className="ig-inv-billing-name">{SELLER.name}</p>
              <p>{SELLER.address}</p>
              <p>{SELLER.city}</p>
              <p>
                <strong>Website:</strong> <span>{SELLER.website}</span>
              </p>
              <p>
                <strong>Email:</strong> {SELLER.email}
              </p>
              <p>
                <strong>Phone:</strong> {SELLER.phone}
              </p>
            </div>
            <div className="ig-inv-to">
              <p className="ig-inv-billing-label">BILLED TO (CLIENT)</p>
              <p className="ig-inv-billing-name">
                {clientName || <em className="ig-placeholder">Client Name</em>}
              </p>
              {clientWebsite && (
                <p>
                  <strong>Website:</strong> {clientWebsite}
                </p>
              )}
            </div>
          </div>

          {/* Line items table */}
          <table className="ig-inv-table">
            <thead>
              <tr>
                <th className="ig-th-desc">DESCRIPTION</th>
                <th className="ig-th-amt">AMOUNT / RATE</th>
                <th className="ig-th-months">MONTHS</th>
                <th className="ig-th-total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const lt = lineTotal(line);
                const hasMonths = parseAmt(line.months) > 0;
                return (
                  <tr
                    key={line.id}
                    className={i % 2 === 0 ? "ig-row-even" : "ig-row-odd"}
                  >
                    <td className="ig-td-desc">
                      {line.title ? (
                        <strong>{line.title}</strong>
                      ) : (
                        <em className="ig-placeholder">—</em>
                      )}
                      {line.subtitle && (
                        <p className="ig-td-sub">{line.subtitle}</p>
                      )}
                    </td>
                    <td>{line.amount || "—"}</td>
                    <td>{line.months || "—"}</td>
                    <td>{lt > 0 ? fmt(lt) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer: bank + totals */}
          <div className="ig-inv-footer">
            <div className="ig-inv-bank">
              <p className="ig-inv-bank-title">
                DIRECT WIRE / ACH PAYMENT DETAILS
              </p>
              <table className="ig-inv-bank-tbl">
                <tbody>
                  <tr>
                    <td>Account Number:</td>
                    <td>
                      <strong>{BANK.accountNumber}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Routing Number:</td>
                    <td>
                      <strong>{BANK.routingNumber}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Beneficiary:</td>
                    <td>
                      <strong>{BANK.beneficiary}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="ig-inv-totals">
              <div className="ig-totals-total">
                <span>Total Due:</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="ig-inv-notes">
            <p className="ig-inv-notes-label">NOTES &amp; TERMS</p>
            <p>
              • Payment is due upon receipt. Please reference Invoice #{" "}
              {invoiceNum} on all wire/ACH remittance transfers.
            </p>
            <p>
              • For billing questions, contact {SELLER.email} or call{" "}
              {SELLER.phone}.
            </p>
          </div>

          <p className="ig-inv-page-num">Page 1 of 1</p>
        </div>
      </section>

      {/* Sent Invoices History */}
      {sentInvoices.length > 0 && (
        <section
          className="panel ig-history-panel"
          data-reveal
          style={{ "--reveal-delay": "120ms" }}
        >
          <div className="panel-header">
            <h2>Sent Invoices</h2>
            <span className="ig-history-count">{sentInvoices.length}</span>
          </div>
          <div className="ig-history-table-wrap">
            <table className="ig-history-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Sent To</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Sent At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...sentInvoices]
                  .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
                  .map((inv) => (
                    <tr key={inv.id}>
                      <td className="ig-history-num">{inv.invoiceNum}</td>
                      <td>{inv.clientName}</td>
                      <td className="ig-history-email">{inv.toEmail}</td>
                      <td>{fmtDate(inv.date)}</td>
                      <td className="ig-history-total">{fmt(inv.total)}</td>
                      <td className="ig-history-sentat">
                        {new Date(inv.sentAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <button
                          className="ig-history-del"
                          title="Remove from history"
                          onClick={async () => {
                            await deleteInvoiceById(inv.id);
                            setSentInvoices((p) =>
                              p.filter((i) => i.id !== inv.id),
                            );
                          }}
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
