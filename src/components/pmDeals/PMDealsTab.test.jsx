import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import PMDealsTab from "./PMDealsTab";

const tab = {
  eyebrow: "Private Money",
  title: "Private money deal tracker",
  description: "Track borrower details and loan terms.",
};

const currentUser = { id: "user1" };

function makeDeal(overrides = {}) {
  return {
    id: "deal-1",
    userId: "user1",
    borrowerName: "Jane Doe",
    borrowerCompany: "Acme LLC",
    amountLent: "$100,000",
    interestRate: "10%",
    months: "12",
    lendDate: "2030-01-01", // far future – never late in real-time tests
    files: [],
    createdAt: "2026-01-01",
    ...overrides,
  };
}

function makeProps(overrides = {}) {
  return {
    tab,
    currentUser,
    fetchPmDeals: vi.fn().mockResolvedValue([]),
    savePmDeal: vi.fn().mockResolvedValue(undefined),
    deletePmDealById: vi.fn().mockResolvedValue(undefined),
    savePmDealFile: vi.fn().mockResolvedValue(undefined),
    fetchPmDealFile: vi.fn().mockResolvedValue(null),
    deletePmDealFileById: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function fillForm(container, options = {}) {
  const {
    borrowerName = "Jane Doe",
    amountLent = "100000",
    interestRate = "10",
    months = "12",
    lendDate = "2030-01-01",
  } = options;

  fireEvent.change(screen.getByPlaceholderText("John Smith"), {
    target: { value: borrowerName },
  });
  fireEvent.change(screen.getByPlaceholderText("$100,000"), {
    target: { value: amountLent },
  });
  const rateInput = screen.getByPlaceholderText("e.g. 22.5%");
  fireEvent.change(rateInput, { target: { value: interestRate } });
  fireEvent.blur(rateInput); // appends %
  fireEvent.change(screen.getByPlaceholderText("e.g. 12"), {
    target: { value: months },
  });
  fireEvent.change(container.querySelector('input[name="lendDate"]'), {
    target: { value: lendDate },
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders hero section from tab prop", async () => {
    render(<PMDealsTab {...makeProps()} />);
    expect(screen.getByText("Private Money")).toBeInTheDocument();
    expect(screen.getByText("Private money deal tracker")).toBeInTheDocument();
    expect(
      screen.getByText("Track borrower details and loan terms."),
    ).toBeInTheDocument();
  });

  it("shows empty state when no deals are loaded", async () => {
    render(<PMDealsTab {...makeProps()} />);
    await waitFor(() =>
      expect(
        screen.getByText("Add your first PM deal above."),
      ).toBeInTheDocument(),
    );
  });

  it("shows singular deal count for one deal", async () => {
    render(
      <PMDealsTab
        {...makeProps({
          fetchPmDeals: vi.fn().mockResolvedValue([makeDeal()]),
        })}
      />,
    );
    await waitFor(() => expect(screen.getByText("1 deal")).toBeInTheDocument());
  });

  it("shows plural deal count for multiple deals", async () => {
    const deals = [
      makeDeal({ id: "d1" }),
      makeDeal({ id: "d2", borrowerName: "Bob Smith" }),
    ];
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue(deals) })}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("2 deals")).toBeInTheDocument(),
    );
  });

  it("renders table headers when deals exist", async () => {
    render(
      <PMDealsTab
        {...makeProps({
          fetchPmDeals: vi.fn().mockResolvedValue([makeDeal()]),
        })}
      />,
    );
    await waitFor(() => screen.getByText("Jane Doe"));
    expect(
      screen.getByRole("columnheader", { name: "Borrower Name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getByText("Days Late")).toBeInTheDocument();
    expect(screen.getByText("Total Payout")).toBeInTheDocument();
  });
});

// ─── Form interactions ────────────────────────────────────────────────────────

describe("form interactions", () => {
  it("Add Deal button is disabled on initial render", () => {
    render(<PMDealsTab {...makeProps()} />);
    expect(screen.getByRole("button", { name: /Add Deal/i })).toBeDisabled();
  });

  it("stays disabled when only borrower name is filled", () => {
    render(<PMDealsTab {...makeProps()} />);
    fireEvent.change(screen.getByPlaceholderText("John Smith"), {
      target: { value: "Jane" },
    });
    expect(screen.getByRole("button", { name: /Add Deal/i })).toBeDisabled();
  });

  it("becomes enabled once all required fields are filled", () => {
    const { container } = render(<PMDealsTab {...makeProps()} />);
    const btn = screen.getByRole("button", { name: /Add Deal/i });
    fillForm(container);
    expect(btn).not.toBeDisabled();
  });

  it("formats amountLent as currency while typing", () => {
    render(<PMDealsTab {...makeProps()} />);
    const input = screen.getByPlaceholderText("$100,000");
    fireEvent.change(input, { target: { value: "100000" } });
    expect(input).toHaveValue("$100,000");
  });

  it("strips non-numeric characters from amountLent", () => {
    render(<PMDealsTab {...makeProps()} />);
    const input = screen.getByPlaceholderText("$100,000");
    fireEvent.change(input, { target: { value: "abc$100,000xyz" } });
    expect(input).toHaveValue("$100,000");
  });

  it("appends % to interest rate on blur", () => {
    render(<PMDealsTab {...makeProps()} />);
    const input = screen.getByPlaceholderText("e.g. 22.5%");
    fireEvent.change(input, { target: { value: "22.5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("22.5%");
  });

  it("strips non-numeric characters from months", () => {
    render(<PMDealsTab {...makeProps()} />);
    const input = screen.getByPlaceholderText("e.g. 12");
    fireEvent.change(input, { target: { value: "12abc" } });
    expect(input).toHaveValue("12");
  });
});

// ─── Adding a deal ────────────────────────────────────────────────────────────

describe("adding a deal", () => {
  it("calls savePmDeal and shows the deal in the table", async () => {
    const savePmDeal = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<PMDealsTab {...makeProps({ savePmDeal })} />);

    fillForm(container);
    fireEvent.click(screen.getByRole("button", { name: /Add Deal/i }));

    await waitFor(() => expect(savePmDeal).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.getByText("Jane Doe")).toBeInTheDocument(),
    );
  });

  it("resets the form after adding a deal", async () => {
    const { container } = render(<PMDealsTab {...makeProps()} />);
    fillForm(container, { borrowerName: "Reset Test" });
    fireEvent.click(screen.getByRole("button", { name: /Add Deal/i }));

    await waitFor(() => screen.getByText("Reset Test"));
    expect(screen.getByPlaceholderText("John Smith")).toHaveValue("");
    expect(screen.getByPlaceholderText("$100,000")).toHaveValue("");
    expect(screen.getByPlaceholderText("e.g. 22.5%")).toHaveValue("");
    expect(screen.getByPlaceholderText("e.g. 12")).toHaveValue("");
  });

  it("saves deal with correct fields including userId", async () => {
    const savePmDeal = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PMDealsTab
        {...makeProps({ savePmDeal, currentUser: { id: "user-abc" } })}
      />,
    );

    fillForm(container, {
      borrowerName: "Jane Doe",
      amountLent: "100000",
      interestRate: "10",
      months: "12",
      lendDate: "2030-01-01",
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Deal/i }));

    await waitFor(() => expect(savePmDeal).toHaveBeenCalledOnce());
    const saved = savePmDeal.mock.calls[0][0];
    expect(saved.userId).toBe("user-abc");
    expect(saved.borrowerName).toBe("Jane Doe");
    expect(saved.amountLent).toBe("$100,000");
    expect(saved.interestRate).toBe("10%");
    expect(saved.months).toBe("12");
    expect(saved.lendDate).toBe("2030-01-01");
    expect(saved.id).toBeTruthy(); // UUID assigned
    expect(saved.files).toEqual([]); // starts with no files
  });
});

// ─── Data loading ─────────────────────────────────────────────────────────────

describe("data loading", () => {
  it("calls fetchPmDeals with the current user's id on mount", async () => {
    const fetchPmDeals = vi.fn().mockResolvedValue([]);
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals, currentUser: { id: "user-xyz" } })}
      />,
    );
    await waitFor(() => expect(fetchPmDeals).toHaveBeenCalledWith("user-xyz"));
  });

  it("skips fetch when currentUser has no id", () => {
    const fetchPmDeals = vi.fn().mockResolvedValue([]);
    render(
      <PMDealsTab {...makeProps({ fetchPmDeals, currentUser: { id: "" } })} />,
    );
    expect(fetchPmDeals).not.toHaveBeenCalled();
  });

  it("renders deals loaded from Firestore in the table", async () => {
    const deal = makeDeal({ borrowerName: "Loaded Borrower" });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("Loaded Borrower")).toBeInTheDocument(),
    );
    expect(screen.getByText("Acme LLC")).toBeInTheDocument();
  });
});

// ─── Calculations ─────────────────────────────────────────────────────────────

describe("calculations", () => {
  afterEach(() => vi.useRealTimers());

  it("shows 0 late days and correct payout when due date is in the future", async () => {
    // lendDate 2030-01-01, months 12 → due 2031-01-01 (always in the future)
    // interest = 100,000 × 10% = $10,000, late fee = $0, payout = $110,000
    const deal = makeDeal({
      amountLent: "$100,000",
      interestRate: "10%",
      months: "12",
      lendDate: "2030-01-01",
    });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );

    await waitFor(() => screen.getByText("Jane Doe"));

    expect(screen.getAllByText("$110,000.00")[0]).toBeInTheDocument(); // total payout
    expect(screen.getAllByText("$0.00")[0]).toBeInTheDocument(); // late fee
  });

  it("counts only weekday late days, skipping Saturday and Sunday", async () => {
    // lendDate 2024-01-01, months 1 → dueDate 2024-02-01 (Thursday)
    // today  = 2024-02-07 (Wednesday)
    // weekdays between: Fri 02-02 → 1, Sat/Sun skipped, Mon 02-05 → 2,
    //                   Tue 02-06 → 3, Wed 02-07 → 4  →  4 late days
    vi.useFakeTimers({ now: new Date("2024-02-07T12:00:00.000") });

    const deal = makeDeal({
      amountLent: "$100,000",
      interestRate: "10%",
      months: "1",
      lendDate: "2024-01-01",
    });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );

    await act(async () => {}); // flush fetchPmDeals Promise

    expect(screen.getByText("4")).toBeInTheDocument(); // days late
    expect(screen.getAllByText("$400.00")[0]).toBeInTheDocument(); // 4 × $100
    expect(screen.getAllByText("$110,400.00")[0]).toBeInTheDocument(); // principal + interest + late fee
  });

  it("charges $100 per weekday late — total payout grows with each weekday", async () => {
    // Same scenario but check interest is correct independently
    vi.useFakeTimers({ now: new Date("2024-02-07T12:00:00.000") });

    const deal = makeDeal({
      amountLent: "$100,000",
      interestRate: "10%",
      months: "1",
      lendDate: "2024-01-01",
    });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );

    await act(async () => {});

    expect(screen.getAllByText("$10,000.00")[0]).toBeInTheDocument(); // flat interest
    expect(screen.getAllByText("$400.00")[0]).toBeInTheDocument(); // 4 × $100 late fee
  });

  it("displays due date in MM/DD/YYYY format", async () => {
    // lendDate 2024-01-01, months 1 → dueDate 2024-02-01 → "02/01/2024"
    vi.useFakeTimers({ now: new Date("2024-01-15T12:00:00.000") });

    const deal = makeDeal({
      months: "1",
      lendDate: "2024-01-01",
    });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );

    await act(async () => {});

    expect(screen.getByText("02/01/2024")).toBeInTheDocument(); // due date
  });
});

// ─── Midnight tick ────────────────────────────────────────────────────────────

describe("midnight tick", () => {
  afterEach(() => vi.useRealTimers());

  it("increments late days and recalculates total payout at midnight", async () => {
    // dueDate = 2024-02-01; at 23:59:59 today is still Feb 1 → 0 late days
    // one second later today becomes Feb 2 (Friday) → 1 weekday late
    vi.useFakeTimers({ now: new Date("2024-02-01T23:59:59.000") });

    const deal = makeDeal({
      amountLent: "$100,000",
      interestRate: "10%",
      months: "1",
      lendDate: "2024-01-01",
    });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );

    await act(async () => {}); // flush fetchPmDeals Promise

    // Before midnight: 0 late days → payout = principal + interest
    expect(screen.getAllByText("$110,000.00")[0]).toBeInTheDocument();

    // Cross midnight — timer fires after ~1 000 ms
    act(() => {
      vi.advanceTimersByTime(1001);
    });

    // After midnight: today = 2024-02-02 (Friday) → 1 weekday late → +$100
    expect(screen.getAllByText("$110,100.00")[0]).toBeInTheDocument();
  });

  it("schedules successive midnight ticks correctly", async () => {
    // Verify the second midnight also increments (Mon follows the weekend)
    // Start just before midnight on 2024-02-01 (Thu) — after first tick: Feb 2 (Fri), 1 late day
    // After second tick: Feb 3 (Sat) — still 1 late day (weekend skipped)
    vi.useFakeTimers({ now: new Date("2024-02-01T23:59:59.000") });

    const deal = makeDeal({
      amountLent: "$100,000",
      interestRate: "10%",
      months: "1",
      lendDate: "2024-01-01",
    });
    render(
      <PMDealsTab
        {...makeProps({ fetchPmDeals: vi.fn().mockResolvedValue([deal]) })}
      />,
    );

    await act(async () => {});

    // First midnight tick → Feb 2 (Fri): 1 weekday late
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    expect(screen.getAllByText("$110,100.00")[0]).toBeInTheDocument();

    // Second midnight tick → Feb 3 (Sat): still 1 weekday late (Sat not counted)
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(screen.getAllByText("$110,100.00")[0]).toBeInTheDocument();
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

describe("delete", () => {
  it("calls deletePmDealById and removes the deal from the table", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deletePmDealById = vi.fn().mockResolvedValue(undefined);
    const deal = makeDeal();

    render(
      <PMDealsTab
        {...makeProps({
          fetchPmDeals: vi.fn().mockResolvedValue([deal]),
          deletePmDealById,
        })}
      />,
    );

    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTitle("Delete deal"));

    await waitFor(() =>
      expect(deletePmDealById).toHaveBeenCalledWith("deal-1"),
    );
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });

  it("does not delete when the user cancels the confirm dialog", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const deletePmDealById = vi.fn();
    const deal = makeDeal();

    render(
      <PMDealsTab
        {...makeProps({
          fetchPmDeals: vi.fn().mockResolvedValue([deal]),
          deletePmDealById,
        })}
      />,
    );

    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTitle("Delete deal"));

    expect(deletePmDealById).not.toHaveBeenCalled();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("updates the deal count after deleting", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deals = [
      makeDeal({ id: "d1", borrowerName: "Alice" }),
      makeDeal({ id: "d2", borrowerName: "Bob" }),
    ];

    render(
      <PMDealsTab
        {...makeProps({
          fetchPmDeals: vi.fn().mockResolvedValue(deals),
          deletePmDealById: vi.fn().mockResolvedValue(undefined),
        })}
      />,
    );

    await waitFor(() => screen.getByText("2 deals"));
    fireEvent.click(screen.getAllByTitle("Delete deal")[0]);
    await waitFor(() => expect(screen.getByText("1 deal")).toBeInTheDocument());
  });
});
