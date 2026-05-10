import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FixAndFlipTab from "./FixAndFlipTab";

const tab = {
  eyebrow: "Flip Analysis",
  title: "Fix and flip review",
  description: "Review flip assumptions.",
  prompts: ["Check the numbers"],
};

// ARV=250k, Purchase=150k, Rehab=30k, Duration=6mo, Points=2%, Rate=12%
// Origination=1500, Legal=1000, Appraisal=500
//
// Total Capital  = 150,000 + 30,000            = 180,000
// LTV            = 150,000 / 250,000           = 60%  → qualifies
// Lender Funds   = 180,000 × 0.9               = 162,000
// Points Cost    = 162,000 × 0.02              = 3,240
// Monthly Int.   = 162,000 × (0.12/12)         = 1,620
// Total Interest = 1,620 × 6                   = 9,720
// Misc Fees      = 1,500 + 1,000 + 500         = 3,000
// Total Fin.     = 3,240 + 9,720 + 3,000       = 15,960
// Out of Pocket  = (180,000 − 162,000) + 15,960 = 33,960
// Net Profit     = 250,000 − 150,000 − 30,000 − 15,960 = 54,040

function fillRequiredFields({
  arv = "250000",
  purchasePrice = "150000",
  rehabCost = "30000",
  durationMonths = "6",
  points = "2",
  interestRate = "12",
} = {}) {
  fireEvent.change(screen.getByLabelText(/^ARV/i), { target: { value: arv } });
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: purchasePrice },
  });
  fireEvent.change(screen.getByLabelText(/Rehab Cost/i), {
    target: { value: rehabCost },
  });
  fireEvent.change(screen.getByLabelText(/Duration/i), {
    target: { value: durationMonths },
  });
  fireEvent.change(screen.getByLabelText(/^Points/i), {
    target: { value: points },
  });
  fireEvent.blur(screen.getByLabelText(/^Points/i));
  fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
    target: { value: interestRate },
  });
  fireEvent.blur(screen.getByLabelText(/Interest Rate/i));
}

describe("FixAndFlipTab", () => {
  it("keeps Calculate disabled until all required fields are filled", () => {
    render(<FixAndFlipTab tab={tab} />);
    const btn = screen.getByRole("button", { name: /Calculate/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "250000" },
    });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "150000" },
    });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Rehab Cost/i), {
      target: { value: "30000" },
    });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Duration/i), {
      target: { value: "6" },
    });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Points/i), {
      target: { value: "2" },
    });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "12" },
    });
    expect(btn).not.toBeDisabled();
  });

  it("formats currency fields while typing", () => {
    render(<FixAndFlipTab tab={tab} />);

    const arv = screen.getByLabelText(/^ARV/i);
    fireEvent.change(arv, { target: { value: "250000" } });
    expect(arv).toHaveValue("$250,000");

    const purchase = screen.getByLabelText(/Purchase Price/i);
    fireEvent.change(purchase, { target: { value: "150000" } });
    expect(purchase).toHaveValue("$150,000");

    const rehab = screen.getByLabelText(/Rehab Cost/i);
    fireEvent.change(rehab, { target: { value: "30000" } });
    expect(rehab).toHaveValue("$30,000");

    const origination = screen.getByLabelText(/Origination Fees/i);
    fireEvent.change(origination, { target: { value: "1500" } });
    expect(origination).toHaveValue("$1,500");
  });

  it("appends % to points and interest rate on blur", () => {
    render(<FixAndFlipTab tab={tab} />);

    const points = screen.getByLabelText(/^Points/i);
    fireEvent.change(points, { target: { value: "2" } });
    fireEvent.blur(points);
    expect(points).toHaveValue("2%");

    const rate = screen.getByLabelText(/Interest Rate/i);
    fireEvent.change(rate, { target: { value: "12" } });
    fireEvent.blur(rate);
    expect(rate).toHaveValue("12%");
  });

  it("shows LTV qualifies when purchase price ≤ 70% of ARV", () => {
    render(<FixAndFlipTab tab={tab} />);
    fillRequiredFields({ arv: "250000", purchasePrice: "150000" }); // LTV = 60%
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText(/Qualifies for Loan/i)).toBeInTheDocument();
  });

  it("shows does not qualify when purchase price > 70% of ARV", () => {
    render(<FixAndFlipTab tab={tab} />);
    fillRequiredFields({ arv: "200000", purchasePrice: "160000" }); // LTV = 80%
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText(/Does Not Qualify/i)).toBeInTheDocument();
  });

  it("calculates correct summary values", () => {
    render(<FixAndFlipTab tab={tab} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Origination Fees/i), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText(/Legal Fees/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText(/Appraisal Fees/i), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText("$180,000.00")).toBeInTheDocument(); // Total Capital
    expect(screen.getByText("$162,000.00")).toBeInTheDocument(); // Lender Funds
    expect(screen.getByText("$3,240.00")).toBeInTheDocument();   // Points Cost
    expect(screen.getByText("$1,620.00")).toBeInTheDocument();   // Monthly Interest
    expect(screen.getByText("$9,720.00")).toBeInTheDocument();   // Total Interest
    expect(screen.getByText("$3,000.00")).toBeInTheDocument();   // Misc Fees
    expect(screen.getByText("$15,960.00")).toBeInTheDocument();  // Total Financing
    expect(screen.getByText("$33,960.00")).toBeInTheDocument();  // Out of Pocket
    expect(screen.getByText("$54,040.00")).toBeInTheDocument();  // Net Profit
  });

  it("shows Deal verdict when LTV qualifies and net profit is positive", () => {
    render(<FixAndFlipTab tab={tab} />);
    fillRequiredFields(); // LTV=60%, Net Profit=$54,040 → Deal
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("Deal")).toBeInTheDocument();
  });

  it("shows No Deal verdict when LTV fails", () => {
    render(<FixAndFlipTab tab={tab} />);
    fillRequiredFields({ arv: "200000", purchasePrice: "160000" }); // LTV=80%
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("No Deal")).toBeInTheDocument();
  });

  it("shows No Deal verdict when net profit is negative", () => {
    render(<FixAndFlipTab tab={tab} />);
    // Purchase=140k, ARV=200k (LTV=70% qualifies), Rehab=90k → net loss
    fillRequiredFields({ arv: "200000", purchasePrice: "140000", rehabCost: "90000" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("No Deal")).toBeInTheDocument();
  });

  it("clears the summary when any field changes after calculating", () => {
    render(<FixAndFlipTab tab={tab} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText(/Qualifies for Loan/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "300000" },
    });
    expect(screen.queryByText(/Qualifies for Loan/i)).not.toBeInTheDocument();
  });
});
