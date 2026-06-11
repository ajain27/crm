import { renderHook } from "@testing-library/react";
import { useFeedbackData } from "../hooks/useFeedbackData";
import { describe, it, expect } from "vitest";

describe("useFeedbackData", () => {
  it("should return empty array when no data is provided", () => {
    const { result } = renderHook(() => useFeedbackData([], [], []));
    expect(result.current).toEqual([]);
  });

  it("should include lead follow-ups", () => {
    const leads = [
      {
        id: "lead1",
        address: "123 Main St",
        followUpDate: "2026-06-15",
      },
    ];
    const { result } = renderHook(() => useFeedbackData([], leads, []));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      id: "lead-lead1",
      type: "lead",
      date: "2026-06-15",
      title: "123 Main St",
      source: "Leads",
    });
  });

  it("should include deal closed dates", () => {
    const deals = [
      {
        id: "deal1",
        address: "456 Oak Ave",
        closedDate: "2026-06-20",
      },
    ];
    const { result } = renderHook(() => useFeedbackData(deals, [], []));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      id: "deal-deal1",
      type: "deal",
      date: "2026-06-20",
      title: "456 Oak Ave",
      source: "Deals",
    });
  });

  it("should include google calendar events", () => {
    const googleEvents = [
      {
        id: "google-1",
        type: "google-calendar",
        date: "2026-06-10T10:00:00Z",
        title: "Team Meeting",
        source: "Google Calendar (test@gmail.com)",
        description: "Weekly sync",
      },
    ];
    const { result } = renderHook(() => useFeedbackData([], [], googleEvents));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toBe(googleEvents[0]);
  });

  it("should combine all feedback types", () => {
    const leads = [
      { id: "lead1", address: "123 Main St", followUpDate: "2026-06-15" },
    ];
    const deals = [
      { id: "deal1", address: "456 Oak Ave", closedDate: "2026-06-20" },
    ];
    const googleEvents = [
      {
        id: "google-1",
        type: "google-calendar",
        date: "2026-06-10T10:00:00Z",
        title: "Meeting",
        source: "Google Calendar (test@gmail.com)",
      },
    ];

    const { result } = renderHook(() =>
      useFeedbackData(deals, leads, googleEvents),
    );
    expect(result.current).toHaveLength(3);
  });

  it("should exclude leads without followUpDate", () => {
    const leads = [
      { id: "lead1", address: "123 Main St" },
      { id: "lead2", address: "789 Elm St", followUpDate: "2026-06-15" },
    ];
    const { result } = renderHook(() => useFeedbackData([], leads, []));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("lead-lead2");
  });

  it("should exclude deals without closedDate", () => {
    const deals = [
      { id: "deal1", address: "456 Oak Ave" },
      { id: "deal2", address: "321 Pine Rd", closedDate: "2026-06-20" },
    ];
    const { result } = renderHook(() => useFeedbackData(deals, [], []));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe("deal-deal2");
  });

  it("should update when input data changes", () => {
    const leads1 = [
      { id: "lead1", address: "123 Main St", followUpDate: "2026-06-15" },
    ];
    const leads2 = [
      { id: "lead1", address: "123 Main St", followUpDate: "2026-06-15" },
      { id: "lead2", address: "789 Elm St", followUpDate: "2026-06-20" },
    ];

    const { result, rerender } = renderHook(
      ({ deals, leads, googleEvents }) =>
        useFeedbackData(deals, leads, googleEvents),
      { initialProps: { deals: [], leads: leads1, googleEvents: [] } },
    );

    expect(result.current).toHaveLength(1);

    rerender({ deals: [], leads: leads2, googleEvents: [] });
    expect(result.current).toHaveLength(2);
  });
});
