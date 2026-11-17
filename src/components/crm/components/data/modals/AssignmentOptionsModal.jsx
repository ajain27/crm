import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";
import CurrencyInput from "../../../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../../../elements/ModalActions";

// Asks for the closing date, the buyer's EMD (the Assignee Deposit), the
// assignee's representative and the inspection period in days before the
// Assignment of Contract is generated. Opens with the last choices made;
// the closing date, EMD and inspection days are required, and the EMD and
// inspection days may be zero.
export default function AssignmentOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  initialInspectionDays = 0,
  initialClosingDate = "",
  initialEmdAmount = "",
  initialAssigneeRep = "",
}) {
  const [inspectionDays, setInspectionDays] = useState(
    String(initialInspectionDays ?? ""),
  );
  const [closingDate, setClosingDate] = useState(initialClosingDate);
  const [emdAmount, setEmdAmount] = useState(String(initialEmdAmount ?? ""));
  const [assigneeRep, setAssigneeRep] = useState(initialAssigneeRep);
  const [touched, setTouched] = useState(false);

  // Reset only when the window opens.
  useEffect(() => {
    if (isOpen) {
      setInspectionDays(String(initialInspectionDays ?? ""));
      setClosingDate(initialClosingDate || "");
      setEmdAmount(String(initialEmdAmount ?? ""));
      setAssigneeRep(initialAssigneeRep || "");
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const closingError = closingDate ? "" : "Enter the closing date";
  // $0 and zero days are allowed; only an empty field is an error.
  const emdError = emdAmount === "" ? "Enter the EMD amount" : "";
  const daysError = inspectionDays === "" ? "Enter the inspection days" : "";
  const emd = parseInt(emdAmount, 10) || 0;

  function handleGenerate() {
    setTouched(true);
    if (closingError || emdError || daysError) return;
    onGenerate({
      inspectionDays: parseInt(inspectionDays, 10) || 0,
      closingDate,
      emdAmount: emd,
      assigneeRep: assigneeRep.trim(),
    });
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

        <label className="field">
          <span>Assignee's Authorized Representative (optional)</span>
          <input
            type="text"
            value={assigneeRep}
            onChange={(e) => setAssigneeRep(e.target.value)}
            onBlur={(e) => setAssigneeRep(e.target.value.trim())}
            placeholder="Name of the person signing for the buyer"
            aria-label="Assignee's Authorized Representative"
          />
        </label>

        <label className="field">
          <span>Inspection Period (days, 0 for none)</span>
          <input
            type="text"
            inputMode="numeric"
            value={inspectionDays}
            onChange={(e) =>
              setInspectionDays(e.target.value.replace(/\D/g, ""))
            }
            placeholder="7"
            aria-label="Inspection Period"
          />
          {touched && daysError && (
            <span className="field-error">{daysError}</span>
          )}
        </label>
      </div>
    </Modal>
  );
}
