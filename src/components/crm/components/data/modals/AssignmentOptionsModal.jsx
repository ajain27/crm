import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";
import CurrencyInput from "../../../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../../../elements/ModalActions";

// Asks for the closing date, the buyer's EMD (the Assignee Deposit) and
// whether the buyer gets an inspection period before the Assignment of
// Contract is generated. Opens with the last choices made; the closing
// date and EMD are required.
export default function AssignmentOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  initialInspectionPeriod = false,
  initialClosingDate = "",
  initialEmdAmount = "",
}) {
  const [inspectionPeriod, setInspectionPeriod] = useState(
    initialInspectionPeriod,
  );
  const [closingDate, setClosingDate] = useState(initialClosingDate);
  const [emdAmount, setEmdAmount] = useState(String(initialEmdAmount || ""));
  const [touched, setTouched] = useState(false);

  // Reset only when the window opens.
  useEffect(() => {
    if (isOpen) {
      setInspectionPeriod(initialInspectionPeriod);
      setClosingDate(initialClosingDate || "");
      setEmdAmount(String(initialEmdAmount || ""));
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const closingError = closingDate ? "" : "Enter the closing date";
  const emd = parseInt(emdAmount, 10) || 0;
  const emdError = emd > 0 ? "" : "Enter the EMD amount";

  function handleGenerate() {
    setTouched(true);
    if (closingError || emdError) return;
    onGenerate({ inspectionPeriod, closingDate, emdAmount: emd });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Assignment"
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
                onClick={handleGenerate}
              />
            </>
          }
        />
      }
    >
      <div className="offer-options-body">
        <label className="field">
          <span>Closing Date</span>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-label="Closing Date"
          />
          {touched && closingError && (
            <span className="field-error">{closingError}</span>
          )}
        </label>

        <label className="field">
          <span>Earnest Money Deposit (EMD)</span>
          <CurrencyInput
            value={emdAmount}
            onValueChange={(v) =>
              setEmdAmount(String(v ?? "").replace(/\D/g, ""))
            }
            placeholder="$5,000"
            aria-label="Earnest Money Deposit"
          />
          {touched && emdError && (
            <span className="field-error">{emdError}</span>
          )}
        </label>

        <label className="ddm-switch-row">
          <span>
            <strong>Buyer needs an inspection period</strong>
            <small>
              Adds a seven (7) day inspection period; the deposit is refunded if
              the buyer backs out within it.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="ddm-switch"
            checked={inspectionPeriod}
            onChange={(e) => setInspectionPeriod(e.target.checked)}
            aria-label="Buyer needs an inspection period"
          />
        </label>
      </div>
    </Modal>
  );
}
