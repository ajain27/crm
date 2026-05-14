import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RentalTab from "./RentalTab";

const tab = {
  eyebrow: "Rental Analysis",
  title: "Cash flow & returns",
  description: "Evaluate a rental property.",
  prompts: ["Verify rent estimate", "Confirm DSCR rate"],
};

// ─── Base scenario ─────────────────────────────────────────────────────────────
// Purchase = $360,000 | Down = 10% = $36,000 | Loan = $324,000
// Rate = 0% (interest-free) | Term = 30yr → Mortgage = $324,000 / 360 = $900/mo
// Rent = $2,000 | Prop Mgmt = 10% = $200 | Insurance = $100 | Taxes = $100
// Agent Commission = 3% of $360,000 = $10,800
// Closing Costs = 2% of $360,000 = $7,200
// First Month Prop Mgmt = 50% = $1,000 | First Month Adjustment = $800
// Inspection Cost = $450 | Total Funds Needed = $54,450
//
// Total Expenses = $900 + $200 + $100 + $100 = $1,300
// Monthly Cash Flow = $2,000 − $1,300 = $700
// Annual Cash Flow  = ($700 × 12) − $800 = $7,600
// NOI (monthly)     = $2,000 − $200 − $100 − $100 = $1,600
// DSCR              = $1,600 / $900 = 1.78
// Cash-on-Cash      = $7,600 / $54,450 × 100 = 14.0%
// Cap Rate          = ($1,600 × 12 / $360,000) × 100 = 5.3%

function fillFields({
  purchasePrice = "360000",
  downPayment = "10",
  agentCommission = "3",
  dscrRate = "0",
  loanTerm = "30",
  monthlyRent = "2000",
  monthlyInsurance = "100",
  monthlyTaxes = "100",
} = {}) {
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  fireEvent.change(screen.getByLabelText(/Down Payment \(%\)/i), {
    target: { value: downPayment },
  });
  fireEvent.change(screen.getByLabelText(/Agent Commission \(%\)/i), {
    target: { value: agentCommission },
  });
  fireEvent.change(screen.getByLabelText(/DSCR Interest Rate/i), {
    target: { value: dscrRate },
  });
  fireEvent.change(screen.getByLabelText(/Loan Term/i), {
    target: { value: loanTerm },
  });
  fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
    target: { value: monthlyRent },
  });
  if (monthlyInsurance) {
    fireEvent.change(screen.getByLabelText(/Monthly Home Insurance/i), {
      target: { value: monthlyInsurance },
    });
  }
  if (monthlyTaxes) {
    fireEvent.change(screen.getByLabelText(/Monthly Property Taxes/i), {
      target: { value: monthlyTaxes },
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

  it("renders both form section labels", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByText("Purchase & Financing")).toBeInTheDocument();
    expect(screen.getByText("Income & Expenses")).toBeInTheDocument();
  });

  it("defaults Loan Term to 30", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByLabelText(/Loan Term/i)).toHaveValue("30");
  });

  it("renders the Calculate button", () => {
    render(<RentalTab tab={tab} />);
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).toBeInTheDocument();
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

  it("formats Monthly Home Insurance as currency while typing", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Monthly Home Insurance/i);
    fireEvent.change(input, { target: { value: "100" } });
    expect(input).toHaveValue("$100");
  });

  it("formats Monthly Property Taxes as currency while typing", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Monthly Property Taxes/i);
    fireEvent.change(input, { target: { value: "200" } });
    expect(input).toHaveValue("$200");
  });

  it("strips non-digits from Loan Term", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Loan Term/i);
    fireEvent.change(input, { target: { value: "30 years" } });
    expect(input).toHaveValue("30");
  });

  it("appends % to Down Payment on blur", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Down Payment \(%\)/i);
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("20%");
  });

  it("appends % to Agent Commission on blur", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/Agent Commission \(%\)/i);
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("3%");
  });

  it("appends % to DSCR Interest Rate on blur", () => {
    render(<RentalTab tab={tab} />);
    const input = screen.getByLabelText(/DSCR Interest Rate/i);
    fireEvent.change(input, { target: { value: "7.5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("7.5%");
  });
});

// ─── Live readonly fields ─────────────────────────────────────────────────────

describe("live readonly fields", () => {
  it("Down Payment Amount updates as purchase price and down % change", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Down Payment \(%\)/i), {
      target: { value: "20" },
    });
    // 200,000 × 20% = $40,000
    expect(screen.getByLabelText(/Down Payment Amount/i)).toHaveValue(
      "$40,000.00",
    );
  });

  it("Loan Amount = Purchase Price − Down Payment Amount", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Down Payment \(%\)/i), {
      target: { value: "20" },
    });
    // 200,000 − 40,000 = $160,000
    expect(screen.getByLabelText(/Loan Amount/i)).toHaveValue("$160,000.00");
  });

  it("Agent Commission Amount updates as purchase price and percent change", () => {
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
    // 10% of $2,000 = $200
    expect(screen.getByLabelText(/Property Management/i)).toHaveValue(
      "$200.00",
    );
  });

  it("Property Management is empty before rent is entered", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByLabelText(/Property Management/i)).toHaveValue("");
  });

  it("Monthly Mortgage updates when financing fields are filled (0% rate)", () => {
    render(<RentalTab tab={tab} />);
    // Loan = $360,000, rate = 0%, term = 30yr → $324,000/360 = $900/mo
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "360000" },
    });
    fireEvent.change(screen.getByLabelText(/Down Payment \(%\)/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/DSCR Interest Rate/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "30" },
    });
    expect(screen.getByLabelText(/Monthly Mortgage/i)).toHaveValue("$900.00");
  });

  it("Closing Costs updates as 2% of purchase price", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "360000" },
    });
    expect(screen.getByLabelText(/Closing Costs/i)).toHaveValue("$7,200.00");
  });
});

// ─── Calculate button state ───────────────────────────────────────────────────

describe("Calculate button", () => {
  it("is disabled on initial render", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("stays disabled after only Purchase Price is filled", () => {
    render(<RentalTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("becomes enabled once all required fields are filled", () => {
    render(<RentalTab tab={tab} />);
    fillFields();
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });
});

// ─── Summary calculations ────────────────────────────────────────────────────

describe("summary calculations", () => {
  it("shows summary only after clicking Calculate", () => {
    render(<RentalTab tab={tab} />);
    expect(screen.queryByText("Monthly Cash Flow")).not.toBeInTheDocument();
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getAllByText("Monthly Cash Flow").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("calculates monthly mortgage correctly at 0% rate", () => {
    render(<RentalTab tab={tab} />);
    // Loan=$324,000, rate=0%, n=360 → $900/mo
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$900.00").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates property management as 10% of rent", () => {
    render(<RentalTab tab={tab} />);
    // Rent=$2,000 → Prop Mgmt=$200
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$200.00").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates monthly cash flow correctly", () => {
    render(<RentalTab tab={tab} />);
    // Expenses = $900 + $200 + $100 + $100 = $1,300 → CF = $2,000 - $1,300 = $700
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$700.00").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates annual cash flow = monthly × 12", () => {
    render(<RentalTab tab={tab} />);
    // ($700 × 12) − $800 first-month management adjustment = $7,600
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$7,600.00")).toBeInTheDocument();
  });

  it("calculates DSCR = NOI / mortgage", () => {
    render(<RentalTab tab={tab} />);
    // NOI = $2,000 - $200 - $100 - $100 = $1,600 | mortgage = $900 → 1.78
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("1.78")).toBeInTheDocument();
  });

  it("calculates cash-on-cash return = annual CF / down payment", () => {
    render(<RentalTab tab={tab} />);
    // $7,600 / $54,450 × 100 = 14.0%
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("14.0%")).toBeInTheDocument();
  });

  it("shows one-time commission, closing, first month management, and inspection costs", () => {
    render(<RentalTab tab={tab} />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Agent Commission (3%)")).toBeInTheDocument();
    expect(screen.getByText("Closing Costs (2% of price)")).toBeInTheDocument();
    expect(
      screen.getByText("First Month Property Management (50%)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Inspection Cost")).toBeInTheDocument();
    expect(screen.getByText("Total Funds Needed")).toBeInTheDocument();
    expect(screen.getByText("$54,450.00")).toBeInTheDocument();
  });

  it("calculates cap rate = annual NOI / purchase price", () => {
    render(<RentalTab tab={tab} />);
    // $1,600 × 12 / $360,000 × 100 = 5.3%
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("5.3%")).toBeInTheDocument();
  });

  it("shows the cash flow formula breakdown", () => {
    render(<RentalTab tab={tab} />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getByText(/Monthly Cash Flow = Rent − Mortgage − Prop\. Mgmt/i),
    ).toBeInTheDocument();
  });

  it("shows negative cash flow when expenses exceed rent", () => {
    render(<RentalTab tab={tab} />);
    // Rent=$500, Expenses will exceed rent
    fillFields({ monthlyRent: "500" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    // Cash flow should be negative — "$500 - $900 - $50 - $100 - $100 < 0"
    const cashFlowEl = screen.getAllByText(/−?\$[\d,]+\.\d{2}/)[0];
    expect(cashFlowEl).toBeDefined();
    // The summary verdict uses deal-analyzer-verdict-negative class for negative CF
    const verdictEl = document.querySelector(".deal-analyzer-verdict-negative");
    expect(verdictEl).toBeTruthy();
  });

  it("shows optional insurance and taxes in expenses when provided", () => {
    render(<RentalTab tab={tab} />);
    fillFields({ monthlyInsurance: "100", monthlyTaxes: "100" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Home Insurance")).toBeInTheDocument();
    expect(screen.getByText("Property Taxes")).toBeInTheDocument();
  });

  it("omits insurance and taxes from expenses when not provided", () => {
    render(<RentalTab tab={tab} />);
    fillFields({ monthlyInsurance: "", monthlyTaxes: "" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.queryByText("Home Insurance")).not.toBeInTheDocument();
    expect(screen.queryByText("Property Taxes")).not.toBeInTheDocument();
  });

  it("DSCR ≥ 1 shows positive class when income covers debt", () => {
    render(<RentalTab tab={tab} />);
    fillFields(); // DSCR = 1.78
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    const dscrEl = screen.getByText("1.78");
    expect(dscrEl.className).toContain("deal-analyzer-return-positive");
  });

  it("DSCR < 1 shows negative class when income does not cover debt", () => {
    render(<RentalTab tab={tab} />);
    // Low rent relative to mortgage: rent=500, expenses=1300 → DSCR < 1
    fillFields({ monthlyRent: "500", monthlyInsurance: "", monthlyTaxes: "" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    // NOI = 500 - 50 = 450, mortgage = 900 → DSCR = 0.50
    const dscrEl = screen.getByText("0.50");
    expect(dscrEl.className).toContain("deal-analyzer-return-negative");
  });

  it("clears summary when any input changes after calculating", () => {
    render(<RentalTab tab={tab} />);
    fillFields();
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
