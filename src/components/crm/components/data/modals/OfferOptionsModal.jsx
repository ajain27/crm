import { useEffect, useState } from "react";
import Modal from "../../../../modal/Modal";
import { DEFAULT_OFFER_OPTIONS } from "./WholesaleOfferPdfTemplate";
import { DEFAULT_COMMERCIAL_OPTIONS } from "./CommercialOfferPdfTemplate";
import CurrencyInput from "../../../../elements/CurrencyInput";
import ModalActions, { ActionButton } from "../../../../elements/ModalActions";

const MAX_DAYS = 365;

function digitsOnly(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function toForm(options, sellerName, isCommercial) {
  const commercial = options.commercial ?? isCommercial;
  const timeline =
    commercial && options.commercial === undefined
      ? DEFAULT_COMMERCIAL_OPTIONS
      : options;
  return {
    sellerName: sellerName || "",
    commercial,
    allowAssignment: options.allowAssignment,
    emdAmount: String(options.emdAmount),
    emdDays: String(options.emdDays ?? DEFAULT_OFFER_OPTIONS.emdDays),
    inspectionDays: String(timeline.inspectionDays),
    closingDays: String(
      timeline.closingDays ?? DEFAULT_OFFER_OPTIONS.closingDays,
    ),
  };
}

// Asks whether it's a commercial deal (the Commercial Purchase and Sale
// Agreement: lot and building only, always assignable), then the seller's
// name, the offer's assignment variant, EMD and when it's due,
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
  isCommercial = false,
}) {
  const [form, setForm] = useState(() =>
    toForm(initialOptions, sellerName, isCommercial),
  );

  // Reset only when the window opens, so typing isn't overwritten.
  useEffect(() => {
    if (isOpen) setForm(toForm(initialOptions, sellerName, isCommercial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const emdAmount = parseInt(form.emdAmount, 10) || 0;
  const inspectionDays = parseInt(form.inspectionDays, 10) || 0;
  const emdError = emdAmount > 0 ? "" : "Enter an EMD amount.";
  const emdDays = parseInt(form.emdDays, 10) || 0;
  // The EMD is due well inside the inspection period, while it's refundable.
  const emdDaysError =
    emdDays >= 1 && emdDays <= 30
      ? ""
      : "Enter between 1 and 30 business days.";
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

  // Switching deal type moves the periods to that agreement's defaults,
  // unless they were changed from the other one's.
  function chooseCommercial(commercial) {
    setForm((p) => {
      if (p.commercial === commercial) return p;
      const from = commercial
        ? DEFAULT_OFFER_OPTIONS
        : DEFAULT_COMMERCIAL_OPTIONS;
      const to = commercial
        ? DEFAULT_COMMERCIAL_OPTIONS
        : DEFAULT_OFFER_OPTIONS;
      const keep = (key) =>
        p[key] === String(from[key]) ? String(to[key]) : p[key];
      return {
        ...p,
        commercial,
        inspectionDays: keep("inspectionDays"),
        closingDays: keep("closingDays"),
      };
    });
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (emdError || emdDaysError || daysError || closingError) return;
    onGenerate({
      sellerName: form.sellerName.trim().replace(/\s+/g, " "),
      commercial: form.commercial,
      allowAssignment: form.commercial || form.allowAssignment,
      emdAmount,
      emdDays,
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
                disabled={
                  !!emdError || !!emdDaysError || !!daysError || !!closingError
                }
              />
            </>
          }
        />
      }
    >
      <form className="offer-options-body" onSubmit={handleSubmit}>
        <fieldset className="offer-options-choice">
          <legend>Is this a commercial deal?</legend>
          <label>
            <input
              type="radio"
              name="dealType"
              checked={!form.commercial}
              onChange={() => chooseCommercial(false)}
            />
            <span>
              <strong>No, residential</strong>
              <small>The Purchase and Sale Agreement.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="dealType"
              checked={form.commercial}
              onChange={() => chooseCommercial(true)}
            />
            <span>
              <strong>Yes, commercial</strong>
              <small>
                The Commercial Purchase and Sale Agreement: lot and building
                only, seller removes equipment and inventory.
              </small>
            </span>
          </label>
        </fieldset>

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

        {!form.commercial && (
          <fieldset className="offer-options-choice">
            <legend>Assignment</legend>
            <label>
              <input
                type="radio"
                name="assignment"
                checked={form.allowAssignment}
                onChange={() =>
                  setForm((p) => ({ ...p, allowAssignment: true }))
                }
              />
              <span>
                <strong>With assignment</strong>
                <small>
                  Buyer is "You Win Estates, and/or assigns", with the
                  assignment &amp; novation clause.
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
        )}

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
          <span>EMD Due (business days after acceptance)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={form.emdDays}
            onChange={(e) =>
              setForm((p) => ({ ...p, emdDays: digitsOnly(e.target.value) }))
            }
            placeholder="3"
            aria-label="EMD Due"
          />
          {emdDaysError && <span className="field-error">{emdDaysError}</span>}
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
            placeholder={form.commercial ? "30" : "14"}
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
            placeholder={form.commercial ? "60" : "21"}
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
