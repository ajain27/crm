import { useRef, useState } from "react";
import { ExternalLink, Search, MapPin, Trash2 } from "lucide-react";
import Pagination from "../../../pagination/Pagination";
import { useAddressAutocomplete } from "../../../../hooks/useAddressAutocomplete";
import { requestComps } from "../../../../services/compsService";
import { zillowUrl } from "../../../leads/leadUtils";
import { StreetViewButton } from "../../../elements/StreetView";
import SubjectAdjuster from "./SubjectAdjuster";
import {
  compsCriteriaText,
  compsStatsText,
} from "../../../crm/components/data/comps/compsNote";

// v3: comps that follow the comp rules (sold, 0.5 mi, 90 days, same
// beds/baths, built ±5 years). Searches saved under older keys used looser
// comps and are no longer read.
const CACHE_KEY = "findComps_cache_v3";
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
    rentEstimate: data.rentEstimate,
    valueEstimate: data.valueEstimate,
    summary: data.summary,
    criteria: data.criteria,
    location: data.location,
    subjectSources: data.subjectSources,
    adjusted: data.adjusted,
    stats: data.stats,
    method: data.method,
    listingUrls: data.listingUrls,
    subjectProperty: sp
      ? {
          formattedAddress: sp.formattedAddress,
          propertyType: sp.propertyType,
          bedrooms: sp.bedrooms,
          bathrooms: sp.bathrooms,
          squareFootage: sp.squareFootage,
          yearBuilt: sp.yearBuilt,
          annualTax: sp.annualTax,
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
      soldDate: c.soldDate,
      distance: c.distance,
      yearBuilt: c.yearBuilt,
      differs: c.differs,
      lat: c.lat,
      lng: c.lng,
      url: c.url,
      source: c.source,
    })),
  };
}

// /api/run-comps result → the shape this tab shows (and caches).
export function toFindCompsResult(api, address) {
  const p = api.property || {};
  return {
    price: api.arvEstimate,
    rentEstimate: api.rentEstimate ?? p.rentEstimate,
    valueEstimate: p.valueEstimate,
    summary: api.summary,
    criteria: api.criteria,
    location: api.location,
    subjectSources: api.subjectSources,
    adjusted: api.adjusted,
    stats: api.stats,
    method: api.method,
    listingUrls: api.listingUrls,
    subjectProperty: {
      formattedAddress: api.address || address,
      propertyType: p.propertyType,
      bedrooms: p.beds,
      bathrooms: p.baths,
      squareFootage: p.sqft,
      yearBuilt: p.yearBuilt,
      annualTax: p.annualTax,
    },
    comparables: (api.topComps || []).map((c, i) => ({
      id: `${i}-${c.address}`,
      formattedAddress: c.address,
      status: "Sold",
      price: c.price,
      bedrooms: c.beds,
      bathrooms: c.baths,
      squareFootage: c.sqft,
      soldDate: c.soldDate,
      distance: c.distance,
      yearBuilt: c.yearBuilt,
      differs: c.differs,
      lat: c.lat,
      lng: c.lng,
      url: c.url,
      source: c.source,
    })),
  };
}

const LISTING_SITES = [
  ["zillow", "Zillow"],
  ["redfin", "Redfin"],
  ["realtor", "Realtor.com"],
];

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

// The property on Zillow: its Zillow page once comps have found it,
// otherwise a Zillow search for the typed address (which lands on the
// property page when the address is a single home).
function propertyZillowUrl(address, result) {
  return (
    result?.listingUrls?.zillow ||
    zillowUrl(address) ||
    "https://www.zillow.com"
  );
}

function FindCompsTab({ tab }) {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [compsPage, setCompsPage] = useState(1);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState("");

  const addressInputRef = useRef(null);
  useAddressAutocomplete(addressInputRef, ({ formatted }) => {
    setAddress(formatted);
    setSuggestions([]);
    if (status === "done" || status === "error") {
      setResult(null);
      setStatus("idle");
      setErrorMsg("");
    }
  });

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
      const data = toFindCompsResult(await requestComps(trimmed), trimmed);
      saveToCache(trimmed, data);
      setResult(data);
      setStatus("done");
      setCompsPage(1);
    } catch (err) {
      setErrorMsg(err.message || "Failed to fetch comps.");
      setStatus("error");
    }
  }

  // Re-applies the comp rules with corrected subject facts. The location,
  // the sites' pages and what each site said carry over from the search.
  async function handleAdjust(facts) {
    setRerunning(true);
    setRerunError("");
    try {
      const sp = result.subjectProperty || {};
      const api = await requestComps(address.trim(), {
        location: result.location,
        subject: {
          ...facts,
          valueEstimate: result.valueEstimate,
          rentEstimate: result.rentEstimate,
          annualTax: sp.annualTax,
        },
      });
      const next = {
        ...toFindCompsResult(api, address.trim()),
        listingUrls: result.listingUrls,
        subjectSources: result.subjectSources,
      };
      next.subjectProperty.formattedAddress = sp.formattedAddress;
      saveToCache(address.trim(), next);
      setResult(next);
      setCompsPage(1);
    } catch (err) {
      setRerunError(err.message || "Couldn't re-run comps.");
    } finally {
      setRerunning(false);
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

  const zillowLink = propertyZillowUrl(address.trim(), result);
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
              Enter the full property address to get an ARV estimate and the
              best comparable sales from Zillow, Redfin and Realtor.com.
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
                  ref={addressInputRef}
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

        {/* Only once there's an address to look up. */}
        {address.trim() && (
          <div className="find-comps-external">
            <span className="find-comps-external-label">View property:</span>
            <a
              href={zillowLink}
              target="_blank"
              rel="noopener noreferrer"
              className="find-comps-external-link"
              aria-label="Open this property in Zillow"
            >
              <ExternalLink size={13} />
              Zillow
            </a>
            {/* The property's other pages, once a search has found them. */}
            {LISTING_SITES.filter(
              ([key]) => key !== "zillow" && result?.listingUrls?.[key],
            ).map(([key, label]) => (
              <a
                key={key}
                href={result.listingUrls[key]}
                target="_blank"
                rel="noopener noreferrer"
                className="find-comps-external-link"
              >
                <ExternalLink size={13} />
                {label}
              </a>
            ))}
            <StreetViewButton
              address={address.trim()}
              location={result?.location}
              className="find-comps-external-link"
            />
          </div>
        )}

        {status === "loading" && (
          <div className="find-comps-loader">
            <div className="find-comps-spinner" />
            <p className="find-comps-loader-msg">
              Searching Zillow, Redfin and Realtor.com and picking the best
              comps… this can take up to a minute.
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
                <span>Rent Estimate</span>
                <strong className="find-comps-muted">
                  {result.rentEstimate != null
                    ? `${fmt(result.rentEstimate)}/mo`
                    : "—"}
                </strong>
              </div>
              <div className="find-comps-arv-card">
                <span>Online Value Estimate</span>
                <strong className="find-comps-muted">
                  {fmt(result.valueEstimate)}
                </strong>
              </div>
            </div>

            {sp && (
              <SubjectAdjuster
                subject={sp}
                sources={result.subjectSources}
                busy={rerunning}
                error={rerunError}
                onRerun={handleAdjust}
              />
            )}

            {result.summary && (
              <p className="find-comps-summary">
                {result.summary}{" "}
                {comparables.length > 0 && (
                  <span className="find-comps-muted">
                    {result.method === "openai"
                      ? "(Comps reviewed and picked by AI.)"
                      : "(Closest comps first.)"}
                  </span>
                )}
              </p>
            )}

            {result.criteria && (
              <p className="find-comps-rules find-comps-muted">
                <strong>Rules:</strong> {compsCriteriaText(result)}
                <br />
                {compsStatsText(result)}
              </p>
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
                        <th>Built</th>
                        <th>Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedComps.map((c) => (
                        <tr key={c.id}>
                          <td className="find-comps-address-cell">
                            {c.url ? (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={
                                  c.source ? `View on ${c.source}` : undefined
                                }
                              >
                                {c.formattedAddress}
                              </a>
                            ) : (
                              c.formattedAddress
                            )}
                            {c.differs && (
                              <span className="find-comps-differs">
                                {c.differs}
                              </span>
                            )}
                            <StreetViewButton
                              compact
                              address={c.formattedAddress}
                              location={
                                c.lat != null && c.lng != null
                                  ? { lat: c.lat, lng: c.lng }
                                  : undefined
                              }
                            />
                          </td>
                          <td>
                            <span
                              className="find-comps-status-badge"
                              style={{ color: statusColor(c.status) }}
                            >
                              {c.status || "—"}
                              {c.soldDate ? ` ${c.soldDate}` : ""}
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
                          <td>{c.yearBuilt ?? "—"}</td>
                          <td>
                            {typeof c.distance === "number"
                              ? `${c.distance} mi`
                              : "—"}
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
