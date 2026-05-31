import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBuyerEdit } from "./useBuyerEdit";

describe("useBuyerEdit", () => {
  it("starts with nothing being edited", () => {
    const { result } = renderHook(() => useBuyerEdit({ updateDeal: vi.fn() }));
    expect(result.current.editingBuyerId).toBeNull();
    expect(result.current.editingBuyerField).toBeNull();
    expect(result.current.editBuyerValue).toBe("");
  });

  it("startEditingBuyer seeds id, field, and value from the deal", () => {
    const { result } = renderHook(() => useBuyerEdit({ updateDeal: vi.fn() }));
    act(() =>
      result.current.startEditingBuyer(
        { id: "d1", buyerName: "Jane" },
        "buyerName",
      ),
    );
    expect(result.current.editingBuyerId).toBe("d1");
    expect(result.current.editingBuyerField).toBe("buyerName");
    expect(result.current.editBuyerValue).toBe("Jane");
  });

  it("uses empty string when the field is absent on the deal", () => {
    const { result } = renderHook(() => useBuyerEdit({ updateDeal: vi.fn() }));
    act(() => result.current.startEditingBuyer({ id: "d1" }, "buyerEmail"));
    expect(result.current.editBuyerValue).toBe("");
  });

  it("setEditBuyerValue updates the working value", () => {
    const { result } = renderHook(() => useBuyerEdit({ updateDeal: vi.fn() }));
    act(() => result.current.setEditBuyerValue("Bob"));
    expect(result.current.editBuyerValue).toBe("Bob");
  });

  it("cancelBuyerEdit clears state", () => {
    const { result } = renderHook(() => useBuyerEdit({ updateDeal: vi.fn() }));
    act(() =>
      result.current.startEditingBuyer(
        { id: "d1", buyerName: "Jane" },
        "buyerName",
      ),
    );
    act(() => result.current.cancelBuyerEdit());
    expect(result.current.editingBuyerId).toBeNull();
    expect(result.current.editingBuyerField).toBeNull();
    expect(result.current.editBuyerValue).toBe("");
  });

  it("saveBuyerEdit invokes updateDeal with the current value", () => {
    const updateDeal = vi.fn();
    const { result } = renderHook(() => useBuyerEdit({ updateDeal }));
    act(() =>
      result.current.startEditingBuyer(
        { id: "d1", buyerName: "Jane" },
        "buyerName",
      ),
    );
    act(() => result.current.setEditBuyerValue("Alice"));
    act(() => result.current.saveBuyerEdit("d1"));
    expect(updateDeal).toHaveBeenCalledWith("d1", "buyerName", "Alice");
    expect(result.current.editingBuyerId).toBeNull();
  });

  it("saveBuyerEdit is a no-op when no field is being edited", () => {
    const updateDeal = vi.fn();
    const { result } = renderHook(() => useBuyerEdit({ updateDeal }));
    act(() => result.current.saveBuyerEdit("d1"));
    expect(updateDeal).not.toHaveBeenCalled();
  });
});
