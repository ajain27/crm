import { useState } from "react";
import { ExternalLink, Search, MapPin, Clock } from "lucide-react";

const CACHE_KEY = "findComps_cache";
const MAX_CACHE = 10;

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistCache(entries) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

const fmt = (n) => (n != null ? `$${Math.round(n).toLocaleString()}` : "—");

const statusColor = (s) => {
  if (!s) return "var(--muted)";
  if (s === "Active") return "#16a34a";
  if (s === "Sold" || s === "Inactive") return "#2563eb";
  if (s === "Pending") return "#d97706";
  return "var(--muted)";
};

function getCompLinks(encoded) {
  return [
    {
      name: "Propwire",
      badge: "Full History",
      url: `https://propwire.com/search?q=${encoded}`,
    },
  ];
}

function FindCompsTab({ tab }) {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cache, setCache] = useState(loadCache);

  function upsertCache(searchAddress, data) {
    setCache((prev) => {
      const filtered = prev.filter(
        (e) => e.address.toLowerCase() !== searchAddress.toLowerCase(),
      );
      const next = [
        {
          address: searchAddress,
          result: data,
          searchedAt: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, MAX_CACHE);
      persistCache(next);
      return next;
    });
  }

  async function handleFindComps() {
    if (!address.trim()) return;

    const trimmed = address.trim();

    // Serve from cache if available
    const cached = cache.find(
      (e) => e.address.toLowerCase() === trimmed.toLowerCase(),
    );
    if (cached) {
      upsertCache(cached.address, cached.result); // bump to top
      setResult(cached.result);
      setStatus("done");
      return;
    }

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const apiKey = import.meta.env.VITE_RENTCAST_API_KEY;
      const params = new URLSearchParams({ address: trimmed, compCount: 5 });
      const res = await fetch(
        `https://api.rentcast.io/v1/avm/value?${params}`,
        { headers: { "X-Api-Key": apiKey } },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      const data = await res.json();
      upsertCache(trimmed, data);
      setResult(data);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message || "Failed to fetch comps. Check your API key.");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setResult(null);
    setAddress("");
    setErrorMsg("");
  }

  function handleLoadRecent(entry) {
    setAddress(entry.address);
    setResult(entry.result);
    setStatus("done");
    upsertCache(entry.address, entry.result);
  }

  const encoded = encodeURIComponent(address.trim());
  const compLinks = getCompLinks(encoded);
  const sp = result?.subjectProperty;

  return (
    <>
      <div className="deal-analyzer-hero">
        <span className="deal-analyzer-eyebrow">{tab.eyebrow}</span>
        <h2>{tab.title}</h2>
        <p>{tab.description}</p>
      </div>

      <div
        className="deal-analyzer-cards"
        data-reveal-group
        style={{ "--reveal-delay": "120ms" }}
      >
        {tab.prompts.map((prompt) => (
          <article key={prompt} className="deal-analyzer-card">
            <strong>Review Focus</strong>
            <p>{prompt}</p>
          </article>
        ))}
      </div>

      <section
        className="deal-analyzer-form"
        data-reveal="left"
        style={{ "--reveal-delay": "160ms" }}
      >
        <div className="panel-header deal-analyzer-form-header">
          <div>
            <h2>Find Comparable Properties</h2>
            <p>
              Enter the full property address to get an ARV estimate and
              comparable sales from RentCast.
            </p>
          </div>
        </div>

        <div className="find-comps-search-section">
          <div className="find-comps-search-row">
            <div className="find-comps-input-wrap field">
              <span>Property Address</span>
              <div className="find-comps-input-inner">
                <MapPin size={16} className="find-comps-input-icon" />
                <input
                  type="text"
                  style={{ paddingLeft: "2.25rem" }}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (status === "done" || status === "error")
                      setStatus("idle");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleFindComps()}
                  placeholder="e.g. 5500 Grand Lake Dr, San Antonio, TX 78244"
                  disabled={status === "loading"}
                />
              </div>
            </div>
            <button
              className="primary-btn find-comps-btn"
              type="button"
              onClick={handleFindComps}
              disabled={!address.trim() || status === "loading"}
            >
              <Search size={16} />
              {status === "loading" ? "Searching…" : "Find Comps"}
            </button>
          </div>

          {/* Recent searches — shown only on idle with no typed address */}
          {status === "idle" && cache.length > 0 && !address.trim() && (
            <div className="find-comps-recent">
              <span className="find-comps-recent-label">
                <Clock size={12} />
                Recent searches
              </span>
              <ul className="find-comps-recent-list">
                {cache.map((entry) => (
                  <li key={entry.address}>
                    <button
                      className="find-comps-recent-item"
                      onClick={() => handleLoadRecent(entry)}
                    >
                      <span className="find-comps-recent-address">
                        {entry.address}
                      </span>
                      {entry.result?.price != null && (
                        <span className="find-comps-recent-arv">
                          {fmt(entry.result.price)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="find-comps-loader">
            <div className="find-comps-spinner" />
            <p className="find-comps-loader-msg">
              Fetching value estimate and comparables…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="find-comps-error">
            <p>{errorMsg}</p>
          </div>
        )}

        {status === "done" && result && (
          <div className="find-comps-results">
            <div className="find-comps-results-header">
              <span className="find-comps-results-label">Results for</span>
              <strong className="find-comps-results-address">
                {sp?.formattedAddress || address}
              </strong>
              <button className="find-comps-new-search" onClick={handleReset}>
                ← New search
              </button>
            </div>

            <div className="find-comps-arv-row">
              <div className="find-comps-arv-card find-comps-arv-main">
                <span>Estimated ARV</span>
                <strong>{fmt(result.price)}</strong>
              </div>
              <div className="find-comps-arv-card">
                <span>Low Estimate</span>
                <strong className="find-comps-muted">
                  {fmt(result.priceRangeLow)}
                </strong>
              </div>
              <div className="find-comps-arv-card">
                <span>High Estimate</span>
                <strong className="find-comps-muted">
                  {fmt(result.priceRangeHigh)}
                </strong>
              </div>
            </div>

            {sp && (
              <div className="find-comps-subject">
                <span className="find-comps-section-label">
                  Subject Property
                </span>
                <div className="find-comps-subject-grid">
                  {sp.propertyType && (
                    <div>
                      <span>Type</span>
                      <strong>{sp.propertyType}</strong>
                    </div>
                  )}
                  {sp.bedrooms != null && (
                    <div>
                      <span>Beds</span>
                      <strong>{sp.bedrooms}</strong>
                    </div>
                  )}
                  {sp.bathrooms != null && (
                    <div>
                      <span>Baths</span>
                      <strong>{sp.bathrooms}</strong>
                    </div>
                  )}
                  {sp.squareFootage != null && (
                    <div>
                      <span>Sq Ft</span>
                      <strong>{sp.squareFootage?.toLocaleString()}</strong>
                    </div>
                  )}
                  {sp.yearBuilt != null && (
                    <div>
                      <span>Year Built</span>
                      <strong>{sp.yearBuilt}</strong>
                    </div>
                  )}
                  {sp.lastSalePrice != null && (
                    <div>
                      <span>Last Sale</span>
                      <strong>{fmt(sp.lastSalePrice)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.comparables?.length > 0 && (
              <div className="find-comps-table-wrap">
                <span className="find-comps-section-label">
                  Comparable Sales ({result.comparables.length})
                </span>
                <div className="table-wrap">
                  <table className="compact-table find-comps-table">
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Price</th>
                        <th>Beds</th>
                        <th>Baths</th>
                        <th>Sq Ft</th>
                        <th>Distance</th>
                        <th>Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.comparables.map((c) => (
                        <tr key={c.id}>
                          <td className="find-comps-address-cell">
                            {c.formattedAddress}
                          </td>
                          <td>
                            <span
                              className="find-comps-status-badge"
                              style={{ color: statusColor(c.status) }}
                            >
                              {c.status || "—"}
                            </span>
                          </td>
                          <td>
                            <strong>{fmt(c.price)}</strong>
                          </td>
                          <td>{c.bedrooms ?? "—"}</td>
                          <td>{c.bathrooms ?? "—"}</td>
                          <td>
                            {c.squareFootage
                              ? c.squareFootage.toLocaleString()
                              : "—"}
                          </td>
                          <td>
                            {c.distance != null
                              ? `${c.distance.toFixed(2)} mi`
                              : "—"}
                          </td>
                          <td>
                            <span className="find-comps-correlation">
                              {c.correlation != null
                                ? `${Math.round(c.correlation * 100)}%`
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="find-comps-external">
              <span className="find-comps-section-label">
                Verify on External Sources
              </span>
              <div className="find-comps-sources-grid">
                {compLinks.map((src) => (
                  <a
                    key={src.name}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="find-comps-source-card"
                  >
                    <div className="find-comps-source-top">
                      <span className="find-comps-source-name">{src.name}</span>
                      <span className="find-comps-source-badge">
                        {src.badge}
                      </span>
                    </div>
                    <div className="find-comps-source-action">
                      <span>Open in {src.name}</span>
                      <ExternalLink size={14} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default FindCompsTab;
