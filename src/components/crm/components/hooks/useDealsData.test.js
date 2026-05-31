import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const fetchDeals = vi.fn();
const deleteDealById = vi.fn();

vi.mock("../../../../firebase/firestoreService", () => ({
  fetchDeals: (...args) => fetchDeals(...args),
  deleteDealById: (...args) => deleteDealById(...args),
}));

const { useDealsData } = await import("./useDealsData");

beforeEach(() => {
  fetchDeals.mockReset();
  deleteDealById.mockReset();
  vi.spyOn(global, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("useDealsData", () => {
  it("sets deals=[] and isLoading=false when no user is signed in", async () => {
    const { result } = renderHook(() => useDealsData({ currentUser: null }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.deals).toEqual([]);
  });

  it("loads deals from firestore for the current user", async () => {
    fetchDeals.mockResolvedValue([{ id: "d1", address: "1 Main" }]);
    const { result } = renderHook(() =>
      useDealsData({ currentUser: { id: "u1" } }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchDeals).toHaveBeenCalledWith("u1");
    expect(result.current.deals).toHaveLength(1);
  });

  it("captures errorMessage on fetch failure", async () => {
    fetchDeals.mockRejectedValue(new Error("net"));
    const { result } = renderHook(() =>
      useDealsData({ currentUser: { id: "u1" } }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.errorMessage).toMatch(/Unable to load deals/);
  });

  it("deleteDeal removes the deal after user confirms", async () => {
    fetchDeals.mockResolvedValue([{ id: "d1", address: "1 Main" }]);
    deleteDealById.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDealsData({ currentUser: { id: "u1" } }),
    );
    await waitFor(() => expect(result.current.deals).toHaveLength(1));
    await act(async () => {
      await result.current.deleteDeal("d1");
    });
    expect(deleteDealById).toHaveBeenCalledWith("d1");
    expect(result.current.deals).toHaveLength(0);
  });

  it("deleteDeal does nothing when user cancels confirm", async () => {
    fetchDeals.mockResolvedValue([{ id: "d1", address: "1 Main" }]);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() =>
      useDealsData({ currentUser: { id: "u1" } }),
    );
    await waitFor(() => expect(result.current.deals).toHaveLength(1));
    await act(async () => {
      await result.current.deleteDeal("d1");
    });
    expect(deleteDealById).not.toHaveBeenCalled();
    expect(result.current.deals).toHaveLength(1);
  });

  it("persist replaces deals array", async () => {
    fetchDeals.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useDealsData({ currentUser: { id: "u1" } }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.persist([{ id: "new", address: "X" }]));
    expect(result.current.deals).toHaveLength(1);
  });
});
