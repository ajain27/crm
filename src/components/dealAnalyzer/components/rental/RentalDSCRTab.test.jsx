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
});
