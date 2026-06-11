import { Search, Plus } from "lucide-react";
import { Select } from "../../../elements/elements";
import ClearFiltersButton from "../../../elements/ClearFiltersButton";
import { useState } from "react";

function Crm_filters({
  filters,
  states,
  propertyTypes,
  months,
  years,
  RefreshCw,
  setFilters,
}) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  return (
    <div>
      <section
        className="panel board-panel"
        data-reveal="right"
        style={{ "--reveal-delay": "180ms" }}
      >
        <div className="panel-header">
          <div>
            <h2>Filter Lead</h2>
          </div>
          <div className="search-container">
            <button
              type="button"
              className="search-icon-btn"
              onClick={() => setSearchExpanded(!searchExpanded)}
              title="Search"
            >
              <Search size={18} />
            </button>
            {searchExpanded && (
              <input
                autoFocus
                type="text"
                className="search-input-expanded"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                onBlur={() => {
                  if (!filters.search) {
                    setSearchExpanded(false);
                  }
                }}
                placeholder="Search Deals..."
              />
            )}
          </div>
        </div>
        <div className="filters">
          <Select
            label="State"
            value={filters.state}
            onChange={(e) =>
              setFilters({
                ...filters,
                state: e.target.value,
              })
            }
            options={states}
          />
          <Select
            label="Property Type"
            value={filters.propertyType}
            onChange={(e) =>
              setFilters({
                ...filters,
                propertyType: e.target.value,
              })
            }
            options={propertyTypes}
          />
          <Select
            label="Offer Sent In"
            value={filters.offerMonth}
            onChange={(e) =>
              setFilters({ ...filters, offerMonth: e.target.value })
            }
            options={months}
          />
          <Select
            label="Year"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            options={years}
          />
          <Select
            label="Offer Status"
            value={filters.offerStatus}
            onChange={(e) =>
              setFilters({ ...filters, offerStatus: e.target.value })
            }
            options={["All", "Not Sent", "Offer Sent", "Offer Withdrawn"]}
          />
          <Select
            label="Offer Accepted"
            value={filters.offerAccepted}
            onChange={(e) =>
              setFilters({ ...filters, offerAccepted: e.target.value })
            }
            options={["All", "No", "Waiting", "Yes"]}
          />
          <Select
            label="Assigned"
            value={filters.assigned}
            onChange={(e) =>
              setFilters({ ...filters, assigned: e.target.value })
            }
            options={["All", "No", "Yes"]}
          />
          <ClearFiltersButton
            onClear={() =>
              setFilters({
                state: "All",
                propertyType: "All",
                offerAccepted: "All",
                offerStatus: "All",
                assigned: "All",
                search: "",
                closed: "All",
                offerMonth: "All",
                closedMonth: "All",
                year: "All",
              })
            }
            hasActiveFilters={
              filters.state !== "All" ||
              filters.propertyType !== "All" ||
              filters.offerAccepted !== "All" ||
              filters.offerStatus !== "All" ||
              filters.assigned !== "All" ||
              filters.closed !== "All" ||
              filters.offerMonth !== "All" ||
              filters.year !== "All" ||
              Boolean(filters.search)
            }
            iconSize={16}
          />
        </div>
      </section>
    </div>
  );
}

export default Crm_filters;
