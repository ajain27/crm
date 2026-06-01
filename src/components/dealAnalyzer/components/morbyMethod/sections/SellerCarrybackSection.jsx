import { Field } from "../../../../elements/elements";
import { fmt } from "../../../../../utils/utils";

export default function SellerCarrybackSection({
  form,
  onChange,
  onBlur,
  sellerCarryback,
  sellerCarrybackTermYears,
  sellerCarrybackMonthly,
  sellerCovers,
  buyerCashToClose,
  sellerExcess,
  purchasePrice,
}) {
  return (
    <>
      <div className="deal-analyzer-section-label">
        Seller Carryback — 2nd Lien Promissory Note
      </div>
      <div className="deal-analyzer-form-grid">
        <Field
          label="Seller Carryback Amount"
          name="sellerCarryback"
          value={form.sellerCarryback}
          onChange={onChange}
          placeholder="e.g. $60,000"
          required
        />
        <Field
          label="Note Rate (% / year)"
          name="sellerCarrybackRate"
          value={form.sellerCarrybackRate}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="e.g. 0 (often interest-free)"
        />
        <Field
          label="Note Term (Years)"
          name="sellerCarrybackTermYears"
          value={form.sellerCarrybackTermYears}
          onChange={onChange}
          placeholder="e.g. 5 (balloon)"
          required
        />
        {sellerCarryback > 0 && sellerCarrybackTermYears > 0 && (
          <label className="field deal-analyzer-output">
            <span>
              Monthly Note Payment{" "}
              <span className="deal-analyzer-auto-badge">auto</span>
            </span>
            <input value={fmt(sellerCarrybackMonthly)} readOnly tabIndex={-1} />
          </label>
        )}
        {sellerCarryback > 0 && (
          <label className="field deal-analyzer-output">
            <span>Seller Covers at Close</span>
            <input value={fmt(sellerCovers)} readOnly tabIndex={-1} />
          </label>
        )}
        {buyerCashToClose >= 0 && purchasePrice > 0 && (
          <label
            className={`field deal-analyzer-output ${buyerCashToClose === 0 ? "deal-analyzer-output-positive" : ""}`}
          >
            <span>Buyer Cash to Close</span>
            <input value={fmt(buyerCashToClose)} readOnly tabIndex={-1} />
          </label>
        )}
        {sellerExcess > 0 && (
          <label className="field deal-analyzer-output deal-analyzer-output-positive">
            <span>Seller Excess (rehab / reserves)</span>
            <input value={fmt(sellerExcess)} readOnly tabIndex={-1} />
          </label>
        )}
      </div>
    </>
  );
}
