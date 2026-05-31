import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDealUpdater } from "./useDealUpdater";

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
});

const baseDeal = {
  id: "d1",
  address: "123 Main",
  city: "Austin",
  state: "TX",
  sellerAccepted: "Yes",
  assigned: "Yes",
  offerStatus: "Offer Sent",
  buyerName: "",
  buyerEmail: "",
  userId: "u1",
};

const makeProps = (overrides = {}) => ({
  deals: [{ ...baseDeal }],
  persist: vi.fn(),
  saveDeal: vi.fn(async (d) => d),
  fetchBuyers: vi.fn().mockResolvedValue([]),
  saveBuyer: vi.fn().mockResolvedValue(undefined),
  setFilters: vi.fn(),
  ...overrides,
});

describe("useDealUpdater", () => {
  describe("updateDealPatch", () => {
    it("merges patch and persists", async () => {
      const props = makeProps();
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDealPatch("d1", { city: "Dallas" });
      });
      expect(props.saveDeal).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Dallas" }),
      );
      expect(props.persist).toHaveBeenCalled();
    });

    it("alerts on save failure", async () => {
      const props = makeProps({
        saveDeal: vi.fn().mockRejectedValue(new Error("net")),
      });
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDealPatch("d1", { city: "Dallas" });
      });
      await waitFor(() => expect(global.alert).toHaveBeenCalled());
    });
  });

  describe("updateDeal", () => {
    it("updates simple field and persists", async () => {
      const props = makeProps();
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDeal("d1", "notes", "Hello");
      });
      const saved = props.saveDeal.mock.calls[0][0];
      expect(saved.notes).toBe("Hello");
    });

    it("blocks closing when sellerAccepted != Yes", async () => {
      const props = makeProps({
        deals: [{ ...baseDeal, sellerAccepted: "No" }],
      });
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDeal("d1", "closed", "Yes");
      });
      expect(global.alert).toHaveBeenCalled();
      expect(props.saveDeal).not.toHaveBeenCalled();
    });

    it("prompts for close date when closing", async () => {
      vi.spyOn(window, "prompt").mockReturnValue("2026-05-20");
      const props = makeProps();
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDeal("d1", "closed", "Yes");
      });
      expect(window.prompt).toHaveBeenCalled();
      const saved = props.saveDeal.mock.calls[0][0];
      expect(saved.closedDate).toBe("2026-05-20");
      expect(saved.closedInMonth).toBe("05");
    });

    it("rejects invalid close date format", async () => {
      vi.spyOn(window, "prompt").mockReturnValue("bad-date");
      const props = makeProps();
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDeal("d1", "closed", "Yes");
      });
      expect(global.alert).toHaveBeenCalled();
      expect(props.saveDeal).not.toHaveBeenCalled();
    });

    it("flips sellerAccepted to 'Waiting' on initial Offer Sent", async () => {
      const props = makeProps({
        deals: [{ ...baseDeal, sellerAccepted: "No", offerStatus: "Not Sent" }],
      });
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDeal("d1", "offerStatus", "Offer Sent");
      });
      const saved = props.saveDeal.mock.calls[0][0];
      expect(saved.sellerAccepted).toBe("Waiting");
    });

    it("clears closedDate when unclosing", async () => {
      const props = makeProps({
        deals: [
          {
            ...baseDeal,
            closed: "Yes",
            closedDate: "2025-01-01",
            closedInMonth: "01",
          },
        ],
      });
      const { result } = renderHook(() => useDealUpdater(props));
      await act(async () => {
        await result.current.updateDeal("d1", "closed", "No");
      });
      const saved = props.saveDeal.mock.calls[0][0];
      expect(saved.closedDate).toBe("");
      expect(saved.closedInMonth).toBe("");
    });
  });
});
