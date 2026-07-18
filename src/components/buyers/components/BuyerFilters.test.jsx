import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BuyerFilters from "./BuyerFilters";

const baseProps = (overrides = {}) => ({
  filters: { state: "All", realEstateType: "All", search: "" },
  states: ["All", "TX", "CA"],
  types: ["All", "Single Family", "Duplex"],
  setFilters: vi.fn(),
  selectedCount: 0,
  onCompose: vi.fn(),
  onDeleteSelected: vi.fn(),
  onClearSelection: vi.fn(),
  ...overrides,
});

describe("BuyerFilters", () => {
  it("renders Filter Buyer heading", () => {
    render(<BuyerFilters {...baseProps()} />);
    expect(screen.getByText(/Find Buyer/i)).toBeInTheDocument();
  });

  it("renders state and type selects", () => {
    render(<BuyerFilters {...baseProps()} />);
    expect(screen.getByLabelText(/Filter by State/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Type/i)).toBeInTheDocument();
  });

  it("changing state filter calls setFilters", () => {
    const setFilters = vi.fn();
    render(<BuyerFilters {...baseProps({ setFilters })} />);
    fireEvent.change(screen.getByLabelText(/Filter by State/i), {
      target: { value: "TX", name: "state" },
    });
    expect(setFilters).toHaveBeenCalled();
  });

  it("Clear Filters resets filters and clears selection", () => {
    const setFilters = vi.fn();
    const onClearSelection = vi.fn();
    render(
      <BuyerFilters
        {...baseProps({
          filters: { state: "TX", realEstateType: "All", search: "" },
          setFilters,
          onClearSelection,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Clear Filters/i }));
    expect(setFilters).toHaveBeenCalledWith({
      state: "All",
      realEstateType: "All",
      search: "",
    });
    expect(onClearSelection).toHaveBeenCalled();
  });

  it("Clear Filters button is disabled when no filters are active", () => {
    render(<BuyerFilters {...baseProps()} />);
    expect(
      screen.getByRole("button", { name: /Clear Filters/i }),
    ).toBeDisabled();
  });

  it("search icon expands the input on click", () => {
    render(<BuyerFilters {...baseProps()} />);
    fireEvent.click(screen.getByTitle("Find Buyer"));
    expect(
      screen.getByPlaceholderText(/Search buyers by name/i),
    ).toBeInTheDocument();
  });

  it("shows Compose Email and Delete buttons when selectedCount > 0", () => {
    render(<BuyerFilters {...baseProps({ selectedCount: 3 })} />);
    expect(
      screen.getByRole("button", { name: /Compose Email \(3\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Delete \(3\)/i }),
    ).toBeInTheDocument();
  });

  it("hides bulk-action buttons when selectedCount is 0", () => {
    render(<BuyerFilters {...baseProps()} />);
    expect(
      screen.queryByRole("button", { name: /Compose Email/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking Compose / Delete invokes their callbacks", () => {
    const onCompose = vi.fn();
    const onDeleteSelected = vi.fn();
    render(
      <BuyerFilters
        {...baseProps({ selectedCount: 2, onCompose, onDeleteSelected })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Compose Email/i }));
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
    expect(onCompose).toHaveBeenCalled();
    expect(onDeleteSelected).toHaveBeenCalled();
  });
});
