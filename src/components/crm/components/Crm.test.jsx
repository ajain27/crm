import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import Wholesale from "./Crm";

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock("../../../firebase/firestoreService", () => ({
  fetchDeals: vi.fn().mockResolvedValue([]),
  fetchBuyers: vi.fn().mockResolvedValue([]),
  fetchLeads: vi.fn().mockResolvedValue([]),
  subscribeToLeads: vi.fn().mockImplementation((_userId, onData) => {
    onData([]);
    return () => {};
  }),
  saveDeal: vi.fn().mockResolvedValue(undefined),
  saveBuyer: vi.fn().mockResolvedValue(undefined),
  deleteDealById: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue({
    id: "u1",
    firstName: "Ankit",
    lastName: "Jain",
    profileImage: "",
  }),
  saveContractVersion: vi.fn().mockResolvedValue(undefined),
  fetchContractVersion: vi.fn().mockResolvedValue(null),
  deleteContractById: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./filters/crm_filters", () => ({
  default: () => <div>Filters</div>,
}));

vi.mock("./forms/crm_form", () => ({
  default: () => <div>Add Property Form</div>,
}));

vi.mock("./data/crm_table", () => ({
  default: () => <div>Deals Table</div>,
}));

vi.mock("../../buyers/components/Buyers", () => ({
  default: () => <div>Buyers View</div>,
}));

vi.mock("../../stats/StatsGrid", () => ({
  default: () => <div>Stats Grid</div>,
}));

vi.mock("../../loader/LoadingScreen", () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock("../../auth/AuthGate", () => ({
  default: () => <div>Sign in to your CRM</div>,
}));

const { fetchDeals } = await import("../../../firebase/firestoreService");

const SESSION_STORAGE_KEY = "crmCurrentUser";

function seedCurrentUser() {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      id: "u1",
      firstName: "Ankit",
      lastName: "Jain",
      username: "ankitjain",
      email: "ankit@example.com",
      profileImage: "",
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Crm", () => {
  it("shows account actions in the top-right avatar dropdown", async () => {
    seedCurrentUser();

    render(<Wholesale />);

    await waitFor(() => {
      expect(fetchDeals).toHaveBeenCalledWith("u1");
    });

    fireEvent.click(screen.getByRole("button", { name: /Open profile menu/i }));

    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(screen.getAllByText("ankit@example.com").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));

    expect(screen.getByText("Profile Photo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ankit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jain")).toBeInTheDocument();
  });

  it("logs the user out after 30 minutes of inactivity", async () => {
    vi.useFakeTimers();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    seedCurrentUser();

    render(<Wholesale />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchDeals).toHaveBeenCalledWith("u1");

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "You have been logged out after 30 minutes of inactivity.",
    );
    expect(screen.getByText("Sign in to your CRM")).toBeInTheDocument();

    alertSpy.mockRestore();
  });
});
