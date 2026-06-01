import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RentalHELOCTab from "./RentalHELOCTab";

// ─── HELOC scenario ────────────────────────────────────────────────────────────
// Purchase = $200,000 financed 100% via HELOC | Rate = 8%/yr | Term = 10 yr
// Monthly HELOC PMT ≈ $2,426.55
// Rent = $3,000 | Prop Mgmt = 10% = $300
// Yearly Insurance = $1,200 → $100/mo | Yearly Taxes = $3,000 → $250/mo
// First Month Prop Mgmt = 50% = $1,500 | Adjustment = $1,200

function fill({
  purchasePrice = "200000",
  titleFees = "1",
  helocInterestRate = "8",
  helocTermYears = "10",
  monthlyRent = "3000",
  yearlyInsurance = "1200",
  yearlyTaxes = "3000",
} = {}) {
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  if (titleFees) {
    fireEvent.change(screen.getByLabelText(/Title Fees \(%\)/i), {
      target: { value: titleFees },
    });
  }
  fireEvent.change(screen.getByLabelText(/HELOC Interest Rate/i), {
    target: { value: helocInterestRate },
  });
  fireEvent.change(screen.getByLabelText(/Term \(Years\)/i), {
    target: { value: helocTermYears },
  });
  fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
    target: { value: monthlyRent },
  });
  if (yearlyInsurance) {
    fireEvent.change(screen.getByLabelText(/Yearly Home Insurance/i), {
      target: { value: yearlyInsurance },
    });
  }
  if (yearlyTaxes) {
    fireEvent.change(screen.getByLabelText(/Yearly Property Taxes/i), {
      target: { value: yearlyTaxes },
    });
  }
}

describe("RentalHELOCTab", () => {
  it("renders the HELOC section", () => {
    render(<RentalHELOCTab />);
    expect(screen.getByText("HELOC")).toBeInTheDocument();
  });

  it("renders the requested input fields", () => {
    render(<RentalHELOCTab />);
    expect(screen.getByLabelText(/Purchase Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/HELOC Interest Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Term \(Years\)/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Estimated Monthly Rent/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Yearly Home Insurance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Yearly Property Taxes/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Annual Miscellaneous Expense/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Title Fees \(%\)/i)).toBeInTheDocument();
  });

  it("computes Closing Costs as 2% of purchase price", () => {
    render(<RentalHELOCTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    expect(screen.getByLabelText(/Closing Costs/i)).toHaveValue("$4,000.00");
  });

  it("shows Title Fees Amount when a percentage is entered", () => {
    render(<RentalHELOCTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Title Fees \(%\)/i), {
      target: { value: "1" },
    });
    // 1% of $200,000 = $2,000
    expect(screen.getByLabelText(/Title Fees Amount/i)).toHaveValue(
      "$2,000.00",
    );
  });

  it("formats Purchase Price as currency while typing", () => {
    render(<RentalHELOCTab />);
    const input = screen.getByLabelText(/Purchase Price/i);
    fireEvent.change(input, { target: { value: "200000" } });
    expect(input).toHaveValue("$200,000");
  });

  it("appends % to HELOC Interest Rate on blur", () => {
    render(<RentalHELOCTab />);
    const input = screen.getByLabelText(/HELOC Interest Rate/i);
    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("8%");
  });

  it("strips non-digits from Term (Years)", () => {
    render(<RentalHELOCTab />);
    const input = screen.getByLabelText(/Term \(Years\)/i);
    fireEvent.change(input, { target: { value: "10 years" } });
    expect(input).toHaveValue("10");
  });

  it("computes the Monthly HELOC Payment live", () => {
    render(<RentalHELOCTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/HELOC Interest Rate/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText(/Term \(Years\)/i), {
      target: { value: "10" },
    });
    // PMT for $200k at 8%/yr over 10 yr ≈ $2,426.55
    expect(screen.getByLabelText(/Monthly HELOC Payment/i)).toHaveValue(
      "$2,426.55",
    );
  });

  it("Calculate is disabled before required fields are set", () => {
    render(<RentalHELOCTab />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("Calculate becomes enabled once all required fields filled", () => {
    render(<RentalHELOCTab />);
    fill({ yearlyInsurance: "", yearlyTaxes: "" });
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });

  it("shows the summary after clicking Calculate", () => {
    render(<RentalHELOCTab />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Monthly Cash Flow").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("includes the HELOC payment in monthly expenses", () => {
    render(<RentalHELOCTab />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getByText(/Monthly HELOC Payment \(8%, 10 yr\)/i),
    ).toBeInTheDocument();
  });

  it("calculates monthly cash flow including HELOC payment, taxes and insurance", () => {
    render(<RentalHELOCTab />);
    // $3,000 − $2,426.55 (HELOC) − $300 (mgmt) − $100 (ins) − $250 (tax) = −$76.55
    // Summary amounts render rounded to whole dollars via AnimatedAmount → -$77.00
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("-$77.00").length).toBeGreaterThanOrEqual(1);
  });

  it("includes closing costs, title fees and inspection in cash needed to close", () => {
    render(<RentalHELOCTab />);
    // Closing $4,000 + Title $2,000 + First Month Mgmt $1,500 + Inspection $450 = $7,950
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Total Cash Needed to Close").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Closing Costs (2% of price)")).toBeInTheDocument();
    expect(screen.getByText("Title Fees (1%)")).toBeInTheDocument();
    expect(screen.getByText("$7,950.00")).toBeInTheDocument();
  });

  it("clears summary when an input changes after calculating", () => {
    render(<RentalHELOCTab />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Monthly Cash Flow").length,
    ).toBeGreaterThanOrEqual(1);
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "3500" },
    });
    expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();
  });
});
