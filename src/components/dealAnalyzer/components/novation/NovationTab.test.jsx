import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NovationTab from "./NovationTab";

const tab = {
  eyebrow: "Novation Analysis",
  title: "List price profit check",
  description: "Calculate the offer price for a novation deal.",
  prompts: ["Confirm list price with comps", "Verify assignment fee"],
};

// ─── Base scenario ────────────────────────────────────────────────────────────
// ARV = $200,000, Repairs = $20,000, Assignment Fee = $10,000
// 90% of ARV   = $180,000
// Offer Price  = $180,000 − $20,000 − $10,000 = $150,000

function fillFields({
  arv = "200000",
  repairs = "20000",
  wholesaleFee = "10000",
} = {}) {
  fireEvent.change(screen.getByLabelText(/^ARV/i), {
    target: { value: arv },
  });
  fireEvent.change(screen.getByLabelText(/^Repairs/i), {
    target: { value: repairs },
  });
  fireEvent.change(screen.getByLabelText(/Assignment Fee/i), {
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
      screen.getByText("Calculate the offer price for a novation deal."),
    ).toBeInTheDocument();
  });

  it("renders all prompt cards", () => {
    render(<NovationTab tab={tab} />);
    expect(
      screen.getByText("Confirm list price with comps"),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify assignment fee")).toBeInTheDocument();
  });

  it("does not show summary on initial render", () => {
    render(<NovationTab tab={tab} />);
    expect(screen.queryByText(/^Offer Price$/i)).not.toBeInTheDocument();
  });

  it("renders all input fields and the Calculate Offer Price button", () => {
    render(<NovationTab tab={tab} />);
    expect(screen.getByLabelText(/^ARV/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Repairs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assignment Fee/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
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

  it("formats Repairs as currency while typing", () => {
    render(<NovationTab tab={tab} />);
    const repairs = screen.getByLabelText(/^Repairs/i);
    fireEvent.change(repairs, { target: { value: "20000" } });
    expect(repairs).toHaveValue("$20,000");
  });

  it("formats Assignment Fee as currency while typing", () => {
    render(<NovationTab tab={tab} />);
    const fee = screen.getByLabelText(/Assignment Fee/i);
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
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    ).toBeDisabled();
  });

  it("stays disabled until all fields are filled", () => {
    render(<NovationTab tab={tab} />);
    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/^Repairs/i), {
      target: { value: "20000" },
    });
    expect(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    ).toBeDisabled();
  });

  it("becomes enabled once all fields are filled", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    expect(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    ).not.toBeDisabled();
  });
});

// ─── Summary calculations ─────────────────────────────────────────────────────

describe("summary calculations", () => {
  it("shows summary only after clicking Calculate Offer Price", () => {
    render(<NovationTab tab={tab} />);
    expect(screen.queryByText(/^Offer Price$/i)).not.toBeInTheDocument();
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getAllByText(/^Offer Price$/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("calculates Offer Price = ARV × 90% − Repairs − Assignment Fee", () => {
    render(<NovationTab tab={tab} />);
    // ARV=200k → 90%=180k, repairs=20k, fee=10k → Offer Price=150k
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getAllByText("$150,000.00").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 90% of ARV in the breakdown", () => {
    render(<NovationTab tab={tab} />);
    // 90% of $200k = $180k
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getByText("$180,000.00")).toBeInTheDocument();
  });

  it("shows the 10% ARV reserve breakdown", () => {
    render(<NovationTab tab={tab} />);
    // ARV=200k → 6%=$12,000, 3%=$6,000, 1%=$2,000
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getByText("10% ARV Reserve Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Agent Commissions (6%)")).toBeInTheDocument();
    expect(screen.getByText("$12,000.00")).toBeInTheDocument();
    expect(screen.getByText("Buffer (3%)")).toBeInTheDocument();
    expect(screen.getByText("$6,000.00")).toBeInTheDocument();
    expect(screen.getByText("Closing Costs (1%)")).toBeInTheDocument();
    expect(screen.getByText("$2,000.00")).toBeInTheDocument();
  });

  it("shows Offer Available when offer price is positive", () => {
    render(<NovationTab tab={tab} />);
    fillFields(); // Offer Price = $150,000 > 0
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getByText("Offer Available")).toBeInTheDocument();
  });

  it("shows No Offer Possible when repairs and fee exceed 90% of ARV", () => {
    render(<NovationTab tab={tab} />);
    // ARV=100k → 90%=90k, repairs=50k, fee=50k → Offer Price = -10k
    fillFields({ arv: "100000", repairs: "50000", wholesaleFee: "50000" });
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getByText("No Offer Possible")).toBeInTheDocument();
  });

  it("shows the formula breakdown with computed values", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(
      screen.getByText(
        /Offer Price = \(ARV × 90%\) − Repairs − Assignment Fee/i,
      ),
    ).toBeInTheDocument();
    // formula line: $200,000.00 × 90% − $20,000.00 − $10,000.00 = $150,000.00
    expect(screen.getByText(/\$200,000\.00 × 90%/)).toBeInTheDocument();
  });

  it("clears summary when ARV changes after calculating", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getAllByText(/^Offer Price$/i).length).toBeGreaterThanOrEqual(
      1,
    );
    fireEvent.change(screen.getByLabelText(/^ARV/i), {
      target: { value: "250000" },
    });
    expect(screen.queryByText("Offer Available")).not.toBeInTheDocument();
  });

  it("clears summary when Repairs changes after calculating", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getAllByText(/^Offer Price$/i).length).toBeGreaterThanOrEqual(
      1,
    );
    fireEvent.change(screen.getByLabelText(/^Repairs/i), {
      target: { value: "30000" },
    });
    expect(screen.queryByText("Offer Available")).not.toBeInTheDocument();
  });

  it("clears summary when Assignment Fee changes after calculating", () => {
    render(<NovationTab tab={tab} />);
    fillFields();
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate Offer Price/i }),
    );
    expect(screen.getAllByText(/^Offer Price$/i).length).toBeGreaterThanOrEqual(
      1,
    );
    fireEvent.change(screen.getByLabelText(/Assignment Fee/i), {
      target: { value: "15000" },
    });
    expect(screen.queryByText("Offer Available")).not.toBeInTheDocument();
  });
});
