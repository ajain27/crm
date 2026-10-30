import CurrencyInput from "../../elements/CurrencyInput";
import {
  OCCUPANT_OPTIONS,
  SELLER_MOTIVATION_OPTIONS,
  SELLING_URGENCY_OPTIONS,
} from "../leadsConfig";

// A select of `options`, also offering a value saved outside them (e.g. an
// imported lead's own wording).
export function OptionSelect({
  value,
  onChange,
  options,
  disabled,
  className,
  placeholder = "Select…",
}) {
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select
      className={className}
      disabled={disabled}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {all.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// The seller details a lead and the CRM deal made from it both show, under
// the same field names. Each modal passes its own `Field` (label + input
// wrapper) and input class, so the fields sit in its grid.
export default function SellerDetailsFields({
  values,
  onChange,
  Field,
  inputClassName,
  disabled = false,
}) {
  return (
    <>
      <Field label="Asking Price">
        <CurrencyInput
          className={inputClassName}
          disabled={disabled}
          value={values.askingPrice || ""}
          onChange={(e) => onChange("askingPrice", e.target.value)}
          placeholder="$0"
        />
      </Field>
      <Field label="Who's Living in the Property">
        <OptionSelect
          className={inputClassName}
          disabled={disabled}
          value={values.occupant}
          onChange={(v) => onChange("occupant", v)}
          options={OCCUPANT_OPTIONS}
        />
      </Field>
      <Field label="Selling Urgency">
        <OptionSelect
          className={inputClassName}
          disabled={disabled}
          value={values.sellingUrgency}
          onChange={(v) => onChange("sellingUrgency", v)}
          options={SELLING_URGENCY_OPTIONS}
        />
      </Field>
      <Field label="Seller Motivation">
        <OptionSelect
          className={inputClassName}
          disabled={disabled}
          value={values.sellerMotivation}
          onChange={(v) => onChange("sellerMotivation", v)}
          options={SELLER_MOTIVATION_OPTIONS}
        />
      </Field>
    </>
  );
}
