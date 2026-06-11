import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarControls } from "../components/CalendarControls";
import { describe, it, expect, vi } from "vitest";

describe("CalendarControls", () => {
  it("should render month name", () => {
    render(
      <CalendarControls
        monthName="June 2026"
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );
    expect(screen.getByText("June 2026")).toBeTruthy();
  });

  it("should call onPrevMonth when previous button is clicked", () => {
    const onPrevMonth = vi.fn();
    render(
      <CalendarControls
        monthName="June 2026"
        onPrevMonth={onPrevMonth}
        onNextMonth={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // First button is prev
    expect(onPrevMonth).toHaveBeenCalled();
  });

  it("should call onNextMonth when next button is clicked", () => {
    const onNextMonth = vi.fn();
    render(
      <CalendarControls
        monthName="June 2026"
        onPrevMonth={vi.fn()}
        onNextMonth={onNextMonth}
      />,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // Second button is next
    expect(onNextMonth).toHaveBeenCalled();
  });

  it("should render both navigation buttons", () => {
    render(
      <CalendarControls
        monthName="June 2026"
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("should have correct aria labels", () => {
    render(
      <CalendarControls
        monthName="June 2026"
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Previous month")).toBeTruthy();
    expect(screen.getByLabelText("Next month")).toBeTruthy();
  });

  it("should handle different month names", () => {
    const { rerender } = render(
      <CalendarControls
        monthName="January 2026"
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );
    expect(screen.getByText("January 2026")).toBeTruthy();

    rerender(
      <CalendarControls
        monthName="December 2026"
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );
    expect(screen.getByText("December 2026")).toBeTruthy();
  });
});
