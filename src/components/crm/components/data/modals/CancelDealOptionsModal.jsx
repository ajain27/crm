import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";
import CurrencyInput from "../../../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../../../elements/ModalActions";
import { trimFieldOnBlur } from "../../../../../utils/utils";
import { EMD_NONE, EMD_OTHER, EMD_REFUND } from "./MutualReleasePdfTemplate";

function digitsOnly(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function toForm({ sellerName, agreementDate, emdAmount }) {
  return {
    sellerName: sellerName || "",
    agreementDate: agreementDate || "",
    escrowNumber: "",
    emdHandling: EMD_REFUND,
    emdAmount: emdAmount > 0 ? String(emdAmount) : "",
    emdOther: "",
  };
}

// Cancel Deal: the details of the Mutual Release & Cancellation Agreement,
// filled in from the deal (seller, the offer's date and EMD) and editable,
// before it's generated. Opens fresh from the deal every time.
export default function CancelDealOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  sellerName,
  agreementDate,
  emdAmount,
}) {
  const [form, setForm] = useState(() =>
    toForm({ sellerName, agreementDate, emdAmount }),
  );

  // Reset only when the window opens.
  useEffect(() => {
    if (isOpen) setForm(toForm({ sellerName, agreementDate, emdAmount }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const amount = parseInt(form.emdAmount, 10) || 0;
  const amountError =
    form.emdHandling === EMD_REFUND && amount <= 0
      ? "Enter the EMD amount to refund."
      : "";
  const otherError =
    form.emdHandling === EMD_OTHER && !form.emdOther.trim()
      ? "Say how the EMD is handled."
      : "";

  function handleSubmit(e) {
    e?.preventDefault();
    if (amountError || otherError) return;
    onGenerate({
      sellerName: form.sellerName.trim(),
      agreementDate: form.agreementDate,
      escrowNumber: form.escrowNumber.trim(),
      emdHandling: form.emdHandling,
      emdAmount: amount,
      emdOther: form.emdOther.trim(),
    });
  }

  const update = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));
  const chooseEmd = (emdHandling) => setForm((p) => ({ ...p, emdHandling }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Deal"
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
              <ActionButton label="Back" onClick={onClose} />
              <ActionButton
                label="Generate Release"
                tone="primary"
                onClick={handleSubmit}
                disabled={!!amountError || !!otherError}
              />
            </>
          }
        />
      }
    >
      <form className="offer-options-body" onSubmit={handleSubmit}>
        <p className="offer-options-intro">
          Generates the Mutual Release &amp; Cancellation Agreement for the
          seller to sign.
        </p>

        <label className="field">
          <span>Seller Name(s)</span>
          <input
            value={form.sellerName}
            onChange={update("sellerName")}
            onBlur={trimFieldOnBlur(update("sellerName"))}
            placeholder="Seller's first and last name"
            aria-label="Seller Name"
          />
        </label>

        <label className="field">
          <span>Agreement Date</span>
          <input
            type="date"
            value={form.agreementDate}
            onChange={update("agreementDate")}
            aria-label="Agreement Date"
          />
        </label>

        <label className="field">
          <span>Escrow / File No. (optional)</span>
          <input
            value={form.escrowNumber}
            onChange={update("escrowNumber")}
            onBlur={trimFieldOnBlur(update("escrowNumber"))}
            placeholder="Left blank to fill in by hand"
            aria-label="Escrow / File No."
          />
        </label>

        <fieldset className="offer-options-choice">
          <legend>Earnest Money Deposit (EMD)</legend>
          <label>
            <input
              type="radio"
              name="emdHandling"
              checked={form.emdHandling === EMD_REFUND}
              onChange={() => chooseEmd(EMD_REFUND)}
            />
            <span>
              <strong>Refund in full to Buyer</strong>
              <small>The EMD held by escrow/title comes back to us.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="emdHandling"
              checked={form.emdHandling === EMD_NONE}
              onChange={() => chooseEmd(EMD_NONE)}
            />
            <span>
              <strong>No EMD was deposited</strong>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="emdHandling"
              checked={form.emdHandling === EMD_OTHER}
              onChange={() => chooseEmd(EMD_OTHER)}
            />
            <span>
              <strong>Other</strong>
              <small>Write in how it's handled.</small>
            </span>
          </label>
        </fieldset>

        {form.emdHandling === EMD_REFUND && (
          <label className="field">
            <span>EMD Amount</span>
            <CurrencyInput
              value={form.emdAmount}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, emdAmount: digitsOnly(v) }))
              }
              placeholder="$100"
              aria-label="EMD Amount"
            />
            {amountError && <span className="field-error">{amountError}</span>}
          </label>
        )}

        {form.emdHandling === EMD_OTHER && (
          <label className="field">
            <span>How the EMD is handled</span>
            <input
              value={form.emdOther}
              onChange={update("emdOther")}
              onBlur={trimFieldOnBlur(update("emdOther"))}
              placeholder="e.g. $50 released to Seller, $50 refunded to Buyer"
              aria-label="How the EMD is handled"
            />
            {otherError && <span className="field-error">{otherError}</span>}
          </label>
        )}

        {/* Lets Enter submit from any input. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
