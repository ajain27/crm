import { CheckCheck, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { formatDate } from "../../../utils/utils";

const EMPTY = "—";

function stopPropagation(e) {
  e.stopPropagation();
}

// A <td> whose clicks don't reach the row — for cells holding links or
// buttons inside a clickable row.
export function ActionCell({ className, children, ...props }) {
  return (
    <td className={className} onClick={stopPropagation} {...props}>
      {children}
    </td>
  );
}

export function EmailLink({ email }) {
  return email ? (
    <a href={`mailto:${email}`} className="leads-contact-link">
      {email}
    </a>
  ) : (
    EMPTY
  );
}

export function PhoneLink({ phone }) {
  return phone ? (
    <a href={`tel:${phone}`} className="leads-contact-link">
      {phone}
    </a>
  ) : (
    EMPTY
  );
}

export function EmailCell({ email }) {
  return (
    <td data-label="Email">
      <EmailLink email={email} />
    </td>
  );
}

export function PhoneCell({ phone }) {
  return (
    <ActionCell data-label="Phone">
      <PhoneLink phone={phone} />
    </ActionCell>
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
    <td className="leads-notes-cell" data-label="Notes">
      {notes ? (
        <span className="leads-notes-preview" title={notes}>
          {notes}
        </span>
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
    <ActionCell className="acc-col-action-mobile">
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

export function QualityCell({ quality, onMarkGood, onMarkBad }) {
  return (
    <ActionCell className="ppc-quality-cell acc-col-action-mobile">
      <div className="ppc-quality-btns">
        <button
          className={`ppc-quality-btn ppc-quality-good${quality === "good" ? " ppc-quality-active" : ""}`}
          title="Mark as good lead"
          disabled={quality === "good"}
          onClick={onMarkGood}
        >
          <ThumbsUp size={13} />
        </button>
        <button
          className={`ppc-quality-btn ppc-quality-bad${quality === "bad" ? " ppc-quality-active" : ""}`}
          title="Mark as bad lead"
          disabled={quality === "bad"}
          onClick={onMarkBad}
        >
          <ThumbsDown size={13} />
        </button>
      </div>
    </ActionCell>
  );
}

export function SelectCell({ checked, onToggle }) {
  return (
    <ActionCell className="buyer-checkbox-cell acc-col-hide-mobile">
      <input
        type="checkbox"
        className="buyer-checkbox"
        checked={checked}
        onChange={onToggle}
      />
    </ActionCell>
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
