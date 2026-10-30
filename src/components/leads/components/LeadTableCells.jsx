import { useEffect, useState } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  ExternalLink,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { displayPhone, formatDate } from "../../../utils/utils";
import { zillowUrl } from "../leadUtils";
import CompsNoteView from "../../crm/components/data/comps/CompsNoteView";

const EMPTY = "—";

function stopPropagation(e) {
  e.stopPropagation();
}

const INTERACTIVE = "a, button, input, select, textarea, label";

// A <td> holding links or buttons inside a clickable row: clicking those
// doesn't also open the row, but clicking the rest of the cell does.
// `guardWholeCell` keeps the whole cell from opening the row — for small
// cells (a checkbox, a delete button) where a near miss shouldn't open it.
export function ActionCell({ className, children, guardWholeCell, ...props }) {
  return (
    <td
      className={className}
      onClick={(e) => {
        if (guardWholeCell || e.target.closest(INTERACTIVE)) {
          e.stopPropagation();
        }
      }}
      {...props}
    >
      {children}
    </td>
  );
}

export function ZillowLink({ address }) {
  const url = zillowUrl(address);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="leads-mls-link"
      title={`View ${address} on Zillow`}
      onClick={stopPropagation}
    >
      <ExternalLink size={12} />
      Zillow
    </a>
  ) : null;
}

// Copies `text` to the clipboard; a check shows for a moment once it has.
export function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleClick(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // No clipboard access (e.g. not a secure page): nothing to show.
    }
  }

  return (
    <button
      type="button"
      className="leads-text-link leads-copy-btn"
      onClick={handleClick}
      title={copied ? "Copied" : label}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function EmailLink({ email }) {
  return email ? (
    <span className="leads-phone">
      <a href={`mailto:${email}`} className="leads-contact-link">
        {email}
      </a>
      <CopyButton text={email} label={`Copy ${email}`} />
    </span>
  ) : (
    EMPTY
  );
}

// "sms:+12146630735" — US numbers without a country code get +1, so the
// Messages app matches them to the same contact as the tel: link.
// `body` prefills the message. "?&body=" is the form both iOS/macOS
// (which reads "&body=") and Android (which reads "?body=") accept.
export function smsHref(phone, body = "") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const to = digits.length === 10 ? `sms:+1${digits}` : `sms:+${digits}`;
  return body ? `${to}?&body=${encodeURIComponent(body)}` : to;
}

// Opens the device's Messages app, so the text goes out from the same
// number that tel: links call from.
export function TextLink({ phone }) {
  const href = smsHref(phone);
  return href ? (
    <a
      href={href}
      className="leads-text-link"
      title={`Text ${phone}`}
      aria-label={`Text ${phone}`}
      onClick={stopPropagation}
    >
      <MessageSquare size={14} />
    </a>
  ) : null;
}

export function PhoneLink({ phone }) {
  return phone ? (
    <span className="leads-phone">
      <a href={`tel:${phone}`} className="leads-contact-link">
        {displayPhone(phone)}
      </a>
      <TextLink phone={phone} />
    </span>
  ) : (
    EMPTY
  );
}

export function EmailCell({ email }) {
  return (
    <ActionCell data-label="Email">
      <EmailLink email={email} />
    </ActionCell>
  );
}

// A second number (`phone2`, e.g. from an import) shows under the first.
export function PhoneCell({ phone, phone2 }) {
  return (
    <ActionCell data-label="Phone">
      {phone2 ? (
        <span className="leads-phone-stack">
          <PhoneLink phone={phone} />
          <PhoneLink phone={phone2} />
        </span>
      ) : (
        <PhoneLink phone={phone} />
      )}
    </ActionCell>
  );
}

// Columns from an imported file the app has no field for, shown as
// label / value rows (read-only).
export function ExtraDetails({
  fields,
  className = "ldm-section",
  labelClassName = "ldm-section-label",
}) {
  const entries = Object.entries(fields || {}).filter(([, v]) =>
    String(v ?? "").trim(),
  );
  if (!entries.length) return null;
  return (
    <div className={className}>
      <div className={labelClassName}>More details</div>
      <dl className="notes-qa-table ldm-extra-details">
        {entries.map(([label, value]) => (
          <div key={label} className="notes-qa-row">
            <dt>{label}</dt>
            <dd>
              {/^https?:\/\//i.test(value) ? (
                <a href={value} target="_blank" rel="noopener noreferrer">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SourceCell({ source }) {
  return (
    <td data-label="Source">
      {source ? <span className="leads-source-badge">{source}</span> : EMPTY}
    </td>
  );
}

export function NotesCell({ notes }) {
  return (
    <td className="leads-notes-cell acc-col-block" data-label="Notes">
      {notes ? (
        <>
          <span className="leads-notes-preview" title={notes}>
            {notes}
          </span>
          {/* Shown instead of the preview in the expanded card */}
          <CompsNoteView notes={notes} className="leads-notes-full" />
        </>
      ) : (
        EMPTY
      )}
    </td>
  );
}

export function DateAddedCell({ date }) {
  return (
    <td className="leads-date-cell" data-label="Added">
      {formatDate(date)}
    </td>
  );
}

export function DeleteCell({ onDelete }) {
  return (
    <ActionCell className="acc-col-action-mobile" guardWholeCell>
      <button
        className="leads-delete-btn acc-delete-btn"
        title="Delete lead"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        <span className="acc-delete-label">Delete</span>
      </button>
    </ActionCell>
  );
}

// "Add to CRM" button. Leads marked bad have to be marked good first.
export function CrmCell({ isBad = false, onAdd }) {
  return (
    <ActionCell className="acc-col-action-mobile">
      <button
        className="leads-crm-btn"
        title={
          isBad
            ? "Mark lead as good before adding to CRM"
            : "Add to CRM pipeline"
        }
        disabled={isBad}
        onClick={onAdd}
      >
        <CheckCheck size={14} />
        CRM
      </button>
    </ActionCell>
  );
}

// Start/stop the email follow-up sequence. Starting needs an email address
// (and a lead not marked bad); `requireEmailToStop` also disables Stop for
// leads without one.
export function AutomationCell({
  lead,
  isBad = false,
  requireEmailToStop = false,
  onRun,
  onStop,
}) {
  const running = lead.emailSequence?.status === "running";
  return (
    <ActionCell className="acc-col-action-mobile">
      {running ? (
        <button
          className="leads-automation-btn leads-automation-btn--stop"
          title="Stop email automation"
          onClick={onStop}
          disabled={requireEmailToStop && !lead.email}
        >
          Stop Automation
        </button>
      ) : (
        <button
          className="leads-automation-btn"
          title={
            isBad
              ? "Mark lead as good before restarting automation"
              : lead.email
                ? "Start the email follow-up sequence"
                : "Add an email address to enable automation"
          }
          onClick={onRun}
          disabled={!lead.email || isBad}
        >
          Run Automation
        </button>
      )}
    </ActionCell>
  );
}

// Clicking the thumb that's already selected clears the rating.
export function QualityCell({ quality, onMarkGood, onMarkBad, onClear }) {
  const isGood = quality === "good";
  const isBad = quality === "bad";
  return (
    <ActionCell className="ppc-quality-cell acc-col-action-mobile">
      <div className="ppc-quality-btns">
        <button
          className={`ppc-quality-btn ppc-quality-good${isGood ? " ppc-quality-active" : ""}`}
          title={isGood ? "Clear good rating" : "Mark as good lead"}
          aria-pressed={isGood}
          onClick={isGood ? onClear : onMarkGood}
        >
          <ThumbsUp size={13} />
        </button>
        <button
          className={`ppc-quality-btn ppc-quality-bad${isBad ? " ppc-quality-active" : ""}`}
          title={isBad ? "Clear bad rating" : "Mark as bad lead"}
          aria-pressed={isBad}
          onClick={isBad ? onClear : onMarkBad}
        >
          <ThumbsDown size={13} />
        </button>
      </div>
    </ActionCell>
  );
}

export function SelectCell({ checked, onToggle }) {
  return (
    <ActionCell
      className="buyer-checkbox-cell acc-col-hide-mobile"
      guardWholeCell
    >
      <input
        type="checkbox"
        className="buyer-checkbox"
        checked={checked}
        onChange={onToggle}
      />
    </ActionCell>
  );
}

// The same row checkbox for card view, passed as AccordionHeaderCell's
// `leading` so it sits beside the collapsed card.
export function CardSelectCheckbox({ checked, onToggle }) {
  return (
    <input
      type="checkbox"
      className="buyer-checkbox"
      checked={checked}
      onChange={onToggle}
      aria-label="Select lead"
    />
  );
}

// Header checkbox that selects/deselects every row on the current page.
export function SelectAllHeader({ ids, selectedIds, onChange }) {
  return (
    <th className="buyer-checkbox-cell">
      <input
        type="checkbox"
        className="buyer-checkbox"
        checked={ids.length > 0 && ids.every((id) => selectedIds.has(id))}
        onChange={(e) => onChange(ids, e.target.checked)}
      />
    </th>
  );
}
