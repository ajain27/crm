import { useState } from "react";
import { ExternalLink, Search, MapPin, Trash2 } from "lucide-react";
import Pagination from "../../../pagination/Pagination";

const CACHE_KEY = "findComps_cache";
const MAX_CACHE = 100;
const COMPS_PER_PAGE = 5;
const MAX_SUGGESTIONS = 8;

// Strip the API response down to only the fields rendered in the UI so each
// cache entry stays small and 50 results fit comfortably within localStorage's
// 5 MB quota. Storing the raw API payload (with extra metadata on every comp)
// caused silent quota failures that wiped the cache on each write.
function slimResult(data) {
  const sp = data.subjectProperty;
  return {
    price: data.price,
    priceRangeLow: data.priceRangeLow,
    priceRangeHigh: data.priceRangeHigh,
    subjectProperty: sp
      ? {
          formattedAddress: sp.formattedAddress,
          propertyType: sp.propertyType,
          bedrooms: sp.bedrooms,
          bathrooms: sp.bathrooms,
          squareFootage: sp.squareFootage,
          yearBuilt: sp.yearBuilt,
          lastSalePrice: sp.lastSalePrice,
        }
      : undefined,
    comparables: (data.comparables ?? []).map((c) => ({
      id: c.id,
      formattedAddress: c.formattedAddress,
      status: c.status,
      price: c.price,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      squareFootage: c.squareFootage,
      distance: c.distance,
      correlation: c.correlation,
    })),
  };
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
  } catch {
    return [];
  }
}

function readCache() {
  return loadCache();
}

function writeCache(searchAddress, data) {
  const slim = slimResult(data);
  const prev = loadCache();
  const filtered = prev.filter(
    (e) => e.address.toLowerCase() !== searchAddress.toLowerCase(),
  );
  const next = [
    {
      address: searchAddress,
      result: slim,
      searchedAt: new Date().toISOString(),
    },
    ...filtered,
  ].slice(0, MAX_CACHE);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Quota still exceeded even after slimming — evict the oldest half and retry.
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(next.slice(0, Math.ceil(MAX_CACHE / 2))),
      );
    } catch {}
  }
  return next;
}

function deleteFromCache(searchAddress) {
  const next = loadCache().filter(
    (e) => e.address.toLowerCase() !== searchAddress.toLowerCase(),
  );
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
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
      url: encoded
        ? `https://propwire.com/search?q=${encoded}`
        : "https://propwire.com",
    },
  ];
}

function FindCompsTab({ tab }) {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [compsPage, setCompsPage] = useState(1);

  function saveToCache(searchAddress, data) {
    writeCache(searchAddress, data);
  }

  function handleDeleteSuggestion(e, entryAddress) {
    e.preventDefault();
    e.stopPropagation();
    deleteFromCache(entryAddress);
    setSuggestions((prev) => prev.filter((s) => s.address !== entryAddress));
    if (
      status === "done" &&
      address.toLowerCase() === entryAddress.toLowerCase()
    ) {
      setResult(null);
      setStatus("idle");
    }
  }

  function handleAddressChange(e) {
    const value = e.target.value;
    setAddress(value);

    // Clear any displayed result when the user edits the address
    if (status === "done" || status === "error") {
      setResult(null);
      setStatus("idle");
      setErrorMsg("");
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const q = trimmed.toLowerCase();
    const matches = readCache()
      .filter((entry) => entry.address.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
    setSuggestions(matches);
  }

  function handleSelectSuggestion(entry) {
    setAddress(entry.address);
    setSuggestions([]);
    saveToCache(entry.address, entry.result);
    setResult(entry.result);
    setStatus("done");
    setCompsPage(1);
  }

  async function handleFindComps() {
    const trimmed = address.trim();
    if (!trimmed) return;

    setSuggestions([]);

    // Check cache for exact match before hitting the API
    const cached = readCache().find(
      (entry) => entry.address.toLowerCase() === trimmed.toLowerCase(),
    );
    if (cached) {
      saveToCache(cached.address, cached.result);
      setResult(cached.result);
      setStatus("done");
      setCompsPage(1);
      return;
    }

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const apiKey = import.meta.env.VITE_RENTCAST_API_KEY;
      const params = new URLSearchParams({ address: trimmed, compCount: 20 });
      const res = await fetch(
        `https://api.rentcast.io/v1/avm/value?${params}`,
        { headers: { "X-Api-Key": apiKey } },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      const data = await res.json();
      saveToCache(trimmed, data);
      setResult(data);
      setStatus("done");
      setCompsPage(1);
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
    setCompsPage(1);
    setSuggestions([]);
  }

  const encoded = encodeURIComponent(address.trim());
  const compLinks = getCompLinks(encoded);
  const sp = result?.subjectProperty;

  const comparables = result?.comparables ?? [];
  const compsTotalPages = Math.ceil(comparables.length / COMPS_PER_PAGE);
  const pagedComps = comparables.slice(
    (compsPage - 1) * COMPS_PER_PAGE,
    compsPage * COMPS_PER_PAGE,
  );

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
                  onChange={handleAddressChange}
                  onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSuggestions([]);
                    if (e.key === "Enter" && status !== "done")
                      handleFindComps();
                  }}
                  placeholder="e.g. 5500 Grand Lake Dr, San Antonio, TX 78244"
                  disabled={status === "loading"}
                />
              </div>

              {suggestions.length > 0 && (
                <ul className="find-comps-suggestions-list">
                  {suggestions.map((entry) => (
                    <li key={entry.address}>
                      <button
                        className="find-comps-recent-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(entry);
                        }}
                      >
                        <span className="find-comps-recent-address">
                          {entry.address}
                        </span>
                        <span className="find-comps-suggestion-meta">
                          {entry.result?.price != null && (
                            <span className="find-comps-recent-arv">
                              {fmt(entry.result.price)}
                            </span>
                          )}
                          <span
                            className="find-comps-suggestion-delete"
                            role="button"
                            aria-label={`Delete ${entry.address}`}
                            onMouseDown={(e) =>
                              handleDeleteSuggestion(e, entry.address)
                            }
                          >
                            <Trash2 size={13} />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              className="primary-btn find-comps-btn"
              type="button"
              onClick={handleFindComps}
              disabled={
                !address.trim() || status === "loading" || status === "done"
              }
            >
              <Search size={16} />
              {status === "loading" ? "Searching…" : "Find Comps"}
            </button>
          </div>
        </div>

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
                  <span className="find-comps-source-badge">{src.badge}</span>
                </div>
                <div className="find-comps-source-action">
                  <span>Open in {src.name}</span>
                  <ExternalLink size={14} />
                </div>
              </a>
            ))}
          </div>
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

            {comparables.length > 0 && (
              <div className="find-comps-table-wrap">
                <span className="find-comps-section-label">
                  Comparable Sales ({comparables.length})
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
                      {pagedComps.map((c) => (
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
                <Pagination
                  currentPage={compsPage}
                  totalPages={compsTotalPages}
                  setCurrentPage={setCompsPage}
                >
                  <span className="table-footer-count">
                    {comparables.length} comparable
                    {comparables.length !== 1 ? "s" : ""}
                  </span>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default FindCompsTab;
