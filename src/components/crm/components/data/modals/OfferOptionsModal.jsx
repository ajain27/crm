import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";
import { DEFAULT_OFFER_OPTIONS } from "./WholesaleOfferPdfTemplate";
import CurrencyInput from "../../../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../../../elements/ModalActions";

const MAX_DAYS = 365;

function digitsOnly(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function toForm(options, sellerName) {
  return {
    sellerName: sellerName || "",
    allowAssignment: options.allowAssignment,
    emdAmount: String(options.emdAmount),
    inspectionDays: String(options.inspectionDays),
    closingDays: String(
      options.closingDays ?? DEFAULT_OFFER_OPTIONS.closingDays,
    ),
  };
}

// Asks for the seller's name, the offer's assignment variant, EMD,
// inspection period and closing timeline before the Purchase & Sale
// Agreement is generated.
// Opens with the deal's seller name and the last options used (or the
// defaults), so regenerating doesn't mean retyping them.
export default function OfferOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  sellerName = "",
  initialOptions = DEFAULT_OFFER_OPTIONS,
}) {
  const [form, setForm] = useState(() => toForm(initialOptions, sellerName));

  // Reset only when the window opens, so typing isn't overwritten.
  useEffect(() => {
    if (isOpen) setForm(toForm(initialOptions, sellerName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const emdAmount = parseInt(form.emdAmount, 10) || 0;
  const inspectionDays = parseInt(form.inspectionDays, 10) || 0;
  const emdError = emdAmount > 0 ? "" : "Enter an EMD amount.";
  const daysError =
    inspectionDays >= 1 && inspectionDays <= MAX_DAYS
      ? ""
      : `Enter between 1 and ${MAX_DAYS} days.`;
  const closingDays = parseInt(form.closingDays, 10) || 0;
  // The EMD goes hard once inspection ends without closing, so closing
  // can't be due before the inspection period is over.
  const closingError =
    closingDays < 1 || closingDays > MAX_DAYS
      ? `Enter between 1 and ${MAX_DAYS} days.`
      : !daysError && closingDays < inspectionDays
        ? "Closing can't be before the inspection period ends."
        : "";

  function handleSubmit(e) {
    e?.preventDefault();
    if (emdError || daysError || closingError) return;
    onGenerate({
      sellerName: form.sellerName.trim().replace(/\s+/g, " "),
      allowAssignment: form.allowAssignment,
      emdAmount,
      inspectionDays,
      closingDays,
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
        <ModalActions
          end={
            <>
              <ActionButton label="Cancel" onClick={onClose} />
              <ActionButton
                label="Generate"
                tone="primary"
                onClick={handleSubmit}
                disabled={!!emdError || !!daysError || !!closingError}
              />
            </>
          }
        />
      }
    >
      <form className="offer-options-body" onSubmit={handleSubmit}>
        <label className="field">
          <span>Seller Name</span>
          <input
            value={form.sellerName}
            onChange={(e) =>
              setForm((p) => ({ ...p, sellerName: e.target.value }))
            }
            placeholder="Seller's first and last name"
            aria-label="Seller Name"
          />
        </label>

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
          <CurrencyInput
            value={form.emdAmount}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, emdAmount: digitsOnly(v) }))
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
            max={MAX_DAYS}
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

        <label className="field">
          <span>Closing Timeline (days after acceptance)</span>
          <input
            type="number"
            min={1}
            max={MAX_DAYS}
            value={form.closingDays}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                closingDays: digitsOnly(e.target.value),
              }))
            }
            placeholder="21"
            aria-label="Closing Timeline"
          />
          {closingError && <span className="field-error">{closingError}</span>}
        </label>

        {/* Lets Enter submit from any input. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
