import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PMDealAddForm from "./PMDealAddForm";

const emptyForm = {
  borrowerName: "",
  borrowerCompany: "",
  propertyAddress: "",
  amountLent: "",
  interestRate: "",
  months: "",
  lendDate: "",
};

describe("PMDealAddForm", () => {
  it("renders heading and inputs", () => {
    render(
      <PMDealAddForm
        form={emptyForm}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmit={vi.fn()}
        saving={false}
        isFormComplete={false}
      />,
    );
    expect(screen.getByText("Add PML Deal")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("123 Main St, Austin, TX"),
    ).toBeInTheDocument();
  });

  it("invokes onChange when typing", () => {
    const onChange = vi.fn();
    render(
      <PMDealAddForm
        form={emptyForm}
        onChange={onChange}
        onBlur={vi.fn()}
        onSubmit={vi.fn()}
        saving={false}
        isFormComplete={false}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("John Smith"), {
      target: { value: "Jane" },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("invokes onBlur when interest rate loses focus", () => {
    const onBlur = vi.fn();
    render(
      <PMDealAddForm
        form={emptyForm}
        onChange={vi.fn()}
        onBlur={onBlur}
        onSubmit={vi.fn()}
        saving={false}
        isFormComplete={false}
      />,
    );
    fireEvent.blur(screen.getByPlaceholderText("e.g. 22.5%"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("submit button is disabled when form is incomplete", () => {
    render(
      <PMDealAddForm
        form={emptyForm}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmit={vi.fn()}
        saving={false}
        isFormComplete={false}
      />,
    );
    expect(screen.getByRole("button", { name: /Add Deal/i })).toBeDisabled();
  });

  it("submit button is enabled when form is complete", () => {
    render(
      <PMDealAddForm
        form={emptyForm}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmit={vi.fn()}
        saving={false}
        isFormComplete={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Add Deal/i }),
    ).not.toBeDisabled();
  });

  it("shows Saving… and disables when saving=true", () => {
    render(
      <PMDealAddForm
        form={emptyForm}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmit={vi.fn()}
        saving={true}
        isFormComplete={true}
      />,
    );
    expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
  });

  it("calls onSubmit on form submit", () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    const { container } = render(
      <PMDealAddForm
        form={emptyForm}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmit={onSubmit}
        saving={false}
        isFormComplete={true}
      />,
    );
    fireEvent.submit(container.querySelector("form"));
    expect(onSubmit).toHaveBeenCalled();
  });
});
