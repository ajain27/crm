import { useEffect, useRef, useState } from "react";
import { requestPropertyHistory } from "../../services/propertyHistoryService";
import { historyToSave, leadHistory } from "./propertyHistory";
import { PriceHistory, PropertyHistory } from "./PropertyHistoryViews";

// The lead windows' Price History and Property History tabs. A lead's
// history comes with its comps run. Opening a lead that has none looks it
// up straight away, so it's always there; `onLoaded(leadId, history)`
// saves it to the lead right then (without it, Save Changes keeps it).
export function useLeadHistory({ lead, draft, setDraft, onLoaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // The lead the window shows, so a lookup that finishes after it moved
  // on to another lead is dropped.
  const leadIdRef = useRef(null);

  async function load(address = draft.address) {
    const where = String(address || "").trim();
    if (!where) return;
    const leadId = lead?.id ?? null;
    const current = () => leadIdRef.current === leadId;
    setLoading(true);
    setError("");
    try {
      const history = historyToSave(await requestPropertyHistory(where));
      if (!current()) return;
      setDraft((prev) => ({ ...prev, propertyHistory: history }));
      try {
        await onLoaded?.(leadId, history);
      } catch (err) {
        // Still on the draft, so Save Changes keeps it.
        console.warn("Couldn't save the property history:", err);
      }
    } catch (err) {
      if (current()) {
        setError(err.message || "Couldn't load the property history.");
      }
    } finally {
      if (current()) setLoading(false);
    }
  }

  useEffect(() => {
    leadIdRef.current = lead?.id ?? null;
    setError("");
    setLoading(false);
    if (lead && !leadHistory(lead) && String(lead.address || "").trim()) {
      load(lead.address);
    }
    // Only when the window opens on a lead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  return { history: leadHistory(draft), loading, error, load: () => load() };
}

const fetchedDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US") : null;

// `view` is "price" (every listing, price change and sale) or "property"
// (sales and tax years).
export function LeadHistoryTab({ view, historyState, address, disabled }) {
  const { history, loading, error, load } = historyState;
  const canLoad = Boolean(String(address || "").trim()) && !disabled;

  if (loading) {
    return (
      <div className="ldm-comps-empty">
        Reading the property's history from Zillow, Redfin and Realtor.com… this
        can take up to a minute.
      </div>
    );
  }
  if (!history) {
    return (
      <div className="ldm-comps-empty">
        {String(address || "").trim()
          ? "No history for this lead yet."
          : "Add an address to look up the property's history."}
        <button
          type="button"
          className="secondary-btn"
          onClick={load}
          disabled={!canLoad}
        >
          Load history
        </button>
        {error && <span className="ldm-history-error">{error}</span>}
      </div>
    );
  }
  return (
    <div className="ldm-history">
      <div className="ldm-history-head">
        <span className="ph-muted">
          From Zillow, Redfin and Realtor.com
          {fetchedDate(history.fetchedAt)
            ? ` · ${fetchedDate(history.fetchedAt)}`
            : ""}
        </span>
        <button
          type="button"
          className="ldm-notes-toggle"
          onClick={load}
          disabled={!canLoad}
        >
          Refresh
        </button>
      </div>
      {error && <p className="ldm-history-error">{error}</p>}
      {view === "price" ? (
        <PriceHistory history={history} />
      ) : (
        <PropertyHistory history={history} />
      )}
    </div>
  );
}
