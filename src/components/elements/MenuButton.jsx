import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import "./MenuButton.css";

// A button that opens a short menu of choices. `items` is
// [{ id, label, hint? }]; picking one calls onSelect(id). The menu opens
// upward with `placement="top"` (e.g. in a modal's footer) and closes on
// a pick, Escape or a click outside.
export default function MenuButton({
  label,
  items,
  onSelect,
  className = "secondary-btn",
  placement = "bottom",
  disabled = false,
  title,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open]);

  return (
    <div className="menu-button" ref={wrapRef}>
      <button
        type="button"
        className={`${className} menu-button-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`menu-button-list menu-button-list--${placement}`}
          role="menu"
        >
          {items.map(({ id, label: itemLabel, hint }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className="menu-button-item"
              onClick={() => {
                setOpen(false);
                onSelect(id);
              }}
            >
              <span>{itemLabel}</span>
              {hint && <span className="menu-button-hint">{hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
