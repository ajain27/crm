import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDealsFilter } from "./useDealsFilter";

const deals = [
  {
    id: "d1",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    propertyType: "Single Family",
    sellerAccepted: "Yes",
    offerStatus: "Offer Sent",
    assigned: "Yes",
    closed: "Yes",
    offerDate: "2025-04-12",
    closedDate: "2025-06-22",
    arv: 450000,
  },
  {
    id: "d2",
    address: "456 Oak Ave",
    city: "Dallas",
    state: "TX",
    propertyType: "Duplex",
    sellerAccepted: "Waiting",
    offerStatus: "Offer Sent",
    assigned: "No",
    closed: "No",
    offerDate: "2026-01-10",
    arv: 380000,
  },
  {
    id: "d3",
    address: "789 Pine Ln",
    city: "Phoenix",
    state: "AZ",
    propertyType: "Single Family",
    sellerAccepted: "No",
    offerStatus: "Not Sent",
    assigned: "No",
    closed: "No",
    offerDate: "",
    arv: 290000,
  },
];

describe("useDealsFilter", () => {
  it("returns all deals when no filters applied", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    expect(result.current.filteredDeals).toHaveLength(3);
  });

  it("derives unique sorted state list with 'All' first", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    expect(result.current.states).toEqual(["All", "AZ", "TX"]);
  });

  it("derives unique propertyType list", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    expect(result.current.propertyTypes).toContain("Single Family");
    expect(result.current.propertyTypes).toContain("Duplex");
  });

  it("derives year list from offerDate", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    expect(result.current.years).toEqual(["All", "2025", "2026"]);
  });

  it("filters by state", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    act(() => result.current.setFilters((p) => ({ ...p, state: "AZ" })));
    expect(result.current.filteredDeals).toHaveLength(1);
    expect(result.current.filteredDeals[0].id).toBe("d3");
  });

  it("filters by closed status", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    act(() => result.current.setFilters((p) => ({ ...p, closed: "Yes" })));
    expect(result.current.filteredDeals).toHaveLength(1);
    expect(result.current.filteredDeals[0].id).toBe("d1");
  });

  it("filters by year", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    act(() => result.current.setFilters((p) => ({ ...p, year: "2025" })));
    expect(result.current.filteredDeals).toHaveLength(1);
  });

  it("search matches multiple fields with multi-term AND", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    act(() =>
      result.current.setFilters((p) => ({ ...p, search: "main austin" })),
    );
    expect(result.current.filteredDeals).toHaveLength(1);
    expect(result.current.filteredDeals[0].address).toBe("123 Main St");
  });

  it("search matches currency-formatted numbers", () => {
    const { result } = renderHook(() => useDealsFilter({ deals }));
    act(() => result.current.setFilters((p) => ({ ...p, search: "$450,000" })));
    expect(result.current.filteredDeals).toHaveLength(1);
  });
});
