import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BuyerForm from "./BuyerForm";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  realEstateType: [],
  notes: "",
};

describe("BuyerForm", () => {
  it("renders headings and fields", () => {
    render(
      <BuyerForm
        addBuyer={vi.fn()}
        form={emptyForm}
        handleChange={vi.fn()}
        propertyTypes={["Single Family", "Duplex"]}
      />,
    );
    expect(screen.getByText("Add Buyer")).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it("Save Buyer button is disabled when fullName/state are missing", () => {
    render(
      <BuyerForm
        addBuyer={vi.fn()}
        form={emptyForm}
        handleChange={vi.fn()}
        propertyTypes={[]}
      />,
    );
    expect(screen.getByRole("button", { name: /Save Buyer/i })).toBeDisabled();
  });

  it("Save Buyer button is enabled once fullName and state are set", () => {
    render(
      <BuyerForm
        addBuyer={vi.fn()}
        form={{ ...emptyForm, fullName: "Jane", state: "TX" }}
        handleChange={vi.fn()}
        propertyTypes={[]}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Save Buyer/i }),
    ).not.toBeDisabled();
  });

  it("phone field formats input through handleChange", () => {
    const handleChange = vi.fn();
    render(
      <BuyerForm
        addBuyer={vi.fn()}
        form={emptyForm}
        handleChange={handleChange}
        propertyTypes={[]}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: "5551234567" },
    });
    expect(handleChange).toHaveBeenCalledWith({
      target: { name: "phone", value: "555-123-4567" },
    });
  });

  it("renders a checkbox per propertyType", () => {
    render(
      <BuyerForm
        addBuyer={vi.fn()}
        form={emptyForm}
        handleChange={vi.fn()}
        propertyTypes={["Single Family", "Duplex"]}
      />,
    );
    expect(screen.getByText("Single Family")).toBeInTheDocument();
    expect(screen.getByText("Duplex")).toBeInTheDocument();
  });

  it("toggling a property type calls handleChange with the new array", () => {
    const handleChange = vi.fn();
    render(
      <BuyerForm
        addBuyer={vi.fn()}
        form={emptyForm}
        handleChange={handleChange}
        propertyTypes={["Single Family"]}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Single Family/i));
    expect(handleChange).toHaveBeenCalledWith({
      target: { name: "realEstateType", value: ["Single Family"] },
    });
  });

  it("submits with addBuyer callback", () => {
    const addBuyer = vi.fn((e) => e.preventDefault());
    const { container } = render(
      <BuyerForm
        addBuyer={addBuyer}
        form={{ ...emptyForm, fullName: "Jane", state: "TX" }}
        handleChange={vi.fn()}
        propertyTypes={[]}
      />,
    );
    fireEvent.submit(container.querySelector("form"));
    expect(addBuyer).toHaveBeenCalled();
  });
});
