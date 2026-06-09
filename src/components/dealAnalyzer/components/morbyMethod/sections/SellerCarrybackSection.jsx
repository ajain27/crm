import { Field } from "../../../../elements/elements";
import { fmt } from "../../../../../utils/utils";

export default function SellerCarrybackSection({
  form,
  onChange,
  onBlur,
  sellerCarryback,
  sellerCarrybackTermYears,
  sellerCarrybackBalloonYears,
  sellerCarrybackBalloon,
  sellerCarrybackMonthly,
  buyerCashToClose,
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
          placeholder="e.g. 10"
          required
        />
        <Field
          label="Balloon Payment at (Years)"
          name="sellerCarrybackBalloonYears"
          value={form.sellerCarrybackBalloonYears}
          onChange={onChange}
          placeholder="e.g. 5 (optional)"
        />
        {sellerCarryback > 0 && sellerCarrybackTermYears > 0 && (
          <>
            <label className="field deal-analyzer-output">
              <span>
                Monthly Note Payment{" "}
                <span className="deal-analyzer-auto-badge">auto</span>
              </span>
              <input
                value={fmt(sellerCarrybackMonthly)}
                readOnly
                tabIndex={-1}
              />
            </label>
            {sellerCarrybackBalloonYears > 0 && sellerCarrybackBalloon > 0 && (
              <label className="field deal-analyzer-output">
                <span>
                  Balloon Payment at Year {sellerCarrybackBalloonYears}{" "}
                  <span className="deal-analyzer-auto-badge">auto</span>
                </span>
                <input
                  value={fmt(sellerCarrybackBalloon)}
                  readOnly
                  tabIndex={-1}
                />
              </label>
            )}
          </>
        )}
        {buyerCashToClose >= 0 && purchasePrice > 0 && (
          <label
            className={`field deal-analyzer-output ${buyerCashToClose === 0 ? "deal-analyzer-output-positive" : ""}`}
          >
            <span>Buyer Cash to Close</span>
            <input value={fmt(buyerCashToClose)} readOnly tabIndex={-1} />
          </label>
        )}
      </div>
    </>
  );
}
