import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePMDealAdd } from "./usePMDealAdd";

const baseProps = () => ({
  setDeals: vi.fn(),
  currentUser: { id: "u1" },
  savePmDeal: vi.fn().mockResolvedValue(undefined),
  today: "2026-05-15",
});

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
});

describe("usePMDealAdd", () => {
  it("starts with an empty form", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    expect(result.current.form).toMatchObject({
      borrowerName: "",
      amountLent: "",
      interestRate: "",
      months: "",
      lendDate: "",
    });
    expect(result.current.isFormComplete).toBeFalsy();
    expect(result.current.saving).toBe(false);
  });

  it("formats amountLent as currency on change", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "amountLent", value: "50000" },
      });
    });
    expect(result.current.form.amountLent).toBe("$50,000");
  });

  it("strips non-allowed characters from interestRate", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "interestRate", value: "12abc%" },
      });
    });
    expect(result.current.form.interestRate).toBe("12%");
  });

  it("strips non-digits from months", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "months", value: "6 months" },
      });
    });
    expect(result.current.form.months).toBe("6");
  });

  it("passes through other fields verbatim", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "borrowerName", value: "Jane" },
      });
    });
    expect(result.current.form.borrowerName).toBe("Jane");
  });

  it("appends % to interestRate on blur if missing", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "interestRate", value: "8" },
      });
    });
    act(() => {
      result.current.handleBlur({
        target: { name: "interestRate", value: "8" },
      });
    });
    expect(result.current.form.interestRate).toBe("8%");
  });

  it("reports isFormComplete=true only when all required fields are filled", () => {
    const { result } = renderHook(() => usePMDealAdd(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "borrowerName", value: "Jane" },
      });
      result.current.handleChange({
        target: { name: "amountLent", value: "10000" },
      });
      result.current.handleChange({
        target: { name: "interestRate", value: "10" },
      });
      result.current.handleChange({
        target: { name: "months", value: "6" },
      });
      result.current.handleChange({
        target: { name: "lendDate", value: "2026-05-01" },
      });
    });
    expect(result.current.isFormComplete).toBeTruthy();
  });

  it("does not save if form is incomplete", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealAdd(props));
    await act(async () => {
      await result.current.handleAdd({ preventDefault: vi.fn() });
    });
    expect(props.savePmDeal).not.toHaveBeenCalled();
  });

  it("saves the deal and resets the form when complete", async () => {
    const props = baseProps();
    const { result } = renderHook(() => usePMDealAdd(props));
    act(() => {
      result.current.handleChange({
        target: { name: "borrowerName", value: "Jane" },
      });
      result.current.handleChange({
        target: { name: "amountLent", value: "10000" },
      });
      result.current.handleChange({
        target: { name: "interestRate", value: "10" },
      });
      result.current.handleChange({
        target: { name: "months", value: "6" },
      });
      result.current.handleChange({
        target: { name: "lendDate", value: "2026-05-01" },
      });
    });
    await act(async () => {
      await result.current.handleAdd({ preventDefault: vi.fn() });
    });
    expect(props.savePmDeal).toHaveBeenCalledTimes(1);
    expect(props.setDeals).toHaveBeenCalled();
    expect(result.current.form.borrowerName).toBe("");
  });

  it("alerts and does not reset on save failure", async () => {
    const props = baseProps();
    props.savePmDeal = vi.fn().mockRejectedValue(new Error("net"));
    const { result } = renderHook(() => usePMDealAdd(props));
    act(() => {
      result.current.handleChange({
        target: { name: "borrowerName", value: "Jane" },
      });
      result.current.handleChange({
        target: { name: "amountLent", value: "10000" },
      });
      result.current.handleChange({
        target: { name: "interestRate", value: "10" },
      });
      result.current.handleChange({
        target: { name: "months", value: "6" },
      });
      result.current.handleChange({
        target: { name: "lendDate", value: "2026-05-01" },
      });
    });
    await act(async () => {
      await result.current.handleAdd({ preventDefault: vi.fn() });
    });
    await waitFor(() => expect(global.alert).toHaveBeenCalled());
    expect(result.current.form.borrowerName).toBe("Jane");
  });
});
