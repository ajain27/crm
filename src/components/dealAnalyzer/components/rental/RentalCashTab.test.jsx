import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RentalCashTab from "./RentalCashTab";

describe("RentalCashTab (direct)", () => {
  it("renders Rental Inputs heading", () => {
    render(<RentalCashTab />);
    expect(screen.getByText("Rental Inputs")).toBeInTheDocument();
  });

  it("Calculate button is disabled before required fields are filled", () => {
    render(<RentalCashTab />);
    expect(screen.getByRole("button", { name: /Calculate/i })).toBeDisabled();
  });

  it("becomes enabled once purchasePrice and monthlyRent are filled", () => {
    render(<RentalCashTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });
    expect(
      screen.getByRole("button", { name: /Calculate/i }),
    ).not.toBeDisabled();
  });

  it("Property Management auto-updates as 10% of monthly rent", () => {
    render(<RentalCashTab />);
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2500" },
    });
    expect(screen.getByLabelText(/Property Management/i)).toHaveValue(
      "$250.00",
    );
  });

  it("Closing Costs is a manual currency entry", () => {
    render(<RentalCashTab />);
    fireEvent.change(screen.getByLabelText(/Closing Costs/i), {
      target: { value: "4000" },
    });
    expect(screen.getByLabelText(/Closing Costs/i)).toHaveValue("$4,000");
  });

  it("Calculating produces a Monthly Cash Flow", () => {
    render(<RentalCashTab />);
    fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
      target: { value: "200000" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(screen.getAllByText("Monthly Cash Flow").length).toBeGreaterThan(0);
  });
});
