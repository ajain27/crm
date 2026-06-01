import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClearFiltersButton from "./ClearFiltersButton";

describe("ClearFiltersButton", () => {
  it("renders default label 'Clear Filters'", () => {
    render(<ClearFiltersButton onClear={vi.fn()} />);
    expect(screen.getByText("Clear Filters")).toBeInTheDocument();
  });

  it("renders a custom label when provided", () => {
    render(<ClearFiltersButton onClear={vi.fn()} label="Reset" />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
    expect(screen.queryByText("Clear Filters")).not.toBeInTheDocument();
  });

  it("calls onClear when clicked", () => {
    const onClear = vi.fn();
    render(<ClearFiltersButton onClear={onClear} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("is enabled by default", () => {
    render(<ClearFiltersButton onClear={vi.fn()} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("is disabled when hasActiveFilters=false", () => {
    render(<ClearFiltersButton onClear={vi.fn()} hasActiveFilters={false} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("uses contextual title text based on filter state", () => {
    const { rerender } = render(
      <ClearFiltersButton onClear={vi.fn()} hasActiveFilters />,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Clear all filters",
    );
    rerender(<ClearFiltersButton onClear={vi.fn()} hasActiveFilters={false} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "No filters applied",
    );
  });

  it("respects a custom title override", () => {
    render(<ClearFiltersButton onClear={vi.fn()} title="Reset everything" />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Reset everything",
    );
  });

  it("merges the clear-filters-btn class with a custom className", () => {
    const { container } = render(
      <ClearFiltersButton onClear={vi.fn()} className="custom-class" />,
    );
    const button = container.querySelector("button");
    expect(button.className).toMatch(/clear-filters-btn/);
    expect(button.className).toMatch(/custom-class/);
  });
});
