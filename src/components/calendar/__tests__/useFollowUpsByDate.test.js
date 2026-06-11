import { renderHook } from "@testing-library/react";
import { useFollowUpsByDate } from "../hooks/useFollowUpsByDate";
import { describe, it, expect } from "vitest";

describe("useFollowUpsByDate", () => {
  it("should return empty object when no follow-ups provided", () => {
    const { result } = renderHook(
      () => useFollowUpsByDate([], 5, 2026), // June 2026
    );
    expect(result.current).toEqual({});
  });

  it("should group follow-ups by day of month", () => {
    const followUps = [
      { id: "1", date: new Date(2026, 5, 15), title: "Event 1", type: "lead" },
      { id: "2", date: new Date(2026, 5, 15), title: "Event 2", type: "deal" },
      { id: "3", date: new Date(2026, 5, 20), title: "Event 3", type: "lead" },
    ];

    const { result } = renderHook(
      () => useFollowUpsByDate(followUps, 5, 2026), // June
    );

    expect(result.current[15]).toHaveLength(2);
    expect(result.current[20]).toHaveLength(1);
  });

  it("should only include events from specified month and year", () => {
    const followUps = [
      {
        id: "1",
        date: new Date(2026, 4, 15),
        title: "May Event",
        type: "lead",
      },
      {
        id: "2",
        date: new Date(2026, 5, 15),
        title: "June Event",
        type: "lead",
      },
      {
        id: "3",
        date: new Date(2026, 6, 15),
        title: "July Event",
        type: "lead",
      },
    ];

    const { result } = renderHook(
      () => useFollowUpsByDate(followUps, 5, 2026), // June
    );

    expect(Object.keys(result.current)).toEqual(["15"]);
    expect(result.current[15][0].title).toBe("June Event");
  });

  it("should handle different date formats", () => {
    const followUps = [
      { id: "1", date: "2026-06-10T10:30:00Z", title: "Event 1", type: "lead" },
      { id: "2", date: new Date(2026, 5, 20), title: "Event 2", type: "deal" },
    ];

    const { result } = renderHook(
      () => useFollowUpsByDate(followUps, 5, 2026), // June
    );

    expect(result.current[10]).toHaveLength(1);
    expect(result.current[20]).toHaveLength(1);
  });

  it("should maintain order of events within a day", () => {
    const followUps = [
      { id: "1", date: new Date(2026, 5, 15), title: "First", type: "lead" },
      { id: "2", date: new Date(2026, 5, 15), title: "Second", type: "deal" },
      { id: "3", date: new Date(2026, 5, 15), title: "Third", type: "lead" },
    ];

    const { result } = renderHook(
      () => useFollowUpsByDate(followUps, 5, 2026), // June
    );

    expect(result.current[15]).toBeDefined();
    expect(result.current[15][0].title).toBe("First");
    expect(result.current[15][1].title).toBe("Second");
    expect(result.current[15][2].title).toBe("Third");
  });

  it("should update when follow-ups change", () => {
    const followUps1 = [
      { id: "1", date: new Date(2026, 5, 15), title: "Event 1", type: "lead" },
    ];
    const followUps2 = [
      { id: "1", date: new Date(2026, 5, 15), title: "Event 1", type: "lead" },
      { id: "2", date: new Date(2026, 5, 20), title: "Event 2", type: "deal" },
    ];

    const { result, rerender } = renderHook(
      ({ followUps, month, year }) =>
        useFollowUpsByDate(followUps, month, year),
      {
        initialProps: { followUps: followUps1, month: 5, year: 2026 },
      },
    );

    expect(Object.keys(result.current)).toEqual(["15"]);

    rerender({ followUps: followUps2, month: 5, year: 2026 });
    expect(Object.keys(result.current).sort()).toEqual(["15", "20"]);
  });

  it("should update when month changes", () => {
    const followUps = [
      {
        id: "1",
        date: new Date(2026, 5, 15),
        title: "June Event",
        type: "lead",
      },
      {
        id: "2",
        date: new Date(2026, 6, 20),
        title: "July Event",
        type: "lead",
      },
    ];

    const { result, rerender } = renderHook(
      ({ followUps, month, year }) =>
        useFollowUpsByDate(followUps, month, year),
      {
        initialProps: { followUps, month: 5, year: 2026 }, // June
      },
    );

    expect(result.current[15]).toHaveLength(1);
    expect(result.current[20]).toBeUndefined();

    rerender({ followUps, month: 6, year: 2026 }); // July
    expect(result.current[15]).toBeUndefined();
    expect(result.current[20]).toHaveLength(1);
  });

  it("should handle edge case of month boundaries", () => {
    const followUps = [
      { id: "1", date: new Date(2026, 5, 1), title: "First Day", type: "lead" },
      { id: "2", date: new Date(2026, 5, 30), title: "Last Day", type: "lead" },
    ];

    const { result } = renderHook(
      () => useFollowUpsByDate(followUps, 5, 2026), // June
    );

    expect(result.current[1]).toHaveLength(1);
    expect(result.current[30]).toHaveLength(1);
  });
});
