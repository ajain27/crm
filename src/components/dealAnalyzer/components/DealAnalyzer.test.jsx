import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("./fixAndFlip/FixAndFlipTab", () => ({
  default: () => <div>fix-flip-stub</div>,
}));
vi.mock("./subTo/SubToTab", () => ({
  default: () => <div>subto-stub</div>,
}));
vi.mock("./wholesale/WholesaleTab", () => ({
  default: () => <div>wholesale-stub</div>,
}));
vi.mock("./multiFamily/MultiFamilyTab", () => ({
  default: () => <div>multi-family-stub</div>,
}));
vi.mock("./novation/NovationTab", () => ({
  default: () => <div>novation-stub</div>,
}));
vi.mock("./rental/RentalTab", () => ({
  default: () => <div>rental-stub</div>,
}));
vi.mock("./findComps/FindCompsTab", () => ({
  default: () => <div>find-comps-stub</div>,
}));

const { default: DealAnalyzer } = await import("./DealAnalyzer");

describe("DealAnalyzer", () => {
  it("renders the deal analyzer tabs", () => {
    render(<DealAnalyzer />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("starts on the Find Comps tab", () => {
    render(<DealAnalyzer />);
    expect(screen.getByText("find-comps-stub")).toBeInTheDocument();
  });

  it("renders a tab button for each analyzer", () => {
    render(<DealAnalyzer />);
    [
      "Find Comps",
      "Wholesale",
      "Rental",
      "Fix N Flip",
      "Sub-To",
      "Multi-Family",
      "Novation",
    ].forEach((label) => {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    });
  });

  it("switches to Wholesale when its tab is clicked", () => {
    render(<DealAnalyzer />);
    fireEvent.click(screen.getByRole("tab", { name: "Wholesale" }));
    expect(screen.getByText("wholesale-stub")).toBeInTheDocument();
    expect(screen.queryByText("find-comps-stub")).not.toBeInTheDocument();
  });

  it("marks the active tab with aria-selected", () => {
    render(<DealAnalyzer />);
    fireEvent.click(screen.getByRole("tab", { name: "Rental" }));
    expect(
      screen.getByRole("tab", { name: "Rental" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen
        .getByRole("tab", { name: "Wholesale" })
        .getAttribute("aria-selected"),
    ).toBe("false");
  });
});
