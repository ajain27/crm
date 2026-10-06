import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";
import { DEFAULT_OFFER_OPTIONS } from "./WholesaleOfferPdfTemplate";

const MAX_INSPECTION_DAYS = 365;

function digitsOnly(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function toForm(options) {
  return {
    allowAssignment: options.allowAssignment,
    emdAmount: String(options.emdAmount),
    inspectionDays: String(options.inspectionDays),
  };
}

// Asks for the offer's assignment variant, EMD and inspection period before
// the Purchase & Sale Agreement is generated. Opens with the last values
// used (or the defaults), so regenerating doesn't mean retyping them.
export default function OfferOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  initialOptions = DEFAULT_OFFER_OPTIONS,
}) {
  const [form, setForm] = useState(() => toForm(initialOptions));

  useEffect(() => {
    if (isOpen) setForm(toForm(initialOptions));
  }, [isOpen, initialOptions]);

  const emdAmount = parseInt(form.emdAmount, 10) || 0;
  const inspectionDays = parseInt(form.inspectionDays, 10) || 0;
  const emdError = emdAmount > 0 ? "" : "Enter an EMD amount.";
  const daysError =
    inspectionDays >= 1 && inspectionDays <= MAX_INSPECTION_DAYS
      ? ""
      : `Enter between 1 and ${MAX_INSPECTION_DAYS} days.`;

  function handleSubmit(e) {
    e?.preventDefault();
    if (emdError || daysError) return;
    onGenerate({
      allowAssignment: form.allowAssignment,
      emdAmount,
      inspectionDays,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Offer"
      className="offer-options-modal"
      style={{
        width: "min(460px, 95vw)",
        maxWidth: "min(460px, 95vw)",
        height: "auto",
      }}
      actions={
        <>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSubmit}
            disabled={!!emdError || !!daysError}
          >
            Generate
          </button>
        </>
      }
    >
      <form className="offer-options-body" onSubmit={handleSubmit}>
        <fieldset className="offer-options-choice">
          <legend>Assignment</legend>
          <label>
            <input
              type="radio"
              name="assignment"
              checked={form.allowAssignment}
              onChange={() => setForm((p) => ({ ...p, allowAssignment: true }))}
            />
            <span>
              <strong>With assignment</strong>
              <small>
                Buyer is "You Win Estates, and/or assigns", with the assignment
                &amp; novation clause.
              </small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="assignment"
              checked={!form.allowAssignment}
              onChange={() =>
                setForm((p) => ({ ...p, allowAssignment: false }))
              }
            />
            <span>
              <strong>No assignment</strong>
              <small>
                Buyer is "You Win Estates" only; the assignment clause is
                removed.
              </small>
            </span>
          </label>
        </fieldset>

        <label className="field">
          <span>Earnest Money Deposit (EMD)</span>
          <input
            inputMode="numeric"
            value={
              form.emdAmount
                ? `$${Number(form.emdAmount).toLocaleString("en-US")}`
                : ""
            }
            onChange={(e) =>
              setForm((p) => ({ ...p, emdAmount: digitsOnly(e.target.value) }))
            }
            placeholder="$100"
            aria-label="Earnest Money Deposit"
          />
          {emdError && <span className="field-error">{emdError}</span>}
        </label>

        <label className="field">
          <span>Inspection Period (days)</span>
          <input
            type="number"
            min={1}
            max={MAX_INSPECTION_DAYS}
            value={form.inspectionDays}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                inspectionDays: digitsOnly(e.target.value),
              }))
            }
            placeholder="14"
            aria-label="Inspection Period"
          />
          {daysError && <span className="field-error">{daysError}</span>}
        </label>

        {/* Lets Enter submit from either input. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
