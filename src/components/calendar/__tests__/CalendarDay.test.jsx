import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarDay } from "../components/CalendarDay";
import { describe, it, expect, vi } from "vitest";

describe("CalendarDay", () => {
  const mockFollowUp1 = {
    id: "1",
    type: "lead",
    date: "2026-06-15",
    title: "Test Lead",
    source: "Leads",
  };

  const mockFollowUp2 = {
    id: "2",
    type: "deal",
    date: "2026-06-15",
    title: "Test Deal",
    source: "Deals",
  };

  const mockFollowUp3 = {
    id: "3",
    type: "google-calendar",
    date: "2026-06-15T10:00:00Z",
    title: "Team Meeting",
    source: "Google Calendar",
  };

  it("should render empty day when day is null", () => {
    const { container } = render(
      <CalendarDay
        day={null}
        isToday={false}
        followUps={[]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(container.querySelector(".empty")).toBeTruthy();
  });

  it("should render day number", () => {
    render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("15")).toBeTruthy();
  });

  it("should apply today class when isToday is true", () => {
    const { container } = render(
      <CalendarDay
        day={15}
        isToday={true}
        followUps={[]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(container.querySelector(".today")).toBeTruthy();
  });

  it("should render follow-up badges for up to 2 events", () => {
    render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp1, mockFollowUp2]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("L")).toBeTruthy();
    expect(screen.getByText("D")).toBeTruthy();
  });

  it("should call onEventClick when badge is clicked", () => {
    const onEventClick = vi.fn();
    render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp1]}
        onEventClick={onEventClick}
        onMoreClick={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("L"));
    expect(onEventClick).toHaveBeenCalledWith(mockFollowUp1);
  });

  it("should show +N indicator for more than 2 events", () => {
    render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp1, mockFollowUp2, mockFollowUp3]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("should call onMoreClick when +N is clicked", () => {
    const onMoreClick = vi.fn();
    render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp1, mockFollowUp2, mockFollowUp3]}
        onEventClick={vi.fn()}
        onMoreClick={onMoreClick}
      />,
    );
    fireEvent.click(screen.getByText("+1"));
    expect(onMoreClick).toHaveBeenCalledWith(15);
  });

  it("should display correct badge type for lead", () => {
    const { container } = render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp1]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(container.querySelector(".follow-up-badge.lead")).toBeTruthy();
  });

  it("should display correct badge type for deal", () => {
    const { container } = render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp2]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(container.querySelector(".follow-up-badge.deal")).toBeTruthy();
  });

  it("should display correct badge type for google-calendar", () => {
    const { container } = render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[mockFollowUp3]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(
      container.querySelector(".follow-up-badge.google-calendar"),
    ).toBeTruthy();
  });

  it("should handle undefined followUps gracefully", () => {
    render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={undefined}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    expect(screen.getByText("15")).toBeTruthy();
  });

  it("should display event title for google calendar events (first 20 chars)", () => {
    const googleEvent = {
      ...mockFollowUp3,
      title: "This is a very long meeting title",
    };
    const { container } = render(
      <CalendarDay
        day={15}
        isToday={false}
        followUps={[googleEvent]}
        onEventClick={vi.fn()}
        onMoreClick={vi.fn()}
      />,
    );
    const badge = container.querySelector(".follow-up-badge");
    expect(badge.textContent).toContain("This is a very long");
  });
});
