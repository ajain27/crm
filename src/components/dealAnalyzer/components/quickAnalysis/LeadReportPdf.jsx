import { forwardRef } from "react";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";
import { medianPricePerSqft } from "../../../leads/comps/leadComps";

// Fixed light colors: the report is always rendered light, whatever the
// app's theme.
const COLORS = {
  renovated: "#16a34a",
  asIs: "#f97316",
  unknown: "#2563eb",
};

function money(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Math.round(n);
  return `${rounded < 0 ? "−" : ""}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

const num = (n) => (n > 0 ? n.toLocaleString("en-US") : "—");
const miles = (d) =>
  d !== null && d !== undefined ? `${d.toFixed(2)} mi` : "—";
const perSqft = (c) =>
  c.price > 0 && c.sqft > 0 ? `$${Math.round(c.price / c.sqft)}` : "—";
// "6110 N 41st St, Tampa, FL 33610" → "6110 N 41st St".
const street = (address) => String(address || "").split(",")[0];

const CONDITION_LABELS = { renovated: "Renovated", "as-is": "As-is" };

// The property's facts as one line: "3 bd · 2 ba · 1,450 sq ft · built 1962".
function factsLine(p = {}) {
  return [
    p.beds > 0 && `${p.beds} bd`,
    p.baths > 0 && `${p.baths} ba`,
    p.sqft > 0 && `${num(p.sqft)} sq ft`,
    p.lotSqft > 0 && `lot ${num(p.lotSqft)} sq ft`,
    p.yearBuilt > 0 && `built ${p.yearBuilt}`,
  ]
    .filter(Boolean)
    .join("  ·  ");
}

function Tile({ label, value, tone }) {
  return (
    <div className={`lr-tile${tone ? ` lr-tile--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Horizontal bars, one per row, scaled to the largest value. `marker`
// ({ value, label }) draws a vertical line across them, e.g. the ARV.
function BarChart({ rows, marker }) {
  const max = Math.max(...rows.map((r) => r.value || 0), marker?.value || 0);
  if (!(max > 0)) return null;
  const pct = (v) => `${Math.max(0, (v / max) * 100)}%`;
  return (
    <div className="lr-bars">
      {rows.map((row) => (
        <div key={row.label} className="lr-bar-row">
          <span className="lr-bar-label">{row.label}</span>
          <span className="lr-bar-track">
            <span
              className="lr-bar-fill"
              style={{ width: pct(row.value), background: row.color }}
            />
            {marker && (
              <span
                className="lr-bar-marker"
                style={{ left: pct(marker.value) }}
              />
            )}
          </span>
          <strong className="lr-bar-value">{money(row.value)}</strong>
        </div>
      ))}
      {marker && (
        <p className="lr-bar-note">
          <span className="lr-marker-key" /> {marker.label}
        </p>
      )}
    </div>
  );
}

// The property report the Analyze window shows: the house's photo and
// facts, its value (comps, Zestimate, Redfin) and every comp and other
// nearby sale, with a chart. Nothing about the seller or the offer is in
// it, so it can be shared. Rendered off-screen and captured into a PDF
// (see renderElementToPdfAssets).
const LeadReportPdf = forwardRef(function LeadReportPdf(
  { address, frontImage, comps, arv: arvProp },
  ref,
) {
  const subject = comps?.subject || {};
  const estimates = comps?.estimates || {};
  const used = comps?.comps || [];
  const others = comps?.otherSales || [];
  const ppsf = comps ? medianPricePerSqft(used) : null;
  const arv = arvProp > 0 ? arvProp : comps?.arv;

  return (
    <DealPdfLayout
      ref={ref}
      tagline="Property Report"
      footerNote="You Win Estates — Values are estimates from recent sales; they aren't an appraisal or financial advice."
    >
      <div className="lr-hero">
        {frontImage ? (
          // A background, not an <img>: the PDF capture ignores
          // object-fit, and this crops the same way.
          <div
            className="lr-photo"
            style={{ backgroundImage: `url(${frontImage})` }}
            role="img"
            aria-label="Front of the property"
          />
        ) : (
          <div className="lr-photo lr-photo--empty">No photo</div>
        )}
        <div className="lr-hero-text">
          <p className="lr-address">{address || "Property"}</p>
          {factsLine(subject) && (
            <p className="lr-facts">{factsLine(subject)}</p>
          )}
        </div>
      </div>

      <div className="lr-tiles">
        <Tile label="ARV" value={money(arv)} />
        <Tile
          label="Median $ / sq ft"
          value={ppsf ? `$${Math.round(ppsf)}` : "—"}
        />
        <Tile label="Rent estimate" value={money(comps?.rent)} />
        <Tile label="Comps used" value={used.length || "—"} />
      </div>

      <PdfSectionTitle>Value</PdfSectionTitle>
      <div className="lr-two-col">
        <div>
          <PdfRow label="ARV from comps" value={money(comps?.arv)} />
          <PdfRow label="Zestimate" value={money(estimates.zestimate)} />
          <PdfRow
            label="Redfin Estimate"
            value={money(estimates.redfinEstimate)}
          />
        </div>
        <div>
          <PdfRow
            label="Median sale $ / sq ft"
            value={ppsf ? `$${Math.round(ppsf)}` : "—"}
          />
          <PdfRow label="Rent estimate" value={money(comps?.rent)} />
          <PdfRow label="Comps run" value={comps?.date || "—"} />
        </div>
      </div>
      {comps?.summary && <p className="lr-note">{comps.summary}</p>}

      <PdfSectionTitle>
        Comps used for the ARV{used.length ? ` (${used.length})` : ""}
      </PdfSectionTitle>
      {used.length ? (
        <>
          <BarChart
            rows={used.map((c) => ({
              label: street(c.address),
              value: c.price,
              color:
                c.condition === "renovated"
                  ? COLORS.renovated
                  : c.condition === "as-is"
                    ? COLORS.asIs
                    : COLORS.unknown,
            }))}
            marker={arv > 0 ? { value: arv, label: `ARV ${money(arv)}` } : null}
          />
          <p className="lr-bar-note">
            {[
              ["Renovated", COLORS.renovated],
              ["As-is", COLORS.asIs],
              ["Condition unknown", COLORS.unknown],
            ].map(([label, color]) => (
              <span key={label} className="lr-key">
                <span className="lr-dot" style={{ background: color }} />{" "}
                {label}
              </span>
            ))}
          </p>
          <table className="lr-comps">
            <thead>
              <tr>
                <th>Address</th>
                <th>Sold</th>
                <th className="lr-num">Price</th>
                <th className="lr-num">Bd / Ba</th>
                <th className="lr-num">Sq ft</th>
                <th className="lr-num">$ / sq ft</th>
                <th className="lr-num">Built</th>
                <th className="lr-num">Distance</th>
                <th>Condition</th>
              </tr>
            </thead>
            <tbody>
              {used.map((c, i) => (
                <tr key={`${c.address}-${i}`}>
                  <td>
                    {c.address}
                    {c.differs && (
                      <span className="lr-differs">{c.differs}</span>
                    )}
                  </td>
                  <td>{c.soldDate || "—"}</td>
                  <td className="lr-num">{money(c.price)}</td>
                  <td className="lr-num">
                    {c.beds ?? "—"} / {c.baths ?? "—"}
                  </td>
                  <td className="lr-num">{num(c.sqft)}</td>
                  <td className="lr-num">{perSqft(c)}</td>
                  <td className="lr-num">{c.yearBuilt || "—"}</td>
                  <td className="lr-num">{miles(c.distance)}</td>
                  <td>{CONDITION_LABELS[c.condition] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="lr-empty">No comps run on this property yet.</p>
      )}

      {others.length > 0 && (
        <>
          <PdfSectionTitle>
            Other nearby sales looked at ({others.length})
          </PdfSectionTitle>
          <table className="lr-comps lr-comps--others">
            <thead>
              <tr>
                <th>Address</th>
                <th>Sold</th>
                <th className="lr-num">Price</th>
                <th className="lr-num">Bd / Ba</th>
                <th className="lr-num">Sq ft</th>
                <th className="lr-num">$ / sq ft</th>
                <th className="lr-num">Distance</th>
                <th>Why not used</th>
              </tr>
            </thead>
            <tbody>
              {others.map((c, i) => (
                <tr key={`${c.address}-${i}`}>
                  <td>{c.address}</td>
                  <td>{c.soldDate || "—"}</td>
                  <td className="lr-num">{money(c.price)}</td>
                  <td className="lr-num">
                    {c.beds ?? "—"} / {c.baths ?? "—"}
                  </td>
                  <td className="lr-num">{num(c.sqft)}</td>
                  <td className="lr-num">{perSqft(c)}</td>
                  <td className="lr-num">{miles(c.distance)}</td>
                  <td className="lr-reason">{c.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </DealPdfLayout>
  );
});

export default LeadReportPdf;
