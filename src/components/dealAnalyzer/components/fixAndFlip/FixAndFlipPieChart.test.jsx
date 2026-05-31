import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FixAndFlipPieChart from "./FixAndFlipPieChart";

const sampleSummary = {
  purchasePrice: 100000,
  totalRehab: 30000,
  pointsCost: 2000,
  totalInterest: 5000,
  miscFees: 1500,
  netProfit: 25000,
};

describe("FixAndFlipPieChart", () => {
  it("renders nothing when all slice values are 0", () => {
    const { container } = render(<FixAndFlipPieChart summary={{}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders slice labels and percentages", () => {
    render(<FixAndFlipPieChart summary={sampleSummary} />);
    expect(screen.getByText("Purchase Price")).toBeInTheDocument();
    expect(screen.getByText("Total Rehab")).toBeInTheDocument();
    expect(screen.getByText("Net Profit")).toBeInTheDocument();
  });

  it("shows ARV label in center when net profit is positive", () => {
    render(<FixAndFlipPieChart summary={sampleSummary} />);
    expect(screen.getByText("ARV")).toBeInTheDocument();
  });

  it("shows Total Costs label when net profit is missing", () => {
    render(
      <FixAndFlipPieChart
        summary={{
          purchasePrice: 100000,
          totalRehab: 30000,
        }}
      />,
    );
    expect(screen.getByText("Total Costs")).toBeInTheDocument();
  });

  it("filters out zero-value slices from the legend", () => {
    render(
      <FixAndFlipPieChart
        summary={{
          purchasePrice: 100000,
          totalRehab: 0,
          pointsCost: 0,
        }}
      />,
    );
    expect(screen.queryByText("Total Rehab")).not.toBeInTheDocument();
  });

  it("formats slice values as currency in the legend", () => {
    render(<FixAndFlipPieChart summary={sampleSummary} />);
    expect(screen.getByText("$100,000.00")).toBeInTheDocument();
    expect(screen.getByText("$25,000.00")).toBeInTheDocument();
  });
});
