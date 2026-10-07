import { useState } from "react";
import Modal from "../../modal/Modal";

const MAX_NAME_LENGTH = 60;

// Names a County Records list — when importing a new one ("Save list") or
// renaming the current one. Names must be unique (ignoring case) so tabs
// can't be confused. Mount it only while open, so it starts from
// `initialName` without an empty first render.
export default function ListNameModal({
  title,
  initialName = "",
  takenNames = [],
  submitLabel,
  saving = false,
  detail,
  onSubmit,
  onClose,
}) {
  const [name, setName] = useState(initialName);

  const trimmed = name.trim().replace(/\s+/g, " ");
  const taken = takenNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase(),
  );
  const error = !trimmed
    ? "Enter a name for this list."
    : taken
      ? "You already have a list with this name."
      : "";

  function handleSubmit(e) {
    e?.preventDefault();
    if (!error && !saving) onSubmit(trimmed);
  }

  return (
    <Modal
      isOpen
      onClose={saving ? () => {} : onClose}
      title={title}
      style={{
        width: "min(440px, 95vw)",
        maxWidth: "min(440px, 95vw)",
        height: "auto",
      }}
      actions={
        <>
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSubmit}
            disabled={!!error || saving}
          >
            {saving ? "Saving…" : submitLabel}
          </button>
        </>
      }
    >
      <form className="county-list-name-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>List name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g. 2026 Delinquent"
            aria-label="List name"
            autoFocus
            disabled={saving}
          />
          {name && error && <span className="field-error">{error}</span>}
        </label>
        {detail && <p className="county-list-name-detail">{detail}</p>}
      </form>
    </Modal>
  );
}
