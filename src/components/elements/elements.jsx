import { useCountUp } from "../../hooks/useCountUp";

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

function Field({ label, required, wrapperClassName = "", ...props }) {
  return (
    <label className={`field ${wrapperClassName}`.trim()}>
      <span>
        {label}
        {required && <span className="required-marker">*</span>}
      </span>
      <input required={required} id={props.id || props.name} {...props} />
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

function ReadOnlyCell({ value, wide, small }) {
  return (
    <td>
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

export { Badge, ReadOnlyCell, Select, Field };
