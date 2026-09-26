import { useState } from "react";

// Search, extra filters, page and row selection for one lead list. Owned by
// PotentialLeads rather than the list itself so they survive switching tabs.
export function useLeadListState(initialFilters = {}) {
  const [search, setSearchValue] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Any change to what's shown starts back on page 1.
  function setSearch(value) {
    setSearchValue(value);
    setPage(1);
  }

  function setFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  }

  function clearFilters() {
    setSearchValue("");
    setFilters(initialFilters);
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search) || Object.values(filters).some(Boolean);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setManySelected(ids, selected) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (selected ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return {
    search,
    setSearch,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
    selectedIds,
    toggleSelected,
    setManySelected,
    clearSelection,
  };
}
