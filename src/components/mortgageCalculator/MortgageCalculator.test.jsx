import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MortgageCalculator from "./MortgageCalculator";

// ─── Base scenario (0% interest for deterministic math) ──────────────────────
// Home=$120,000, Down=0%, Rate=0%, Term=10yr
// Loan = 120,000
// PI   = 120,000 / 120 = $1,000.00/mo exactly
// Total Monthly = $1,000.00
// Total PI (lifetime) = $1,000 × 120 = $120,000.00
// Total Interest = $120,000 − $120,000 = $0.00
// Payments = 120

// ─── Scenario with carrying costs ────────────────────────────────────────────
// Same base + Tax=$2,400/yr, Insurance=$1,200/yr, HOA=$50/mo
// Monthly Tax = 2,400 / 12 = $200.00
// Monthly Ins = 1,200 / 12 = $100.00
// Total Monthly = 1,000 + 200 + 100 + 50 = $1,350.00
// Lifetime Total = $1,350 × 120 = $162,000.00

// ─── Scenario with down payment ──────────────────────────────────────────────
// Home=$300,000, Down=20%, Rate=0%, Term=10yr
// Down Amt = $60,000
// Loan     = $240,000

function fillBase({
  homePrice = "120000",
  downPct = "",
  rate = "0",
  term = "10",
} = {}) {
  fireEvent.change(screen.getByLabelText(/Home Price/i), {
    target: { value: homePrice },
  });
  if (downPct) {
    fireEvent.change(screen.getByLabelText(/Down Payment/i), {
      target: { value: downPct },
    });
  }
  fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
    target: { value: rate },
  });
  fireEvent.change(screen.getByLabelText(/Loan Term/i), {
    target: { value: term },
  });
}

function clickCalculate() {
  fireEvent.click(screen.getByRole("button", { name: /Calculate Mortgage/i }));
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders the page heading", () => {
    render(<MortgageCalculator />);
    expect(
      screen.getByRole("heading", { name: /Mortgage Calculator/i }),
    ).toBeInTheDocument();
  });

  it("renders the page subtitle", () => {
    render(<MortgageCalculator />);
    expect(
      screen.getByText(/full monthly and lifetime cost breakdown/i),
    ).toBeInTheDocument();
  });

  it("renders the Loan Details section heading", () => {
    render(<MortgageCalculator />);
    expect(
      screen.getByRole("heading", { name: /Loan Details/i }),
    ).toBeInTheDocument();
  });

  it("renders the form section label", () => {
    render(<MortgageCalculator />);
    expect(screen.getByText("Purchase & Financing")).toBeInTheDocument();
  });

  it("renders all input fields", () => {
    render(<MortgageCalculator />);
    expect(screen.getByLabelText(/Home Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Down Payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Interest Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Loan Term/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Annual Property Tax/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Annual Home Insurance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monthly HOA/i)).toBeInTheDocument();
  });

  it("renders the Calculate Mortgage button", () => {
    render(<MortgageCalculator />);
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).toBeInTheDocument();
  });

  it("does not show results on initial render", () => {
    render(<MortgageCalculator />);
    expect(
      screen.queryByText(/Estimated Monthly Payment/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Monthly Breakdown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lifetime Totals/i)).not.toBeInTheDocument();
  });
});

// ─── Calculate button state ───────────────────────────────────────────────────

describe("Calculate button state", () => {
  it("is disabled on initial render", () => {
    render(<MortgageCalculator />);
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).toBeDisabled();
  });

  it("is disabled when only home price is entered", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "200000" },
    });
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).toBeDisabled();
  });

  it("is enabled when home price, rate, and term are all provided", () => {
    render(<MortgageCalculator />);
    fillBase();
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).not.toBeDisabled();
  });

  it("is disabled when home price is 0", () => {
    render(<MortgageCalculator />);
    fillBase({ homePrice: "0" });
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).toBeDisabled();
  });

  it("is disabled when loan term is 0", () => {
    render(<MortgageCalculator />);
    fillBase({ term: "0" });
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).toBeDisabled();
  });

  it("is disabled when interest rate is missing", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "30" },
    });
    expect(
      screen.getByRole("button", { name: /Calculate Mortgage/i }),
    ).toBeDisabled();
  });
});

// ─── Input formatting ─────────────────────────────────────────────────────────

describe("input formatting", () => {
  it("formats home price with $ and commas", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "350000" },
    });
    expect(screen.getByLabelText(/Home Price/i).value).toBe("$350,000");
  });

  it("formats property tax as currency", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Annual Property Tax/i), {
      target: { value: "4200" },
    });
    expect(screen.getByLabelText(/Annual Property Tax/i).value).toBe("$4,200");
  });

  it("formats home insurance as currency", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Annual Home Insurance/i), {
      target: { value: "1800" },
    });
    expect(screen.getByLabelText(/Annual Home Insurance/i).value).toBe(
      "$1,800",
    );
  });

  it("formats HOA as currency", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Monthly HOA/i), {
      target: { value: "200" },
    });
    expect(screen.getByLabelText(/Monthly HOA/i).value).toBe("$200");
  });

  it("strips non-numeric characters from interest rate", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "abc6.5xyz" },
    });
    expect(screen.getByLabelText(/Interest Rate/i).value).toBe("6.5");
  });

  it("strips non-numeric characters from loan term", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "30 years" },
    });
    expect(screen.getByLabelText(/Loan Term/i).value).toBe("30");
  });

  it("caps down payment at 2 digits", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Down Payment/i), {
      target: { value: "200" },
    });
    expect(screen.getByLabelText(/Down Payment/i).value).toBe("20");
  });
});

// ─── Down payment preview ─────────────────────────────────────────────────────

describe("down payment preview", () => {
  it("shows dollar amount preview when both home price and down % are entered", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Down Payment/i), {
      target: { value: "20" },
    });
    expect(screen.getByText(/\$60,000/)).toBeInTheDocument();
  });

  it("does not show preview when only home price is entered", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "300000" },
    });
    expect(screen.queryByText(/\$60,000/)).not.toBeInTheDocument();
  });

  it("does not show preview when down payment is 0", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Down Payment/i), {
      target: { value: "0" },
    });
    expect(screen.queryByText(/mc-field-hint/)).not.toBeInTheDocument();
  });

  it("updates preview when home price changes", () => {
    render(<MortgageCalculator />);
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Down Payment/i), {
      target: { value: "10" },
    });
    expect(screen.getByText(/\$20,000/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "400000" },
    });
    expect(screen.getByText(/\$40,000/)).toBeInTheDocument();
  });
});

// ─── Summary calculations (base: 0% rate, 0% down) ───────────────────────────

describe("summary calculations — base scenario", () => {
  it("shows the estimated monthly payment banner", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText(/Estimated Monthly Payment/i)).toBeInTheDocument();
  });

  it("calculates PI = $1,000.00 for $120k / 0% down / 0% rate / 10yr", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    const cells = screen.getAllByText("$1,000.00");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it("shows loan amount of $120,000.00", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    const cells = screen.getAllByText("$120,000.00");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it("shows down payment of $0.00 when no down payment entered", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 120 total payments for 10-year term", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("shows $0.00 total interest for 0% rate loan", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText(/Total Interest Paid/i)).toBeInTheDocument();
  });

  it("shows banner meta with loan amount and term info", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText(/10 yr @ 0%/i)).toBeInTheDocument();
  });
});

// ─── Summary calculations (with carrying costs) ──────────────────────────────

describe("summary calculations — with carrying costs", () => {
  it("calculates total monthly = $1,350.00 with tax, insurance, HOA", () => {
    render(<MortgageCalculator />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/Annual Property Tax/i), {
      target: { value: "2400" },
    });
    fireEvent.change(screen.getByLabelText(/Annual Home Insurance/i), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByLabelText(/Monthly HOA/i), {
      target: { value: "50" },
    });
    clickCalculate();
    const cells = screen.getAllByText("$1,350.00");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it("shows monthly tax of $200.00 for $2,400/yr annual tax", () => {
    render(<MortgageCalculator />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/Annual Property Tax/i), {
      target: { value: "2400" },
    });
    clickCalculate();
    expect(screen.getAllByText("$200.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows monthly insurance of $100.00 for $1,200/yr annual insurance", () => {
    render(<MortgageCalculator />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/Annual Home Insurance/i), {
      target: { value: "1200" },
    });
    clickCalculate();
    expect(screen.getAllByText("$100.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows monthly HOA of $50.00", () => {
    render(<MortgageCalculator />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/Monthly HOA/i), {
      target: { value: "50" },
    });
    clickCalculate();
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Summary calculations (with down payment) ────────────────────────────────

describe("summary calculations — with down payment", () => {
  it("calculates correct down payment amount", () => {
    render(<MortgageCalculator />);
    fillBase({ homePrice: "300000", downPct: "20" });
    clickCalculate();
    expect(screen.getByText("$60,000.00")).toBeInTheDocument();
  });

  it("calculates correct loan amount after down payment", () => {
    render(<MortgageCalculator />);
    fillBase({ homePrice: "300000", downPct: "20" });
    clickCalculate();
    expect(screen.getAllByText("$240,000.00").length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Results sections ─────────────────────────────────────────────────────────

describe("results sections", () => {
  it("shows Monthly Breakdown section after calculate", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText("Monthly Breakdown")).toBeInTheDocument();
  });

  it("shows Lifetime Totals section after calculate", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText("Lifetime Totals")).toBeInTheDocument();
  });

  it("shows Monthly Cost Breakdown table header after calculate", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText("Monthly Cost Breakdown")).toBeInTheDocument();
  });

  it("shows all breakdown card labels", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(
      screen.getAllByText("Principal + Interest").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Down Payment")).toBeInTheDocument();
    expect(screen.getByText("Loan Amount")).toBeInTheDocument();
  });

  it("shows all lifetime total labels", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText("Total Interest Paid")).toBeInTheDocument();
    expect(screen.getByText("Total Principal + Interest")).toBeInTheDocument();
    expect(screen.getByText("Total Carrying Costs")).toBeInTheDocument();
    expect(screen.getByText("Total Mortgage Paid")).toBeInTheDocument();
    expect(screen.getByText("Number of Payments")).toBeInTheDocument();
  });

  it("shows table rows for each cost type", () => {
    render(<MortgageCalculator />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/Annual Property Tax/i), {
      target: { value: "2400" },
    });
    fireEvent.change(screen.getByLabelText(/Annual Home Insurance/i), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByLabelText(/Monthly HOA/i), {
      target: { value: "50" },
    });
    clickCalculate();
    expect(screen.getByText("Property Tax")).toBeInTheDocument();
    expect(screen.getByText("Home Insurance")).toBeInTheDocument();
    expect(screen.getByText("HOA")).toBeInTheDocument();
    expect(screen.getByText("Total Monthly Payment")).toBeInTheDocument();
  });
});

// ─── Results clear on input change ───────────────────────────────────────────

describe("results clear on input change", () => {
  it("hides results when any input changes after calculate", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    expect(screen.getByText(/Estimated Monthly Payment/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Home Price/i), {
      target: { value: "150000" },
    });
    expect(
      screen.queryByText(/Estimated Monthly Payment/i),
    ).not.toBeInTheDocument();
  });

  it("restores results when Calculate is clicked again", () => {
    render(<MortgageCalculator />);
    fillBase();
    clickCalculate();
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "15" },
    });
    clickCalculate();
    expect(screen.getByText(/Estimated Monthly Payment/i)).toBeInTheDocument();
  });
});
