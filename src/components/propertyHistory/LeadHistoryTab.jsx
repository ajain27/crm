import { useEffect, useState } from "react";
import { requestPropertyHistory } from "../../services/propertyHistoryService";
import { historyToSave, leadHistory } from "./propertyHistory";
import { PriceHistory, PropertyHistory } from "./PropertyHistoryViews";

// The lead windows' Price History and Property History tabs. A lead's
// history comes with its comps run; without one it can be loaded on its
// own, onto the draft (Save Changes keeps it, like comps).
export function useLeadHistory({ lead, draft, setDraft }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
  }, [lead]);

  async function load() {
    const address = String(draft.address || "").trim();
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const data = await requestPropertyHistory(address);
      setDraft((prev) => ({ ...prev, propertyHistory: historyToSave(data) }));
    } catch (err) {
      setError(err.message || "Couldn't load the property history.");
    } finally {
      setLoading(false);
    }
  }

  return { history: leadHistory(draft), loading, error, load };
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
