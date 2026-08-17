import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WholesaleTab from "./WholesaleTab";

const tab = {
  eyebrow: "Wholesale",
  title: "Calculate MAO",
  description: "Maximum allowable offer.",
  prompts: ["Verify ARV", "Check rehab estimate"],
};

function fillRequired({
  arv = "250000",
  rehabCost = "30000",
  wholesaleFee = "10000",
} = {}) {
  fireEvent.change(screen.getByLabelText(/^ARV/i), { target: { value: arv } });
  // No rehab type → enter manual rehab
  fireEvent.change(screen.getByLabelText(/^Rehab Cost/i), {
    target: { value: rehabCost },
  });
  fireEvent.change(screen.getByLabelText(/Assignment Fee/i), {
    target: { value: wholesaleFee },
  });
}

describe("WholesaleTab", () => {
  it("renders hero, prompt cards, and inputs", () => {
    render(<WholesaleTab tab={tab} />);
    expect(screen.getByText("Wholesale")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Calculate MAO/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify ARV")).toBeInTheDocument();
  });

  it("formats ARV as currency", () => {
    render(<WholesaleTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "250000" },
    });
    expect(screen.getByLabelText(/^ARV/i)).toHaveValue("$250,000");
  });

  it("strips non-digits from Square Footage", () => {
    render(<WholesaleTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Square Footage/i), {
      target: { value: "1,800 sf" },
    });
    expect(screen.getByLabelText(/Square Footage/i)).toHaveValue("1800");
  });

  it("Calculate button is disabled before required fields are filled", () => {
    render(<WholesaleTab tab={tab} />);
    expect(
      screen.getByRole("button", { name: /Calculate MAO/i }),
    ).toBeDisabled();
  });

  it("computes MAO and Assign Deal correctly", () => {
    render(<WholesaleTab tab={tab} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    // MAO = 250,000 × 70% - 30,000 - 10,000 = 175,000 - 40,000 = $135,000
    expect(screen.getAllByText("$135,000.00").length).toBeGreaterThanOrEqual(1);
    // Assign Deal = MAO + assignment fee = $145,000
    expect(screen.getByText("$145,000.00")).toBeInTheDocument();
  });

  it("renders the ARV allocation pie chart after calculating", () => {
    render(<WholesaleTab tab={tab} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText("ARV Allocation")).toBeInTheDocument();
    expect(screen.getByText("Buyer's Margin (30%)")).toBeInTheDocument();
  });

  it("auto-fills rehab cost when rehab type and sqft are set", () => {
    render(<WholesaleTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Square Footage/i), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByLabelText(/Rehab Type/i), {
      target: { value: "light" },
    });
    // Light rehab tier 1 = $40,000 (no cheap-market multiplier)
    expect(screen.getByDisplayValue("$40,000.00")).toBeInTheDocument();
  });

  it("does not show Rehab Cost input when 'no-rehab' selected", () => {
    render(<WholesaleTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/Rehab Type/i), {
      target: { value: "no-rehab" },
    });
    expect(screen.queryByLabelText(/^Rehab Cost$/i)).not.toBeInTheDocument();
  });

  it("shows 'Viable Deal' verdict when MAO is positive", () => {
    render(<WholesaleTab tab={tab} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText("Viable Deal")).toBeInTheDocument();
  });

  it("shows 'No Room' verdict when MAO is non-positive", () => {
    render(<WholesaleTab tab={tab} />);
    fillRequired({ rehabCost: "200000" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText("No Room")).toBeInTheDocument();
  });

  it("clears summary when an input changes after calculating", () => {
    render(<WholesaleTab tab={tab} />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText(/Assign Deal \(MAO/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "300000" },
    });
    expect(screen.queryByText(/Assign Deal \(MAO/)).not.toBeInTheDocument();
  });
});
