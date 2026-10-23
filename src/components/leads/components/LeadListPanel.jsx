import { Search } from "lucide-react";
import ClearFiltersButton from "../../elements/ClearFiltersButton";
import Pagination from "../../pagination/Pagination";
import { paginate, pluralizeLeads } from "../leadUtils";
import ResizableTable from "../../elements/ResizableTable";

export function LeadSearchInput({ value, onChange, placeholder }) {
  return (
    <div className="leads-search-wrap">
      <Search size={13} className="leads-search-icon" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="leads-search-input"
      />
    </div>
  );
}

export function LeadClearFilters({ listState }) {
  return (
    <ClearFiltersButton
      onClear={listState.clearFilters}
      hasActiveFilters={listState.hasActiveFilters}
      className="leads-clear-filters"
      iconSize={13}
    />
  );
}

// The panel every lead list shares: title + "X of Y leads" count, a filter
// bar, empty states, the table and pagination. `children` is a render
// function given the current page's leads; it returns the <thead>/<tbody>.
// Columns can be resized by dragging their header edges; widths are
// remembered under `resizeKey` (the title by default).
export default function LeadListPanel({
  title,
  totalCount,
  filteredLeads,
  listState,
  filters,
  statusMessage,
  noLeadsSubtitle,
  noLeadsMessage,
  noMatchMessage = "No leads match the current search.",
  revealDelay = "80ms",
  resizeKey,
  children,
}) {
  const { pageItems, totalPages, page, summary } = paginate(
    filteredLeads,
    listState.page,
  );

  return (
    <section
      className="panel leads-list-panel"
      data-reveal="left"
      style={{ "--reveal-delay": revealDelay }}
    >
      <div className="panel-header leads-list-header">
        <div>
          <h2>{title}</h2>
          <p>
            {totalCount === 0
              ? noLeadsSubtitle
              : `${filteredLeads.length} of ${totalCount} ${pluralizeLeads(totalCount)}`}
          </p>
        </div>
        <div className="leads-filters">{filters}</div>
      </div>
      {statusMessage && <p className="leads-sync-status">{statusMessage}</p>}

      {totalCount === 0 ? (
        <div className="leads-empty">
          <p>{noLeadsMessage}</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="leads-empty">
          <p>{noMatchMessage}</p>
        </div>
      ) : (
        <>
          <div
            className="table-wrap leads-table-wrap acc-card-container"
            style={{ overflowX: "auto" }}
          >
            <ResizableTable
              resizeKey={resizeKey || title}
              className="compact-table leads-table acc-card"
            >
              {children(pageItems)}
            </ResizableTable>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            setCurrentPage={listState.setPage}
          >
            <span className="pagination-summary">{summary}</span>
          </Pagination>
        </>
      )}
    </section>
  );
}
