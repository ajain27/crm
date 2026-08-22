import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Standard down-payment-percent dropdown, styled to match the rest of a
// `deal-analyzer-form-grid` row (label on top, full-width control below) —
// unlike a free-text percent Field, financing math elsewhere depends on the
// value always being one of a known set of loan-program percentages.
export const STANDARD_DOWN_PCT_OPTIONS = [
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70,
];

// A custom in-page listbox instead of a native <select> — Chrome on macOS
// renders native <select> popups via the OS at a position that's wrong
// whenever the page isn't at exactly 100% browser zoom, which we can't fix
// with CSS since that popup lives outside the page's layout entirely.
export default function DownPaymentPctField({
  label = "Down Payment %",
  value,
  onChange,
  options = STANDARD_DOWN_PCT_OPTIONS,
  badge,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <label className="field down-pct-field" ref={rootRef}>
      <span>
        {label}
        {badge && <span className="deal-analyzer-auto-badge">{badge}</span>}
      </span>
      <button
        type="button"
        className="down-pct-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{value}%</span>
        <ChevronDown
          size={16}
          className={`down-pct-chevron${open ? " open" : ""}`}
        />
      </button>
      {open && (
        <ul className="down-pct-listbox" role="listbox">
          {options.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              className={`down-pct-option${opt === value ? " selected" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <span>{opt}%</span>
              {opt === value && <Check size={14} />}
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
