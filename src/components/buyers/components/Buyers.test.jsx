import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import Buyers from "./Buyers";

vi.mock("../../../firebase/firestoreService", () => ({
  fetchBuyers: vi.fn().mockResolvedValue([]),
  saveBuyer: vi.fn().mockResolvedValue(undefined),
  deleteBuyerById: vi.fn().mockResolvedValue(undefined),
}));

const { fetchBuyers, saveBuyer } =
  await import("../../../firebase/firestoreService");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Buyers component", () => {
  it("renders and loads buyers", async () => {
    fetchBuyers.mockResolvedValue([
      {
        id: "b1",
        fullName: "Jane Doe",
        email: "jane@example.com",
        state: "TX",
      },
    ]);

    render(<Buyers theme="light" setTheme={vi.fn()} />);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Buyers List")).toBeInTheDocument();
  });

  it("prevents adding a buyer with duplicate email", async () => {
    fetchBuyers.mockResolvedValue([
      {
        id: "b1",
        fullName: "Jane Doe",
        email: "jane@example.com",
        state: "TX",
      },
    ]);

    render(<Buyers theme="light" setTheme={vi.fn()} />);

    await screen.findByText("Jane Doe");

    const addBuyerSection = screen.getByText("Add Buyer").closest("section");
    const addBuyerForm = within(addBuyerSection);

    fireEvent.change(addBuyerForm.getByLabelText(/Full Name/i), {
      target: { value: "John Smith" },
    });
    fireEvent.change(addBuyerForm.getByLabelText(/Email/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(addBuyerForm.getByLabelText(/State/i), {
      target: { value: "TX" },
    });

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    fireEvent.click(addBuyerForm.getByRole("button", { name: /Save Buyer/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "A buyer with this email or phone number already exists.",
      );
    });

    alertSpy.mockRestore();
  });

  it("filters buyers as soon as the user types in search", async () => {
    fetchBuyers.mockResolvedValue([
      {
        id: "b1",
        fullName: "Jane Doe",
        email: "jane@example.com",
        city: "Austin",
        state: "TX",
      },
      {
        id: "b2",
        fullName: "John Smith",
        email: "john@example.com",
        city: "Dallas",
        state: "TX",
      },
    ]);

    render(<Buyers theme="light" setTheme={vi.fn()} />);

    await screen.findByText("Jane Doe");
    expect(screen.getByText("John Smith")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Search"));
    fireEvent.change(
      screen.getByPlaceholderText(/Search buyers by name, email, phone, city/i),
      {
        target: { value: "john" },
      },
    );

    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });
});
