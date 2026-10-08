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

  describe("HOA", () => {
    function fillBasics() {
      fireEvent.change(screen.getByLabelText(/Purchase Price/i), {
        target: { value: "200000" },
      });
      fireEvent.change(screen.getByLabelText(/Estimated Monthly Rent/i), {
        target: { value: "2000" },
      });
    }

    it("asks for monthly dues only when the property has an HOA", () => {
      render(<RentalCashTab />);
      expect(screen.getByLabelText("HOA?")).toHaveValue("No");
      expect(screen.queryByLabelText(/Monthly HOA Dues/i)).toBeNull();
      fireEvent.change(screen.getByLabelText("HOA?"), {
        target: { value: "Yes" },
      });
      fireEvent.change(screen.getByLabelText(/Monthly HOA Dues/i), {
        target: { value: "250" },
      });
      expect(screen.getByLabelText(/Monthly HOA Dues/i)).toHaveValue("$250");
    });

    it("adds HOA dues to total monthly expenses and lowers cash flow", () => {
      render(<RentalCashTab />);
      fillBasics();
      fireEvent.change(screen.getByLabelText("HOA?"), {
        target: { value: "Yes" },
      });
      fireEvent.change(screen.getByLabelText(/Monthly HOA Dues/i), {
        target: { value: "250" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

      expect(screen.getByText("HOA Dues")).toBeInTheDocument();
      // $200 property management (10% of $2,000 rent) + $250 HOA.
      const total = screen.getByText("Total Monthly Expenses").nextSibling;
      expect(total).toHaveTextContent("$450.00");
      expect(screen.getAllByText("$1,550.00").length).toBeGreaterThan(0);
    });

    it("ignores dues typed before switching the answer back to No", () => {
      render(<RentalCashTab />);
      fillBasics();
      fireEvent.change(screen.getByLabelText("HOA?"), {
        target: { value: "Yes" },
      });
      fireEvent.change(screen.getByLabelText(/Monthly HOA Dues/i), {
        target: { value: "250" },
      });
      fireEvent.change(screen.getByLabelText("HOA?"), {
        target: { value: "No" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

      expect(screen.queryByText("HOA Dues")).toBeNull();
      const total = screen.getByText("Total Monthly Expenses").nextSibling;
      expect(total).toHaveTextContent("$200.00");
    });
  });
});
