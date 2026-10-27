import "./Spinner.css";

const SIZES = { sm: 16, md: 24, lg: 40 };

// A spinning ring for work in progress. `size` is "sm" (16px, e.g. inside a
// button), "md" (24px) or "lg" (40px), or a number of pixels. `label` is
// shown beside it (`stacked` puts it underneath); without one, `ariaLabel`
// names it for screen readers. `decorative` hides it from screen readers,
// for a spinner beside text that already says what's happening.
export default function Spinner({
  size = "md",
  label,
  ariaLabel = "Loading",
  stacked = false,
  decorative = false,
  className = "",
}) {
  const px = typeof size === "number" ? size : SIZES[size] || SIZES.md;
  return (
    <span
      className={`spinner${stacked ? " spinner--stacked" : ""} ${className}`.trim()}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "status", "aria-label": label ? undefined : ariaLabel })}
    >
      <span
        className="spinner-ring"
        style={{
          width: px,
          height: px,
          borderWidth: Math.max(2, Math.round(px / 10)),
        }}
        aria-hidden="true"
      />
      {label && <span className="spinner-label">{label}</span>}
    </span>
  );
}
