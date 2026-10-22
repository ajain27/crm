import { useState } from "react";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import Modal from "../../modal/Modal";
import { countyRecordFields, isAmountDueColumn } from "./countyRecordDeal";
import { ZillowLink } from "../components/LeadTableCells";
import { StreetViewButton } from "../../elements/StreetView";

// One county record as a form: every column can be filled in or edited
// and saved with `onSave(row)` (async). Add to CRM (`onAddToCrm(row)`)
// saves any edits first, then adds the record as it now reads.
export default function CountyRecordModal({
  columns,
  row,
  inCrm,
  onAddToCrm,
  onSave,
  onClose,
  onDelete,
}) {
  const [draft, setDraft] = useState(() =>
    columns.map((_, i) => String(row?.[i] ?? "")),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  if (!row) return null;
  const { address, ownerName } = countyRecordFields(columns, draft);
  const alreadyInCrm = inCrm || added;
  const dirty = draft.some((value, i) => value !== String(row[i] ?? ""));
  const busy = saving || adding;

  function setValue(index, value) {
    setDraft((prev) => prev.map((v, i) => (i === index ? value : v)));
    setSaved(false);
  }

  async function save() {
    // Trimmed, like other forms (surrounding spaces from pasting).
    const next = draft.map((v) => v.trim());
    await onSave(next);
    setDraft(next);
    setSaved(true);
    return next;
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await save();
    } catch (err) {
      setError(err.message || "Couldn't save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    setAdding(true);
    setError("");
    try {
      const current = dirty ? await save() : draft;
      await onAddToCrm(current);
      setAdded(true);
    } catch (err) {
      setError(err.message || "Couldn't add this record to the CRM.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={address || ownerName || "County Record"}
      headerActions={
        address ? (
          <>
            <ZillowLink address={address} />
            <StreetViewButton address={address} />
          </>
        ) : null
      }
      className="county-record-modal"
      style={{
        width: "min(720px, 95vw)",
        maxWidth: "min(720px, 95vw)",
        height: "auto",
        maxHeight: "92vh",
      }}
      actions={
        <>
          {onDelete && (
            <button
              type="button"
              className="danger-btn county-record-delete"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 size={14} />
              Delete record
            </button>
          )}
          {error && <span className="county-record-error">{error}</span>}
          {!address && !alreadyInCrm && (
            <span className="county-record-hint">
              No property address column found, so this can't be added.
            </span>
          )}
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
          {alreadyInCrm ? (
            <button type="button" className="secondary-btn" disabled>
              <Check size={14} />
              {added ? "Added to CRM" : "Already in CRM"}
            </button>
          ) : (
            <button
              type="button"
              className="secondary-btn"
              onClick={handleAdd}
              disabled={busy || !address}
            >
              <Plus size={14} />
              {adding ? "Adding…" : "Add to CRM"}
            </button>
          )}
          <button
            type="button"
            className="primary-btn"
            onClick={handleSave}
            disabled={busy || !dirty}
          >
            {saved && !dirty ? <Check size={14} /> : <Save size={14} />}
            {saving ? "Saving…" : saved && !dirty ? "Saved" : "Save changes"}
          </button>
        </>
      }
    >
      <div className="ldm-grid county-record-form">
        {columns.map((column, i) => (
          <label key={`${column}-${i}`} className="ldm-field">
            <span
              className={`ldm-label${isAmountDueColumn(column) ? " county-amount-due" : ""}`}
            >
              {column}
            </span>
            <input
              className={`ldm-input${isAmountDueColumn(column) ? " county-amount-due" : ""}`}
              value={draft[i]}
              onChange={(e) => setValue(i, e.target.value)}
              placeholder="—"
            />
          </label>
        ))}
      </div>
    </Modal>
  );
}
