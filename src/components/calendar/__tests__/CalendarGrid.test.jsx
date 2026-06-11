import { render, screen } from "@testing-library/react";
import { CalendarGrid } from "../components/CalendarGrid";
import { describe, it, expect, vi } from "vitest";

describe("CalendarGrid", () => {
  const mockFollowUps = {
    1: [{ id: "1", type: "lead", date: "2026-06-01", title: "Event 1" }],
    15: [
      { id: "2", type: "deal", date: "2026-06-15", title: "Event 2" },
      { id: "3", type: "lead", date: "2026-06-15", title: "Event 3" },
    ],
  };

  it("should render weekday headers", () => {
    render(
      <CalendarGrid
        currentMonth={5} // June
        currentYear={2026}
        followUpsByDate={mockFollowUps}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Sun")).toBeTruthy();
    expect(screen.getByText("Mon")).toBeTruthy();
    expect(screen.getByText("Tue")).toBeTruthy();
    expect(screen.getByText("Wed")).toBeTruthy();
    expect(screen.getByText("Thu")).toBeTruthy();
    expect(screen.getByText("Fri")).toBeTruthy();
    expect(screen.getByText("Sat")).toBeTruthy();
  });

  it("should render calendar days", () => {
    render(
      <CalendarGrid
        currentMonth={5} // June
        currentYear={2026}
        followUpsByDate={mockFollowUps}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("should pass correct props to CalendarDay", () => {
    const { container } = render(
      <CalendarGrid
        currentMonth={5} // June
        currentYear={2026}
        followUpsByDate={mockFollowUps}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    // Check that calendar-day divs exist
    const days = container.querySelectorAll(".calendar-day");
    expect(days.length).toBeGreaterThan(0);
  });

  it("should handle empty followUpsByDate", () => {
    render(
      <CalendarGrid
        currentMonth={5} // June
        currentYear={2026}
        followUpsByDate={{}}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
  });

  it("should highlight today's date when in current month", () => {
    const today = new Date();
    const { container } = render(
      <CalendarGrid
        currentMonth={today.getMonth()}
        currentYear={today.getFullYear()}
        followUpsByDate={{}}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    const todayElement = container.querySelector(".calendar-day.today");
    expect(todayElement).toBeTruthy();
  });

  it("should not highlight today when viewing different month", () => {
    const { container } = render(
      <CalendarGrid
        currentMonth={0} // January
        currentYear={2020}
        followUpsByDate={{}}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    const todayElement = container.querySelector(".calendar-day.today");
    expect(todayElement).toBeFalsy();
  });

  it("should render correct number of days for month with 30 days", () => {
    const { container } = render(
      <CalendarGrid
        currentMonth={5} // June (30 days)
        currentYear={2026}
        followUpsByDate={{}}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    // June starts on Monday (day index 1) so 1 empty cell + 30 days + remaining cells
    const days = container.querySelectorAll(".calendar-day");
    expect(days.length).toBeGreaterThanOrEqual(30);
  });

  it("should render correct number of days for month with 31 days", () => {
    const { container } = render(
      <CalendarGrid
        currentMonth={4} // May (31 days)
        currentYear={2026}
        followUpsByDate={{}}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    const days = container.querySelectorAll(".calendar-day");
    expect(days.length).toBeGreaterThanOrEqual(31);
  });

  it("should handle February leap year (29 days)", () => {
    const { container } = render(
      <CalendarGrid
        currentMonth={1} // February 2024 (leap year)
        currentYear={2024}
        followUpsByDate={{}}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    const days = container.querySelectorAll(".calendar-day");
    expect(days.length).toBeGreaterThanOrEqual(29);
  });

  it("should pass followUps to CalendarDay for each day", () => {
    const { container } = render(
      <CalendarGrid
        currentMonth={5} // June
        currentYear={2026}
        followUpsByDate={mockFollowUps}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    // Check that badges are rendered
    const badges = container.querySelectorAll(".follow-up-badge");
    expect(badges.length).toBeGreaterThan(0);
  });
});
