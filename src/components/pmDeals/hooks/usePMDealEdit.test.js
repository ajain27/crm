import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePMDealEdit } from "./usePMDealEdit";

const baseProps = () => ({
  setDeals: vi.fn(),
  savePmDeal: vi.fn().mockResolvedValue(undefined),
});

const sampleDeal = {
  id: "d1",
  borrowerName: "Jane",
  borrowerCompany: "Acme",
  propertyAddress: "1 Main",
  amountLent: "$25,000",
  interestRate: "10%",
  months: "6",
  lendDate: "2026-05-01",
};

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
});

describe("usePMDealEdit", () => {
  it("has no editingDeal initially", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    expect(result.current.editingDeal).toBeNull();
    expect(result.current.editForm).toBeNull();
    expect(result.current.editSaving).toBe(false);
  });

  it("handleRowClick seeds the edit form from the deal", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    act(() => result.current.handleRowClick(sampleDeal));
    expect(result.current.editingDeal).toEqual(sampleDeal);
    expect(result.current.editForm.borrowerName).toBe("Jane");
  });

  it("falls back to empty strings when deal fields are missing", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    act(() => result.current.handleRowClick({ id: "d1" }));
    expect(result.current.editForm.borrowerName).toBe("");
    expect(result.current.editForm.amountLent).toBe("");
  });

  it("handleEditChange formats amountLent as currency", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    act(() => result.current.handleRowClick(sampleDeal));
    act(() =>
      result.current.handleEditChange({
        target: { name: "amountLent", value: "30000" },
      }),
    );
    expect(result.current.editForm.amountLent).toBe("$30,000");
  });

  it("handleEditChange filters interestRate and months", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    act(() => result.current.handleRowClick(sampleDeal));
    act(() =>
      result.current.handleEditChange({
        target: { name: "interestRate", value: "8abc%" },
      }),
    );
    expect(result.current.editForm.interestRate).toBe("8%");
    act(() =>
      result.current.handleEditChange({
        target: { name: "months", value: "12 m" },
      }),
    );
    expect(result.current.editForm.months).toBe("12");
  });

  it("handleEditBlur appends % to interestRate", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    act(() => result.current.handleRowClick(sampleDeal));
    act(() =>
      result.current.handleEditChange({
        target: { name: "interestRate", value: "9" },
      }),
    );
    act(() =>
      result.current.handleEditBlur({
        target: { name: "interestRate", value: "9" },
      }),
    );
    expect(result.current.editForm.interestRate).toBe("9%");
  });

  it("handleEditSave persists and closes modal", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealEdit(props));
    act(() => result.current.handleRowClick(sampleDeal));
    await act(async () => {
      await result.current.handleEditSave();
    });
    expect(props.savePmDeal).toHaveBeenCalledTimes(1);
    expect(props.setDeals).toHaveBeenCalled();
    expect(result.current.editingDeal).toBeNull();
  });

  it("handleEditSave alerts and keeps modal open on failure", async () => {
    const props = baseProps();
    props.savePmDeal = vi.fn().mockRejectedValue(new Error("net"));
    const { result } = renderHook(() => usePMDealEdit(props));
    act(() => result.current.handleRowClick(sampleDeal));
    await act(async () => {
      await result.current.handleEditSave();
    });
    await waitFor(() => expect(global.alert).toHaveBeenCalled());
    expect(result.current.editingDeal).not.toBeNull();
  });

  it("closeEditModal clears state without saving", () => {
    const { result } = renderHook(() => usePMDealEdit(baseProps()));
    act(() => result.current.handleRowClick(sampleDeal));
    act(() => result.current.closeEditModal());
    expect(result.current.editingDeal).toBeNull();
    expect(result.current.editForm).toBeNull();
  });

  it("handleEditSave is a no-op when nothing is being edited", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealEdit(props));
    await act(async () => {
      await result.current.handleEditSave();
    });
    expect(props.savePmDeal).not.toHaveBeenCalled();
  });
});
