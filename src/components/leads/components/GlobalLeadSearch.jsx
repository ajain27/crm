import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import {
  fetchCountyRecordImports,
  fetchCountyRecordRows,
} from "../../../firebase/firestoreService";
import { displayPhone } from "../../../utils/utils";
import { listName } from "../countyRecords/CountyRecords";
import {
  SEARCH_GROUPS,
  searchCountyRecords,
  searchLeads,
} from "../globalSearch";

// Results shown per group; the rest are counted.
const GROUP_LIMIT = 8;
// County lists are re-read when the search is used again after this long.
const COUNTY_REFRESH_MS = 60_000;

// The County Records lists (hidden ones aside) with their rows, for
// searching. Loaded when the search is first used, not with the page.
function useCountyLists(userId, enabled) {
  const [lists, setLists] = useState([]);
  const [status, setStatus] = useState("idle");
  const loadedAt = useRef(0);

  function load() {
    if (!enabled || !userId || status === "loading") return;
    if (Date.now() - loadedAt.current < COUNTY_REFRESH_MS) return;
    loadedAt.current = Date.now();
    setStatus("loading");
    fetchCountyRecordImports(userId)
      .then((imports) =>
        Promise.all(
          imports
            .filter((i) => !i.hidden)
            .map(async (i) => ({
              id: i.id,
              name: listName(i),
              columns: i.columns || [],
              deletedRows: i.deletedRows || [],
              rows: await fetchCountyRecordRows(i.id),
            })),
        ),
      )
      .then((loaded) => {
        setLists(loaded);
        setStatus("done");
      })
      .catch(() => {
        loadedAt.current = 0;
        setStatus("error");
      });
  }

  return { lists, status, load };
}

// One search box for every lead list: Residential, Commercial, PPC, PPL,
// Cold Calling and County Records. Matches show grouped by list; picking
// one opens it (`onOpenLead(lead)`, `onOpenCountyRecord({ importId,
// rowIndex })`).
export default function GlobalLeadSearch({
  leads,
  currentUser,
  includeCountyRecords = true,
  onOpenLead,
  onOpenCountyRecord,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim());
  const county = useCountyLists(currentUser?.id, includeCountyRecords);
  const wrapRef = useRef(null);

  // Closes on a click outside.
  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  const results = deferredQuery
    ? [
        ...searchLeads(leads, deferredQuery),
        ...searchCountyRecords(county.lists, deferredQuery),
      ]
    : [];
  const groups = SEARCH_GROUPS.map((group) => ({
    ...group,
    items: results.filter((r) => r.group === group.id),
  })).filter((group) => group.items.length > 0);

  function pick(result) {
    setOpen(false);
    if (result.group === "county") {
      onOpenCountyRecord({
        importId: result.importId,
        rowIndex: result.rowIndex,
      });
    } else {
      onOpenLead(result.lead);
    }
  }

  return (
    <div className="global-search" ref={wrapRef}>
      <div className="global-search-box">
        <Search size={14} className="global-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="global-search-input"
          placeholder="Search all leads by anything: name, address, phone, notes…"
          aria-label="Search all leads"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            county.load();
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
            county.load();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {query && (
          <button
            type="button"
            className="global-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && deferredQuery && (
        <div className="global-search-results" role="listbox">
          {groups.length === 0 && (
            <p className="global-search-empty">
              {county.status === "loading"
                ? "Searching…"
                : `No leads match "${deferredQuery}".`}
            </p>
          )}
          {groups.map((group) => (
            <section key={group.id} className="global-search-group">
              <h4 className="global-search-group-title">
                {group.label}
                <span className="global-search-count">
                  {group.items.length}
                </span>
              </h4>
              {group.items.slice(0, GROUP_LIMIT).map((result) => (
                <button
                  key={result.key}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="global-search-item"
                  onClick={() => pick(result)}
                >
                  <span className="global-search-name">
                    {result.name || result.address || "Unnamed lead"}
                    {result.listName && (
                      <span className="global-search-list">
                        {result.listName}
                      </span>
                    )}
                  </span>
                  <span className="global-search-meta">
                    {[
                      result.name ? result.address : "",
                      result.phones.map(displayPhone).join(", "),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              ))}
              {group.items.length > GROUP_LIMIT && (
                <p className="global-search-more">
                  {group.items.length - GROUP_LIMIT} more — keep typing to
                  narrow it down.
                </p>
              )}
            </section>
          ))}
          {county.status === "loading" && groups.length > 0 && (
            <p className="global-search-more">Searching County Records…</p>
          )}
          {county.status === "error" && (
            <p className="global-search-more">
              Couldn&apos;t search County Records. Check your connection.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
