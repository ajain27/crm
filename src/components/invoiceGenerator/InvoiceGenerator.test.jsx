import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import InvoiceGenerator from "./InvoiceGenerator";

vi.mock("../../firebase/firestoreService", () => ({
  saveInvoice: vi.fn().mockResolvedValue(undefined),
  fetchInvoices: vi.fn().mockResolvedValue([]),
  deleteInvoiceById: vi.fn().mockResolvedValue(undefined),
  saveScheduledPayment: vi.fn().mockResolvedValue(undefined),
  fetchScheduledPayments: vi.fn().mockResolvedValue([]),
  deleteScheduledPaymentById: vi.fn().mockResolvedValue(undefined),
}));

const { fetchScheduledPayments } =
  await import("../../firebase/firestoreService");

function addMonthsISO(iso, monthsToAdd) {
  const [y, m, d] = iso.split("-").map(Number);
  const targetIndex = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(d, daysInTargetMonth);
  const result = new Date(targetYear, targetMonth, targetDay);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function scheduleDateInputs() {
  return Array.from(document.querySelectorAll(".ig-schedule-date"));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InvoiceGenerator payment schedule", () => {
  it("auto-fills consecutive monthly dates when number of payments > 1", () => {
    render(<InvoiceGenerator currentUser={{ id: "u1" }} />);

    fireEvent.change(screen.getByLabelText("Number of Payments"), {
      target: { value: "3" },
    });

    const inputs = scheduleDateInputs();
    expect(inputs).toHaveLength(3);
    expect(inputs[0].value).toBe(todayISO());
    expect(inputs[1].value).toBe(addMonthsISO(todayISO(), 1));
    expect(inputs[2].value).toBe(addMonthsISO(todayISO(), 2));
  });

  it("lets the user override an auto-filled date", () => {
    render(<InvoiceGenerator currentUser={{ id: "u1" }} />);

    fireEvent.change(screen.getByLabelText("Number of Payments"), {
      target: { value: "2" },
    });

    const [first] = scheduleDateInputs();
    fireEvent.change(first, { target: { value: "2030-01-15" } });
    expect(first.value).toBe("2030-01-15");
  });

  it("does not overwrite a manually edited date when unrelated fields change", () => {
    render(<InvoiceGenerator currentUser={{ id: "u1" }} />);

    fireEvent.change(screen.getByLabelText("Number of Payments"), {
      target: { value: "2" },
    });
    const [first] = scheduleDateInputs();
    fireEvent.change(first, { target: { value: "2030-01-15" } });

    fireEvent.change(screen.getByPlaceholderText(/Cloud Med Spas/i), {
      target: { value: "Acme Co" },
    });

    expect(scheduleDateInputs()[0].value).toBe("2030-01-15");
  });
});

describe("InvoiceGenerator send enablement", () => {
  it("enables Send Invoice without requiring Number of Payments to be touched", () => {
    render(<InvoiceGenerator currentUser={{ id: "u1" }} />);

    fireEvent.change(screen.getByPlaceholderText(/Cloud Med Spas/i), {
      target: { value: "Acme Co" },
    });
    fireEvent.change(screen.getByLabelText("Setup Fee"), {
      target: { value: "1000" },
    });

    expect(screen.getByRole("button", { name: /Send Invoice/i })).toBeEnabled();
  });
});

describe("InvoiceGenerator scheduled payments accordion", () => {
  const PAYMENTS = [
    {
      id: "p1",
      invoiceNum: "YWC-1",
      clientName: "Acme Co",
      paymentNum: 1,
      totalPayments: 2,
      dueDate: "2026-09-01",
      paymentAmount: 100,
      status: "pending",
    },
    {
      id: "p2",
      invoiceNum: "YWC-1",
      clientName: "Acme Co",
      paymentNum: 2,
      totalPayments: 2,
      dueDate: "2026-10-01",
      paymentAmount: 100,
      status: "pending",
    },
    {
      id: "p3",
      invoiceNum: "YWC-2",
      clientName: "Beta LLC",
      paymentNum: 1,
      totalPayments: 1,
      dueDate: "2026-08-15",
      paymentAmount: 250,
      status: "pending",
    },
  ];

  it("groups scheduled payments per client, collapsed by default", async () => {
    fetchScheduledPayments.mockResolvedValue(PAYMENTS);
    render(<InvoiceGenerator currentUser={{ id: "u1" }} />);

    expect(await screen.findByText("Acme Co")).toBeInTheDocument();
    expect(screen.getByText("Beta LLC")).toBeInTheDocument();
    expect(screen.queryByText("YWC-1")).not.toBeInTheDocument();
    expect(screen.queryByText("YWC-2")).not.toBeInTheDocument();
  });

  it("expands a client group to reveal only that client's payments", async () => {
    fetchScheduledPayments.mockResolvedValue(PAYMENTS);
    render(<InvoiceGenerator currentUser={{ id: "u1" }} />);

    const acmeHeader = await screen.findByRole("button", {
      name: /Acme Co/i,
    });
    fireEvent.click(acmeHeader);

    const acmeGroup = acmeHeader.closest(".ig-sched-group");
    expect(within(acmeGroup).getAllByText("YWC-1")).toHaveLength(2);
    expect(screen.queryByText("YWC-2")).not.toBeInTheDocument();
  });
});
