import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RentalDSCRTab from "./RentalDSCRTab";

describe("RentalDSCRTab (direct)", () => {
  it("renders the DSCR Loan section", () => {
    render(<RentalDSCRTab />);
    expect(screen.getByText("DSCR Loan")).toBeInTheDocument();
  });

  it("computes Down Payment as 20% of purchase price", () => {
    render(<RentalDSCRTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    expect(screen.getByLabelText(/Down Payment.*20%/i)).toHaveValue(
      "$40,000.00",
    );
  });

  it("Extra Down Payment field is present", () => {
    render(<RentalDSCRTab />);
    expect(screen.getByLabelText(/Extra Down Payment/i)).toBeInTheDocument();
  });

  it("Calculate disabled before required fields are set", () => {
    render(<RentalDSCRTab />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("renders Additional Lenders section with Add Lender button", () => {
    render(<RentalDSCRTab />);
    expect(screen.getByText("Additional Lenders")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Lender/i }),
    ).toBeInTheDocument();
  });

  it("calculates summary when all DSCR fields are filled", () => {
    render(<RentalDSCRTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getByText("DSCR")).toBeInTheDocument();
  });

  it("Extra Down Payment reveals Effective Loan Amount output", () => {
    render(<RentalDSCRTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Extra Down Payment/i), {
      target: { value: "10000" },
    });
    expect(screen.getByLabelText(/Effective Loan Amount/i)).toBeInTheDocument();
  });

  it("asks whether Total Cash Needed to Buy is a HELOC, hiding the rate field by default", () => {
    render(<RentalDSCRTab />);
    expect(
      screen.getByText("Is Total Cash Needed to Buy a HELOC?"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/HELOC Interest Rate/i),
    ).not.toBeInTheDocument();
  });

  it("reveals the HELOC rate field and requires it once Yes is selected", () => {
    render(<RentalDSCRTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });

    fireEvent.change(
      screen.getByLabelText(/Is Total Cash Needed to Buy a HELOC/i),
      { target: { value: "Yes" } },
    );
    expect(screen.getByLabelText(/HELOC Interest Rate/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/HELOC Interest Rate/i), {
      target: { value: "9" },
    });
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });

  it("subtracts the interest-only HELOC payment from cash flow when enabled", () => {
    render(<RentalDSCRTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Interest Rate/i), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText(/Loan Term/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    const cashFlowWithoutHeloc = screen.getByText(
      (_, el) => el?.tagName === "STRONG" && /\$/.test(el.textContent || ""),
      { selector: ".deal-analyzer-final-verdict strong" },
    ).textContent;

    fireEvent.change(
      screen.getByLabelText(/Is Total Cash Needed to Buy a HELOC/i),
      { target: { value: "Yes" } },
    );
    fireEvent.change(screen.getByLabelText(/HELOC Interest Rate/i), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText(/Cash-to-Buy HELOC Payment/i)).toBeInTheDocument();
    const cashFlowWithHeloc = screen.getByText(
      (_, el) => el?.tagName === "STRONG" && /\$/.test(el.textContent || ""),
      { selector: ".deal-analyzer-final-verdict strong" },
    ).textContent;
    expect(cashFlowWithHeloc).not.toBe(cashFlowWithoutHeloc);
  });
});
