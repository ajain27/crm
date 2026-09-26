import { forwardRef } from "react";
import { MapPin, Phone, Tag } from "lucide-react";
import { SOURCES } from "../leadUtils";

// A labelled form cell in the "Add Lead" grids. Pass `icon` to show a
// lucide icon inside the input.
export function LeadField({
  label,
  required,
  icon: Icon,
  className = "",
  style,
  children,
}) {
  return (
    <div className={`field ${className}`.trim()} style={style}>
      <span>
        {label}
        {required && (
          <>
            {" "}
            <span className="required-star">*</span>
          </>
        )}
      </span>
      {Icon ? (
        <div className="leads-input-icon-wrap">
          <Icon size={15} className="leads-field-icon" />
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// Labelled <select>. `options` is a list of strings or { value, label }.
export function LeadSelectField({
  label,
  icon,
  name,
  value,
  onChange,
  options,
  placeholder,
}) {
  return (
    <LeadField label={label} icon={icon}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="leads-select"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const { value: optValue, label: optLabel } =
            typeof opt === "string" ? { value: opt, label: opt } : opt;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
    </LeadField>
  );
}

export function SourceSelectField({ value, onChange }) {
  return (
    <LeadSelectField
      label="Source"
      icon={Tag}
      name="source"
      value={value}
      onChange={onChange}
      options={SOURCES}
      placeholder="Select source…"
    />
  );
}

export function PhoneField({ label = "Phone", name, value, onChange }) {
  return (
    <LeadField label={label} icon={Phone}>
      <input
        type="tel"
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder="555-000-0000"
        maxLength={12}
      />
    </LeadField>
  );
}

export function TextField({
  label,
  icon,
  type = "text",
  name,
  value,
  onChange,
  onBlur,
  placeholder,
}) {
  return (
    <LeadField label={label} icon={icon}>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </LeadField>
  );
}

export const AddressField = forwardRef(function AddressField(
  { value, onChange, onBlur, placeholder },
  ref,
) {
  return (
    <LeadField
      label="Property Address"
      required
      icon={MapPin}
      className="leads-address-field"
    >
      <input
        ref={ref}
        type="text"
        name="address"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required
      />
    </LeadField>
  );
});

export function FormError({ message }) {
  if (!message) return null;
  return <p className="leads-form-error col-span-full">{message}</p>;
}
