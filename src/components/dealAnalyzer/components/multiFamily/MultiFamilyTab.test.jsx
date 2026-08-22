import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiFamilyTab from "./MultiFamilyTab";

const tab = {
  eyebrow: "Multi-Family Analysis",
  title: "Rental income & returns",
  description: "Analyze NOI, cap rate, cash flow, and cash-on-cash return.",
  prompts: ["Confirm rents with local comps", "Stress-test vacancy rates"],
};

// ─── Base scenario (0% interest for clean mortgage math) ─────────────────────
// Purchase=$400k, 4 units, Rent=$1,200/unit, Vacancy=5%, Down=25%, Rate=0%, Term=30yr
//
// Gross Monthly Rent  = 1,200 × 4               = $4,800.00
// Vacancy Loss        = 4,800 × 5%              = $240.00
// EGI                 = 4,800 − 240             = $4,560.00
// Operating Expenses  = 4,560 × 35%             = $1,596.00
// Monthly NOI         = 4,560 − 1,596           = $2,964.00
// Annual NOI          = 2,964 × 12              = $35,568.00
// Cap Rate            = 35,568 / 400,000 × 100  = 8.89%
// Down Payment        = 400,000 × 25%           = $100,000.00
// Loan Amount         = 400,000 − 100,000       = $300,000.00
// Monthly Mortgage    = 300,000 / 360           = $833.33  (0% rate)
// Monthly Cash Flow   = 2,964 − 833.33…         = $2,130.67
// Annual Cash Flow    = 2,130.66… × 12          = $25,568.00
// Closing Costs       = 400,000 × 2%             = $8,000.00
// Agent Commission    = 400,000 × 3%             = $12,000.00
// Total Cash Invested = 100,000 + 8,000 + 12,000 = $120,000.00
// CoC Return          = 25,568 / 120,000 × 100  = 21.31%
// GRM                 = 400,000 / (4,800 × 12)  = 6.94x
// Price Per Unit      = 400,000 / 4             = $100,000.00
// Verdict: DEAL (CF > 0, CoC ≥ 8%, Cap Rate ≥ 5%)

function fill({
  purchasePrice = "400000",
  numUnits = "4",
  rentPerUnit = "1200",
  vacancyRate = "5",
  downPayment = "25",
  interestRate = "0",
  loanTermYears = "30",
} = {}) {
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  fireEvent.change(screen.getByLabelText(/Number of Units/i), {
    target: { value: numUnits },
  });
  fireEvent.change(screen.getByLabelText(/Monthly Rent Per Unit/i), {
    target: { value: rentPerUnit },
  });
  fireEvent.change(screen.getByLabelText(/Vacancy Rate/i), {
    target: { value: vacancyRate },
  });
  fireEvent.blur(screen.getByLabelText(/Vacancy Rate/i));
  fireEvent.click(screen.getByLabelText(/Down Payment/i));
  fireEvent.click(screen.getByRole("option", { name: `${downPayment}%` }));
  fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
    target: { value: interestRate },
  });
  fireEvent.blur(screen.getByLabelText(/Interest Rate/i));
  fireEvent.change(screen.getByLabelText(/Loan Term/i), {
    target: { value: loanTermYears },
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders hero eyebrow, title, and description from tab prop", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(screen.getByText("Multi-Family Analysis")).toBeInTheDocument();
    expect(screen.getByText("Rental income & returns")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Analyze NOI, cap rate, cash flow, and cash-on-cash return.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all review prompt cards", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(
      screen.getByText("Confirm rents with local comps"),
    ).toBeInTheDocument();
    expect(screen.getByText("Stress-test vacancy rates")).toBeInTheDocument();
  });

  it("renders all form section labels", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(screen.getByText("Property & Acquisition")).toBeInTheDocument();
    expect(screen.getByText("Rental Income")).toBeInTheDocument();
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    expect(screen.getByText("Financing")).toBeInTheDocument();
  });

  it("renders the Calculate button", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).toBeInTheDocument();
  });

  it("does not show summary on initial render", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(screen.queryByText(/Final Verdict/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Monthly NOI/i)).not.toBeInTheDocument();
  });

  it("expense ratio field is pre-filled with 35% and is read-only", () => {
    render(<MultiFamilyTab tab={tab} />);
    const expenseRatio = screen.getByLabelText(/Expense Ratio/i);
    expect(expenseRatio).toHaveValue("35%");
    expect(expenseRatio).toHaveAttribute("readonly");
  });
});

// ─── Input formatting ─────────────────────────────────────────────────────────

describe("input formatting", () => {
  it("formats Purchase Price as currency while typing", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Purchase Price/i);
    fireEvent.change(field, { target: { value: "400000" } });
    expect(field).toHaveValue("$400,000");
  });

  it("formats Monthly Rent Per Unit as currency while typing", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Monthly Rent Per Unit/i);
    fireEvent.change(field, { target: { value: "1200" } });
    expect(field).toHaveValue("$1,200");
  });

  it("formats Additional Expenses as currency while typing", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Additional Expenses/i);
    fireEvent.change(field, { target: { value: "300" } });
    expect(field).toHaveValue("$300");
  });

  it("appends % to Vacancy Rate on blur", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Vacancy Rate/i);
    fireEvent.change(field, { target: { value: "5" } });
    fireEvent.blur(field);
    expect(field).toHaveValue("5%");
  });

  it("Down Payment defaults to 25% and offers 15%–70% in steps of 5", () => {
    render(<MultiFamilyTab tab={tab} />);
    const trigger = screen.getByLabelText(/Down Payment/i);
    expect(trigger).toHaveTextContent("25%");

    fireEvent.click(trigger);
    const options = screen
      .getAllByRole("option")
      .map((opt) => opt.textContent.replace(/\s+/g, " ").trim());
    expect(options).toEqual([
      "15%",
      "20%",
      "25%",
      "30%",
      "35%",
      "40%",
      "45%",
      "50%",
      "55%",
      "60%",
      "65%",
      "70%",
    ]);
  });

  it("changes the down payment when a listbox option is picked", () => {
    render(<MultiFamilyTab tab={tab} />);
    fireEvent.click(screen.getByLabelText(/Down Payment/i));
    fireEvent.click(screen.getByRole("option", { name: "40%" }));
    expect(screen.getByLabelText(/Down Payment/i)).toHaveTextContent("40%");
  });

  it("appends % to Interest Rate on blur", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Interest Rate/i);
    fireEvent.change(field, { target: { value: "7" } });
    fireEvent.blur(field);
    expect(field).toHaveValue("7%");
  });

  it("strips non-digits from Number of Units", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Number of Units/i);
    fireEvent.change(field, { target: { value: "4 units" } });
    expect(field).toHaveValue("4");
  });

  it("strips non-digits from Loan Term", () => {
    render(<MultiFamilyTab tab={tab} />);
    const field = screen.getByLabelText(/Loan Term/i);
    fireEvent.change(field, { target: { value: "30yr" } });
    expect(field).toHaveValue("30");
  });
});

// ─── Calculate button state ───────────────────────────────────────────────────

describe("Calculate button", () => {
  it("is disabled on initial render", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("stays disabled when only some required fields are filled", () => {
    render(<MultiFamilyTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "400000" },
    });
    fireEvent.change(screen.getByLabelText(/Number of Units/i), {
      target: { value: "4" },
    });
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("becomes enabled when all required fields are filled", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });
});

// ─── Income calculations ──────────────────────────────────────────────────────

describe("income calculations", () => {
  it("calculates gross monthly rent as rent per unit × number of units", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$4,800.00").length).toBeGreaterThanOrEqual(1); // 1,200 × 4
  });

  it("calculates vacancy loss and effective gross income", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$240.00")).toBeInTheDocument(); // vacancy loss
    expect(screen.getByText("$4,560.00")).toBeInTheDocument(); // EGI
  });

  it("includes other income in gross monthly income", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    // Other income $200 → gross income = 4,800 + 200 = $5,000
    // Vacancy = 5,000 × 5% = $250 → EGI = $4,750
    fireEvent.change(screen.getByLabelText(/Other Monthly Income/i), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$5,000.00")).toBeInTheDocument(); // gross income
    expect(screen.getByText("$250.00")).toBeInTheDocument(); // vacancy loss
    expect(screen.getByText("$4,750.00")).toBeInTheDocument(); // EGI
  });

  it("shows gross rent multiplier based on purchase price and gross rent", () => {
    // GRM = 400,000 / (4,800 × 12) = 6.94x
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("6.94x")).toBeInTheDocument();
  });
});

// ─── Expense calculations ─────────────────────────────────────────────────────

describe("expense calculations", () => {
  it("applies 35% expense ratio to effective gross income", () => {
    // EGI = $4,560 → 35% = $1,596
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$1,596.00")).toBeInTheDocument();
  });

  it("adds additional expenses on top of the 35% base", () => {
    // EGI = $4,560 → base = $1,596, additional = $300 → total = $1,896
    // Monthly NOI = $4,560 − $1,896 = $2,664
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.change(screen.getByLabelText(/Additional Expenses/i), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$1,896.00")).toBeInTheDocument(); // total expenses
    expect(screen.getByText("$2,664.00")).toBeInTheDocument(); // monthly NOI
  });

  it("calculates monthly and annual NOI correctly", () => {
    // Monthly NOI = $2,964, Annual NOI = $35,568
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$2,964.00")).toBeInTheDocument(); // monthly NOI
    expect(screen.getByText("$35,568.00")).toBeInTheDocument(); // annual NOI
  });
});

// ─── Financing calculations ───────────────────────────────────────────────────

describe("financing calculations", () => {
  it("calculates down payment amount and loan amount", () => {
    // Down = 25% × $400k = $100k, Loan = $300k
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$300,000.00")).toBeInTheDocument(); // loan amount
  });

  it("calculates monthly mortgage at 0% interest as loan / months", () => {
    // $300,000 / 360 = $833.33… → AnimatedAmount rounds to $833.00
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$833.00").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates monthly and annual cash flow", () => {
    // CF = $2,964 − $833.33… = $2,130.67 → AnimatedAmount rounds to $2,131.00
    // Annual CF = $2,130.66… × 12 = $25,568.00 (exact whole number)
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("$2,131.00").length).toBeGreaterThanOrEqual(1); // monthly CF (rounded)
    expect(screen.getAllByText("$25,568.00").length).toBeGreaterThanOrEqual(1); // annual CF
  });

  it("shows total cash invested and cash on cash return", () => {
    // Down=$100k + Closing(2%×400k=$8k) + Commission(3%×400k=$12k) = $120,000
    // CoC = $25,568 / $120,000 × 100 = 21.31%
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$120,000.00")).toBeInTheDocument();
    expect(screen.getByText("21.31%")).toBeInTheDocument();
  });

  it("includes rehab and auto closing costs in total cash invested", () => {
    // Down=$100k, Rehab=$10k, Closing(2%=$8k), Commission(3%=$12k) → Total=$130,000
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.change(screen.getByLabelText(/Rehab Cost/i), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("$130,000.00")).toBeInTheDocument();
  });
});

// ─── Summary sections ─────────────────────────────────────────────────────────

describe("summary sections", () => {
  it("shows summary only after clicking Calculate", () => {
    render(<MultiFamilyTab tab={tab} />);
    expect(screen.queryByText(/Final Verdict/i)).not.toBeInTheDocument();
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText(/Final Verdict/i)).toBeInTheDocument();
  });

  it("shows Monthly, Annual, and Acquisition & Returns section labels", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("Annual")).toBeInTheDocument();
    expect(screen.getByText("Acquisition & Returns")).toBeInTheDocument();
  });

  it("shows price per unit", () => {
    // $400,000 / 4 = $100,000
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Price Per Unit")).toBeInTheDocument();
  });

  it("shows cap rate in verdict banner and returns grid", () => {
    // Cap Rate = 8.89%
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("8.89%").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the CoC formula calculation breakdown", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getByText(
        /Cash on Cash Return = Annual Cash Flow ÷ Total Cash Invested/i,
      ),
    ).toBeInTheDocument();
  });

  it("clears summary when any input changes after calculating", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText(/Final Verdict/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "500000" },
    });
    expect(screen.queryByText(/Final Verdict/i)).not.toBeInTheDocument();
  });
});

// ─── Final verdict ────────────────────────────────────────────────────────────

describe("final verdict", () => {
  it("shows Deal when cash flow is positive, CoC ≥ 8%, and cap rate ≥ 5%", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill(); // CF=$2,130.67, CoC=21.31%, CapRate=8.89% → DEAL
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Deal")).toBeInTheDocument();
  });

  it("shows cap rate meets threshold banner when cap rate ≥ 5%", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText(/Meets Threshold/i)).toBeInTheDocument();
  });

  it("shows No Deal when cap rate is below 5%", () => {
    // Purchase=$800k, same rents → Cap Rate = 35,568/800,000 × 100 = 4.45% < 5%
    render(<MultiFamilyTab tab={tab} />);
    fill({ purchasePrice: "800000" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("No Deal")).toBeInTheDocument();
    expect(screen.getByText(/Below Threshold/i)).toBeInTheDocument();
  });

  it("shows No Deal when cash flow is negative", () => {
    // Low rent relative to high purchase: 4 units × $500/unit with $400k purchase
    // EGI ≈ $1,900, NOI ≈ $1,235/mo, but mortgage at 12% will exceed NOI
    render(<MultiFamilyTab tab={tab} />);
    fill({ rentPerUnit: "500", interestRate: "12" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("No Deal")).toBeInTheDocument();
  });

  it("shows Positive Cash Flow banner for a good deal", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Positive Cash Flow")).toBeInTheDocument();
  });

  it("shows Negative Cash Flow banner when mortgage exceeds NOI", () => {
    render(<MultiFamilyTab tab={tab} />);
    fill({ rentPerUnit: "500", interestRate: "12" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Negative Cash Flow")).toBeInTheDocument();
  });
});
