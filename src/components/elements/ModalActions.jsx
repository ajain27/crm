import "./ModalActions.css";

// Small, compact buttons for a modal's footer, shared by every detail
// window. `tone`: "default" (outlined), "primary" (filled — the main
// action), "accent" (green fill) or "danger" (red text). `icon` is a
// lucide icon component, shown before the label.
export function ActionButton({
  icon: Icon,
  label,
  tone = "default",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`action-btn action-btn--${tone} ${className}`.trim()}
      {...props}
    >
      {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
      {label}
    </button>
  );
}

// A modal footer laid out in two groups: `start` (the window's tools —
// Delete, Run comps, Analyze…) on the left, wrapping when there are many,
// and `end` (Cancel / Save) on the right. Pass it as a Modal's `actions`.
export default function ModalActions({ start, end }) {
  return (
    <div className="modal-actions-bar">
      <div className="modal-actions-start">{start}</div>
      <div className="modal-actions-end">{end}</div>
    </div>
  );
}
