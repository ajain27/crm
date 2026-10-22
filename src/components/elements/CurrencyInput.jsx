import { forwardRef, useLayoutEffect, useRef } from "react";
import { fmtCurrencyInput } from "../../utils/utils";

// How many digits come before `position` in `text` — the caret's place in
// the number itself, which stays the same when "$" and commas move around.
function digitsBefore(text, position) {
  return (text.slice(0, position).match(/[\d.]/g) || []).length;
}

// The caret position just after the `count`th digit of `text`.
function positionAfterDigits(text, count) {
  if (count === 0) return text.startsWith("$") ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/[\d.]/.test(text[i])) seen += 1;
    if (seen === count) return i + 1;
  }
  return text.length;
}

// A text input for dollar amounts: shows "$100,000" as you type and keeps
// the caret where it was. Values saved before formatting ("100000") show
// formatted too.
//
// `onChange` gets an event-like { target: { name, value } } with the
// formatted value, so form handlers that read e.target work unchanged;
// `onValueChange(value)` is there for setters that take the value alone.
const CurrencyInput = forwardRef(function CurrencyInput(
  { value, onChange, onValueChange, name, placeholder = "$0", ...props },
  forwardedRef,
) {
  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const shown = fmtCurrencyInput(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caretRef.current === null || !input) return;
    if (document.activeElement === input) {
      const at = positionAfterDigits(shown, caretRef.current);
      input.setSelectionRange(at, at);
    }
    caretRef.current = null;
  }, [shown]);

  function setRefs(el) {
    inputRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  }

  function handleChange(e) {
    const typed = e.target.value;
    const formatted = fmtCurrencyInput(typed);
    caretRef.current = digitsBefore(
      typed,
      e.target.selectionStart ?? typed.length,
    );
    onChange?.({ target: { name, value: formatted }, currentTarget: e.target });
    onValueChange?.(formatted);
  }

  return (
    <input
      ref={setRefs}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      name={name}
      placeholder={placeholder}
      {...props}
      value={shown}
      onChange={handleChange}
    />
  );
});

export default CurrencyInput;
