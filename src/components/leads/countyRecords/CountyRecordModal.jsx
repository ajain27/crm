import { useEffect, useState } from "react";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import Modal from "../../modal/Modal";
import { countyRecordFields, isAmountDueColumn } from "./countyRecordDeal";
import { ZillowLink } from "../components/LeadTableCells";
import { StreetViewButton } from "../../elements/StreetView";
import { useLeadComps } from "../comps/useLeadComps";
import { compsResultToSave } from "../comps/leadComps";
import {
  LeadCompsTab,
  LeadCompsTabBar,
  LeadRunCompsModal,
  RunCompsButton,
} from "../comps/LeadCompsTabs";

const PHONE_COLUMN = /phone|cell|mobile|\btel\b|telephone/i;
const LONG_TEXT_COLUMN =
  /reason|note|description|comment|remark|detail|summary|narrative|violation/i;

// "Phone 2", "Phone 3", … — the first not already a column.
function nextPhoneColumn(columns) {
  const taken = new Set(columns.map((c) => c.trim().toLowerCase()));
  let n = 2;
  while (taken.has(`phone ${n}`)) n += 1;
  return `Phone ${n}`;
}

// One county record as a form: every column can be filled in or edited
// (and phone numbers added) and saved with `onSave(row, newColumns)`
// (async), which closes the window. Add to CRM (`onAddToCrm(row,
// comps)`) saves any edits first, then adds the record as it now reads,
// with any comps run on it.
// Comps: `loadComps()` gives the record's saved { compsResult, note } (or
// null), `saveComps({ compsResult, note })` keeps a new run — saved as
// soon as it finishes.
export default function CountyRecordModal({
  columns,
  row,
  inCrm,
  onAddToCrm,
  onSave,
  onClose,
  onDelete,
  loadComps,
  saveComps,
}) {
  // Phone columns added from this window ("Phone 2", …), saved to the
  // list's columns with the record.
  const [addedColumns, setAddedColumns] = useState([]);
  const allColumns = [...columns, ...addedColumns];
  const [draft, setDraft] = useState(() =>
    columns.map((_, i) => String(row?.[i] ?? "")),
  );
  const [saving, setSaving] = useState(false);
  const [focusIndex, setFocusIndex] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const { address, ownerName } = countyRecordFields(columns, draft);

  // The record's comps, shaped like a lead's for the shared comps pieces.
  const [compsRecord, setCompsRecord] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadComps?.()
      .then((saved) => {
        if (!cancelled && saved)
          setCompsRecord({
            compsResult: saved.compsResult,
            notes: saved.note || "",
          });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Loaded once per record (the modal is keyed by record).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const compsDraft = { ...compsRecord, address };
  const compsState = useLeadComps({
    lead: compsRecord,
    draft: compsDraft,
    setDraft: (update) =>
      setCompsRecord((prev) => {
        const next = update({ ...prev, address });
        return { compsResult: next.compsResult, notes: next.notes };
      }),
    enabled: Boolean(saveComps),
    onRunSaved: (note, result) =>
      saveComps({ compsResult: compsResultToSave(result), note }),
  });

  if (!row) return null;
  const alreadyInCrm = inCrm || added;
  const dirty =
    addedColumns.length > 0 ||
    draft.some((value, i) => value !== String(row[i] ?? ""));
  const phoneIndexes = allColumns
    .map((column, i) => (PHONE_COLUMN.test(column) ? i : -1))
    .filter((i) => i >= 0);

  // Free-text columns (and long values) get a full-width text area after
  // the other fields. Decided by the saved value, so a field doesn't turn
  // into a text area while typing.
  const fields = allColumns.map((column, i) => ({ column, i }));
  const isLong = ({ column, i }) =>
    LONG_TEXT_COLUMN.test(column) || String(row[i] ?? "").length > 60;
  const shortFields = fields.filter((f) => !isLong(f));
  const longFields = fields.filter(isLong);

  function focusOnce(el) {
    if (el) {
      el.focus();
      setFocusIndex(null);
    }
  }

  // Goes to this record's first empty phone column, or adds a new one.
  function addPhone() {
    const empty = phoneIndexes.find((i) => !draft[i]?.trim());
    const index = empty ?? allColumns.length;
    if (empty === undefined) {
      setAddedColumns((prev) => [...prev, nextPhoneColumn(allColumns)]);
      setDraft((prev) => [...prev, ""]);
    }
    setFocusIndex(index);
  }
  const busy = saving || adding;

  function setValue(index, value) {
    setDraft((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  async function save() {
    // Trimmed, like other forms (surrounding spaces from pasting).
    const next = draft.map((v) => v.trim());
    await onSave(next, addedColumns);
    setDraft(next);
    setAddedColumns([]);
    return next;
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await save();
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save this record.");
      setSaving(false);
    }
  }

  async function handleAdd() {
    setAdding(true);
    setError("");
    try {
      const current = dirty ? await save() : draft;
      await onAddToCrm(
        current,
        compsRecord?.compsResult
          ? {
              note: compsRecord.notes,
              arv: compsRecord.compsResult.arvEstimate,
            }
          : undefined,
      );
      setAdded(true);
    } catch (err) {
      setError(err.message || "Couldn't add this record to the CRM.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
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
          // Wide enough for the comps table beside its map.
          width: "min(1240px, 96vw)",
          maxWidth: "min(1240px, 96vw)",
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
            {compsState.enabled && (
              <RunCompsButton
                compsState={compsState}
                address={address}
                disabled={busy}
              />
            )}
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
              <Save size={14} />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <div className="ldm-body">
          {compsState.enabled && <LeadCompsTabBar compsState={compsState} />}
          {compsState.tab === "comps" ? (
            <LeadCompsTab
              compsState={compsState}
              lead={{ address }}
              disabled={busy}
            />
          ) : (
            <div className="ldm-grid county-record-form">
              {shortFields.map(({ column, i }) => (
                <label key={`${column}-${i}`} className="ldm-field">
                  <span
                    className={`ldm-label${isAmountDueColumn(column) ? " county-amount-due" : ""}`}
                  >
                    {column}
                  </span>
                  <input
                    className={`ldm-input${isAmountDueColumn(column) ? " county-amount-due" : ""}`}
                    type={PHONE_COLUMN.test(column) ? "tel" : "text"}
                    value={draft[i] ?? ""}
                    onChange={(e) => setValue(i, e.target.value)}
                    placeholder="—"
                    ref={i === focusIndex ? focusOnce : undefined}
                  />
                </label>
              ))}
              <button
                type="button"
                className="ldm-notes-toggle county-record-add-phone"
                onClick={addPhone}
              >
                <Plus size={13} /> Add phone number
              </button>
              {longFields.map(({ column, i }) => (
                <label
                  key={`${column}-${i}`}
                  className="ldm-field county-record-long"
                >
                  <span className="ldm-label">{column}</span>
                  <textarea
                    className="ldm-notes"
                    value={draft[i] ?? ""}
                    onChange={(e) => setValue(i, e.target.value)}
                    placeholder="—"
                    rows={4}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>
      <LeadRunCompsModal
        compsState={compsState}
        address={address}
        noteSavedLabel="Saved to this record"
      />
    </>
  );
}
