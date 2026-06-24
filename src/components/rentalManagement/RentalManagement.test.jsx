import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RentalManagement from "./RentalManagement";

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const baseProps = (overrides = {}) => ({
  currentUser: { id: "u1" },
  fetchRentals: vi.fn().mockResolvedValue([]),
  saveRental: vi.fn().mockResolvedValue(undefined),
  deleteRentalById: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const sampleRentals = [
  {
    id: "r1",
    address: "111 A St",
    city: "Austin",
    state: "TX",
    monthlyRent: "$2,000",
    monthlyMortgage: "$1,000",
    tenants: [
      {
        id: "t1",
        name: "Reg Tenant",
        phone: "555-111-2222",
        email: "reg@example.com",
        type: "Regular",
        leaseStartDate: "2024-01-01",
        leaseEndDate: "2025-12-31",
        isCurrent: true,
      },
    ],
  },
  {
    id: "r2",
    address: "222 B St",
    city: "Dallas",
    state: "TX",
    monthlyRent: "$1,500",
    monthlyMortgage: "$900",
    tenants: [
      {
        id: "t2",
        name: "S8 Tenant",
        phone: "555-333-4444",
        email: "s8@example.com",
        type: "Section 8",
        leaseStartDate: "2023-06-01",
        leaseEndDate: "2024-12-31",
        isCurrent: true,
      },
    ],
  },
];

describe("RentalManagement", () => {
  it("renders the stats and add form", async () => {
    render(<RentalManagement {...baseProps()} />);
    expect(
      await screen.findByRole("heading", { name: "Rental Management" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Net Cashflow")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Property/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("123 Main St")).toBeInTheDocument();
  });

  it("loads existing rentals from the fetch prop", async () => {
    const fetchRentals = vi.fn().mockResolvedValue(sampleRentals);
    render(<RentalManagement {...baseProps({ fetchRentals })} />);
    await waitFor(() => expect(fetchRentals).toHaveBeenCalledWith("u1"));
    expect(await screen.findByText("111 A St")).toBeInTheDocument();
    expect(screen.getByText("222 B St")).toBeInTheDocument();
  });

  it("saves a new rental when required fields are filled", async () => {
    const saveRental = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <RentalManagement {...baseProps({ saveRental })} />,
    );
    const address = await screen.findByPlaceholderText("123 Main St");
    fireEvent.change(address, { target: { value: "500 Oak Ave" } });
    fireEvent.change(container.querySelector('select[name="state"]'), {
      target: { value: "TX" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }));
    await waitFor(() => expect(saveRental).toHaveBeenCalled());
    expect(saveRental.mock.calls[0][0]).toMatchObject({
      address: "500 Oak Ave",
      state: "TX",
      tenants: expect.any(Array),
    });
  });

  it("flags a duplicate address on blur", async () => {
    const fetchRentals = vi.fn().mockResolvedValue(sampleRentals);
    render(<RentalManagement {...baseProps({ fetchRentals })} />);
    await screen.findByText("111 A St");
    const address = screen.getByPlaceholderText("123 Main St");
    fireEvent.change(address, { target: { value: "111 A St" } });
    fireEvent.blur(address);
    expect(
      await screen.findByText(/already in your list/i),
    ).toBeInTheDocument();
  });

  it("filters by tenant type", async () => {
    const fetchRentals = vi.fn().mockResolvedValue(sampleRentals);
    const { container } = render(
      <RentalManagement {...baseProps({ fetchRentals })} />,
    );
    await screen.findByText("111 A St");
    fireEvent.change(
      container.querySelector('select[name="filterTenantType"]'),
      { target: { value: "Section 8" } },
    );
    expect(screen.queryByText("111 A St")).not.toBeInTheDocument();
    expect(screen.getByText("222 B St")).toBeInTheDocument();
  });

  it("filters by city", async () => {
    const fetchRentals = vi.fn().mockResolvedValue(sampleRentals);
    const { container } = render(
      <RentalManagement {...baseProps({ fetchRentals })} />,
    );
    await screen.findByText("111 A St");
    fireEvent.change(container.querySelector('select[name="filterCity"]'), {
      target: { value: "Dallas" },
    });
    expect(screen.queryByText("111 A St")).not.toBeInTheDocument();
    expect(screen.getByText("222 B St")).toBeInTheDocument();
  });

  it("deletes a rental", async () => {
    const deleteRentalById = vi.fn().mockResolvedValue(undefined);
    const fetchRentals = vi.fn().mockResolvedValue(sampleRentals);
    render(
      <RentalManagement {...baseProps({ fetchRentals, deleteRentalById })} />,
    );
    await screen.findByText("111 A St");
    fireEvent.click(screen.getAllByRole("button", { name: "Details" })[0]);
    fireEvent.click(await screen.findByText("Delete Property"));
    await waitFor(() => expect(deleteRentalById).toHaveBeenCalledWith("r1"));
  });
});
