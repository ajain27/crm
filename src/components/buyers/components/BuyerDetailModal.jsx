import { useEffect, useState } from "react";
import Modal from "../../modal/Modal";
import { Field } from "../../elements/elements";
import { formatPhone } from "../../../utils/utils";
import { STATE_OPTIONS } from "../../../constants/stateOptions";

const toTypes = (value) =>
  Array.isArray(value) ? value : value ? [value] : [];

// Opens on a buyer's row: every field can be edited, or filled in when it
// was left blank. `onSave` gets the whole updated buyer and resolves true
// when it was saved (false keeps the modal open, e.g. a duplicate email).
function BuyerDetailModal({ buyer, onClose, onSave, propertyTypes = [] }) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (buyer) {
      setDraft({
        ...buyer,
        phone: buyer.phone ? formatPhone(buyer.phone) : "",
        realEstateType: toTypes(buyer.realEstateType),
      });
    }
  }, [buyer]);

  if (!buyer) return null;

  function handleChange(event) {
    const { name, value } = event.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  }

  function handleTypeToggle(type) {
    setDraft((prev) => {
      const current = toTypes(prev.realEstateType);
      return {
        ...prev,
        realEstateType: current.includes(type)
          ? current.filter((t) => t !== type)
          : [...current, type],
      };
    });
  }

  const isComplete =
    Boolean(draft.fullName?.trim()) &&
    Boolean(draft.email?.trim()) &&
    Boolean(draft.state?.trim());
  const selected = toTypes(draft.realEstateType);

  async function handleSave() {
    if (!isComplete || saving) return;
    setSaving(true);
    try {
      if (await onSave(draft)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={buyer.fullName || "Buyer Details"}
      className="buyer-detail-modal"
      style={{ maxWidth: "640px" }}
      actions={
        <div className="buyer-form-actions">
          <button className="secondary-btn form-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-btn form-btn"
            onClick={handleSave}
            disabled={!isComplete || saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      }
    >
      <form
        className="add-form buyer-add-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Field
          label="Full Name"
          name="fullName"
          id="buyer-detail-fullName"
          value={draft.fullName || ""}
          onChange={handleChange}
          placeholder="John Smith"
          required
        />
        <Field
          label="Email"
          name="email"
          id="buyer-detail-email"
          type="email"
          value={draft.email || ""}
          onChange={handleChange}
          placeholder="john@example.com"
          required
        />
        <Field
          label="Phone Number"
          name="phone"
          id="buyer-detail-phone"
          value={draft.phone || ""}
          onChange={(e) =>
            handleChange({
              target: { name: "phone", value: formatPhone(e.target.value) },
            })
          }
          placeholder="555-867-5309"
          maxLength="12"
        />
        <Field
          label="City (They buy in)"
          name="city"
          id="buyer-detail-city"
          value={draft.city || ""}
          onChange={handleChange}
          placeholder="Austin"
        />
        <label className="field">
          <span>
            State <span className="required-marker">*</span>
          </span>
          <select
            name="state"
            value={draft.state || ""}
            onChange={handleChange}
            required
          >
            {STATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field buyer-buys-field">
          <span>Property Types They Buy</span>
          <div className="buyer-type-checkboxes">
            {propertyTypes.map((type) => (
              <label
                key={type}
                className={`buyer-type-pill${selected.includes(type) ? " buyer-type-pill--active" : ""}`}
              >
                <input
                  type="checkbox"
                  className="buyer-checkbox"
                  checked={selected.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <label className="field buyer-notes-field">
          <span>Notes</span>
          <textarea
            name="notes"
            value={draft.notes || ""}
            onChange={handleChange}
            placeholder="Add any notes about this buyer..."
            rows={5}
          />
        </label>
      </form>
    </Modal>
  );
}

export default BuyerDetailModal;
