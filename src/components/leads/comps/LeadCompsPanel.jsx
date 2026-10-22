import { useEffect, useRef, useState } from "react";
import { ExternalLink, Home } from "lucide-react";
import { StreetViewButton } from "../../elements/StreetView";
import CompsMap from "./CompsMap";
import { medianPricePerSqft } from "./leadComps";
import "./LeadComps.css";

const money = (n) =>
  typeof n === "number" && Number.isFinite(n) && n > 0
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";
const num = (n) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "—";
const parseMoney = (text) => {
  const n = Number(String(text || "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "123 Main St, Dallas, TX 75201" → ["123 Main St", "Dallas, TX 75201"]
function addressLines(address) {
  const [street, ...rest] = String(address || "")
    .replace(/, USA$/, "")
    .split(",");
  return [street.trim(), rest.join(",").trim()];
}

// "2026-09-30" → "9/30/26"
function shortDate(date) {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1].slice(2)}` : date || "";
}

function Stat({ label, value, suffix }) {
  return (
    <div className="lcp-stat">
      <span>{label}</span>
      <strong>
        {value}
        {suffix && value !== "—" && <small>{suffix}</small>}
      </strong>
    </div>
  );
}

function location(home) {
  return home.lat != null && home.lng != null
    ? { lat: home.lat, lng: home.lng }
    : undefined;
}

function PropertyCell({ home, isSubject }) {
  const [street, rest] = addressLines(home.address);
  return (
    <td>
      <div className="lcp-property">
        <span className={`lcp-thumb ${isSubject ? "is-subject" : ""}`}>
          <Home size={14} />
        </span>
        <span className="lcp-address">
          <span className="lcp-street">
            {street}
            {isSubject && <span className="lcp-subject-badge">Subject</span>}
          </span>
          <span className="lcp-city">
            {rest}
            {home.url && (
              <a
                href={home.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lcp-icon-link"
                title="View listing"
                aria-label={`View listing for ${street}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} />
              </a>
            )}
            <StreetViewButton
              address={home.address}
              location={location(home)}
              compact
            />
          </span>
        </span>
      </div>
    </td>
  );
}

// The lead's comps, laid out like a valuation report: headline figures,
// then the comps table beside a map of them. Clicking a row highlights
// its pin and clicking a pin highlights its row.
export default function LeadCompsPanel({ comps, lead }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const rowRefs = useRef(new Map());

  useEffect(() => {
    rowRefs.current
      .get(selectedKey)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedKey]);

  const ppsf = medianPricePerSqft(comps.comps);
  const subject = { ...comps.subject, key: "subject", kind: "subject" };
  const rows = comps.comps.map((c, i) => ({
    ...c,
    key: `comp-${i}`,
    kind: "comp",
  }));
  const points = [subject, ...rows].filter((p) => p.address);

  function select(key) {
    setSelectedKey((current) => (current === key ? null : key));
  }

  return (
    <div className="lcp">
      <div className="lcp-stats">
        <Stat
          label="After repair value"
          value={money(parseMoney(lead.arv) ?? comps.arv)}
        />
        <Stat
          label="Asking price"
          value={money(parseMoney(lead.askingPrice))}
        />
        <Stat label="Median price / sq ft" value={money(ppsf)} />
        <Stat label="Rent estimate" value={money(comps.rent)} suffix="/mo" />
      </div>

      <div className="lcp-main">
        <div className="lcp-table-wrap">
          <table className="lcp-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Dist.</th>
                <th>Bd</th>
                <th>Ba</th>
                <th>Sq ft</th>
                <th>Built</th>
                <th>$/sq ft</th>
                <th className="lcp-right">Last sale</th>
              </tr>
            </thead>
            <tbody>
              {[subject, ...rows].map((home) => {
                const isSubject = home.kind === "subject";
                const perSqft =
                  home.price > 0 && home.sqft > 0
                    ? home.price / home.sqft
                    : null;
                return (
                  <tr
                    key={home.key}
                    ref={(el) => {
                      if (el) rowRefs.current.set(home.key, el);
                      else rowRefs.current.delete(home.key);
                    }}
                    className={[
                      isSubject ? "is-subject" : "",
                      selectedKey === home.key ? "is-selected" : "",
                    ].join(" ")}
                    onClick={() => select(home.key)}
                    aria-selected={selectedKey === home.key}
                  >
                    <PropertyCell home={home} isSubject={isSubject} />
                    <td>
                      {isSubject
                        ? "—"
                        : home.distance != null
                          ? `${home.distance} mi`
                          : "—"}
                    </td>
                    <td>{num(home.beds)}</td>
                    <td>{num(home.baths)}</td>
                    <td>{num(home.sqft)}</td>
                    <td>{home.yearBuilt ?? "—"}</td>
                    <td>{money(perSqft)}</td>
                    <td className="lcp-right">
                      {isSubject ? (
                        <span className="lcp-muted">—</span>
                      ) : (
                        <>
                          <strong>{money(home.price)}</strong>
                          {home.soldDate && (
                            <span className="lcp-muted lcp-sold">
                              Sold on {shortDate(home.soldDate)}
                            </span>
                          )}
                        </>
                      )}
                      {home.differs && (
                        <span
                          className="lcp-differs"
                          title={`Outside the comp rules: ${home.differs}`}
                        >
                          {home.differs}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="lcp-muted lcp-empty">No homes sold nearby.</p>
          )}
          {comps.date && (
            <p className="lcp-muted lcp-footnote">Comps run {comps.date}</p>
          )}
        </div>

        <CompsMap points={points} selectedKey={selectedKey} onSelect={select} />
      </div>
    </div>
  );
}
