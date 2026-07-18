import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Crm_filters from "./crm_filters";

const baseFilters = {
  state: "All",
  propertyType: "All",
  offerAccepted: "All",
  offerStatus: "All",
  assigned: "All",
  closed: "All",
  offerMonth: "All",
  closedMonth: "All",
  year: "All",
  search: "",
};

const baseProps = (overrides = {}) => ({
  filters: baseFilters,
  states: ["All", "TX", "CA"],
  propertyTypes: ["All", "Single Family"],
  months: ["All", "01", "02"],
  years: ["All", "2025", "2026"],
  RefreshCw: () => null,
  setFilters: vi.fn(),
  ...overrides,
});

describe("Crm_filters", () => {
  it("renders Filter Lead heading", () => {
    render(<Crm_filters {...baseProps()} />);
    expect(screen.getByText(/Filter Lead/i)).toBeInTheDocument();
  });

  it("renders state and propertyType selects", () => {
    render(<Crm_filters {...baseProps()} />);
    expect(screen.getByLabelText(/^State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Type/i)).toBeInTheDocument();
  });

  it("changing state calls setFilters with new state value", () => {
    const setFilters = vi.fn();
    render(<Crm_filters {...baseProps({ setFilters })} />);
    fireEvent.change(screen.getByLabelText(/^State/i), {
      target: { value: "TX" },
    });
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ state: "TX" }),
    );
  });

  it("clicking the search icon reveals a text input", () => {
    render(<Crm_filters {...baseProps()} />);
    fireEvent.click(screen.getByTitle("Find Lead"));
    expect(screen.getByPlaceholderText("Search Deals...")).toBeInTheDocument();
  });

  it("typing in search calls setFilters", () => {
    const setFilters = vi.fn();
    render(<Crm_filters {...baseProps({ setFilters })} />);
    fireEvent.click(screen.getByTitle("Find Lead"));
    fireEvent.change(screen.getByPlaceholderText("Search Deals..."), {
      target: { value: "main" },
    });
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ search: "main" }),
    );
  });
});
