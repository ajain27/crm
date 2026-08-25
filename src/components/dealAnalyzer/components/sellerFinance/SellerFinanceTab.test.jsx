import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SellerFinanceTab from "./SellerFinanceTab";

const tab = {
  eyebrow: "Creative Finance",
  title: "Seller-financed note review",
  description: "Review seller financing assumptions.",
  prompts: ["Check the note's monthly payment"],
};

function fillBaseForm({ monthlyRent = "2000" } = {}) {
  fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
    target: { value: "300000" },
  });
  fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
    target: { value: "6" },
  });
  fireEvent.change(screen.getByLabelText(/Note Term/i), {
    target: { value: "10" },
  });
  fireEvent.change(screen.getByLabelText(/Monthly Rent/i), {
    target: { value: monthlyRent },
  });
}

describe("SellerFinanceTab", () => {
  it("keeps Calculate disabled until all required fields are filled", () => {
    render(<SellerFinanceTab tab={tab} />);

    const calculateButton = screen.getByRole("button", { name: /Calculate/i });
    expect(calculateButton).toBeDisabled();

    fillBaseForm();
    expect(calculateButton).not.toBeDisabled();
  });

  it("formats the purchase price as currency while typing", () => {
    render(<SellerFinanceTab tab={tab} />);

    const purchasePriceInput = screen.getByLabelText(/Purchase Price/i);
    fireEvent.change(purchasePriceInput, { target: { value: "300000" } });
    expect(purchasePriceInput).toHaveValue("$300,000");
  });

  it("computes the seller financing amount from the purchase price and percentage", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();

    expect(screen.getByText(/Seller Financing Amount/i)).toBeInTheDocument();
    const amountInput = screen.getByDisplayValue("$60,000.00");
    expect(amountInput).toBeInTheDocument();
  });

  it("calculates the monthly payment and balloon payment in the summary", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Balloon Payment at \(Years\)/i), {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText("Seller Note Monthly Payment")).toBeInTheDocument();

    const balloonLabel = screen.getByText("Balloon Due");
    const balloonValue = balloonLabel.parentElement.querySelector("strong");
    expect(balloonValue).toHaveTextContent("at year 5");
  });

  it("shows a lender row on load without needing to click Add Lender", () => {
    render(<SellerFinanceTab tab={tab} />);

    expect(screen.getByLabelText(/Lender 1 Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lender 1 Rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lender 1 Term/i)).toBeInTheDocument();
  });

  it("auto-fills the default lender row with the remaining amount after seller financing", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "20" },
    });

    // $300,000 purchase − $60,000 (20%) seller financing = $240,000 remaining
    // — no need to click Add Lender, the default row already picks it up.
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$240,000");

    fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));

    // With the first lender covering the full remaining balance, the second
    // lender has nothing left to auto-fill.
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toHaveValue("");
  });

  it("keeps an auto-filled lender amount in sync when seller financing % changes afterward", () => {
    render(<SellerFinanceTab tab={tab} />);

    // The default lender row seeds with the full purchase price since
    // nothing else has been carved out yet.
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$300,000");

    // Entering Seller Financing % afterward should recalculate the
    // still-auto lender amount instead of leaving it stale.
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "20" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$240,000");
  });

  it("stops auto-syncing a lender amount once the user edits it manually", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });

    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "100000" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$100,000");

    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "20" },
    });
    // A manual edit should stick — no longer overwritten by the auto-sync.
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$100,000");
  });

  it("keeps auto-syncing a later lender when an earlier lender is manual", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });

    // First (default) lender: manually set, so it should never be touched
    // by the sync.
    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "50000" },
    });

    // Second lender: added after, so it auto-fills with what's left.
    fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toHaveValue("$250,000");

    // Seller financing % carves out $60,000 — only the auto (second) lender
    // should absorb the change; the manual first lender stays put.
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "20" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$50,000");
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toHaveValue("$190,000");
  });

  it("rolls fees into financing when the lender covers the full purchase price", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });

    fireEvent.change(screen.getByLabelText(/Lender 1 Rate/i), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Term/i), {
      target: { value: "30" },
    });

    fireEvent.change(screen.getByLabelText(/Origination Fees \(%\)/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Doc Fees/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText(/Appraisal Fees/i), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText(/Underwriting Fees/i), {
      target: { value: "500" },
    });

    // Lender defaulted to the full $300,000 (no seller financing entered),
    // so origination is 1% of $300,000 = $3,000.
    expect(screen.getByLabelText(/Origination Fees Amount/i)).toHaveValue(
      "$3,000.00",
    );

    // Total lender fees: $3,000 + $1,000 + $500 + $500 = $5,000 — still
    // shown as a reference line item...
    expect(screen.getByLabelText(/Total Lender Fees/i)).toHaveValue(
      "$5,000.00",
    );
    // ...but since the lender covers the entire purchase price, there is no
    // down-payment gap, so the fees are assumed rolled into the loan too:
    // the buyer brings $0 cash to close.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue("$0.00");
  });

  it("brings buyer cash to close to $0 when seller financing + lender fully cover the price, even with closing costs", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Closing Costs/i), {
      target: { value: "2500" },
    });

    // Fully seller-financed (no lender) — the price is 100% covered, so
    // closing costs roll into the financing instead of costing cash.
    expect(screen.getByLabelText(/Total Cash to Close Costs/i)).toHaveValue(
      "$2,500.00",
    );
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue("$0.00");
  });

  it("still charges fees on top of an actual down-payment gap when the deal is only partially financed", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "30" },
    });
    // Manually cap the lender at 60% instead of letting it auto-fill the
    // remaining 70%, leaving a real 10% ($30,000) unfinanced.
    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "180000" },
    });
    fireEvent.change(screen.getByLabelText(/Closing Costs/i), {
      target: { value: "2500" },
    });

    // $300,000 − $180,000 lender − $90,000 seller note = $30,000 gap, plus
    // the $2,500 closing costs the buyer still has to bring in cash.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue(
      "$32,500.00",
    );
  });

  it("includes each additional lender's monthly payment in the summary", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "150000" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Rate/i), {
      target: { value: "7" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Term/i), {
      target: { value: "30" },
    });

    fillBaseForm();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText("Lender Payments")).toBeInTheDocument();
    expect(screen.getByText("Total Lender Payment")).toBeInTheDocument();
    // $150,000 @ 7% amortized over 30 years — not an interest-only figure
    // (AnimatedAmount rounds to the nearest whole dollar for display).
    const totalLabel = screen.getByText("Total Lender Payment");
    const totalValue = totalLabel.parentElement.querySelector("strong");
    expect(totalValue).toHaveTextContent("$998.00");
  });

  it("does not fall back to an interest-only payment when a lender has no term", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Lender 1 Amount/i), {
      target: { value: "150000" },
    });
    fireEvent.change(screen.getByLabelText(/Lender 1 Rate/i), {
      target: { value: "7" },
    });

    fillBaseForm();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText("Add a term to amortize")).toBeInTheDocument();
    const totalLabel = screen.getByText("Total Lender Payment");
    const totalValue = totalLabel.parentElement.querySelector("strong");
    expect(totalValue).toHaveTextContent("$0.00");
  });

  it("keeps the live Total Monthly Debt Service consistent with the lender's own preview — no interest-only leak", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Lender 1 Rate/i), {
      target: { value: "7" },
    });

    // Lender has an amount (auto-filled) and a rate, but no term yet: the
    // widget's own inline preview must NOT show an interest-only guess...
    expect(screen.queryByText(/Monthly payment: \$/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Add a term to calculate the amortized monthly payment/),
    ).toBeInTheDocument();

    // ...and the live Total Monthly Debt Service must agree: it should
    // equal just the seller note payment ($666.12 → displayed as $666.12),
    // not include a phantom interest-only lender payment.
    expect(screen.getByLabelText(/Total Monthly Debt Service/i)).toHaveValue(
      "$666.12",
    );

    // Once a term is entered, the lender's amortized payment appears and
    // both the widget preview and the live total pick it up together.
    fireEvent.change(screen.getByLabelText(/Lender 1 Term/i), {
      target: { value: "30" },
    });

    expect(
      screen.queryByText(/Add a term to calculate/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Monthly payment: \$1,596\.73/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Monthly Debt Service/i)).toHaveValue(
      "$2,262.85",
    );
  });

  it("flags the buyer cash to close when the deal is over-financed", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByLabelText(/Note Term/i), {
      target: { value: "10" },
    });

    expect(
      screen.getByLabelText(/Buyer Cash to Close/i).closest("label"),
    ).toHaveClass("deal-analyzer-output-red");
  });

  it("marks cash flow red when it's negative", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm({ monthlyRent: "600" });

    expect(screen.getByLabelText(/^Cash Flow/i).closest("label")).toHaveClass(
      "deal-analyzer-output-red",
    );

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    const cashFlowBanner = screen.getByText("Monthly Cash Flow").closest("div");
    expect(cashFlowBanner).toHaveClass("deal-analyzer-verdict-negative");
  });

  it("marks cash flow green whenever it's positive, even under $400/month", () => {
    render(<SellerFinanceTab tab={tab} />);

    // Seller note payment is $666.12/mo (see amortization test below); at
    // $800 rent, cash flow is $133.88 — positive, but well under $400.
    fillBaseForm({ monthlyRent: "800" });

    expect(screen.getByLabelText(/^Cash Flow/i).closest("label")).toHaveClass(
      "deal-analyzer-output-positive",
    );

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    const cashFlowBanner = screen.getByText("Monthly Cash Flow").closest("div");
    expect(cashFlowBanner).toHaveClass("deal-analyzer-verdict-positive");
  });

  it("marks cash flow positive well above $400/month", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm({ monthlyRent: "3000" });

    expect(screen.getByLabelText(/^Cash Flow/i).closest("label")).toHaveClass(
      "deal-analyzer-output-positive",
    );
  });

  it("factors property tax, insurance, and appliance insurance into cash flow", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm({ monthlyRent: "3000" });

    fireEvent.change(screen.getByLabelText(/Yearly Property Tax/i), {
      target: { value: "2400" },
    });
    fireEvent.change(screen.getByLabelText(/Yearly Insurance/i), {
      target: { value: "1200" },
    });
    fireEvent.change(
      screen.getByLabelText(/Appliance Insurance \(Monthly\)/i),
      {
        target: { value: "50" },
      },
    );

    // $2,400/yr tax → $200/mo; $1,200/yr insurance → $100/mo.
    expect(screen.getByLabelText(/Monthly Property Tax/i)).toHaveValue(
      "$200.00",
    );
    expect(screen.getByLabelText(/Monthly Insurance/i)).toHaveValue("$100.00");

    // Seller note payment for this scenario is $666.12 (verified elsewhere).
    // Property management is 10% of $3,000 rent = $300.
    // Total expenses = $666.12 + $200 + $100 + $50 + $300 = $1,316.12.
    expect(screen.getByLabelText(/Total Monthly Expenses/i)).toHaveValue(
      "$1,316.12",
    );

    // Cash Flow = $3,000 − $1,316.12 = $1,683.88.
    expect(screen.getByLabelText(/^Cash Flow/i)).toHaveValue("$1,683.88");
  });
});
