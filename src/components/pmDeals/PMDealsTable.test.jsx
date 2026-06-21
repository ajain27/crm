import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PMDealsTable, { computeDeal } from "./PMDealsTable";

const deal = {
  id: "d1",
  borrowerName: "Jane",
  borrowerCompany: "Acme",
  propertyAddress: "1 Main",
  amountLent: "$25,000",
  interestRate: "10%",
  months: "6",
  lendDate: "2025-01-15",
  files: [],
};

describe("computeDeal", () => {
  it("computes interest, due date, days late, and total payout", () => {
    const result = computeDeal(deal, "2026-05-30");
    expect(result.principal).toBe(25000);
    expect(result.dueDate).toBe("2025-07-15");
    expect(result.interest).toBeCloseTo(2500, 0);
    expect(result.lateDays).toBeGreaterThan(0);
    expect(result.totalPayout).toBeGreaterThan(25000 + 2500);
  });

  it("returns zero interest when rate is 0", () => {
    const result = computeDeal({ ...deal, interestRate: "0%" }, "2025-06-15");
    expect(result.interest).toBe(0);
  });

  it("returns empty due date when lendDate missing", () => {
    const result = computeDeal({ ...deal, lendDate: "" }, "2026-05-30");
    expect(result.dueDate).toBe("");
    expect(result.lateDays).toBe(0);
  });

  it("zero lateDays when not past due", () => {
    const result = computeDeal(deal, "2025-06-30");
    expect(result.lateDays).toBe(0);
    expect(result.lateFee).toBe(0);
  });
});

const baseProps = (overrides = {}) => ({
  deals: [deal],
  filteredDeals: [deal],
  today: "2026-05-30",
  filterBorrower: "",
  setFilterBorrower: vi.fn(),
  filterCompany: "",
  setFilterCompany: vi.fn(),
  uploadingId: null,
  onRowClick: vi.fn(),
  onDelete: vi.fn(),
  onOpenFile: vi.fn(),
  onFileUpload: vi.fn(),
  ...overrides,
});

describe("PMDealsTable", () => {
  it("shows empty state when no deals", () => {
    render(<PMDealsTable {...baseProps({ deals: [], filteredDeals: [] })} />);
    expect(
      screen.getByText("Add your first PM deal above."),
    ).toBeInTheDocument();
  });

  it("shows 'no match' state when filters exclude all deals", () => {
    render(<PMDealsTable {...baseProps({ filteredDeals: [] })} />);
    expect(
      screen.getByText("No deals match your filters."),
    ).toBeInTheDocument();
  });

  it("renders deal row with borrower and address", () => {
    render(<PMDealsTable {...baseProps()} />);
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("1 Main")).toBeInTheDocument();
  });

  it("clicking a row invokes onRowClick with the deal", () => {
    const onRowClick = vi.fn();
    render(<PMDealsTable {...baseProps({ onRowClick })} />);
    fireEvent.click(screen.getByText("Acme"));
    expect(onRowClick).toHaveBeenCalledWith(deal);
  });

  it("clicking the borrower name heading toggles the accordion instead of opening the row", () => {
    const onRowClick = vi.fn();
    render(<PMDealsTable {...baseProps({ onRowClick })} />);
    fireEvent.click(screen.getByText("Jane"));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("clicking delete invokes onDelete and does not propagate to row", () => {
    const onRowClick = vi.fn();
    const onDelete = vi.fn();
    render(<PMDealsTable {...baseProps({ onRowClick, onDelete })} />);
    fireEvent.click(screen.getByTitle("Delete deal"));
    expect(onDelete).toHaveBeenCalledWith("d1");
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("renders filter inputs and Clear button when filters are active", () => {
    const setFilterBorrower = vi.fn();
    render(
      <PMDealsTable
        {...baseProps({ filterBorrower: "Jane", setFilterBorrower })}
      />,
    );
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear/i })).toBeInTheDocument();
  });

  it("typing in borrower filter calls setFilterBorrower", () => {
    const setFilterBorrower = vi.fn();
    render(<PMDealsTable {...baseProps({ setFilterBorrower })} />);
    fireEvent.change(screen.getByPlaceholderText(/Filter by borrower/i), {
      target: { value: "X" },
    });
    expect(setFilterBorrower).toHaveBeenCalledWith("X");
  });

  it("Eye icon appears when files exist; clicking calls onOpenFile", () => {
    const onOpenFile = vi.fn();
    const dealWithFile = {
      ...deal,
      files: [{ id: "f1", name: "doc.pdf", type: "application/pdf" }],
    };
    render(
      <PMDealsTable
        {...baseProps({
          deals: [dealWithFile],
          filteredDeals: [dealWithFile],
          onOpenFile,
        })}
      />,
    );
    const eyeBtn = screen.getByLabelText(/View files for Jane/i);
    fireEvent.click(eyeBtn);
    expect(onOpenFile).toHaveBeenCalled();
  });

  describe("borrower with multiple deals", () => {
    const dealOne = {
      ...deal,
      id: "d1",
      lendDate: "2025-01-15",
      propertyAddress: "1 Main",
    };
    const dealTwo = {
      ...deal,
      id: "d2",
      lendDate: "2025-06-01",
      propertyAddress: "2 Second St",
    };
    const groupedProps = baseProps({
      deals: [dealOne, dealTwo],
      filteredDeals: [dealOne, dealTwo],
    });

    it("renders one shared accordion heading for the borrower, not one per deal", () => {
      render(<PMDealsTable {...groupedProps} />);
      expect(screen.getAllByText("Jane")).toHaveLength(1);
      expect(screen.getByText(/Jane — Deal 1/)).toBeInTheDocument();
      expect(screen.getByText(/Jane — Deal 2/)).toBeInTheDocument();
    });

    it("still renders both deals' data divided inside the group", () => {
      render(<PMDealsTable {...groupedProps} />);
      expect(screen.getByText("1 Main")).toBeInTheDocument();
      expect(screen.getByText("2 Second St")).toBeInTheDocument();
    });

    it("clicking a deal row inside the group still invokes onRowClick with that deal", () => {
      const onRowClick = vi.fn();
      render(<PMDealsTable {...groupedProps} onRowClick={onRowClick} />);
      fireEvent.click(screen.getByText("2 Second St"));
      expect(onRowClick).toHaveBeenCalledWith(dealTwo);
    });
  });
});
