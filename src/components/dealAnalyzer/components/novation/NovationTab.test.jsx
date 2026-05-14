import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NovationTab from "./NovationTab";

const tab = {
  eyebrow: "Novation Analysis",
  title: "List price profit check",
  description: "Calculate the MAO for a novation deal.",
  prompts: ["Confirm list price with comps", "Verify wholesale fee"],
};

// ─── Base scenario ────────────────────────────────────────────────────────────
// ARV = $200,000, Wholesale Fee = $10,000
// 90% of ARV  = $180,000
// MAO         = $180,000 − $10,000 = $170,000

function fillFields({ arv = "200000", wholesaleFee = "10000" } = {}) {
  fireEvent.change(screen.getByLabelText(/^ARV/i), {
    target: { value: arv },
  });
  fireEvent.change(screen.getByLabelText(/Wholesale Fee/i), {
    target: { value: wholesaleFee },
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders hero content from tab prop", () => {
    render(<NovationTab tab={tab} />);
    expect(screen.getByText("Novation Analysis")).toBeInTheDocument();
    expect(screen.getByText("List price profit check")).toBeInTheDocument();
    expect(
      screen.getByText("Calculate the MAO for a novation deal."),
    ).toBeInTheDocument();
  });

  it("renders all prompt cards", () => {
    render(<NovationTab tab={tab} />);
    expect(
      screen.getByText("Confirm list price with comps"),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify wholesale fee")).toBeInTheDocument();
  });

  it("does not show summary on initial render", () => {
    render(<NovationTab tab={tab} />);
    expect(
      screen.queryByText(/Maximum Allowable Offer \(MAO\)/i),
    ).not.toBeInTheDocument();
  });

  it("renders both input fields and the Calculate MAO button", () => {
    render(<NovationTab tab={tab} />);
    expect(screen.getByLabelText(/^ARV/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Wholesale Fee/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Calculate MAO/i }),
    ).toBeInTheDocument();
  });
});

// ─── Input formatting ─────────────────────────────────────────────────────────

describe("input formatting", () => {
  it("formats ARV as currency while typing", () => {
    render(<NovationTab tab={tab} />);
    const arv = screen.getByLabelText(/^ARV/i);
    fireEvent.change(arv, { target: { value: "200000" } });
    expect(arv).toHaveValue("$200,000");
  });

  it("formats Wholesale Fee as currency while typing", () => {
    render(<NovationTab tab={tab} />);
    const fee = screen.getByLabelText(/Wholesale Fee/i);
    fireEvent.change(fee, { target: { value: "10000" } });
    expect(fee).toHaveValue("$10,000");
  });

  it("strips non-numeric characters from ARV", () => {
    render(<NovationTab tab={tab} />);
    const arv = screen.getByLabelText(/^ARV/i);
    fireEvent.change(arv, { target: { value: "abc$200,000xyz" } });
    expect(arv).toHaveValue("$200,000");
  });
});

// ─── Calculate button state ───────────────────────────────────────────────────

describe("Calculate button", () => {
  it("is disabled on initial render", () => {
    render(<NovationTab tab={tab} />);
    expect(
      screen.getByRole("button", { name: /Calculate MAO/i }),
    ).toBeDisabled();
  });

  it("stays disabled after only ARV is filled", () => {
    render(<NovationTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "200000" },
    });
    expect(
      screen.getByRole("button", { name: /Calculate MAO/i }),
    ).toBeDisabled();
  });

  it("becomes enabled once both fields are filled", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    expect(
      screen.getByRole("button", { name: /Calculate MAO/i }),
    ).not.toBeDisabled();
  });
});

// ─── Summary calculations ─────────────────────────────────────────────────────

describe("summary calculations", () => {
  it("shows summary only after clicking Calculate MAO", () => {
    render(<NovationTab tab={tab} />);
    expect(
      screen.queryByText(/Maximum Allowable Offer \(MAO\)/i),
    ).not.toBeInTheDocument();
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(
      screen.getByText(/Maximum Allowable Offer \(MAO\)/i),
    ).toBeInTheDocument();
  });

  it("calculates MAO = ARV × 90% − Wholesale Fee", () => {
    render(<NovationTab tab={tab} />);
    // ARV=200k → 90%=180k, fee=10k → MAO=170k
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getAllByText("$170,000.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 90% of ARV in the breakdown", () => {
    render(<NovationTab tab={tab} />);
    // 90% of $200k = $180k
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText("$180,000.00")).toBeInTheDocument();
  });

  it("shows Viable Deal when MAO is positive", () => {
    render(<NovationTab tab={tab} />);
    fillFields(); // MAO = $170,000 > 0
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText("Viable Deal")).toBeInTheDocument();
  });

  it("shows No Room when wholesale fee exceeds 90% of ARV", () => {
    render(<NovationTab tab={tab} />);
    // ARV=100k → 90%=90k, fee=100k → MAO = -10k
    fillFields({ arv: "100000", wholesaleFee: "100000" });
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(screen.getByText("No Room")).toBeInTheDocument();
  });

  it("shows the formula breakdown with computed values", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(
      screen.getByText(/MAO = ARV × 90% − Wholesale Fee/i),
    ).toBeInTheDocument();
    // formula line: $200,000.00 × 90% − $10,000.00 = $170,000.00
    expect(screen.getByText(/\$200,000\.00 × 90%/)).toBeInTheDocument();
  });

  it("clears summary when ARV changes after calculating", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(
      screen.getByText(/Maximum Allowable Offer \(MAO\)/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "250000" },
    });
    expect(
      screen.queryByText(/Maximum Allowable Offer \(MAO\)/i),
    ).not.toBeInTheDocument();
  });

  it("clears summary when Wholesale Fee changes after calculating", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(screen.getByRole("button", { name: /Calculate MAO/i }));
    expect(
      screen.getByText(/Maximum Allowable Offer \(MAO\)/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Wholesale Fee/i), {
      target: { value: "15000" },
    });
    expect(
      screen.queryByText(/Maximum Allowable Offer \(MAO\)/i),
    ).not.toBeInTheDocument();
  });
});
