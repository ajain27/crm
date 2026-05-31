import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PMDealEditModal from "./PMDealEditModal";

const editForm = {
  borrowerName: "Jane",
  borrowerCompany: "Acme",
  propertyAddress: "1 Main",
  amountLent: "$25,000",
  interestRate: "10%",
  months: "6",
  lendDate: "2026-05-01",
};

describe("PMDealEditModal", () => {
  it("renders nothing when editingDeal is null", () => {
    const { container } = render(
      <PMDealEditModal
        editingDeal={null}
        editForm={null}
        editSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and seeded values", () => {
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1" }}
        editForm={editForm}
        editSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit PM Deal")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$25,000")).toBeInTheDocument();
  });

  it("calls onChange when an input changes", () => {
    const onChange = vi.fn();
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1" }}
        editForm={editForm}
        editSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={onChange}
        onBlur={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Jane"), {
      target: { value: "Bob" },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("Save Changes button invokes onSave", () => {
    const onSave = vi.fn();
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1" }}
        editForm={editForm}
        editSaving={false}
        onClose={vi.fn()}
        onSave={onSave}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it("Cancel button invokes onClose", () => {
    const onClose = vi.fn();
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1" }}
        editForm={editForm}
        editSaving={false}
        onClose={onClose}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables Save Changes when editSaving=true", () => {
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1" }}
        editForm={editForm}
        editSaving={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
  });
});
