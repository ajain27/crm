import { forwardRef } from "react";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";
import { donutPath } from "../wholesale/pieChartGeometry";
import { medianPricePerSqft } from "../../../leads/comps/leadComps";
import { NOVATION_RESERVE } from "./quickAnalysis";

// Fixed light colors: the report is always rendered light, whatever the
// app's theme.
const COLORS = {
  seller: "#2563eb",
  repairs: "#f97316",
  fee: "#a855f7",
  buyer: "#16a34a",
  agent: "#0d9488",
  buffer: "#eab308",
  closing: "#64748b",
  arv: "#1a3560",
  asking: "#9ca3af",
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

// Where the ARV goes, as a donut with its legend.
function Donut({ parts, total }) {
  const shown = parts.filter((p) => p.value > 0);
  const sum = shown.reduce((s, p) => s + p.value, 0);
  if (!(sum > 0)) return null;
  let deg = 0;
  const slices = shown.map((p) => {
    const sweep = (p.value / sum) * 360;
    const path = donutPath(70, 70, 64, 40, deg, deg + sweep);
    deg += sweep;
    return { ...p, path };
  });
  return (
    <div className="lr-donut">
      <svg viewBox="0 0 140 140" className="lr-donut-svg">
        {slices.map((s) => (
          <path
            key={s.label}
            d={s.path}
            fill={s.color}
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          style={{ fontSize: "8px", fill: "#6b7280", fontWeight: 700 }}
        >
          ARV
        </text>
        <text
          x="70"
          y="80"
          textAnchor="middle"
          style={{ fontSize: "11px", fill: "#1a1a2e", fontWeight: 700 }}
        >
          {money(total)}
        </text>
      </svg>
      <ul className="lr-legend">
        {shown.map((p) => (
          <li key={p.label}>
            <span className="lr-dot" style={{ background: p.color }} />
            <span className="lr-legend-label">{p.label}</span>
            <span className="lr-legend-pct">
              {Math.round((p.value / sum) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The property report the Analyze window shows: the house's photo and
// facts, the seller, its value (comps, Zestimate, Redfin), every comp and
// other nearby sale, and the cash (wholesale) and novation numbers as
// answered in the window, with charts. Rendered off-screen and captured
// into a PDF (see renderElementToPdfAssets).
const LeadReportPdf = forwardRef(function LeadReportPdf(
  { address, frontImage, contact, comps, analysis, askingPrice },
  ref,
) {
  const subject = comps?.subject || {};
  const estimates = comps?.estimates || {};
  const used = comps?.comps || [];
  const others = comps?.otherSales || [];
  const ppsf = comps ? medianPricePerSqft(used) : null;
  const { inputs, wholesale, novation, workLabel } = analysis || {};
  const arv = inputs?.arv || comps?.arv;

  const cashParts = analysis && [
    { label: "Offer to seller", value: wholesale.mao, color: COLORS.seller },
    { label: "Repairs", value: wholesale.repairs, color: COLORS.repairs },
    { label: "Your fee", value: wholesale.wholesaleFee, color: COLORS.fee },
    {
      label: "Buyer's profit",
      value: wholesale.buyersProfit,
      color: COLORS.buyer,
    },
  ];
  const reserveColors = {
    agentCommission: COLORS.agent,
    buffer: COLORS.buffer,
    closingCosts: COLORS.closing,
  };
  const novationParts = analysis && [
    { label: "Offer to seller", value: novation.offer, color: COLORS.seller },
    { label: "Repairs", value: novation.repairs, color: COLORS.repairs },
    { label: "Your fee", value: novation.wholesaleFee, color: COLORS.fee },
    ...NOVATION_RESERVE.map(({ key, label }) => ({
      label,
      value: novation[key],
      color: reserveColors[key],
    })),
  ];

  return (
    <DealPdfLayout
      ref={ref}
      tagline="Property Report"
      footerNote="You Win Estates — Values and offers are estimates from recent sales and the repair figure given; they aren't an appraisal or financial advice."
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
          {contact.length > 0 && (
            <div className="lr-contact">
              {contact.map(([label, value]) => (
                <div key={label} className="lr-contact-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lr-tiles">
        <Tile label="ARV" value={money(arv)} />
        <Tile
          label="Cash offer (MAO)"
          value={analysis ? money(wholesale.mao) : "—"}
          tone={analysis && (wholesale.mao >= 0 ? "good" : "bad")}
        />
        <Tile
          label="Novation offer"
          value={analysis ? money(novation.offer) : "—"}
          tone={analysis && (novation.offer >= 0 ? "good" : "bad")}
        />
        <Tile
          label="Seller asks"
          value={askingPrice > 0 ? money(askingPrice) : "—"}
        />
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
                  ? COLORS.buyer
                  : c.condition === "as-is"
                    ? COLORS.repairs
                    : COLORS.seller,
            }))}
            marker={arv > 0 ? { value: arv, label: `ARV ${money(arv)}` } : null}
          />
          <p className="lr-bar-note">
            {[
              ["Renovated", COLORS.buyer],
              ["As-is", COLORS.repairs],
              ["Condition unknown", COLORS.seller],
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

      <PdfSectionTitle>Deal analysis: cash vs. novation</PdfSectionTitle>
      {analysis ? (
        <>
          <p className="lr-repairs">
            Work needed: <strong>{workLabel}</strong> · Repair cost{" "}
            <strong>{money(inputs.repairs)}</strong> · Your fee{" "}
            <strong>{money(inputs.cashFee)}</strong> cash,{" "}
            <strong>{money(inputs.novationFee)}</strong> novation
          </p>
          <BarChart
            rows={[
              { label: "ARV", value: inputs.arv, color: COLORS.arv },
              {
                label: "Novation offer",
                value: novation.offer,
                color: COLORS.agent,
              },
              {
                label: "Cash offer (MAO)",
                value: wholesale.mao,
                color: COLORS.seller,
              },
              ...(askingPrice > 0
                ? [
                    {
                      label: "Seller asks",
                      value: askingPrice,
                      color: COLORS.asking,
                    },
                  ]
                : []),
            ]}
          />
          {novation.offer > wholesale.mao && (
            <p className="lr-note">
              Novation puts {money(novation.offer - wholesale.mao)} more in the
              seller&apos;s pocket than a cash offer, for a longer close while
              the house is sold on the market.
            </p>
          )}

          <div className="lr-two-col lr-strategies">
            <div className="lr-card">
              <p className="lr-card-title">Cash offer (wholesale)</p>
              <Donut parts={cashParts} total={wholesale.arv} />
              <PdfRow label="ARV" value={money(wholesale.arv)} />
              <PdfRow
                label={`− Buyer's profit (${inputs.buyersProfitPct}%)`}
                value={money(wholesale.buyersProfit)}
              />
              <PdfRow label="− Repairs" value={money(wholesale.repairs)} />
              <PdfRow
                label="− Your wholesale fee"
                value={money(wholesale.wholesaleFee)}
              />
              <PdfRow
                bold
                label="Max offer to seller"
                value={money(wholesale.mao)}
                tone={wholesale.mao >= 0 ? "positive" : "negative"}
              />
              <PdfRow
                label="Assign to your buyer at"
                value={money(wholesale.buyerPrice)}
              />
              <PdfRow
                label="Your profit"
                value={money(wholesale.wholesaleFee)}
                tone="positive"
              />
            </div>
            <div className="lr-card">
              <p className="lr-card-title">Novation</p>
              <Donut parts={novationParts} total={novation.arv} />
              <PdfRow
                label="ARV (sold on the market)"
                value={money(novation.arv)}
              />
              {NOVATION_RESERVE.map(({ key, label, pct }) => (
                <PdfRow
                  key={key}
                  label={`− ${label} (${pct}%)`}
                  value={money(novation[key])}
                />
              ))}
              <PdfRow label="− Repairs" value={money(novation.repairs)} />
              <PdfRow label="− Your fee" value={money(novation.wholesaleFee)} />
              <PdfRow
                bold
                label="Offer to seller"
                value={money(novation.offer)}
                tone={novation.offer >= 0 ? "positive" : "negative"}
              />
              <PdfRow
                label="Your profit"
                value={money(novation.wholesaleFee)}
                tone="positive"
              />
            </div>
          </div>
        </>
      ) : (
        <p className="lr-empty">
          Pick the work needed in the Analyze window to add the cash and
          novation numbers.
        </p>
      )}
    </DealPdfLayout>
  );
});

export default LeadReportPdf;
