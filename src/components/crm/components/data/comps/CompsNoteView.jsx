import { ExternalLink } from "lucide-react";
import { StreetViewButton } from "../../../../elements/StreetView";
import { splitCompsNotes } from "./compsNote";

const SOURCE_LABELS = {
  zillow: "Zillow",
  redfin: "Redfin",
  realtor: "Realtor.com",
};

function sourceLabel(url) {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const key = Object.keys(SOURCE_LABELS).find((k) => host.includes(k));
  return key ? SOURCE_LABELS[key] : host || "Listing";
}

// Links sit inside clickable rows — keep their clicks from opening the row.
function NoteLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="leads-mls-link"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={12} />
      {children}
    </a>
  );
}

function CompsNote({ comps }) {
  return (
    <div className="comps-note">
      <div className="run-comps-estimates">
        <div>
          <span>ARV estimate</span>
          <strong>{comps.arv}</strong>
        </div>
        <div>
          <span>Rent estimate</span>
          <strong>{comps.rent}/mo</strong>
        </div>
        {comps.property && (
          <div>
            <span>Property</span>
            <strong>{comps.property}</strong>
          </div>
        )}
      </div>

      {comps.summary && <p className="run-comps-summary">{comps.summary}</p>}

      <h3 className="run-comps-heading">
        {comps.comps.length === 0
          ? "No comps"
          : `Top ${comps.comps.length} comp${comps.comps.length === 1 ? "" : "s"}`}
        <span className="run-comps-method"> · run {comps.date}</span>
      </h3>
      {(comps.rules || comps.stats) && (
        <p className="run-comps-muted run-comps-rules">
          {comps.rules && (
            <>
              <strong>Rules:</strong> {comps.rules}
              <br />
            </>
          )}
          {comps.stats}
        </p>
      )}

      {comps.comps.length > 0 && (
        <ol className="run-comps-list">
          {comps.comps.map((comp, i) => (
            <li key={`${comp.address}-${i}`} className="run-comps-comp">
              <div className="run-comps-comp-head">
                <strong>{comp.address}</strong>
                <span>{comp.price}</span>
              </div>
              <div className="run-comps-muted">
                {comp.details}
                {comp.ppsf ? ` · ${comp.ppsf}/sq ft` : ""}
              </div>
              <div className="run-comps-links">
                {comp.url && (
                  <NoteLink href={comp.url}>
                    View on {sourceLabel(comp.url)}
                  </NoteLink>
                )}
                <StreetViewButton address={comp.address} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {(comps.method || comps.sources.length > 0) && (
        <div className="run-comps-sources">
          {comps.method && (
            <span className="run-comps-muted">{comps.method}</span>
          )}
          {comps.sources.map((url) => (
            <NoteLink key={url} href={url}>
              {sourceLabel(url)}
            </NoteLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Notes with any comps notes in them laid out like the comps window;
// everything else stays as written.
export default function CompsNoteView({ notes, className = "" }) {
  return (
    <div className={`comps-note-view ${className}`.trim()}>
      {splitCompsNotes(notes).map((seg, i) =>
        seg.type === "comps" ? (
          <CompsNote key={i} comps={seg.comps} />
        ) : (
          <p key={i} className="comps-note-text">
            {seg.text}
          </p>
        ),
      )}
    </div>
  );
}
