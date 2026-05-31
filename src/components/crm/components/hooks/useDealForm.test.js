import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDealForm } from "./useDealForm";

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
});

const baseProps = (overrides = {}) => ({
  deals: [],
  currentUser: { id: "u1" },
  saveDeal: vi.fn(async (d) => d),
  saveBuyer: vi.fn().mockResolvedValue(undefined),
  fetchBuyers: vi.fn().mockResolvedValue([]),
  saveContractVersion: vi.fn().mockResolvedValue(undefined),
  setDeals: vi.fn(),
  setFilters: vi.fn(),
  ...overrides,
});

describe("useDealForm", () => {
  it("starts with the empty deal form", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    expect(result.current.form.address).toBe("");
    expect(result.current.tableLoading).toBe(false);
    expect(result.current.formError).toBe("");
  });

  it("handleChange formats currency fields", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "arv", value: "450000" },
      }),
    );
    expect(result.current.form.arv).toBe("$450,000");
  });

  it("handleChange rejects digits in city field", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "city", value: "Austin99" },
      }),
    );
    expect(result.current.form.city).toBe(""); // rejected
  });

  it("handleChange rejects non-digits in zipCode", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "zipCode", value: "78701x" },
      }),
    );
    expect(result.current.form.zipCode).toBe("");
  });

  it("handleChange rejects digits in state", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "state", value: "TX1" },
      }),
    );
    expect(result.current.form.state).toBe("");
  });

  it("handleChange accepts non-currency simple field", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "notes", value: "Some notes" },
      }),
    );
    expect(result.current.form.notes).toBe("Some notes");
  });

  it("handleChange blocks close=Yes when sellerAccepted/assigned not set", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "closed", value: "Yes" },
      }),
    );
    expect(global.alert).toHaveBeenCalled();
    expect(result.current.form.closed).toBe("No");
  });

  it("setting offerStatus=Not Sent resets downstream fields", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() => {
      result.current.handleChange({
        target: { name: "offerStatus", value: "Offer Sent" },
      });
      result.current.handleChange({
        target: { name: "contractPrice", value: "100000" },
      });
    });
    expect(result.current.form.contractPrice).toBe("$100,000");
    act(() =>
      result.current.handleChange({
        target: { name: "offerStatus", value: "Not Sent" },
      }),
    );
    expect(result.current.form.contractPrice).toBe("");
  });

  it("addDeal blocks when required address fields missing", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useDealForm(props));
    await act(async () => {
      await result.current.addDeal({ preventDefault: vi.fn() });
    });
    expect(global.alert).toHaveBeenCalled();
    expect(props.saveDeal).not.toHaveBeenCalled();
  });

  it("addDeal saves and resets the form when valid", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useDealForm(props));
    act(() => {
      result.current.handleChange({
        target: { name: "address", value: "1 Main St" },
      });
      result.current.handleChange({
        target: { name: "city", value: "Austin" },
      });
      result.current.handleChange({
        target: { name: "zipCode", value: "78701" },
      });
      result.current.handleChange({
        target: { name: "state", value: "TX" },
      });
    });
    await act(async () => {
      await result.current.addDeal({ preventDefault: vi.fn() });
    });
    await waitFor(() => expect(props.saveDeal).toHaveBeenCalled());
    const saved = props.saveDeal.mock.calls[0][0];
    expect(saved.address).toBe("1 Main St");
    expect(saved.state).toBe("TX");
    expect(props.setDeals).toHaveBeenCalled();
  });

  it("addDeal flags duplicate addresses", async () => {
    const props = baseProps({
      deals: [{ id: "x", address: "1 Main St" }],
    });
    const { result } = renderHook(() => useDealForm(props));
    act(() => {
      result.current.handleChange({
        target: { name: "address", value: "1 Main St" },
      });
      result.current.handleChange({
        target: { name: "city", value: "Austin" },
      });
      result.current.handleChange({
        target: { name: "zipCode", value: "78701" },
      });
      result.current.handleChange({
        target: { name: "state", value: "TX" },
      });
    });
    await act(async () => {
      await result.current.addDeal({ preventDefault: vi.fn() });
    });
    expect(result.current.formError).toMatch(/already in your pipeline/);
    expect(props.saveDeal).not.toHaveBeenCalled();
  });

  it("clearContractFile wipes contract fields", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() => result.current.clearContractFile());
    expect(result.current.form.contractFileName).toBe("");
    expect(result.current.form.contractVersions).toEqual([]);
  });

  it("resetForm clears form and error", () => {
    const { result } = renderHook(() => useDealForm(baseProps()));
    act(() =>
      result.current.handleChange({
        target: { name: "notes", value: "X" },
      }),
    );
    act(() => result.current.resetForm());
    expect(result.current.form.notes).toBe("");
    expect(result.current.formError).toBe("");
  });
});
