import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FindCompsTab, { toFindCompsResult } from "./FindCompsTab";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tab = {
  eyebrow: "Comparable Sales",
  title: "Find property comps",
  description: "Search for comparable sold properties.",
  prompts: ["Use sold comps within 0.5 miles", "Match bed/bath count"],
};

const MOCK_ADDRESS = "5500 Grand Lake Dr, San Antonio, TX 78244";
const CACHE_KEY = "findComps_cache_v3";

// What /api/run-comps returns (Serper → Firecrawl → OpenAI).
const mockApiResponse = {
  address: MOCK_ADDRESS,
  listingUrls: {
    zillow: "https://www.zillow.com/homedetails/5500-Grand-Lake-Dr/1_zpid/",
    redfin: null,
    realtor:
      "https://www.realtor.com/realestateandhomes-detail/5500-Grand-Lake-Dr",
  },
  sourceErrors: { redfin: "No page found" },
  location: { lat: 29.5, lng: -98.4, matchedAddress: "5500 GRAND LAKE DR" },
  subjectSources: {
    zillow: {
      propertyType: "Single Family",
      beds: 3,
      baths: 2.5,
      sqft: 1878,
      yearBuilt: 1973,
    },
    realtor: {
      propertyType: "Single Family",
      beds: 3,
      baths: 2,
      sqft: 1878,
      yearBuilt: 1973,
    },
  },
  property: {
    propertyType: "Single Family",
    beds: 3,
    baths: 2,
    sqft: 1878,
    yearBuilt: 1973,
    valueEstimate: 247500,
    rentEstimate: 1850,
    annualTax: 3200,
  },
  arvEstimate: 250000,
  rentEstimate: 1850,
  criteria: {
    radiusMiles: 0.5,
    soldWithinDays: 90,
    beds: 3,
    baths: 2,
    yearBuiltFrom: 1968,
    yearBuiltTo: 1978,
    unknown: [],
  },
  stats: {
    nearbySales: 9,
    matched: 2,
    excluded: {
      distance: 3,
      soldDate: 0,
      beds: 2,
      baths: 1,
      yearBuilt: 1,
      propertyType: 0,
    },
    removedByAi: [],
  },
  topComps: [
    {
      address: "5207 Pine Lake Dr, San Antonio, TX 78244",
      price: 289444,
      beds: 3,
      baths: 2,
      sqft: 1895,
      soldDate: "2026-07-14",
      distance: 0.21,
      yearBuilt: 1975,
      url: "https://www.zillow.com/homedetails/5207-Pine-Lake-Dr/2_zpid/",
      source: "Zillow",
      reason: "Nearly identical size, sold this summer",
    },
    {
      address: "6707 Lake Cliff St, San Antonio, TX 78244",
      price: 245000,
      beds: 3,
      baths: 2,
      sqft: 1820,
      soldDate: "2026-08-02",
      distance: 0.44,
      yearBuilt: 1970,
      url: null,
      source: "Realtor.com",
      reason: "Same bed/bath, slightly smaller",
    },
  ],
  summary: "ARV based on two recent 3/2 sales within half a mile.",
};

// The result as the tab saves it in localStorage.
const mockResult = toFindCompsResult(mockApiResponse, MOCK_ADDRESS);

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = vi.fn();
});

function mockFetchSuccess(data = mockApiResponse) {
  globalThis.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

function mockFetchError(message = "Address not found") {
  globalThis.fetch.mockResolvedValueOnce({
    ok: false,
    status: 404,
    json: async () => ({ error: message }),
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
        screen.getByText(/Searching Zillow, Redfin and Realtor\.com/i),
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
  it("runs comps through /api/run-comps with the entered address", async () => {
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
    expect(url).toBe("/api/run-comps");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ address: MOCK_ADDRESS });
  });

  it("displays the estimated ARV, rent estimate and online value estimate", async () => {
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
    expect(screen.getByText("$1,850/mo")).toBeInTheDocument();
    expect(screen.getByText("$247,500")).toBeInTheDocument();
    expect(screen.queryByText("Low Estimate")).not.toBeInTheDocument();
    expect(
      screen.getByText(/ARV based on two recent 3\/2 sales/),
    ).toBeInTheDocument();
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
    expect(screen.getByLabelText("Year Built")).toHaveValue(1973);
    expect(screen.getByLabelText("Sq Ft")).toHaveValue(1878);
    expect(screen.getByLabelText("Property type")).toHaveValue("Single Family");
    expect(screen.getByText("$3,200")).toBeInTheDocument();
    // The property's own pages join the View property row; Redfin wasn't found.
    expect(
      screen.getByRole("link", { name: "Open this property in Zillow" }),
    ).toHaveAttribute("href", mockApiResponse.listingUrls.zillow);
    expect(
      screen.getByRole("link", { name: /^Realtor\.com$/ }),
    ).toHaveAttribute("href", mockApiResponse.listingUrls.realtor);
    expect(screen.queryByRole("link", { name: /^Redfin$/ })).toBeNull();
    expect(screen.queryByText(/This property on/i)).not.toBeInTheDocument();
    // One Street View button for the property.
    expect(
      screen.getAllByRole("button", { name: /^Street View$/ }),
    ).toHaveLength(1);
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

  it("shows each comp's price, sale date and listing link", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));

    await waitFor(() =>
      expect(screen.getByText("$289,444")).toBeInTheDocument(),
    );
    expect(screen.getByText("Sold 2026-07-14")).toBeInTheDocument();
    expect(screen.getByText("0.21 mi")).toBeInTheDocument();
    expect(screen.getByText("1975")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "5207 Pine Lake Dr, San Antonio, TX 78244",
      }),
    ).toHaveAttribute("href", mockApiResponse.topComps[0].url);
    // No listing link → plain text.
    expect(
      screen.getByText("6707 Lake Cliff St, San Antonio, TX 78244").tagName,
    ).toBe("TD");
  });

  it("shows View property links only once an address is entered", () => {
    render(<FindCompsTab tab={tab} />);
    expect(screen.queryByText(/Propwire/)).not.toBeInTheDocument();
    expect(screen.queryByText("View property:")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open this property in Zillow" }),
    ).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    expect(
      screen.getByRole("link", { name: "Open this property in Zillow" }),
    ).toHaveAttribute(
      "href",
      "https://www.zillow.com/homes/5500-Grand-Lake-Dr-San-Antonio-TX-78244_rb/",
    );
    expect(
      screen.getByRole("button", { name: /Street View/ }),
    ).toBeInTheDocument();
  });

  it("links straight to the property's Zillow page after results load", async () => {
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
      screen.getByRole("link", { name: "Open this property in Zillow" }),
    ).toHaveAttribute("href", mockApiResponse.listingUrls.zillow);
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

// ─── Auto-search from cache on typing ─────────────────────────────────────────

describe("auto-search from cache on typing", () => {
  it("shows suggestions from cache as user types a partial address", () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    // Type only the first word of the address
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS.split(" ")[0] },
    });

    expect(screen.getByText(MOCK_ADDRESS)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("selecting a suggestion loads cached result without an API call", async () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS.split(" ")[0] },
    });

    fireEvent.mouseDown(screen.getByText(MOCK_ADDRESS));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("disables Find Comps button after a suggestion is selected", async () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS.split(" ")[0] },
    });
    fireEvent.mouseDown(screen.getByText(MOCK_ADDRESS));

    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Find Comps/i })).toBeDisabled();
  });

  it("enables Find Comps button when address is not in cache", () => {
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: "999 Unknown St, Nowhere, TX 00000" },
    });

    expect(
      screen.getByRole("button", { name: /Find Comps/i }),
    ).not.toBeDisabled();
  });

  it("clears results when address is cleared", async () => {
    setCache([
      {
        address: MOCK_ADDRESS,
        result: mockResult,
        searchedAt: new Date().toISOString(),
      },
    ]);
    render(<FindCompsTab tab={tab} />);
    // Select via suggestion
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS.split(" ")[0] },
    });
    fireEvent.mouseDown(screen.getByText(MOCK_ADDRESS));
    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: "" },
    });
    expect(screen.queryByText("Estimated ARV")).not.toBeInTheDocument();
  });
});

describe("comp rules", () => {
  it("shows the rules applied and how many nearby sales each excluded", async () => {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));
    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
    const rules = screen.getByText(/^Rules:/).closest("p");
    expect(rules).toHaveTextContent(
      "Sold within 0.5 mi in the last 90 days · 3 bd · 2 ba · built 1968–1978",
    );
    expect(rules).toHaveTextContent(
      "9 homes sold nearby; 2 meet every rule (others: 3 too far, 2 different beds, 1 different baths, 1 built outside the range).",
    );
  });
});

describe("adjusting the subject property", () => {
  async function search() {
    mockFetchSuccess();
    render(<FindCompsTab tab={tab} />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\./i), {
      target: { value: MOCK_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: /Find Comps/i }));
    await waitFor(() =>
      expect(screen.getByText("Estimated ARV")).toBeInTheDocument(),
    );
  }

  it("shows what each site said and flags where they disagree", async () => {
    await search();
    const baths = screen.getByLabelText("Baths").closest("label");
    expect(baths).toHaveTextContent("Zillow 2.5 · Realtor.com 2");
    expect(baths).toHaveClass("find-comps-adjust-field--conflict");
    const beds = screen.getByLabelText("Beds").closest("label");
    expect(beds).not.toHaveClass("find-comps-adjust-field--conflict");
    expect(screen.getByText(/don't agree on everything/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Re-run comps/ })).toBeDisabled();
  });

  it("re-runs comps with corrected values at the same location", async () => {
    await search();
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockApiResponse,
        listingUrls: null,
        subjectSources: {},
        property: { ...mockApiResponse.property, baths: 2.5 },
        topComps: [mockApiResponse.topComps[1]],
        arvEstimate: 245000,
        adjusted: true,
      }),
    });

    fireEvent.change(screen.getByLabelText("Baths"), {
      target: { value: "2.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Re-run comps/ }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const body = JSON.parse(globalThis.fetch.mock.calls[1][1].body);
    expect(body).toMatchObject({
      address: MOCK_ADDRESS,
      location: mockApiResponse.location,
      subject: {
        beds: 3,
        baths: 2.5,
        sqft: 1878,
        yearBuilt: 1973,
        propertyType: "Single Family",
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/Comparable Sales \(1\)/)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Baths")).toHaveValue(2.5);
    // The sites' pages and their values carry over from the search.
    expect(
      screen.getByRole("link", { name: "Open this property in Zillow" }),
    ).toHaveAttribute("href", mockApiResponse.listingUrls.zillow);
    expect(screen.getByLabelText("Baths").closest("label")).toHaveTextContent(
      "Zillow 2.5 · Realtor.com 2",
    );
  });

  it("shows the error if the re-run fails, keeping the results", async () => {
    await search();
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({
        error: "Couldn't load recent sales from Redfin (403).",
      }),
    });
    fireEvent.change(screen.getByLabelText("Beds"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /Re-run comps/ }));
    expect(
      await screen.findByText(/Couldn't load recent sales from Redfin/),
    ).toBeInTheDocument();
    expect(screen.getByText("Estimated ARV")).toBeInTheDocument();
  });
});
