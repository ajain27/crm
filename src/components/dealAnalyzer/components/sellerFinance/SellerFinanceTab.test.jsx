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

  it("uses interest-only payments with the principal due at the end of the term", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Payment Type/i), {
      target: { value: "interestOnly" },
    });

    // $60,000 x 6% / 12 = $300.00
    expect(screen.getAllByDisplayValue("$300.00").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    const principalLabel = screen.getByText("Principal Due");
    const principalValue = principalLabel.parentElement.querySelector("strong");
    expect(principalValue).toHaveTextContent("$60,000.00 at year 10");
  });

  it("uses hybrid payments that self-amortize to a full payoff when no balloon is set", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Payment Type/i), {
      target: { value: "hybrid" },
    });
    fireEvent.change(screen.getByLabelText(/Interest-Only Period/i), {
      target: { value: "12" },
    });

    // $60,000 x 6% / 12 = $300.00 for the first 12 months.
    expect(screen.getAllByDisplayValue("$300.00").length).toBeGreaterThan(0);
    // The amortized payment for months 13+ is higher than the IO payment,
    // since it now has to pay down principal over the remaining 108 months.
    expect(
      screen.getByLabelText(/Monthly Payment \(Month 13\+, Amortized\)/i),
    ).not.toHaveValue("$300.00");

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(
      screen.getAllByText(/Months 1–12, Interest Only/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Month 13\+, Amortized/i).length,
    ).toBeGreaterThan(0);

    // Sized to amortize over exactly the remaining term, so it fully pays
    // off by year 10 — no balloon left over.
    const balloonLabel = screen.getByText("Balloon Due");
    const balloonValue = balloonLabel.parentElement.querySelector("strong");
    expect(balloonValue).toHaveTextContent("None");
  });

  it("treats a hybrid balloon during the interest-only period as the full principal", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Payment Type/i), {
      target: { value: "hybrid" },
    });
    fireEvent.change(screen.getByLabelText(/Interest-Only Period/i), {
      target: { value: "24" },
    });
    // Balloon at year 1 (month 12) falls before the 24-month IO period ends
    // — no principal has been paid down yet.
    fireEvent.change(screen.getByLabelText(/Balloon Payment at \(Years\)/i), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    const principalLabel = screen.getByText("Principal Due");
    const principalValue = principalLabel.parentElement.querySelector("strong");
    expect(principalValue).toHaveTextContent("$60,000.00 at year 1");
  });

  it("treats a hybrid balloon during the amortized period as a partial balance", () => {
    render(<SellerFinanceTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Payment Type/i), {
      target: { value: "hybrid" },
    });
    fireEvent.change(screen.getByLabelText(/Interest-Only Period/i), {
      target: { value: "12" },
    });
    // Balloon at year 3 (month 36) falls well after the 12-month IO period
    // — some principal has already amortized down.
    fireEvent.change(screen.getByLabelText(/Balloon Payment at \(Years\)/i), {
      target: { value: "3" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    const balloonLabel = screen.getByText("Balloon Due");
    const balloonValue = balloonLabel.parentElement.querySelector("strong");
    expect(balloonValue).toHaveTextContent("at year 3");
    // Partial payoff — strictly less than the full $60,000 financed.
    const [, amountText] = balloonValue.textContent.match(/\$([\d,]+\.\d{2})/);
    const amount = Number(amountText.replace(/,/g, ""));
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThan(60000);
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

  it("auto-fills the default lender row with 80% of the purchase price", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "20" },
    });

    // 80% of $300,000 = $240,000 — no need to click Add Lender, the default
    // row already picks it up.
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$240,000");

    fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));

    // With the first lender covering the full 80% lender share, the second
    // lender has nothing left to auto-fill.
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toHaveValue("");
  });

  it("keeps the auto-filled lender at 80% of price regardless of seller financing %", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$240,000");

    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "30" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$240,000");

    // Changing the price afterward re-syncs the still-auto lender.
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "400000" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$320,000");
  });

  it("sizes the auto-filled lender from the selected lender LTV", () => {
    render(<SellerFinanceTab tab={tab} />);

    expect(screen.getByLabelText(/Lender LTV/i)).toHaveValue("80");
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "30" },
    });

    fireEvent.change(screen.getByLabelText(/Lender LTV/i), {
      target: { value: "70" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$210,000");

    fireEvent.change(screen.getByLabelText(/Lender LTV/i), {
      target: { value: "85" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$255,000");
    // 30% seller + 85% lender = $45,000 over − $7,850 default lender fees.
    expect(screen.getByLabelText(/Cash Back to Buyer/i)).toHaveValue(
      "$37,150.00",
    );
  });

  it("uses financing above the price to pay fees and gives the rest back to the buyer", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    // 30% seller + 80% lender = 110% → $30,000 over the price.
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/Closing Costs/i), {
      target: { value: "2500" },
    });

    // $30,000 excess − $7,850 default lender fees − $2,500 closing costs.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue("$0.00");
    expect(screen.getByLabelText(/Cash Back to Buyer/i)).toHaveValue(
      "$19,650.00",
    );
  });

  it("has the buyer cover only the fees the excess financing can't", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    // 22% seller + 80% lender = 102% → $6,000 over the price.
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "22" },
    });

    // $7,850 default lender fees − $6,000 excess = $1,850 from the buyer.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue(
      "$1,850.00",
    );
    expect(screen.queryByLabelText(/Cash Back to Buyer/i)).toBeNull();
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

    // Second lender: added after, so it auto-fills with what's left of the
    // 80% lender share ($240,000 − $50,000).
    fireEvent.click(screen.getByRole("button", { name: /Add Lender/i }));
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toHaveValue("$190,000");

    // A price change re-syncs only the auto (second) lender; the manual
    // first lender stays put.
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "400000" },
    });
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toHaveValue("$50,000");
    expect(screen.getByLabelText(/Lender 2 Amount/i)).toHaveValue("$270,000");
  });

  it("has the buyer bring the 20% gap plus fees with no seller financing", () => {
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

    fireEvent.change(screen.getByLabelText(/Origination Fees/i), {
      target: { value: "3000" },
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

    // Total lender fees: $3,000 + $1,000 + $500 + $500 = $5,000 — still
    // shown as a reference line item...
    expect(screen.getByLabelText(/Total Lender Fees/i)).toHaveValue(
      "$5,000.00",
    );
    // ...and since the lender only funds 80%, the buyer brings the $60,000
    // gap plus the $5,000 in fees.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue(
      "$65,000.00",
    );
  });

  it("brings buyer cash to close to $0 when seller financing fully covers the price", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "100" },
    });

    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue("$0.00");
  });

  it("hides all lender and lender-fee UI once seller financing covers 100% of the price", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "80" },
    });

    // Below 100%, the lender/fee UI is present as usual.
    expect(screen.getByLabelText(/Lender 1 Amount/i)).toBeInTheDocument();
    expect(screen.getByText("Additional Lenders")).toBeInTheDocument();
    expect(screen.getByText("Lender Fees & Closing Costs")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Origination Fees/i), {
      target: { value: "2500" },
    });
    fireEvent.change(screen.getByLabelText(/Closing Costs/i), {
      target: { value: "1000" },
    });

    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "100" },
    });

    // At 100%, there's no lender — the whole section disappears instead of
    // showing a block of zeros, and any fee values entered earlier are
    // cleared out rather than lingering hidden.
    expect(screen.queryByText("Additional Lenders")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Lender Fees & Closing Costs"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Lender 1 Amount/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Origination Fees/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Closing Costs/i)).not.toBeInTheDocument();

    // Dropping back below 100% brings the section back, empty — the
    // cleared fees don't reappear, and defaults can seed again.
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "80" },
    });
    expect(screen.getByLabelText(/Origination Fees/i)).toHaveValue("$2,500");
  });

  it("shows a Down Payment field at 100% and finances only what's left over it", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });

    // Below 100%, there's no Down Payment field.
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "80" },
    });
    expect(
      screen.queryByLabelText(/Down Payment \(Optional\)/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "100" },
    });
    expect(
      screen.getByLabelText(/Down Payment \(Optional\)/i),
    ).toBeInTheDocument();
    // With no down payment entered, the full price is still financed.
    expect(screen.getByLabelText(/Seller Financing Amount/i)).toHaveValue(
      "$300,000.00",
    );

    fireEvent.change(screen.getByLabelText(/Down Payment \(Optional\)/i), {
      target: { value: "30000" },
    });

    // Only the remaining $270,000 is financed once a down payment is set.
    expect(
      screen.getByLabelText(/Seller Financing Amount \(After Down Payment\)/i),
    ).toHaveValue("$270,000.00");
    // Buyer Cash to Close is exactly the down payment — no lender, no fees.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue(
      "$30,000.00",
    );
  });

  it("still over-finances normally above 100% when no down payment is entered", () => {
    render(<SellerFinanceTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "150" },
    });

    // 150% of price, same as before this feature existed — the Down
    // Payment field being newly available doesn't change this unless a
    // down payment is actually typed into it.
    expect(screen.getByLabelText(/Seller Financing Amount/i)).toHaveValue(
      "$450,000.00",
    );
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
    // the $2,500 closing costs and the $7,850 default lender fees the buyer
    // still has to bring in cash.
    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue(
      "$40,350.00",
    );
  });

  it("defaults the lender fees once seller financing is under 100% and a lender is present", () => {
    render(<SellerFinanceTab tab={tab} />);

    expect(screen.getByLabelText(/Origination Fees/i)).toHaveValue("");

    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText(/Seller Financing \(%\)/i), {
      target: { value: "20" },
    });

    expect(screen.getByLabelText(/Origination Fees/i)).toHaveValue("$2,500");
    expect(screen.getByLabelText(/Doc Fees/i)).toHaveValue("$3,000");
    expect(screen.getByLabelText(/Appraisal Fees/i)).toHaveValue("$750");
    expect(screen.getByLabelText(/Underwriting Fees/i)).toHaveValue("$1,600");
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

  it("returns the excess to the buyer when the deal is over-financed", () => {
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

    expect(screen.getByLabelText(/Buyer Cash to Close/i)).toHaveValue("$0.00");
    expect(
      screen.getByLabelText(/Cash Back to Buyer/i).closest("label"),
    ).toHaveClass("deal-analyzer-output-positive");
    expect(screen.getByLabelText(/Cash Back to Buyer/i)).toHaveValue(
      "$150,000.00",
    );
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
