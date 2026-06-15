import { Field, AnimatedAmount } from "../../../elements/elements";
import { parsePercent } from "../../../../utils/utils";

export function SellerCreditCarrybackField({
  value,
  purchasePrice,
  onChange,
  onBlur,
  fmt,
}) {
  const pct = parsePercent(value);
  const amount = purchasePrice * (pct / 100);
  return (
    <>
      <Field
        label="Seller Credit / Carryback (%)"
        name="sellerCarryback"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="e.g. 3"
      />
      {amount > 0 && (
        <label className="field deal-analyzer-output">
          <span>Seller Credit / Carryback Amount</span>
          <input value={fmt(amount)} readOnly tabIndex={-1} />
        </label>
      )}
    </>
  );
}

export function SellerCreditCarrybackSummaryRow({ pct, amount, fmt }) {
  if (!(amount > 0)) return null;
  return (
    <div>
      <span>Seller Credit / Carryback ({pct}%)</span>
      <strong className="deal-analyzer-return-positive">
        −<AnimatedAmount value={amount} format={fmt} />
      </strong>
    </div>
  );
}
