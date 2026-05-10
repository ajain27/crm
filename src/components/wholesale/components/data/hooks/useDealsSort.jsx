import { useState, useEffect, useMemo } from "react";

export function useDealsSort(filteredDeals) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "closedDate", direction: "desc" });
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredDeals, sortConfig]);

  const sortedDeals = useMemo(() => {
    const getSortValue = (deal) => {
      switch (sortConfig.key) {
        case "listedPrice":
        case "arv":
        case "rehabCost":
        case "mao":
        case "contractPrice":
        case "assignedPrice":
          return Number(deal[sortConfig.key] || 0);
        case "grossRevenue":
          return Number(deal.assignedPrice || 0) - Number(deal.contractPrice || 0);
        case "offerDate":
          return deal.offerDate || "";
        case "closedDate":
          return deal.closedDate || "";
        default:
          return "";
      }
    };

    return [...filteredDeals].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      if (aValue === bValue) return 0;
      if (sortConfig.direction === "asc") return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredDeals, sortConfig]);

  const totalPages = Math.ceil(sortedDeals.length / itemsPerPage) || 1;
  const currentDeals = sortedDeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }

  function renderSortableHeader(label, key) {
    const isActive = sortConfig.key === key;
    const indicator = !isActive ? " ↕" : sortConfig.direction === "asc" ? " ↑" : " ↓";
    const ariaSort =
      sortConfig.key !== key
        ? "none"
        : sortConfig.direction === "asc"
          ? "ascending"
          : "descending";

    return (
      <th aria-sort={ariaSort}>
        <button
          type="button"
          className={`sort-header ${isActive ? "active" : ""}`}
          onClick={() => handleSort(key)}
        >
          {label}
          <span className="sort-indicator" aria-hidden="true">
            {indicator}
          </span>
        </button>
      </th>
    );
  }

  return { currentDeals, currentPage, setCurrentPage, totalPages, renderSortableHeader };
}
