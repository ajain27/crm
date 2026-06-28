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

  it("renders title and read-only seeded values by default", () => {
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
    expect(screen.getByRole("heading", { name: "Jane" })).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("$25,000")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Jane")).not.toBeInTheDocument();
  });

  it("reveals editable inputs after clicking the edit toggle", () => {
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
    fireEvent.click(screen.getByTitle("Edit"));
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
    fireEvent.click(screen.getByTitle("Edit"));
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

  it("Delete Deal button invokes onDelete", () => {
    const onDelete = vi.fn();
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1" }}
        editForm={editForm}
        editSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Delete Deal"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("Eye icon appears when files exist; clicking calls onOpenFile", () => {
    const onOpenFile = vi.fn();
    render(
      <PMDealEditModal
        editingDeal={{
          id: "d1",
          borrowerName: "Jane",
          files: [{ id: "f1", name: "doc.pdf", type: "application/pdf" }],
        }}
        editForm={editForm}
        editSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
        onOpenFile={onOpenFile}
        onFileUpload={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/View files for Jane/i));
    expect(onOpenFile).toHaveBeenCalled();
  });

  it("shows Days Late and Due Date in red when the deal is past due", () => {
    render(
      <PMDealEditModal
        editingDeal={{ id: "d1", borrowerName: "Jane" }}
        editForm={editForm}
        editSaving={false}
        dueDate="2026-01-01"
        lateDays={5}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />,
    );
    expect(screen.getByText("5")).toHaveStyle({ color: "#dc2626" });
    expect(screen.getByText("01/01/2026")).toHaveStyle({ color: "#dc2626" });
  });
});
