import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import Modal from "../../modal/Modal";
import { countyRecordFields, isAmountDueColumn } from "./countyRecordDeal";

// One county record: every column and value, with an Add to CRM action.
// `renderValue` formats a cell (e.g. phone links) the same way as the table.
export default function CountyRecordModal({
  columns,
  row,
  inCrm,
  onAddToCrm,
  onClose,
  onDelete,
  renderValue,
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  if (!row) return null;
  const { address, ownerName } = countyRecordFields(columns, row);
  const alreadyInCrm = inCrm || added;

  async function handleAdd() {
    setAdding(true);
    setError("");
    try {
      await onAddToCrm();
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
              disabled={adding}
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
            <button type="button" className="primary-btn" disabled>
              <Check size={14} />
              {added ? "Added to CRM" : "Already in CRM"}
            </button>
          ) : (
            <button
              type="button"
              className="primary-btn"
              onClick={handleAdd}
              disabled={adding || !address}
            >
              <Plus size={14} />
              {adding ? "Adding…" : "Add to CRM"}
            </button>
          )}
        </>
      }
    >
      <dl className="county-record-fields">
        {columns.map((column, i) => (
          <div key={column} className="county-record-field">
            <dt
              className={
                isAmountDueColumn(column) ? "county-amount-due" : undefined
              }
            >
              {column}
            </dt>
            <dd>{row[i] ? renderValue(row[i], i) : "—"}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
