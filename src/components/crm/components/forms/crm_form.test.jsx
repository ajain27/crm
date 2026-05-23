import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Wholesale_form from "./crm_form";
import { createEmptyDealForm } from "../crmConfig";

function renderForm(overrides = {}) {
  const form = {
    ...createEmptyDealForm(),
    address: "123 Main St",
    city: "Austin",
    zipCode: "78701",
    state: "AL",
    propertyType: "Single Family",
    arv: "$100,000",
    desiredProfit: "$10,000",
    mao: "$45,000",
    notes: "Test notes",
    ...overrides,
  };

  render(
    <Wholesale_form
      addDeal={vi.fn((event) => event.preventDefault())}
      form={form}
      handleChange={vi.fn()}
      handleBlur={vi.fn()}
      checkDuplicateAddress={vi.fn()}
      handleContractFileChange={vi.fn()}
      clearContractFile={vi.fn()}
    />,
  );
}

describe("Wholesale_form rehab fields", () => {
  it("shows auto rehab cost from rehab type, square footage, and state", () => {
    renderForm({
      rehabType: "light",
      squareFootage: "1200",
    });

    expect(screen.getAllByDisplayValue("$10,000").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Additional Rehab Cost/i)).toBeInTheDocument();
  });

  it("shows manual rehab input when auto rehab is unavailable", () => {
    renderForm({
      rehabType: "heavy",
      squareFootage: "5600",
      rehabCost: "$80,000",
    });

    expect(screen.getByLabelText(/Rehab Cost \(manual/i)).toBeInTheDocument();
  });

  it("uses total rehab in the suggested MAO placeholder", () => {
    renderForm({
      rehabType: "light",
      squareFootage: "1200",
      additionalRehabCost: "$5,000",
    });

    expect(
      screen.getByPlaceholderText("Suggested MAO: $45,000"),
    ).toBeInTheDocument();
  });

  it("shows a negative suggested MAO instead of hiding the placeholder", () => {
    renderForm({
      rehabType: "heavy",
      squareFootage: "5600",
      rehabCost: "$80,000",
      desiredProfit: "$10,000",
      mao: "",
    });

    expect(
      screen.getByPlaceholderText("Suggested MAO: -$20,000"),
    ).toBeInTheDocument();
  });

  it("hides rehab inputs when no rehab is selected", () => {
    renderForm({
      rehabType: "no-rehab",
    });

    expect(screen.queryByLabelText(/^Rehab Cost/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Additional Rehab Cost/i),
    ).not.toBeInTheDocument();
  });
});
