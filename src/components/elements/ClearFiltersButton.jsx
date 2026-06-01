import { RefreshCw } from "lucide-react";

export default function ClearFiltersButton({
  onClear,
  hasActiveFilters = true,
  label = "Clear Filters",
  iconSize = 14,
  className = "secondary-btn",
  title,
}) {
  const resolvedTitle =
    title ?? (hasActiveFilters ? "Clear all filters" : "No filters applied");
  return (
    <button
      type="button"
      className={`clear-filters-btn ${className}`.trim()}
      onClick={onClear}
      disabled={!hasActiveFilters}
      title={resolvedTitle}
    >
      <RefreshCw size={iconSize} />
      {label}
    </button>
  );
}
