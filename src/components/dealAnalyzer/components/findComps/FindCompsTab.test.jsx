import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FindCompsTab from "./FindCompsTab";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tab = {
  eyebrow: "Comparable Sales",
  title: "Find property comps",
  description: "Search for comparable sold properties.",
  prompts: ["Use sold comps within 0.5 miles", "Match bed/bath count"],
};

const MOCK_ADDRESS = "5500 Grand Lake Dr, San Antonio, TX 78244";
const CACHE_KEY = "findComps_cache";

const mockResult = {
  price: 250000,
  priceRangeLow: 195000,
  priceRangeHigh: 304000,
  subjectProperty: {
    formattedAddress: MOCK_ADDRESS,
    propertyType: "Single Family",
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1878,
    yearBuilt: 1973,
    lastSalePrice: 270000,
  },
  comparables: [
    {
      id: "comp-1",
      formattedAddress: "5207 Pine Lake Dr, San Antonio, TX 78244",
      status: "Active",
      price: 289444,
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1895,
      distance: 0.384,
      correlation: 0.9916,
    },
    {
      id: "comp-2",
      formattedAddress: "6707 Lake Cliff St, San Antonio, TX 78244",
      status: "Sold",
      price: 245000,
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1820,
      distance: 0.72,
      correlation: 0.9721,
    },
  ],
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  vi.stubEnv("VITE_RENTCAST_API_KEY", "test-rentcast-key");
});

beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = vi.fn();
});

function mockFetchSuccess(data = mockResult) {
  globalThis.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

function mockFetchError(message = "Address not found") {
  globalThis.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ message }),
  });
}

function setCache(entries) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders hero eyebrow, title, and description from tab prop", () => {
    render(<FindCompsTab tab={tab} />);
    expect(screen.getByText("Comparable Sales")).toBeInTheDocument();
    expect(screen.getByText("Find property comps")).toBeInTheDocument();
    expect(
      screen.getByText("Search for comparable sold properties."),
    ).toBeInTheDocument();
  });

  it("renders all review prompt cards", () => {
    render(<FindCompsTab tab={tab} />);
    expect(
      screen.getByText("Use sold comps within 0.5 miles"),
    ).toBeInTheDocument();
    expect(screen.getByText("Match bed/bath count")).toBeInTheDocument();
  });

  it("renders address input and Find Comps button", () => {
    render(<FindCompsTab tab={tab} />);
    expect(screen.getByPlaceholderText(/e\.g\./i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Find Comps/i }),
    ).toBeInTheDocument();
  });

  it("does not show results section on initial render", () => {
    render(<FindCompsTab tab={tab} />);
    expect(screen.queryByText("Estimated ARV")).not.toBeInTheDocument();
    expect(screen.queryByText("Subject Property")).not.toBeInTheDocument();
  });

  it("does not show loader on initial render", () => {
    render(<FindCompsTab tab={tab} />);
    expect(
      screen.queryByText(/Fetching value estimate/i),
    ).not.toBeInTheDocument();
  });
});

// ─── Button state ─────────────────────────────────────────────────────────────

describe("Find Comps button", () => {
  it("is disabled when address input is empty", () => {
    render(<FindCompsTab tab={tab} />);
    expect(screen.getByRole("button", { name: /Find Comps/i })).toBeDisabled();
  });

  it("is enabled after typing an address", () => {
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    expect(
      screen.getByRole("button", { name: /Find Comps/i }),
    ).not.toBeDisabled();
  });

  it("is disabled again if address is cleared", () => {
    render(<FindCompsTab tab={tab} />);
    const input = screen.getByPlaceholderText(/e\.g\./i);
    fireEvent.change(input, { target: { value: MOCK_ADDRESS } });
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Find Comps/i })).toBeDisabled();
  });

  it("shows Searching… text and is disabled while loading", async () => {
    globalThis.fetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));
    await waitFor(() => {
      expect(screen.getByText("Searching…")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Searching…/i })).toBeDisabled();
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe("loading state", () => {
  it("shows spinner and loading message while fetching", async () => {
    globalThis.fetch.mockReturnValue(new Promise(() => {}));
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Fetching value estimate and comparables/i),
      ).toBeInTheDocument();
    });
  });

  it("input is disabled while loading", async () => {
    globalThis.fetch.mockReturnValue(new Promise(() => {}));
    render(<FindCompsTab tab={tab} />);
    const input = screen.getByPlaceholderText(/e\.g\./i);
    fireEvent.change(input, { target: { value: MOCK_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));
    await waitFor(() => expect(input).toBeDisabled());
  });
});

// ─── Successful fetch ─────────────────────────────────────────────────────────

describe("successful fetch", () => {
  it("calls the RentCast API with the entered address and API key", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    const [url, options] = globalThis.fetch.mock.calls[0];
    // URLSearchParams encodes spaces as "+" so check the base URL and key fields separately
    expect(url).toContain("https://api.rentcast.io/v1/avm/value");
    expect(url).toContain("address=");
    expect(url).toContain("San+Antonio");
    expect(options.headers["X-Api-Key"]).toBe("test-rentcast-key");
  });

  it("displays the estimated ARV, low, and high estimates", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(screen.getByText("$250,000")).toBeInTheDocument();
    expect(screen.getByText("$195,000")).toBeInTheDocument();
    expect(screen.getByText("$304,000")).toBeInTheDocument();
  });

  it("displays subject property details", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Subject Property")).toBeInTheDocument(),
    );
    expect(screen.getByText("Single Family")).toBeInTheDocument();
    expect(screen.getByText("1973")).toBeInTheDocument();
    expect(screen.getByText("$270,000")).toBeInTheDocument();
  });

  it("renders a row in the comparables table for each comparable", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText(/Comparable Sales \(2\)/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText("5207 Pine Lake Dr, San Antonio, TX 78244"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("6707 Lake Cliff St, San Antonio, TX 78244"),
    ).toBeInTheDocument();
  });

  it("shows correct comparable price, distance, and match %", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("$289,444")).toBeInTheDocument(),
    );
    expect(screen.getByText("0.38 mi")).toBeInTheDocument();
    expect(screen.getByText("99%")).toBeInTheDocument();
  });

  it("shows the Propwire external link after results load", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Open in Propwire")).toBeInTheDocument(),
    );
  });

  it("hides the loader once results are shown", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/Fetching value estimate/i),
    ).not.toBeInTheDocument();
  });

  it("triggers search on Enter key press", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(/e\.g\./i), { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("error handling", () => {
  it("shows API error message when fetch returns non-ok", async () => {
    mockFetchError("Invalid address format");
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Invalid address format")).toBeInTheDocument(),
    );
  });

  it("shows fallback error message when fetch rejects", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("Network error"));
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument(),
    );
  });

  it("does not show results when an error occurs", async () => {
    mockFetchError();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Address not found")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Estimated ARV")).not.toBeInTheDocument();
  });

  it("resets error state when address is changed after an error", async () => {
    mockFetchError();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Address not found")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: "New address" },
    });
    expect(screen.queryByText("Address not found")).not.toBeInTheDocument();
  });
});

// ─── New search / reset ───────────────────────────────────────────────────────

describe("new search reset", () => {
  it("clicking ← New search hides results and clears the input", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText(/← New search/i));

    expect(screen.queryByText("Estimated ARV")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\./i)).toHaveValue("");
  });

  it("Find Comps button is disabled after reset", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText(/← New search/i));
    expect(screen.getByRole("button", { name: /Find Comps/i })).toBeDisabled();
  });
});

// ─── Cache — localStorage ─────────────────────────────────────────────────────

describe("localStorage cache", () => {
  it("saves result to localStorage after a successful fetch", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    const stored = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].address).toBe(MOCK_ADDRESS);
    expect(stored[0].result.price).toBe(250000);
  });

  it("serves cached result without calling fetch on repeat search", async () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("cache lookup is case-insensitive", async () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS.toLowerCase() },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("caps cache at 100 entries, dropping the oldest", async () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({
      address: `${i} Old St`,
      result: { price: 100000 + i * 1000 },
      searchedAt: new Date().toISOString(),
    }));
    setCache(existing);

    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    const stored = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(stored).toHaveLength(100);
    expect(stored[0].address).toBe(MOCK_ADDRESS);
    expect(stored.find((e) => e.address === "99 Old St")).toBeUndefined();
  });

  it("bumps an existing cache entry to the top when searched again", async () => {
    setCache([
      {
        address: "111 Other St",
        result: { price: 180000 },
        searchedAt: new Date().toISOString(),
      },
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    const stored = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(stored[0].address).toBe(MOCK_ADDRESS);
    expect(stored).toHaveLength(2); // no duplicate
  });
});

// ─── Recent searches list ──────────────────────────────────────────────────────

describe("recent searches list", () => {
  it("shows recent searches when cache is populated and input is empty", () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: { price: 250000 },
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    expect(screen.getByText(MOCK_ADDRESS)).toBeInTheDocument();
    expect(screen.getByText("$250,000")).toBeInTheDocument();
  });

  it("does not show recent searches when cache is empty", () => {
    render(<FindCompsTab tab={tab} />);
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
  });

  it("hides recent searches once the user starts typing", () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: { price: 250000 },
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    expect(screen.getByText("Recent searches")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: "a" },
    });
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
  });

  it("clicking a recent entry loads its result without an API call", async () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    fireEvent.click(screen.getByText(MOCK_ADDRESS));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(screen.getByText("$250,000")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("paginates recent entries showing 5 per page", () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      address: `${i + 1} Recent St`,
      result: { price: 200000 + i * 1000 },
      searchedAt: new Date().toISOString(),
    }));
    setCache(entries);
    render(<FindCompsTab tab={tab} />);
    // First 5 visible on page 1
    entries.slice(0, 5).forEach((e) => {
      expect(screen.getByText(e.address)).toBeInTheDocument();
    });
    // Entries 6-10 not yet visible
    entries.slice(5).forEach((e) => {
      expect(screen.queryByText(e.address)).not.toBeInTheDocument();
    });
    // Pagination controls present
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    // Navigate to page 2
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    entries.slice(5).forEach((e) => {
      expect(screen.getByText(e.address)).toBeInTheDocument();
    });
  });
});
