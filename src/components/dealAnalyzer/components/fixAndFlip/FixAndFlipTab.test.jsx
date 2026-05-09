import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FixAndFlipTab from "./FixAndFlipTab";

const tab = {
  eyebrow: "Flip Analysis",
  title: "Fix and flip review",
  description: "Review flip assumptions.",
  prompts: ["Check the MAO"],
};

function fillForm() {
  fireEvent.change(screen.getByLabelText(/ARV/i), {
    target: { value: "500000" },
  });
  fireEvent.change(screen.getByLabelText(/Desired Profit/i), {
    target: { value: "5" },
  });
  fireEvent.blur(screen.getByLabelText(/Desired Profit/i));
  fireEvent.change(screen.getByLabelText(/Rehab Cost/i), {
    target: { value: "25000" },
  });
}

describe("FixAndFlipTab", () => {
  it("keeps Calculate disabled until all required fields are filled", () => {
    render(<FixAndFlipTab tab={tab} />);

    const calculateButton = screen.getByRole("button", { name: /Calculate/i });
    expect(calculateButton).toBeDisabled();

    fillForm();
    expect(calculateButton).not.toBeDisabled();
  });

  it("formats ARV and rehab cost while typing and desired profit on blur", () => {
    render(<FixAndFlipTab tab={tab} />);

    const arvInput = screen.getByLabelText(/ARV/i);
    fireEvent.change(arvInput, { target: { value: "500000" } });
    expect(arvInput).toHaveValue("$500,000");

    const rehabInput = screen.getByLabelText(/Rehab Cost/i);
    fireEvent.change(rehabInput, { target: { value: "25000" } });
    expect(rehabInput).toHaveValue("$25,000");

    const desiredProfitInput = screen.getByLabelText(/Desired Profit/i);
    fireEvent.change(desiredProfitInput, { target: { value: "5" } });
    fireEvent.blur(desiredProfitInput);
    expect(desiredProfitInput).toHaveValue("5%");
  });

  it("calculates and displays MAO, financing fees, and closing cost in the summary", () => {
    render(<FixAndFlipTab tab={tab} />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText("Financing Fees (6%)")).toBeInTheDocument();
    expect(screen.getByText("$30,000.00")).toBeInTheDocument();
    expect(screen.getByText("Closing Cost (9%)")).toBeInTheDocument();
    expect(screen.getByText("$45,000.00")).toBeInTheDocument();

    const maoLabel = screen.getByText("MAO");
    const maoValue = maoLabel.parentElement.querySelector("strong");
    expect(maoValue).toHaveTextContent("$375,000.00");
    expect(maoValue).toHaveClass("deal-analyzer-highlight-value");
  });
});
