import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../../elements/elements";
import {
  parseCurrency,
  parsePercent,
  fmtCurrencyInput,
} from "../../../../utils/utils";

export function createEmptyLender() {
  return { id: crypto.randomUUID(), amount: "", rate: "", term: "" };
}

function calcPMT(annualRatePct, termYears, principal) {
  if (principal <= 0) return 0;
  // No term → fall back to interest-only
  if (termYears <= 0) {
    return annualRatePct > 0 ? (principal * (annualRatePct / 100)) / 12 : 0;
  }
  if (annualRatePct <= 0) return principal / (termYears * 12);
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export function calcLenderMonthlyPayment(lenders) {
  return lenders.reduce((sum, l) => {
    const amount = parseCurrency(l.amount);
    const rate = parsePercent(l.rate);
    const term = parseInt(l.term || "0", 10) || 0;
    return sum + calcPMT(rate, term, amount);
  }, 0);
}

export function calcLenderTotal(lenders) {
  return lenders.reduce((sum, l) => sum + parseCurrency(l.amount), 0);
}

export default function AdditionalLenders({ lenders, setLenders, onMutate }) {
  function notify() {
    if (onMutate) onMutate();
  }

  function handleAdd() {
    setLenders((prev) => [...prev, createEmptyLender()]);
    notify();
  }

  function handleRemove(id) {
    setLenders((prev) => prev.filter((l) => l.id !== id));
    notify();
  }

  function handleAmountChange(id, value) {
    setLenders((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, amount: fmtCurrencyInput(value) } : l,
      ),
    );
    notify();
  }

  function handleRateChange(id, value) {
    setLenders((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, rate: value.replace(/[^0-9.%]/g, "") } : l,
      ),
    );
    notify();
  }

  function handleRateBlur(id, value) {
    if (!value) return;
    const numeric = value.replace(/[^0-9.]/g, "");
    if (!numeric) return;
    setLenders((prev) =>
      prev.map((l) => (l.id === id ? { ...l, rate: `${numeric}%` } : l)),
    );
  }

  function handleTermChange(id, value) {
    setLenders((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, term: value.replace(/[^0-9]/g, "") } : l,
      ),
    );
    notify();
  }

  return (
    <>
      <div className="deal-analyzer-section-label">Additional Lenders</div>
      <div className="deal-analyzer-form-grid">
        {lenders.map((lender, idx) => {
          const amount = parseCurrency(lender.amount);
          const rate = parsePercent(lender.rate);
          const term = parseInt(lender.term || "0", 10) || 0;
          const monthlyPayment = calcPMT(rate, term, amount);
          return (
            <div
              key={lender.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: "0.75rem",
                alignItems: "end",
                gridColumn: "1 / -1",
              }}
            >
              <Field
                label={`Lender ${idx + 1} Amount`}
                name={`lender-amount-${lender.id}`}
                value={lender.amount}
                onChange={(e) => handleAmountChange(lender.id, e.target.value)}
                placeholder="e.g. $25,000"
              />
              <Field
                label={`Lender ${idx + 1} Rate (%)`}
                name={`lender-rate-${lender.id}`}
                value={lender.rate}
                onChange={(e) => handleRateChange(lender.id, e.target.value)}
                onBlur={(e) => handleRateBlur(lender.id, e.target.value)}
                placeholder="e.g. 10"
              />
              <Field
                label={`Lender ${idx + 1} Term (Years)`}
                name={`lender-term-${lender.id}`}
                value={lender.term}
                onChange={(e) => handleTermChange(lender.id, e.target.value)}
                placeholder="e.g. 5"
              />
              <button
                type="button"
                className="leads-delete-btn"
                onClick={() => handleRemove(lender.id)}
                title={`Remove lender ${idx + 1}`}
                aria-label={`Remove lender ${idx + 1}`}
                style={{ marginBottom: "0.5rem" }}
              >
                <Trash2 size={14} />
              </button>
              {monthlyPayment > 0 && (
                <span
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Monthly payment: $
                  {monthlyPayment.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  {term <= 0 && " (interest-only — add term to amortize)"}
                </span>
              )}
            </div>
          );
        })}
        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleAdd}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} />
            Add Lender
          </button>
        </div>
      </div>
    </>
  );
}
