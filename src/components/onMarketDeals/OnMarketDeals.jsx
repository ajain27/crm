import { useRef, useState } from "react";
import {
  ExternalLink,
  ImageOff,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useAddressAutocomplete } from "../../hooks/useAddressAutocomplete";
import {
  requestListingDetails,
  requestMarketListings,
} from "../../services/marketListingsService";
import { requestComps } from "../../services/compsService";
import { compsResultToSave } from "../leads/comps/leadComps";
import { StreetViewButton } from "../elements/StreetView";
import Spinner from "../elements/Spinner";
import ListingDetailsModal from "./ListingDetailsModal";
import Pagination from "../pagination/Pagination";
import { usePagination } from "../pagination/usePagination";
import {
  DEFAULT_KEYWORDS,
  DEFAULT_MIN_DAYS,
  HOME_TYPES,
  SORTS,
  belowZestimate,
  cityKey,
  combineCityResults,
  keywordLabel,
  money,
  pricePerSqft,
  visibleListings,
} from "./marketDeals";
import "./OnMarketDeals.css";

// The chosen cities, keywords and settings, and each city's last results,
// are kept in this browser so the page opens as it was left. Each search
// costs Zillow scrapes, so a city's results are reused for a day unless
// refreshed.
const STORAGE_KEY = "onMarketDeals_v1";
const RESULTS_FRESH_MS = 24 * 60 * 60 * 1000;
// Searches running at once. Firecrawl's plan allows ~10 pages a minute, so
// a city's 17 searches pace themselves: a search turned away waits the
// seconds Firecrawl names and tries again.
const CONCURRENCY = 2;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(load, onWait) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load();
    } catch (err) {
      if (!err.retryAfter || attempt >= MAX_RETRIES) throw err;
      onWait(err.retryAfter);
      await sleep((err.retryAfter + 1) * 1000);
    }
  }
}

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const count = (n, suffix = "") =>
  typeof n === "number" && n > 0
    ? `${n.toLocaleString("en-US")}${suffix}`
    : null;

// Runs `tasks` (functions returning promises), `limit` at a time.
async function runLimited(tasks, limit, onDone) {
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const task = tasks[next++];
      await task();
      onDone();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

// A home's Zillow page details (photos, description, contacts) loaded when
// its window opens; kept for the most recent homes so reopening is free.
const MAX_SAVED_DETAILS = 80;
// The same for each home's comps run.
const MAX_SAVED_COMPS = 40;

// Zillow's home types as the comps rules name them.
const COMPS_TYPES = {
  SINGLE_FAMILY: "Single Family",
  MULTI_FAMILY: "Multi-Family",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
};

// A listing's facts as the comps API takes them.
function compsSubject(l) {
  return {
    propertyType: COMPS_TYPES[l.homeType] || null,
    beds: l.beds ?? null,
    baths: l.baths ?? null,
    sqft: l.sqft ?? null,
    yearBuilt: l.yearBuilt ?? null,
    valueEstimate: l.zestimate ?? null,
    rentEstimate: l.rentZestimate ?? null,
    annualTax: null,
  };
}

// Clicks on the card's own links and buttons don't open the window.
const INTERACTIVE = "a, button";

function ListingCard({ listing: l, onOpen }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const under = belowZestimate(l);
  const ppsf = pricePerSqft(l);
  const facts = [
    count(l.beds, " bd"),
    count(l.baths, " ba"),
    count(l.sqft, " sq ft"),
    count(l.lotSqft, " sq ft lot"),
    l.yearBuilt ? `built ${l.yearBuilt}` : null,
  ].filter(Boolean);
  const details = [
    ["Price / sq ft", ppsf ? money(ppsf) : "—"],
    ["Rent Zestimate", l.rentZestimate ? `${money(l.rentZestimate)}/mo` : "—"],
    ["Tax assessed", money(l.taxAssessedValue)],
    ["HOA", l.hoa ? `${money(l.hoa)}/mo` : "—"],
    ["Type", HOME_TYPES[l.homeType] || l.propertyType || "—"],
    ["MLS #", l.mls || "—"],
  ];
  return (
    <article
      className="omd-card"
      onClick={(e) => {
        if (!e.target.closest(INTERACTIVE)) onOpen(l);
      }}
    >
      <div className="omd-photo">
        {l.photo && !photoFailed ? (
          <img
            src={l.photo}
            alt={l.street || l.address}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div className="omd-photo-empty">
            <ImageOff size={22} />
            No photo
          </div>
        )}
        <span className="omd-days">{l.daysOnMarket} days on market</span>
        {l.saleType === "For sale by owner" && (
          <span className="omd-fsbo">For sale by owner</span>
        )}
      </div>
      <div className="omd-card-body">
        <div className="omd-price-row">
          <strong className="omd-price">{money(l.price)}</strong>
          {l.statusText && <span className="omd-status">{l.statusText}</span>}
        </div>
        {l.zestimate > 0 && (
          <div className="omd-zestimate">
            Zestimate {money(l.zestimate)}
            {under !== null && (
              <span className={under > 0 ? "omd-under" : "omd-over"}>
                {" · "}
                {Math.abs(Math.round(under * 100))}%{" "}
                {under > 0 ? "under" : "over"}
              </span>
            )}
          </div>
        )}
        <div className="omd-address">
          <span>{l.street || l.address}</span>
          <span className="omd-muted">
            {[l.city, [l.state, l.zip].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
        {facts.length > 0 && (
          <div className="omd-facts">{facts.join(" · ")}</div>
        )}
        <dl className="omd-details">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {l.broker && (
          <div className="omd-muted omd-broker">Listed by {l.broker}</div>
        )}
        <div className="omd-keywords" aria-label="Matched keywords">
          {l.keywords.map((k) => (
            <span key={k} className="omd-keyword">
              {keywordLabel(k)}
            </span>
          ))}
        </div>
        <div className="omd-links">
          <button
            type="button"
            className="omd-open-btn"
            onClick={() => onOpen(l)}
          >
            View details
          </button>
          {l.zillowUrl && (
            <a href={l.zillowUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} />
              Zillow
            </a>
          )}
          {l.redfinUrl && (
            <a href={l.redfinUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} />
              Redfin
            </a>
          )}
          <StreetViewButton
            address={l.address}
            location={
              l.lat != null && l.lng != null
                ? { lat: l.lat, lng: l.lng }
                : undefined
            }
          />
        </div>
      </div>
    </article>
  );
}

export default function OnMarketDeals() {
  const [saved] = useState(loadSaved);
  const [cities, setCities] = useState(saved.cities || []);
  const [keywords, setKeywords] = useState(saved.keywords || DEFAULT_KEYWORDS);
  const [minDays, setMinDays] = useState(saved.minDays ?? DEFAULT_MIN_DAYS);
  const [sort, setSort] = useState(saved.sort || "longest");
  const [results, setResults] = useState(saved.results || {});
  const [cityFilter, setCityFilter] = useState("all");
  const [cityInput, setCityInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [progress, setProgress] = useState(null);
  const [waitingUntil, setWaitingUntil] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState(saved.details || {});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [comps, setComps] = useState(saved.comps || {});
  const [compsLoadingId, setCompsLoadingId] = useState(null);
  const [compsError, setCompsError] = useState("");

  function persist(next) {
    save({
      cities,
      keywords,
      minDays,
      sort,
      results,
      details,
      comps,
      ...next,
    });
  }

  // Runs comps on the home (the Find Comps API) for its ARV and
  // comparable sales. The listing already has the home's facts and map
  // position, so they're passed in and the API skips reading its pages —
  // faster, no scraper requests, and the same answer each time.
  async function loadComps(listing) {
    if (!listing?.address) return;
    setCompsLoadingId(listing.id);
    setCompsError("");
    try {
      const result = await requestComps(
        listing.address,
        listing.lat != null && listing.lng != null
          ? {
              location: { lat: listing.lat, lng: listing.lng },
              subject: compsSubject(listing),
            }
          : null,
      );
      const entry = {
        // The history isn't shown here; leave it out of what's saved.
        result: { ...compsResultToSave(result), history: null },
        summary: result.summary || "",
      };
      setComps((prev) => {
        const next = Object.fromEntries(
          Object.entries({ ...prev, [listing.id]: entry }).slice(
            -MAX_SAVED_COMPS,
          ),
        );
        persist({ comps: next });
        return next;
      });
    } catch (err) {
      setCompsError(err.message || "Couldn't run comps for this home.");
    } finally {
      setCompsLoadingId((id) => (id === listing.id ? null : id));
    }
  }

  async function loadDetails(listing) {
    if (!listing?.zillowUrl) return;
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const loaded = await withRetry(
        () => requestListingDetails(listing.zillowUrl),
        () => {},
      );
      setDetails((prev) => {
        const next = Object.fromEntries(
          Object.entries({ ...prev, [listing.id]: loaded }).slice(
            -MAX_SAVED_DETAILS,
          ),
        );
        persist({ details: next });
        return next;
      });
    } catch (err) {
      setDetailsError(err.message || "Couldn't load this home's details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  const cityInputRef = useRef(null);
  useAddressAutocomplete(
    cityInputRef,
    ({ city, state }) => {
      if (!city || !state) return;
      setCityInput("");
      setCities((prev) => {
        if (prev.some((c) => cityKey(c) === cityKey({ city, state }))) {
          return prev;
        }
        const next = [...prev, { city, state }];
        persist({ cities: next });
        return next;
      });
    },
    { types: ["(cities)"] },
  );

  function removeCity(c) {
    const next = cities.filter((x) => cityKey(x) !== cityKey(c));
    setCities(next);
    if (cityFilter === cityKey(c)) setCityFilter("all");
    persist({ cities: next });
  }

  function addKeyword(e) {
    e.preventDefault();
    const k = keywordInput.trim().toLowerCase();
    if (!k || keywords.includes(k)) return;
    const next = [...keywords, k];
    setKeywords(next);
    setKeywordInput("");
    persist({ keywords: next });
  }

  function removeKeyword(k) {
    const next = keywords.filter((x) => x !== k);
    setKeywords(next);
    persist({ keywords: next });
  }

  const keywordsSig = [...keywords].sort().join("|");
  const isFresh = (c) => {
    const r = results[cityKey(c)];
    return (
      r &&
      r.keywordsSig === keywordsSig &&
      Date.now() - Date.parse(r.fetchedAt) < RESULTS_FRESH_MS
    );
  };

  // Searches each city (all of them when refreshing, else only those
  // without fresh results): Redfin once, Zillow once per keyword.
  async function findDeals(refresh = false) {
    const toSearch = cities.filter((c) => refresh || !isFresh(c));
    if (!toSearch.length || !keywords.length) return;
    setError("");
    const perCity = Object.fromEntries(
      toSearch.map((c) => [
        cityKey(c),
        { byKeyword: {}, redfin: [], failed: [] },
      ]),
    );
    const tasks = toSearch.flatMap((c) => {
      const bucket = perCity[cityKey(c)];
      return [
        () =>
          requestMarketListings({ ...c, redfin: true })
            .then((homes) => (bucket.redfin = homes))
            .catch(() => {}),
        ...keywords.map(
          (keyword) => () =>
            withRetry(
              () => requestMarketListings({ ...c, keyword }),
              (seconds) => setWaitingUntil(Date.now() + seconds * 1000),
            )
              .then((listings) => (bucket.byKeyword[keyword] = listings))
              .catch((err) =>
                bucket.failed.push({ keyword, message: err.message }),
              ),
        ),
      ];
    });
    setProgress({ done: 0, total: tasks.length });
    await runLimited(tasks, CONCURRENCY, () => {
      setWaitingUntil(null);
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    });
    setWaitingUntil(null);
    const fetchedAt = new Date().toISOString();
    const next = { ...results };
    toSearch.forEach((c) => {
      const { byKeyword, redfin, failed } = perCity[cityKey(c)];
      next[cityKey(c)] = {
        fetchedAt,
        keywordsSig,
        listings: combineCityResults(byKeyword, redfin),
        failed: failed.map((f) => f.keyword),
      };
    });
    const allFailed = toSearch.every(
      (c) => perCity[cityKey(c)].failed.length === keywords.length,
    );
    if (allFailed) {
      setError(
        perCity[cityKey(toSearch[0])].failed[0]?.message ||
          "Couldn't load listings. Try again in a minute.",
      );
    }
    setResults(next);
    setProgress(null);
    persist({ results: next });
  }

  const shownCities = cities.filter((c) => results[cityKey(c)]);
  const pooled = shownCities
    .filter((c) => cityFilter === "all" || cityKey(c) === cityFilter)
    .flatMap((c) => results[cityKey(c)].listings);
  const listings = visibleListings(pooled, { minDays, sort });
  const listingPages = usePagination(listings, {
    resetOn: [cityFilter, sort, minDays, results],
  });
  const openListing = openId
    ? shownCities
        .flatMap((c) => results[cityKey(c)].listings)
        .find((l) => l.id === openId) || null
    : null;

  function openDetails(listing) {
    setOpenId(listing.id);
    setDetailsError("");
    setCompsError("");
    if (!details[listing.id]) loadDetails(listing);
    if (!comps[listing.id]) loadComps(listing);
  }
  const countFor = (c) =>
    visibleListings(results[cityKey(c)]?.listings || [], {
      minDays,
      sort,
    }).length;
  const failedNotes = shownCities
    .filter((c) => results[cityKey(c)].failed?.length)
    .map(
      (c) =>
        `${c.city}: ${results[cityKey(c)].failed.map(keywordLabel).join(", ")}`,
    );
  const searching = progress !== null;
  const needsSearch = cities.some((c) => !isFresh(c));

  return (
    <>
      <header className="page-header" data-reveal="left">
        <div>
          <h1>On Market Deals</h1>
          <span>
            Homes for sale whose listing reads like an investor deal, on the
            market more than {minDays} days.
          </span>
        </div>
      </header>

      <section className="panel omd-setup" data-reveal="left">
        <div className="omd-field">
          <span className="omd-label">Markets</span>
          <div className="omd-input">
            <MapPin size={16} />
            <input
              ref={cityInputRef}
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Add a city, e.g. Pontiac, MI"
              aria-label="Add a city"
              disabled={searching}
            />
          </div>
          {cities.length > 0 && (
            <div className="omd-chips">
              {cities.map((c) => (
                <span key={cityKey(c)} className="omd-chip">
                  {c.city}, {c.state}
                  <button
                    type="button"
                    onClick={() => removeCity(c)}
                    aria-label={`Remove ${c.city}, ${c.state}`}
                    disabled={searching}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="omd-field">
          <span className="omd-label">
            Keywords in the listing{" "}
            <span className="omd-muted">
              (each is its own Zillow search; quotes match the exact phrase)
            </span>
          </span>
          <div className="omd-chips">
            {keywords.map((k) => (
              <span key={k} className="omd-chip omd-chip--keyword">
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  aria-label={`Remove ${keywordLabel(k)}`}
                  disabled={searching}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <form className="omd-keyword-add" onSubmit={addKeyword}>
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder='Add, e.g. "sweat equity"'
                aria-label="Add a keyword"
                disabled={searching}
              />
              <button
                type="submit"
                className="omd-icon-btn"
                aria-label="Add keyword"
                disabled={searching || !keywordInput.trim()}
              >
                <Plus size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="omd-actions">
          <label className="omd-days-input">
            On the market more than
            <input
              type="number"
              min="0"
              value={minDays}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                setMinDays(v);
                persist({ minDays: v });
              }}
            />
            days
          </label>
          <div className="omd-buttons">
            {shownCities.length > 0 && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => findDeals(true)}
                disabled={searching}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            )}
            <button
              type="button"
              className="primary-btn"
              onClick={() => findDeals(false)}
              disabled={
                searching || !cities.length || !keywords.length || !needsSearch
              }
            >
              {searching ? (
                <Spinner size="sm" decorative />
              ) : (
                <Search size={15} />
              )}
              {searching ? "Searching…" : "Find deals"}
            </button>
          </div>
        </div>

        {searching && (
          <div className="omd-progress">
            <div
              className="omd-progress-bar"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
            <Spinner
              size="sm"
              label={
                `Searching Zillow and Redfin… ${progress.done} of ${progress.total} searches` +
                (waitingUntil
                  ? " · pausing for the scraper's per-minute limit, then continuing"
                  : "")
              }
            />
          </div>
        )}
        {error && <p className="omd-error">{error}</p>}
      </section>

      {shownCities.length > 0 && (
        <section className="panel omd-results" data-reveal="left">
          <div className="omd-toolbar">
            <div className="omd-city-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={cityFilter === "all"}
                className={cityFilter === "all" ? "active" : ""}
                onClick={() => setCityFilter("all")}
              >
                All
                <span className="omd-tab-count">
                  {shownCities.reduce((n, c) => n + countFor(c), 0)}
                </span>
              </button>
              {shownCities.map((c) => (
                <button
                  key={cityKey(c)}
                  type="button"
                  role="tab"
                  aria-selected={cityFilter === cityKey(c)}
                  className={cityFilter === cityKey(c) ? "active" : ""}
                  onClick={() => setCityFilter(cityKey(c))}
                >
                  {c.city}, {c.state}
                  <span className="omd-tab-count">{countFor(c)}</span>
                </button>
              ))}
            </div>
            <label className="omd-sort">
              Sort
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  persist({ sort: e.target.value });
                }}
              >
                {Object.entries(SORTS).map(([id, { label }]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {failedNotes.length > 0 && (
            <p className="omd-muted omd-note">
              Some keyword searches didn't load — {failedNotes.join("; ")}.
              Refresh to try them again.
            </p>
          )}

          {listings.length ? (
            <>
              <div className="omd-grid">
                {listingPages.pageItems.map((l) => (
                  <ListingCard key={l.id} listing={l} onOpen={openDetails} />
                ))}
              </div>
              <Pagination
                currentPage={listingPages.page}
                totalPages={listingPages.totalPages}
                setCurrentPage={listingPages.setPage}
              >
                <span className="table-footer-count">
                  {listingPages.from}–{listingPages.to} of {listingPages.total}{" "}
                  {listingPages.total === 1 ? "home" : "homes"}
                </span>
              </Pagination>
            </>
          ) : (
            <p className="omd-empty">
              No listings with these keywords have been on the market more than{" "}
              {minDays} days.
            </p>
          )}
        </section>
      )}
      {openListing && (
        <ListingDetailsModal
          listing={openListing}
          detailsState={{
            details: details[openListing.id] || null,
            loading: detailsLoading,
            error: detailsError,
            retry: () => loadDetails(openListing),
          }}
          compsState={{
            saved: comps[openListing.id] || null,
            loading: compsLoadingId === openListing.id,
            error: compsError,
            retry: () => loadComps(openListing),
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
