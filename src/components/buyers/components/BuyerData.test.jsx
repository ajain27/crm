import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import BuyerData from "./BuyerData";

const buyers = [
  {
    id: "b1",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "123-456-7890",
    city: "Austin",
    state: "TX",
  },
];

describe("BuyerData", () => {
  describe("checkbox selection", () => {
    it("renders a checkbox for each buyer row", () => {
      render(
        <BuyerData
          filteredBuyers={buyers}
          buyers={buyers}
          deleteBuyer={vi.fn()}
          updateBuyer={vi.fn()}
          selectedIds={new Set()}
          onToggleSelect={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );
      const checkboxes = screen.getAllByRole("checkbox");
      // header checkbox + 1 row checkbox
      expect(checkboxes).toHaveLength(2);
    });

    it("calls onToggleSelect when a row checkbox is clicked", () => {
      const onToggleSelect = vi.fn();
      render(
        <BuyerData
          filteredBuyers={buyers}
          buyers={buyers}
          deleteBuyer={vi.fn()}
          updateBuyer={vi.fn()}
          selectedIds={new Set()}
          onToggleSelect={onToggleSelect}
          onSelectAll={vi.fn()}
        />,
      );
      const row = screen.getByText("Jane Doe").closest("tr");
      const checkbox = row.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);
      expect(onToggleSelect).toHaveBeenCalledWith("b1");
    });

    it("calls onSelectAll when header checkbox is clicked", () => {
      const onSelectAll = vi.fn();
      render(
        <BuyerData
          filteredBuyers={buyers}
          buyers={buyers}
          deleteBuyer={vi.fn()}
          updateBuyer={vi.fn()}
          selectedIds={new Set()}
          onToggleSelect={vi.fn()}
          onSelectAll={onSelectAll}
        />,
      );
      const [headerCheckbox] = screen.getAllByRole("checkbox");
      fireEvent.click(headerCheckbox);
      expect(onSelectAll).toHaveBeenCalledWith(buyers, false);
    });

    it("marks header checkbox as checked when all rows are selected", () => {
      render(
        <BuyerData
          filteredBuyers={buyers}
          buyers={buyers}
          deleteBuyer={vi.fn()}
          updateBuyer={vi.fn()}
          selectedIds={new Set(["b1"])}
          onToggleSelect={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );
      const [headerCheckbox] = screen.getAllByRole("checkbox");
      expect(headerCheckbox.checked).toBe(true);
    });

    it("applies selected row class when buyer is selected", () => {
      render(
        <BuyerData
          filteredBuyers={buyers}
          buyers={buyers}
          deleteBuyer={vi.fn()}
          updateBuyer={vi.fn()}
          selectedIds={new Set(["b1"])}
          onToggleSelect={vi.fn()}
          onSelectAll={vi.fn()}
        />,
      );
      const row = screen.getByText("Jane Doe").closest("tr");
      expect(row.className).toContain("buyer-row-selected");
    });
  });
  it("calls updateBuyer when the email is edited", () => {
    const updateBuyer = vi.fn();
    render(
      <BuyerData
        filteredBuyers={buyers}
        buyers={buyers}
        deleteBuyer={vi.fn()}
        updateBuyer={updateBuyer}
      />,
    );

    const row = screen.getByText("Jane Doe").closest("tr");
    const editEmailButton = within(row).getByTitle("Edit Email");
    fireEvent.click(editEmailButton);

    const input = within(row).getByDisplayValue("jane@example.com");
    fireEvent.change(input, { target: { value: "jane2@example.com" } });

    const saveButton = within(row).getByTitle("Save");
    fireEvent.click(saveButton);

    expect(updateBuyer).toHaveBeenCalledWith(
      "b1",
      "email",
      "jane2@example.com",
    );
  });

  it("calls updateBuyer when the phone is edited", () => {
    const updateBuyer = vi.fn();
    render(
      <BuyerData
        filteredBuyers={buyers}
        buyers={buyers}
        deleteBuyer={vi.fn()}
        updateBuyer={updateBuyer}
      />,
    );

    const row = screen.getByText("Jane Doe").closest("tr");
    const editPhoneButton = within(row).getByTitle("Edit Phone");
    fireEvent.click(editPhoneButton);

    const input = within(row).getByDisplayValue("123-456-7890");
    fireEvent.change(input, { target: { value: "0987654321" } });

    const saveButton = within(row).getByTitle("Save");
    fireEvent.click(saveButton);

    expect(updateBuyer).toHaveBeenCalledWith("b1", "phone", "098-765-4321");
  });
});
