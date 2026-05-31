import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDealsSort } from "./useDealsSort";

function makeDeals(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `d${i}`,
    arv: 100000 + i * 1000,
    contractPrice: 50000 + i * 500,
    assignedPrice: 75000 + i * 500,
    offerDate: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`,
    closedDate: `2025-02-${String((i % 28) + 1).padStart(2, "0")}`,
  }));
}

describe("useDealsSort", () => {
  it("paginates 10 deals per page", () => {
    const deals = makeDeals(25);
    const { result } = renderHook(() => useDealsSort(deals));
    expect(result.current.currentDeals).toHaveLength(10);
    expect(result.current.totalPages).toBe(3);
  });

  it("returns at least 1 page even with 0 deals", () => {
    const { result } = renderHook(() => useDealsSort([]));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentDeals).toHaveLength(0);
  });

  it("sorts by closedDate descending by default", () => {
    const deals = makeDeals(3);
    const { result } = renderHook(() => useDealsSort(deals));
    const dates = result.current.currentDeals.map((d) => d.closedDate);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("setCurrentPage moves to a later page", () => {
    const deals = makeDeals(25);
    const { result } = renderHook(() => useDealsSort(deals));
    act(() => result.current.setCurrentPage(2));
    expect(result.current.currentDeals).toHaveLength(10);
    expect(result.current.currentDeals[0].id).not.toBe("d0");
  });

  it("renderSortableHeader returns a th with aria-sort", () => {
    const deals = makeDeals(5);
    const { result } = renderHook(() => useDealsSort(deals));
    const node = result.current.renderSortableHeader("ARV", "arv");
    expect(node.type).toBe("th");
    expect(node.props["aria-sort"]).toBe("none");
  });
});
