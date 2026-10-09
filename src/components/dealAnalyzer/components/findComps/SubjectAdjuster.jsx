import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const fmt = (n) => (n != null ? `$${Math.round(n).toLocaleString()}` : "—");

const SITE_LABELS = {
  zillow: "Zillow",
  redfin: "Redfin",
  realtor: "Realtor.com",
};
const PROPERTY_TYPES = ["Single Family", "Condo", "Townhouse", "Multi-Family"];

// Editable facts: the displayed subject's key, the per-site key, label.
const FIELDS = [
  { key: "bedrooms", source: "beds", label: "Beds", step: "1" },
  { key: "bathrooms", source: "baths", label: "Baths", step: "0.5" },
  { key: "squareFootage", source: "sqft", label: "Sq Ft", step: "1" },
  { key: "yearBuilt", source: "yearBuilt", label: "Year Built", step: "1" },
];

function toForm(subject) {
  return {
    propertyType: subject?.propertyType || "",
    ...Object.fromEntries(
      FIELDS.map(({ key }) => [
        key,
        subject?.[key] != null ? String(subject[key]) : "",
      ]),
    ),
  };
}

// "Zillow 4 · Redfin 2.5 · Realtor.com 2.5", and whether the sites disagree.
function siteValues(sources, field, format = (v) => v) {
  const entries = Object.entries(sources || {})
    .filter(([, values]) => values?.[field] != null)
    .map(([site, values]) => [SITE_LABELS[site] || site, values[field]]);
  const distinct = new Set(entries.map(([, v]) => String(v).toLowerCase()));
  return {
    text: entries.map(([site, v]) => `${site} ${format(v)}`).join(" · "),
    conflict: distinct.size > 1,
  };
}

// The subject property's facts as editable fields, with what each site
// said underneath. Zillow, Redfin and Realtor.com often disagree; fixing
// the facts and re-running applies the comp rules to the corrected values.
export default function SubjectAdjuster({
  subject,
  sources,
  busy,
  error,
  onRerun,
}) {
  const [form, setForm] = useState(() => toForm(subject));

  // A new result (search or re-run) resets the fields to its values.
  useEffect(() => {
    setForm(toForm(subject));
  }, [subject]);

  const changed = JSON.stringify(form) !== JSON.stringify(toForm(subject));
  const anyConflict =
    FIELDS.some(({ source }) => siteValues(sources, source).conflict) ||
    siteValues(sources, "propertyType").conflict;

  function handleSubmit(e) {
    e.preventDefault();
    if (!changed || busy) return;
    const number = (v) => (v === "" ? null : Number(v));
    onRerun({
      propertyType: form.propertyType || null,
      beds: number(form.bedrooms),
      baths: number(form.bathrooms),
      sqft: number(form.squareFootage),
      yearBuilt: number(form.yearBuilt),
    });
  }

  const typeSites = siteValues(sources, "propertyType");
  const typeOptions = [
    ...new Set([form.propertyType, ...PROPERTY_TYPES].filter(Boolean)),
  ];

  return (
    <form className="find-comps-subject" onSubmit={handleSubmit}>
      <span className="find-comps-section-label">Subject Property</span>
      <p className="find-comps-adjust-hint">
        {anyConflict
          ? "Zillow, Redfin and Realtor.com don't agree on everything below. "
          : ""}
        Check the beds, baths, size and type, correct anything that's wrong, and
        re-run the comps.
      </p>
      <div className="find-comps-subject-grid">
        {FIELDS.map(({ key, source, label, step }) => {
          const sites = siteValues(sources, source, (v) =>
            source === "sqft" ? Number(v).toLocaleString() : v,
          );
          return (
            <label
              key={key}
              className={`find-comps-adjust-field${sites.conflict ? " find-comps-adjust-field--conflict" : ""}`}
            >
              <span>{label}</span>
              <input
                type="number"
                min="0"
                step={step}
                value={form[key]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [key]: e.target.value }))
                }
                aria-label={label}
                disabled={busy}
              />
              {sites.text && <small>{sites.text}</small>}
            </label>
          );
        })}
        <label
          className={`find-comps-adjust-field${typeSites.conflict ? " find-comps-adjust-field--conflict" : ""}`}
        >
          <span>Type</span>
          <select
            value={form.propertyType}
            onChange={(e) =>
              setForm((p) => ({ ...p, propertyType: e.target.value }))
            }
            aria-label="Property type"
            disabled={busy}
          >
            <option value="">Any</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {typeSites.text && <small>{typeSites.text}</small>}
        </label>
        {subject?.annualTax != null && (
          <div className="find-comps-adjust-field">
            <span>Annual Tax</span>
            <strong>{fmt(subject.annualTax)}</strong>
          </div>
        )}
      </div>
      <div className="find-comps-adjust-actions">
        <button
          type="submit"
          className="secondary-btn find-comps-rerun-btn"
          disabled={!changed || busy}
        >
          <RefreshCw size={14} />
          {busy ? "Re-running…" : "Re-run comps with these values"}
        </button>
        {changed && !busy && (
          <button
            type="button"
            className="find-comps-adjust-reset"
            onClick={() => setForm(toForm(subject))}
          >
            Undo changes
          </button>
        )}
        {error && <span className="find-comps-adjust-error">{error}</span>}
      </div>
    </form>
  );
}
