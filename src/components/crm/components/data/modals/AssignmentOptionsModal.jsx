import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";

// Asks whether the buyer gets an inspection period before the Assignment
// of Contract is generated. Opens with the last choice made.
export default function AssignmentOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  initialInspectionPeriod = false,
}) {
  const [inspectionPeriod, setInspectionPeriod] = useState(
    initialInspectionPeriod,
  );

  // Reset only when the window opens.
  useEffect(() => {
    if (isOpen) setInspectionPeriod(initialInspectionPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        <>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => onGenerate({ inspectionPeriod })}
          >
            Generate
          </button>
        </>
      }
    >
      <div className="offer-options-body">
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
