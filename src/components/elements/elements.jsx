import { ChevronDown } from "lucide-react";
import { useCountUp } from "../../hooks/useCountUp";
import { trimFieldOnBlur } from "../../utils/utils";

export function SimpleStat({
  icon,
  label,
  value,
  subtitle,
  colorTheme,
  className = "",
  numericValue,
  format,
  valueClassName = "",
}) {
  const target =
    typeof numericValue === "number"
      ? numericValue
      : typeof value === "number"
        ? value
        : 0;
  const animated = useCountUp(target);

  let display;
  if (typeof numericValue === "number" && format) {
    display = format(animated);
  } else if (typeof value === "number") {
    display = animated;
  } else {
    display = value;
  }

  return (
    <article
      className={`stat-card simple-stat ${colorTheme ? `theme-${colorTheme} simple-stat-themed` : ""} ${className}`.trim()}
    >
      <div className="simple-header">
        <div>
          <p>{label}</p>
          {subtitle && <span className="subtitle">{subtitle}</span>}
        </div>
        <div className="small-icon">{icon}</div>
      </div>
      <strong className={valueClassName || undefined}>{display}</strong>
    </article>
  );
}

export function AnimatedAmount({ value = 0, format }) {
  const animated = useCountUp(Math.round(Math.abs(value)));
  const signed = value < 0 ? -animated : animated;
  return <>{format ? format(signed) : signed}</>;
}

export function GaugeStat({ label, subtitle, value, max, colorTheme }) {
  const animated = useCountUp(value);
  const radius = 58;
  const stroke = 12;
  const circumference = radius * Math.PI;
  const safeMax = max > 0 ? max : 1;
  const strokeDashoffset =
    circumference - (Math.min(animated, safeMax) / safeMax) * circumference;

  return (
    <article className={`stat-card gauge-stat theme-${colorTheme}`}>
      <div className="gauge-header">
        <p>{label}</p>
        {subtitle && <span className="subtitle">{subtitle}</span>}
      </div>
      <div className="gauge-container">
        <svg height="80" width="140">
          <path
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={stroke}
            fill="transparent"
            strokeLinecap="round"
            d="M 12,70 A 58,58 0 0,1 128,70"
          />
          <path
            className="gauge-path"
            stroke={
              colorTheme === "orange"
                ? "#fcd34d"
                : colorTheme === "red"
                  ? "#fca5a5"
                  : "#86efac"
            }
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            fill="transparent"
            strokeLinecap="round"
            d="M 12,70 A 58,58 0 0,1 128,70"
          />
        </svg>
        <div className="gauge-text">
          <strong className="gauge-val">{animated}</strong>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  required,
  wrapperClassName = "",
  onChange,
  onBlur,
  ...props
}) {
  const trimOnBlur = trimFieldOnBlur(onChange);
  function handleBlur(event) {
    trimOnBlur(event);
    onBlur?.(event);
  }

  return (
    <label className={`field ${wrapperClassName}`.trim()}>
      <span>
        {label}
        {required && <span className="required-marker">*</span>}
      </span>
      <input
        required={required}
        id={props.id || props.name}
        onChange={onChange}
        onBlur={handleBlur}
        {...props}
      />
    </label>
  );
}

function Select({ label, required, options, ...props }) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required-marker">*</span>}
      </span>
      <select required={required} id={props.id || props.name} {...props}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

// Collapsed/expanded heading cell for the mobile "accordion card" table
// layout (see src/styles/accordionCard.css). Tag the `<table>` with
// `acc-card` and its scroll wrapper with `acc-card-container` to enable it.
function AccordionHeaderCell({
  id,
  label,
  value,
  className = "",
  valueClassName = "",
  colSpan,
  onHeaderClick,
}) {
  const toggleId = `acc-toggle-${id}`;
  return (
    <td
      className={`acc-col-header ${className}`.trim()}
      data-label={label}
      colSpan={colSpan}
      onClick={(e) => {
        e.stopPropagation();
        onHeaderClick?.(e);
      }}
    >
      <input
        type="checkbox"
        id={toggleId}
        className="acc-accordion-toggle"
        aria-hidden="true"
        tabIndex={-1}
      />
      <label htmlFor={toggleId} className="acc-accordion-label">
        <span className={`acc-accordion-address ${valueClassName}`.trim()}>
          {value}
        </span>
        <ChevronDown size={16} className="acc-accordion-chevron" />
      </label>
    </td>
  );
}

function ReadOnlyCell({ value, wide, small, label }) {
  return (
    <td data-label={label}>
      <span
        className={`readonly-input ${wide ? "wide" : ""} ${small ? "small" : ""}`.trim()}
      >
        {value}
      </span>
    </td>
  );
}

function Badge({ value }) {
  const className = String(value || "")
    .toLowerCase()
    .replaceAll(" ", "-");
  return <span className={`badge ${className}`}>{value || "—"}</span>;
}

export { Badge, ReadOnlyCell, Select, Field, AccordionHeaderCell };
