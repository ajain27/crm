import { Search, RefreshCw, Mail, Trash2, X } from "lucide-react";
import { Select } from "../../elements/elements";
import { useEffect, useRef, useState } from "react";

function BuyerFilters({
  filters,
  states,
  setFilters,
  selectedCount,
  onCompose,
  onDeleteSelected,
}) {
  const [searchExpanded, setSearchExpanded] = useState(Boolean(filters.search));
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus();
    }
  }, [searchExpanded]);

  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      state: "All",
      realEstateType: "All",
      search: "",
    });
  };

  return (
    <section
      className="panel"
      data-reveal="right"
      style={{ "--reveal-delay": "180ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>Filter Buyer</h2>
        </div>
        <div className="search-container">
          <button
            type="button"
            className="search-icon-btn"
            onClick={() => {
              if (searchExpanded && filters.search) {
                searchInputRef.current?.focus();
                return;
              }
              setSearchExpanded((prev) => !prev);
            }}
            title="Search"
          >
            <Search size={18} />
          </button>
          {searchExpanded && (
            <div className="search-input-wrap">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input-expanded"
                id="buyer-search"
                name="search"
                placeholder="Search buyers by name, email, phone, city..."
                value={filters.search}
                onChange={handleFilter}
                onBlur={() => {
                  if (!filters.search) {
                    setSearchExpanded(false);
                  }
                }}
              />
              {filters.search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFilters((prev) => ({ ...prev, search: "" }));
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="filters">
        <Select
          label="Filter by State"
          name="state"
          value={filters.state}
          onChange={handleFilter}
          options={states}
        />
        <button className="secondary-btn" onClick={clearFilters}>
          <RefreshCw size={16} /> Clear Filters
        </button>
        {selectedCount > 0 && (
          <div className="buyer-bulk-actions">
            <button
              className="primary-btn buyer-compose-btn"
              onClick={onCompose}
            >
              <Mail size={16} /> Compose Email ({selectedCount})
            </button>
            <button
              className="danger-btn buyer-compose-btn"
              onClick={onDeleteSelected}
            >
              <Trash2 size={16} /> Delete ({selectedCount})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default BuyerFilters;
