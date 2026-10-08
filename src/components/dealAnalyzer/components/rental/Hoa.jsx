import { Field, Select, AnimatedAmount } from "../../../elements/elements";
import { parseCurrency } from "../../../../utils/utils";

// HOA, shared by the Cash, DSCR and HELOC rental tabs: a Yes/No question,
// and the monthly dues once the answer is Yes. Dues count as a monthly
// operating expense (they lower NOI and cash flow).

export const HOA_FORM_DEFAULTS = { hasHoa: "No", monthlyHoa: "" };

// Monthly dues in dollars; 0 when the property has no HOA, even if an
// amount was typed before switching the answer back to No.
export function monthlyHoaFrom(form) {
  return form.hasHoa === "Yes" ? parseCurrency(form.monthlyHoa) : 0;
}

export function HoaFields({ form, onChange }) {
  return (
    <>
      <Select
        label="HOA?"
        name="hasHoa"
        value={form.hasHoa || "No"}
        onChange={onChange}
        options={["No", "Yes"]}
      />
      {form.hasHoa === "Yes" && (
        <Field
          label="Monthly HOA Dues"
          name="monthlyHoa"
          value={form.monthlyHoa}
          onChange={onChange}
          placeholder="e.g. $250"
        />
      )}
    </>
  );
}

export function HoaSummaryRow({ summary, fmt }) {
  if (!(summary.monthlyHoa > 0)) return null;
  return (
    <div>
      <span>HOA Dues</span>
      <strong className="deal-analyzer-return-negative">
        <AnimatedAmount value={summary.monthlyHoa} format={fmt} />
      </strong>
    </div>
  );
}
