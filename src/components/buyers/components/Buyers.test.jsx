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
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
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
        "A buyer with this email already exists.",
      );
    });

    alertSpy.mockRestore();
  });

  describe("mail merge", () => {
    it("does not show Compose Email button when no buyers are selected", async () => {
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
      expect(
        screen.queryByRole("button", { name: /Compose Email/i }),
      ).not.toBeInTheDocument();
    });

    it("shows Compose Email button when a buyer is selected", async () => {
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

      const row = screen.getByText("Jane Doe").closest("tr");
      const checkbox = row.querySelector('input[type="checkbox"]');
      fireEvent.click(checkbox);

      expect(
        screen.getByRole("button", { name: /Compose Email \(1\)/i }),
      ).toBeInTheDocument();
    });

    it("opens the mail merge modal when Compose Email is clicked", async () => {
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

      const row = screen.getByText("Jane Doe").closest("tr");
      fireEvent.click(row.querySelector('input[type="checkbox"]'));
      fireEvent.click(
        screen.getByRole("button", { name: /Compose Email \(1\)/i }),
      );

      expect(screen.getByText(/1 buyer selected/i)).toBeInTheDocument();
    });

    it("shows selected buyer as recipient in modal", async () => {
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

      const row = screen.getByText("Jane Doe").closest("tr");
      fireEvent.click(row.querySelector('input[type="checkbox"]'));
      fireEvent.click(
        screen.getByRole("button", { name: /Compose Email \(1\)/i }),
      );

      const chip = document.querySelector(".mail-merge-chip");
      expect(chip?.textContent).toContain("jane@example.com");
    });

    it("closes the modal when Cancel is clicked", async () => {
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

      const row = screen.getByText("Jane Doe").closest("tr");
      fireEvent.click(row.querySelector('input[type="checkbox"]'));
      fireEvent.click(
        screen.getByRole("button", { name: /Compose Email \(1\)/i }),
      );

      expect(screen.getByText(/1 buyer selected/i)).toBeInTheDocument();
      const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
      const modalCancelButton = cancelButtons[cancelButtons.length - 1];
      fireEvent.click(modalCancelButton);

      expect(screen.queryByText(/1 buyer selected/i)).not.toBeInTheDocument();
    });
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

    fireEvent.click(screen.getByTitle("Find Buyer"));
    fireEvent.change(
      screen.getByPlaceholderText(/Search buyers by name, email, phone, city/i),
      {
        target: { value: "john" },
      },
    );

    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });

  describe("buyer details modal", () => {
    const BUYERS = [
      {
        id: "b1",
        fullName: "Jane Doe",
        email: "jane@example.com",
        state: "TX",
        realEstateType: ["Single Family"],
      },
      {
        id: "b2",
        fullName: "Sam Lee",
        email: "sam@example.com",
        state: "GA",
      },
    ];

    async function openJane() {
      fetchBuyers.mockResolvedValue(BUYERS);
      render(<Buyers theme="light" setTheme={vi.fn()} />);
      fireEvent.click(await screen.findByText("Jane Doe"));
      return within(document.querySelector(".buyer-detail-modal"));
    }

    it("opens on a buyer's row and saves edited and added details", async () => {
      const modal = await openJane();
      expect(modal.getByLabelText(/Full Name/i)).toHaveValue("Jane Doe");

      fireEvent.change(modal.getByLabelText(/Phone Number/i), {
        target: { value: "5128675309" },
      });
      fireEvent.change(modal.getByLabelText(/City/i), {
        target: { value: "  Austin " },
      });
      fireEvent.click(modal.getByLabelText("Multi Family"));
      fireEvent.change(modal.getByLabelText(/Notes/i), {
        target: { value: "Pays cash, closes in 10 days" },
      });
      fireEvent.click(modal.getByText("Save Changes"));

      await waitFor(() =>
        expect(saveBuyer).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "b1",
            fullName: "Jane Doe",
            phone: "512-867-5309",
            city: "Austin",
            realEstateType: ["Single Family", "Multi Family"],
            notes: "Pays cash, closes in 10 days",
          }),
        ),
      );
      await waitFor(() =>
        expect(
          document.querySelector(".buyer-detail-modal"),
        ).not.toBeInTheDocument(),
      );
      expect(screen.getByText("Austin")).toBeInTheDocument();
    });

    it("keeps the modal open when the email belongs to another buyer", async () => {
      const modal = await openJane();
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      fireEvent.change(modal.getByLabelText(/Email/i), {
        target: { value: "SAM@example.com" },
      });
      fireEvent.click(modal.getByText("Save Changes"));
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          "A buyer with this email already exists.",
        ),
      );
      expect(saveBuyer).not.toHaveBeenCalled();
      expect(document.querySelector(".buyer-detail-modal")).toBeInTheDocument();
      alertSpy.mockRestore();
    });

    it("doesn't open from the row's checkbox", async () => {
      fetchBuyers.mockResolvedValue(BUYERS);
      render(<Buyers theme="light" setTheme={vi.fn()} />);
      const row = (await screen.findByText("Jane Doe")).closest("tr");
      for (const checkbox of within(row).getAllByRole("checkbox")) {
        fireEvent.click(checkbox);
      }
      expect(document.querySelector(".buyer-detail-modal")).toBeNull();
    });
  });
});
