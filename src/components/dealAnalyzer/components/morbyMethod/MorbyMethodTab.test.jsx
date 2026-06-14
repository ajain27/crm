import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MorbyMethodTab from "./MorbyMethodTab";

const tab = {
  eyebrow: "Morby Method",
  title: "DSCR + seller carryback",
  description: "Stack a first lien with a seller-carried second.",
  prompts: ["Verify carryback terms", "Confirm DSCR qualifying ratio"],
};

function fillRequired({
  purchasePrice = "300000",
  dscrRate = "8",
  dscrTermYears = "30",
  sellerCarryback = "20",
  sellerCarrybackTermYears = "10",
  monthlyRent = "2500",
} = {}) {
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  fireEvent.change(screen.getByLabelText(/^Interest Rate/i), {
    target: { value: dscrRate },
  });
  fireEvent.change(screen.getByLabelText(/Loan Term/i), {
    target: { value: dscrTermYears },
  });
  fireEvent.change(screen.getByLabelText(/Seller Carryback \(%\)/i), {
    target: { value: sellerCarryback },
  });
  fireEvent.change(screen.getByLabelText(/^Note Term/i), {
    target: { value: sellerCarrybackTermYears },
  });
  fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
    target: { value: monthlyRent },
  });
}

describe("MorbyMethodTab", () => {
  it("renders hero and prompts", () => {
    render(<MorbyMethodTab tab={tab} />);
    expect(screen.getByText("Morby Method")).toBeInTheDocument();
    expect(screen.getByText("Verify carryback terms")).toBeInTheDocument();
    expect(screen.getByText("Morby Method Inputs")).toBeInTheDocument();
  });

  it("formats Purchase Price as currency", () => {
    render(<MorbyMethodTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    expect(screen.getByLabelText(/Purchase Price/i)).toHaveValue("$300,000");
  });

  it("computes Down Payment as 20% of purchase price", () => {
    render(<MorbyMethodTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    // 20% of 300,000 = 60,000
    expect(screen.getByDisplayValue("$60,000.00")).toBeInTheDocument();
  });

  it("Calculate button disabled until required fields are filled", () => {
    render(<MorbyMethodTab tab={tab} />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("Calculate produces a summary once required fields are filled", () => {
    render(<MorbyMethodTab tab={tab} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("Monthly Cash Flow").length).toBeGreaterThan(0);
  });

  it("renders the Additional Lenders section", () => {
    render(<MorbyMethodTab tab={tab} />);
    expect(screen.getByText("Additional Lenders")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Lender/i }),
    ).toBeInTheDocument();
  });

  it("clears the summary when an input changes after calculating", () => {
    render(<MorbyMethodTab tab={tab} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("Monthly Cash Flow").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "3000" },
    });
    expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();
  });

  it("shows Buyer Cash to Close once purchase price is set", () => {
    render(<MorbyMethodTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toBeInTheDocument();
  });

  it("Buyer Cash to Close goes to 0 when seller carryback fully covers upfront", () => {
    render(<MorbyMethodTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Carryback \(%\)/i), {
      target: { value: "66" },
    });
    // 60k down + upfront costs — 66% seller carryback (~198k) covers it
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue("$0.00");
  });
});
