import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubToTab from "./SubToTab";

const tab = {
  eyebrow: "Creative Finance",
  title: "Subject-to deal review",
  description: "Review subject-to assumptions.",
  prompts: ["Check the monthly payment"],
};

function fillBaseForm() {
  fireEvent.change(screen.getByLabelText(/Property Value/i), {
    target: { value: "500000" },
  });
  fireEvent.change(screen.getByLabelText(/Entry Fee/i), {
    target: { value: "57000" },
  });
  fireEvent.change(screen.getByLabelText(/Rehab Cost/i), {
    target: { value: "2000" },
  });
  fireEvent.change(screen.getByLabelText(/Mortgage Balance/i), {
    target: { value: "450000" },
  });
  fireEvent.change(screen.getByLabelText(/^Interest/i), {
    target: { value: "5" },
  });
  fireEvent.blur(screen.getByLabelText(/^Interest/i));
  fireEvent.change(screen.getByLabelText(/Term in Years/i), {
    target: { value: "30" },
  });
  fireEvent.change(screen.getByLabelText(/^Tax/i), {
    target: { value: "345" },
  });
  fireEvent.change(screen.getByLabelText(/Insurance/i), {
    target: { value: "70" },
  });
  fireEvent.change(screen.getByLabelText(/Rent Estimate/i), {
    target: { value: "3500" },
  });
}

describe("SubToTab", () => {
  it("keeps Calculate disabled until all required fields are filled", () => {
    render(<SubToTab tab={tab} />);

    const calculateButton = screen.getByRole("button", { name: /Calculate/i });
    expect(calculateButton).toBeDisabled();

    fillBaseForm();
    expect(calculateButton).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Any Arrears/i), {
      target: { value: "Yes" },
    });
    expect(calculateButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Arrears Amount/i), {
      target: { value: "1000" },
    });
    expect(calculateButton).not.toBeDisabled();
  });

  it("formats currency fields while typing", () => {
    render(<SubToTab tab={tab} />);

    const entryFeeInput = screen.getByLabelText(/Entry Fee/i);
    fireEvent.change(entryFeeInput, { target: { value: "57000" } });
    expect(entryFeeInput).toHaveValue("$57,000");

    const propertyValueInput = screen.getByLabelText(/Property Value/i);
    fireEvent.change(propertyValueInput, { target: { value: "500000" } });
    expect(propertyValueInput).toHaveValue("$500,000");
  });

  it("highlights entry fee above 10% of property value and interest above 5%", () => {
    render(<SubToTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Property Value/i), {
      target: { value: "500000" },
    });
    fireEvent.change(screen.getByLabelText(/Entry Fee/i), {
      target: { value: "60000" },
    });
    fireEvent.change(screen.getByLabelText(/^Interest/i), {
      target: { value: "6" },
    });

    expect(screen.getByLabelText(/Entry Fee/i).closest("label")).toHaveClass(
      "deal-analyzer-warning",
    );
    expect(screen.getByLabelText(/^Interest/i).closest("label")).toHaveClass(
      "deal-analyzer-warning",
    );
  });

  it("calculates cash on cash return from entry fee, rehab cost, and arrears in the summary", () => {
    render(<SubToTab tab={tab} />);

    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/Any Arrears/i), {
      target: { value: "Yes" },
    });
    fireEvent.change(screen.getByLabelText(/Arrears Amount/i), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    expect(screen.getByText("Total Entry")).toBeInTheDocument();
    expect(screen.getByText("$60,000.00")).toBeInTheDocument();

    const cashOnCashLabel = screen.getByText("Cash on Cash Return");
    const cashOnCashValue =
      cashOnCashLabel.parentElement.querySelector("strong");
    expect(cashOnCashValue).toHaveTextContent("20.99%");
    expect(cashOnCashValue).toHaveClass("deal-analyzer-return-positive");
  });

  it("shows total entry in red when the final verdict is no deal", () => {
    render(<SubToTab tab={tab} />);

    fireEvent.change(screen.getByLabelText(/Property Value/i), {
      target: { value: "500000" },
    });
    fireEvent.change(screen.getByLabelText(/Entry Fee/i), {
      target: { value: "57000" },
    });
    fireEvent.change(screen.getByLabelText(/Rehab Cost/i), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByLabelText(/Mortgage Balance/i), {
      target: { value: "450000" },
    });
    fireEvent.change(screen.getByLabelText(/^Interest/i), {
      target: { value: "5" },
    });
    fireEvent.blur(screen.getByLabelText(/^Interest/i));
    fireEvent.change(screen.getByLabelText(/Term in Years/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/^Tax/i), {
      target: { value: "345" },
    });
    fireEvent.change(screen.getByLabelText(/Insurance/i), {
      target: { value: "70" },
    });
    fireEvent.change(screen.getByLabelText(/Rent Estimate/i), {
      target: { value: "1500" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    const totalEntryLabel = screen.getByText("Total Entry");
    const totalEntryValue =
      totalEntryLabel.parentElement.querySelector("strong");
    expect(totalEntryValue).toHaveTextContent("$59,000.00");
    expect(totalEntryValue).toHaveClass("deal-analyzer-return-negative");
  });
});
