import { Search, RefreshCw, Mail } from "lucide-react";
import { Select } from "../../elements/elements";
import { useEffect, useRef, useState } from "react";

function BuyerFilters({
  filters,
  states,
  setFilters,
  selectedCount,
  onCompose,
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
          <button className="primary-btn buyer-compose-btn" onClick={onCompose}>
            <Mail size={16} /> Compose Email ({selectedCount})
          </button>
        )}
      </div>
    </section>
  );
}

export default BuyerFilters;
