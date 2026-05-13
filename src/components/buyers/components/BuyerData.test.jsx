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
