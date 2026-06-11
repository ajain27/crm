import { render, screen, fireEvent } from "@testing-library/react";
import { EventDetailsModal } from "../components/EventDetailsModal";
import { describe, it, expect, vi } from "vitest";

describe("EventDetailsModal", () => {
  const mockLeadEvent = {
    id: "lead-1",
    type: "lead",
    date: "2026-06-15",
    title: "123 Main Street",
    source: "Leads",
  };

  const mockDealEvent = {
    id: "deal-1",
    type: "deal",
    date: "2026-06-20",
    title: "456 Oak Avenue",
    source: "Deals",
  };

  const mockGoogleEvent = {
    id: "google-1",
    type: "google-calendar",
    date: "2026-06-10T10:30:00Z",
    title: "Team Meeting",
    source: "Google Calendar (test@gmail.com)",
    description: "Weekly team sync",
  };

  it("should return null when event is null", () => {
    const { container } = render(
      <EventDetailsModal event={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should display lead event details", () => {
    render(<EventDetailsModal event={mockLeadEvent} onClose={vi.fn()} />);
    expect(screen.getByText("123 Main Street")).toBeTruthy();
    expect(screen.getByText("Lead Follow-up")).toBeTruthy();
    expect(screen.getByText("Leads")).toBeTruthy();
  });

  it("should display deal event details", () => {
    render(<EventDetailsModal event={mockDealEvent} onClose={vi.fn()} />);
    expect(screen.getByText("456 Oak Avenue")).toBeTruthy();
    expect(screen.getByText("Deal Closed")).toBeTruthy();
    expect(screen.getByText("Deals")).toBeTruthy();
  });

  it("should display google calendar event details", () => {
    render(<EventDetailsModal event={mockGoogleEvent} onClose={vi.fn()} />);
    expect(screen.getByText("Team Meeting")).toBeTruthy();
    expect(screen.getByText("Google Calendar")).toBeTruthy();
    expect(screen.getByText("Weekly team sync")).toBeTruthy();
    expect(screen.getByText("Google Calendar (test@gmail.com)")).toBeTruthy();
  });

  it("should not display description if not provided", () => {
    const eventWithoutDescription = {
      ...mockGoogleEvent,
      description: null,
    };
    render(
      <EventDetailsModal event={eventWithoutDescription} onClose={vi.fn()} />,
    );
    expect(screen.queryByText("Description:")).not.toBeTruthy();
  });

  it("should call onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<EventDetailsModal event={mockLeadEvent} onClose={onClose} />);
    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("should call onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <EventDetailsModal event={mockLeadEvent} onClose={onClose} />,
    );
    const overlay = container.querySelector(".modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("should not close modal when clicking inside content", () => {
    const onClose = vi.fn();
    const { container } = render(
      <EventDetailsModal event={mockLeadEvent} onClose={onClose} />,
    );
    const content = container.querySelector(".event-details-modal");
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("should display all label fields", () => {
    render(<EventDetailsModal event={mockLeadEvent} onClose={vi.fn()} />);
    expect(screen.getByText("Type:")).toBeTruthy();
    expect(screen.getByText("Date:")).toBeTruthy();
    expect(screen.getByText("Source:")).toBeTruthy();
  });

  it("should format google calendar time correctly", () => {
    render(<EventDetailsModal event={mockGoogleEvent} onClose={vi.fn()} />);
    expect(screen.getByText("Time:")).toBeTruthy();
  });
});
