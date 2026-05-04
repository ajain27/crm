import { Search, Plus } from "lucide-react";
import { Select } from "../../elements";
import { useState } from "react";

function Wholesale_filters({
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
      <section className="panel board-panel">
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
            label="Closed In"
            value={filters.closedMonth}
            onChange={(e) =>
              setFilters({ ...filters, closedMonth: e.target.value })
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
            options={["All", "Offer Sent", "Rejected", "Accepted"]}
          />
          <Select
            label="Accepted"
            value={filters.sellerAccepted}
            onChange={(e) =>
              setFilters({ ...filters, sellerAccepted: e.target.value })
            }
            options={["All", "No", "Maybe", "Yes"]}
          />
          <Select
            label="Assigned"
            value={filters.assigned}
            onChange={(e) =>
              setFilters({ ...filters, assigned: e.target.value })
            }
            options={["All", "No", "Yes"]}
          />
          <button
            className="secondary-btn"
            onClick={() =>
              setFilters({
                state: "All",
                propertyType: "All",
                offerStatus: "All",
                sellerAccepted: "All",
                assigned: "All",
                search: "",
                closed: "All",
                offerMonth: "All",
                closedMonth: "All",
                year: "All",
              })
            }
          >
            <RefreshCw size={16} /> Clear Filters
          </button>
        </div>
      </section>
    </div>
  );
}

export default Wholesale_filters;
