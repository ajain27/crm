import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RentalTab from "./RentalTab";

const tab = {
  eyebrow: "Rental Analysis",
  title: "Cash flow & returns",
  description: "Evaluate a rental property.",
  prompts: ["Verify rent estimate", "Confirm DSCR rate"],
};

// ─── Cash mode scenario ────────────────────────────────────────────────────────
// Purchase = $200,000 | Agent Commission = 3% = $6,000
// Closing Costs = 2% = $4,000 | Title Fees = 1% = $2,000 | Inspection = $450
// Rent = $2,000 | Prop Mgmt = 10% = $200 | Insurance/mo = $100 | Taxes/mo = $100
// First Month Prop Mgmt = 50% = $1,000 | Adjustment = $800
// Monthly CF = $2,000 − $200 − $100 − $100 = $1,600
// Annual CF  = ($1,600 × 12) − $800 = $18,400
// Total Funds Needed = $200,000 + $4,000 + $2,000 + $6,000 + $450 = $212,450
// Cap Rate = ($1,600 × 12 / $200,000) × 100 = 9.6%

// ─── Loan (DSCR) mode scenario ─────────────────────────────────────────────────
// Purchase = $200,000 | Down = 20% = $40,000 | Loan = 80% = $160,000
// Points = 2% → $3,200 | Rate = 12%/yr | Term = 30 yr → PMT amortized
// Upfront Loan = $40,000 (down) + $3,200 (points) = $43,200
// Agent Commission = 3% = $6,000 | Closing = $4,000 | Title = $2,000 | Inspection = $450
// Total Cash Needed = $43,200 + $4,000 + $2,000 + $6,000 + $450 = $55,650
// (Insurance & Taxes are calculated monthly, not upfront)

function fillCash({
  purchasePrice = "200000",
  agentCommission = "3",
  titleFees = "1",
  monthlyRent = "2000",
  yearlyInsurance = "1200",
  yearlyTaxes = "1200",
} = {}) {
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  if (agentCommission) {
    fireEvent.change(screen.getByLabelText(/Agent Commission \(%\)/i), {
      target: { value: agentCommission },
    });
  }
  if (titleFees) {
    fireEvent.change(screen.getByLabelText(/Title Fees \(%\)/i), {
      target: { value: titleFees },
    });
  }
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

function switchToLoan() {
  fireEvent.click(screen.getByRole("button", { name: /^DSCR$/i }));
}

function fillLoan({
  purchasePrice = "200000",
  agentCommission = "3",
  titleFees = "1",
  points = "2",
  interestRate = "12",
  loanTermYears = "30",
  monthlyRent = "2000",
  yearlyInsurance = "1200",
  yearlyTaxes = "1200",
} = {}) {
  switchToLoan();
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  if (agentCommission) {
    fireEvent.change(screen.getByLabelText(/Agent Commission \(%\)/i), {
      target: { value: agentCommission },
    });
  }
  if (titleFees) {
    fireEvent.change(screen.getByLabelText(/Title Fees \(%\)/i), {
      target: { value: titleFees },
    });
  }
  if (points) {
    fireEvent.change(screen.getByLabelText(/Points \(%\)/i), {
      target: { value: points },
    });
  }
  fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
    target: { value: interestRate },
  });
  fireEvent.change(screen.getByLabelText(/Loan Term \(Years\)/i), {
    target: { value: loanTermYears },
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

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders hero content from tab prop", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByText("Rental Analysis")).toBeInTheDocument();
    expect(screen.getByText("Cash flow & returns")).toBeInTheDocument();
    expect(screen.getByText("Evaluate a rental property.")).toBeInTheDocument();
  });

  it("renders all prompt cards", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByText("Verify rent estimate")).toBeInTheDocument();
    expect(screen.getByText("Confirm DSCR rate")).toBeInTheDocument();
  });

  it("does not show summary on initial render", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();
  });

  it("renders Cash, Loan and HELOC toggle buttons", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByRole("button", { name: /^Cash$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^DSCR$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^HELOC$/i }),
    ).toBeInTheDocument();
  });

  it("shows HELOC fields after switching to HELOC mode", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.click(screen.getByRole("button", { name: /^HELOC$/i }));
    expect(screen.getByLabelText(/HELOC Interest Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Term \(Years\)/i)).toBeInTheDocument();
  });

  it("defaults to Cash mode — no loan fields shown", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.queryByLabelText(/Points \(%\)/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Interest Rate/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Loan Term \(Years\)/i),
    ).not.toBeInTheDocument();
  });

  it("shows DSCR fields after switching to Loan mode", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    expect(screen.getByLabelText(/Points \(%\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Interest Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Loan Term \(Years\)/i)).toBeInTheDocument();
  });

  it("renders the Calculate button", () => {
    render(<RentalTab tab={tab} />);
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).toBeInTheDocument();
  });

  it("renders section labels", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByText("Purchase & Acquisition")).toBeInTheDocument();
    expect(screen.getByText("Income & Expenses")).toBeInTheDocument();
  });
});

// ─── Input formatting ─────────────────────────────────────────────────────────

describe("input formatting", () => {
  it("formats Purchase Price as currency while typing", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Purchase Price/i);
    fireEvent.change(input, { target: { value: "200000" } });
    expect(input).toHaveValue("$200,000");
  });

  it("formats Estimated Monthly Rent as currency while typing", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Estimated Monthly Rent/i);
    fireEvent.change(input, { target: { value: "1800" } });
    expect(input).toHaveValue("$1,800");
  });

  it("formats Yearly Home Insurance as currency while typing", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Yearly Home Insurance/i);
    fireEvent.change(input, { target: { value: "100" } });
    expect(input).toHaveValue("$100");
  });

  it("formats Yearly Property Taxes as currency while typing", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Yearly Property Taxes/i);
    fireEvent.change(input, { target: { value: "200" } });
    expect(input).toHaveValue("$200");
  });

  it("appends % to Agent Commission on blur", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Agent Commission \(%\)/i);
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("3%");
  });

  it("appends % to Points on blur (loan mode)", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    const input = screen.getByLabelText(/Points \(%\)/i);
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("2%");
  });

  it("appends % to Interest Rate on blur (loan mode)", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    const input = screen.getByLabelText(/Interest Rate/i);
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("12%");
  });

  it("strips non-digits from Loan Term (loan mode)", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    const input = screen.getByLabelText(/Loan Term \(Years\)/i);
    fireEvent.change(input, { target: { value: "30 years" } });
    expect(input).toHaveValue("30");
  });
});

// ─── Live readonly fields ─────────────────────────────────────────────────────

describe("live readonly fields", () => {
  it("Closing Costs updates as 2% of purchase price", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    expect(screen.getByLabelText(/Closing Costs/i)).toHaveValue("$4,000.00");
  });

  it("Agent Commission Amount appears when commission is entered", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Agent Commission \(%\)/i), {
      target: { value: "3" },
    });
    expect(screen.getByLabelText(/Agent Commission Amount/i)).toHaveValue(
      "$6,000.00",
    );
  });

  it("Property Management shows 10% of rent live", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });
    expect(screen.getByLabelText(/Property Management/i)).toHaveValue(
      "$200.00",
    );
  });

  it("Property Management is empty before rent is entered", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByLabelText(/Property Management/i)).toHaveValue("");
  });

  it("shows Title Fees amount when percentage entered", () => {
    render(<RentalTab tab={tab} />);
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

  it("shows Down Payment as 20% of purchase price in loan mode", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    // 20% of $200,000 = $40,000
    expect(screen.getByLabelText(/Down Payment.*20%/i)).toHaveValue(
      "$40,000.00",
    );
  });

  it("calculates Monthly Mortgage (PMT) in loan mode", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/Loan Term \(Years\)/i), {
      target: { value: "30" },
    });
    // PMT for $160k at 12%/yr for 30 years — just verify it's non-empty
    expect(screen.getByLabelText(/Monthly Mortgage/i).value).not.toBe("");
  });
});

// ─── Calculate button state ───────────────────────────────────────────────────

describe("Calculate button", () => {
  it("is disabled on initial render", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("stays disabled after only Purchase Price is filled (cash mode)", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("becomes enabled once purchase price and rent filled (cash mode)", () => {
    render(<RentalTab tab={tab} />);
    fillCash({ agentCommission: "", yearlyInsurance: "", yearlyTaxes: "" });
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });

  it("stays disabled in loan mode until rate and term are filled", () => {
    render(<RentalTab tab={tab} />);
    switchToLoan();
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });
    // missing interestRate and loanTermYears
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("becomes enabled once all loan-mode required fields filled", () => {
    render(<RentalTab tab={tab} />);
    fillLoan({ points: "", yearlyInsurance: "", yearlyTaxes: "" });
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });
});

// ─── Cash mode summary ────────────────────────────────────────────────────────

describe("cash mode summary", () => {
  it("shows summary after clicking Calculate", () => {
    render(<RentalTab tab={tab} />);
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Monthly Cash Flow").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("calculates monthly cash flow (no mortgage in cash mode)", () => {
    render(<RentalTab tab={tab} />);
    // Rent=$2,000 − PropMgmt=$200 − Insurance=$100 − Taxes=$100 = $1,600
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$1,600.00").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates annual cash flow in cash mode", () => {
    render(<RentalTab tab={tab} />);
    // $1,600 × 12 = $19,200
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$19,200.00")).toBeInTheDocument();
  });

  it("shows Total Funds Needed including full purchase price in cash mode", () => {
    render(<RentalTab tab={tab} />);
    // $200,000 + $4,000 + $2,000 + $6,000 + $375 = $212,375
    // (Insurance & Taxes are calculated monthly, not upfront)
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Total Funds Needed")).toBeInTheDocument();
    expect(screen.getAllByText("$212,375.00").length).toBeGreaterThanOrEqual(1);
  });

  it("does not show DSCR in cash mode", () => {
    render(<RentalTab tab={tab} />);
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    // "DSCR" appears as the toggle button label; confirm no DSCR summary row exists
    expect(
      screen.queryByText(/^DSCR$/i, { selector: "span" }),
    ).not.toBeInTheDocument();
  });

  it("calculates cap rate in cash mode", () => {
    render(<RentalTab tab={tab} />);
    // NOI = $1,600/mo | ($1,600 × 12 / $200,000) × 100 = 9.6%
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("9.6%")).toBeInTheDocument();
  });

  it("shows closing cost and inspection in one-time costs", () => {
    render(<RentalTab tab={tab} />);
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Closing Costs (2% of price)")).toBeInTheDocument();
    expect(screen.getByText("Inspection Cost")).toBeInTheDocument();
  });

  it("shows purchase price in one-time costs in cash mode", () => {
    render(<RentalTab tab={tab} />);
    fillCash({ agentCommission: "", yearlyInsurance: "", yearlyTaxes: "" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("Purchase Price").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("shows negative cash flow when expenses exceed rent", () => {
    render(<RentalTab tab={tab} />);
    fillCash({ monthlyRent: "100" });
    // Add a large annual misc expense ($24,000/yr = $2,000/mo) to push cash flow negative
    fireEvent.change(screen.getByLabelText(/Annual Miscellaneous Expense/i), {
      target: { value: "24000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    const verdictEl = document.querySelector(".deal-analyzer-verdict-negative");
    expect(verdictEl).toBeTruthy();
  });

  it("omits insurance and taxes when not provided", () => {
    render(<RentalTab tab={tab} />);
    fillCash({ yearlyInsurance: "", yearlyTaxes: "" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.queryByText("Home Insurance")).not.toBeInTheDocument();
    expect(screen.queryByText("Property Taxes")).not.toBeInTheDocument();
  });

  it("clears summary when input changes after calculating", () => {
    render(<RentalTab tab={tab} />);
    fillCash();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Monthly Cash Flow").length,
    ).toBeGreaterThanOrEqual(1);
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2500" },
    });
    expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();
  });
});

// ─── Loan mode summary ────────────────────────────────────────────────────────

describe("loan mode summary", () => {
  it("shows monthly mortgage in expenses in loan mode", () => {
    render(<RentalTab tab={tab} />);
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getByText(/Monthly Mortgage \(DSCR 12%/i),
    ).toBeInTheDocument();
  });

  it("shows Total Cash Needed to Buy label in loan mode", () => {
    render(<RentalTab tab={tab} />);
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Total Cash Needed to Buy").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("includes down payment, upfront costs, closing, title, commission and inspection in total", () => {
    render(<RentalTab tab={tab} />);
    // Down $40k + Points $3.2k + Closing $4k + Title $2k + Commission $6k + Inspection $375 = $55,575
    // (Insurance & Taxes now calculated monthly)
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$55,575.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows DSCR in loan mode", () => {
    render(<RentalTab tab={tab} />);
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    // DSCR summary row is a <span> inside the results section
    expect(
      screen.getByText(/^DSCR$/i, { selector: "span" }),
    ).toBeInTheDocument();
    const dscrEl = document.querySelector(
      ".deal-analyzer-return-positive, .deal-analyzer-return-negative",
    );
    expect(dscrEl).toBeTruthy();
  });

  it("shows points breakdown in one-time costs", () => {
    render(<RentalTab tab={tab} />);
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Points (2%)")).toBeInTheDocument();
    // $160,000 × 2% = $3,200
    expect(screen.getByText("$3,200.00")).toBeInTheDocument();
  });

  it("calculates cap rate the same as cash mode", () => {
    render(<RentalTab tab={tab} />);
    // NOI = $2,000 - $200 (prop mgmt) - $100 (ins) - $100 (tax) = $1,600
    // Cap Rate = ($1,600 × 12 / $200,000) × 100 = 9.6%
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("9.6%")).toBeInTheDocument();
  });

  it("clears summary when switching finance type", () => {
    render(<RentalTab tab={tab} />);
    fillLoan();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Monthly Cash Flow").length,
    ).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("button", { name: /^Cash$/i }));
    expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();
  });
});
