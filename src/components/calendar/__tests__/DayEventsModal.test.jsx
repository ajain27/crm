import { render, screen, fireEvent } from "@testing-library/react";
import { DayEventsModal } from "../components/DayEventsModal";
import { describe, it, expect, vi } from "vitest";

describe("DayEventsModal", () => {
  const mockEvents = [
    {
      id: "1",
      type: "lead",
      date: "2026-06-15",
      title: "123 Main Street",
      source: "Leads",
    },
    {
      id: "2",
      type: "deal",
      date: "2026-06-15",
      title: "456 Oak Avenue",
      source: "Deals",
    },
    {
      id: "3",
      type: "google-calendar",
      date: "2026-06-15T10:30:00Z",
      title: "Team Meeting",
      source: "Google Calendar (test@gmail.com)",
    },
  ];

  it("should return null when day is null", () => {
    const { container } = render(
      <DayEventsModal
        day={null}
        currentMonth={5}
        currentYear={2026}
        events={[]}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should display date header correctly", () => {
    render(
      <DayEventsModal
        day={15}
        currentMonth={5} // June
        currentYear={2026}
        events={mockEvents}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/Events for Jun 15, 2026/)).toBeTruthy();
  });

  it("should render all events", () => {
    render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    expect(screen.getByText("123 Main Street")).toBeTruthy();
    expect(screen.getByText("456 Oak Avenue")).toBeTruthy();
    expect(screen.getByText("Team Meeting")).toBeTruthy();
  });

  it("should display type badges correctly", () => {
    render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    const badges = screen.getAllByText(/^[LCD]$/);
    expect(badges).toHaveLength(3);
  });

  it("should call onEventClick and onClose when event is clicked", () => {
    const onEventClick = vi.fn();
    const onClose = vi.fn();
    render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={onClose}
        onEventClick={onEventClick}
      />,
    );
    fireEvent.click(screen.getByText("123 Main Street"));
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={onClose}
        onEventClick={vi.fn()}
      />,
    );
    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("should call onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={onClose}
        onEventClick={vi.fn()}
      />,
    );
    const overlay = container.querySelector(".modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("should not close modal when clicking inside content", () => {
    const onClose = vi.fn();
    const { container } = render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={onClose}
        onEventClick={vi.fn()}
      />,
    );
    const content = container.querySelector(".day-events-modal");
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("should display event source", () => {
    render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Leads")).toBeTruthy();
    expect(screen.getByText("Deals")).toBeTruthy();
    expect(screen.getByText("Google Calendar (test@gmail.com)")).toBeTruthy();
  });

  it("should display time for google calendar events", () => {
    const { container } = render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={mockEvents}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    // Check that the event item with time exists
    const eventItems = container.querySelectorAll(".event-item-time");
    expect(eventItems.length).toBeGreaterThan(0);
  });

  it("should handle empty events array", () => {
    render(
      <DayEventsModal
        day={15}
        currentMonth={5}
        currentYear={2026}
        events={[]}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/Events for Jun 15, 2026/)).toBeTruthy();
  });

  it("should handle different months correctly", () => {
    render(
      <DayEventsModal
        day={1}
        currentMonth={0} // January
        currentYear={2026}
        events={mockEvents}
        onClose={vi.fn()}
        onEventClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/Events for Jan 1, 2026/)).toBeTruthy();
  });
});
