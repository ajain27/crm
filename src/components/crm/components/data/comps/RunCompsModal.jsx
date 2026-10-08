import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Loader } from "lucide-react";
import Modal from "../../../../modal/Modal";
import { formatCompsNote, pricePerSqft, requestComps } from "./compsNote";

const money = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : "—";
const num = (n) =>
  typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "—";

const SOURCE_LABELS = {
  zillow: "Zillow",
  redfin: "Redfin",
  realtor: "Realtor.com",
};

// Runs comps for `address` as soon as it opens, shows the result, and
// hands the formatted note to `onSaveNote` (which adds it to the deal).
// `onApply` fills the deal's ARV and Sq Ft from the result.
export default function RunCompsModal({
  address,
  onSaveNote,
  onApply,
  onClose,
}) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Run once per open (React may mount effects twice in development).
    if (started.current) return;
    started.current = true;
    requestComps(address)
      .then(async (data) => {
        setResult(data);
        try {
          await onSaveNote(formatCompsNote(data));
          setNoteSaved(true);
        } catch {
          setError("Comps ran, but the note couldn't be saved to the deal.");
        }
      })
      .catch((err) => setError(err.message || "Running comps failed."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = !result && !error;
  const p = result?.property || {};

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Comps — ${address}`}
      className="run-comps-modal"
      style={{
        width: "min(860px, 96vw)",
        maxWidth: "min(860px, 96vw)",
        height: loading || !result ? "auto" : undefined,
      }}
      actions={
        <>
          {noteSaved && (
            <span className="run-comps-saved">
              <Check size={14} /> Saved to the deal's notes
            </span>
          )}
          {result && (result.arvEstimate || p.sqft) && (
            <button
              type="button"
              className="secondary-btn"
              disabled={applied}
              onClick={() => {
                onApply({ arv: result.arvEstimate, squareFootage: p.sqft });
                setApplied(true);
              }}
            >
              {applied ? "Filled in — Save Changes to keep" : "Use ARV & Sq Ft"}
            </button>
          )}
          <button type="button" className="primary-btn" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="run-comps-body">
        {loading && (
          <div className="run-comps-loading">
            <Loader className="loading-spinner" size={22} />
            <span>
              Searching Zillow, Redfin and Realtor.com and picking the best
              comps… this can take up to a minute.
            </span>
          </div>
        )}

        {error && <p className="run-comps-error">{error}</p>}

        {result && (
          <>
            <div className="run-comps-estimates">
              <div>
                <span>ARV estimate</span>
                <strong>{money(result.arvEstimate)}</strong>
              </div>
              <div>
                <span>Rent estimate</span>
                <strong>{money(result.rentEstimate)}/mo</strong>
              </div>
              <div>
                <span>Property</span>
                <strong>
                  {num(p.beds)} bd · {num(p.baths)} ba · {num(p.sqft)} sq ft
                </strong>
              </div>
              <div>
                <span>Built · Annual tax</span>
                <strong>
                  {p.yearBuilt ?? "—"} · {money(p.annualTax)}
                </strong>
              </div>
            </div>

            {result.summary && (
              <p className="run-comps-summary">{result.summary}</p>
            )}

            <h3 className="run-comps-heading">
              Top {result.topComps.length} comps
            </h3>
            {result.topComps.length === 0 ? (
              <p className="run-comps-muted">No comparable sales were found.</p>
            ) : (
              <ol className="run-comps-list">
                {result.topComps.map((comp, i) => {
                  const ppsf = pricePerSqft(comp);
                  return (
                    <li key={`${comp.address}-${i}`} className="run-comps-comp">
                      <div className="run-comps-comp-head">
                        <strong>{comp.address}</strong>
                        <span>{money(comp.price)}</span>
                      </div>
                      <div className="run-comps-muted">
                        {num(comp.beds)} bd · {num(comp.baths)} ba ·{" "}
                        {num(comp.sqft)} sq ft
                        {ppsf ? ` · ${money(ppsf)}/sq ft` : ""}
                        {comp.soldDate ? ` · sold ${comp.soldDate}` : ""}
                      </div>
                      {comp.reason && (
                        <div className="run-comps-reason">{comp.reason}</div>
                      )}
                      {comp.url && (
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="leads-mls-link"
                        >
                          <ExternalLink size={12} />
                          View on {comp.source}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="run-comps-sources">
              {Object.entries(SOURCE_LABELS).map(([key, label]) =>
                result.listingUrls?.[key] ? (
                  <a
                    key={key}
                    href={result.listingUrls[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="leads-mls-link"
                  >
                    <ExternalLink size={12} />
                    {label}
                  </a>
                ) : (
                  <span key={key} className="run-comps-muted">
                    {label}: {result.sourceErrors?.[key] || "not found"}
                  </span>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
