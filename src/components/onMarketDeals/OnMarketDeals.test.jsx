import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import OnMarketDeals from "./OnMarketDeals";
import { requestComps } from "../../services/compsService";
import {
  requestListingDetails,
  requestMarketListings,
} from "../../services/marketListingsService";

// The city box's Google autocomplete: the test picks a city by calling the
// hook's onSelect.
const pickCity = vi.hoisted(() => ({ current: null }));
vi.mock("../../hooks/useAddressAutocomplete", () => ({
  useAddressAutocomplete: (ref, onSelect) => {
    pickCity.current = onSelect;
  },
}));
vi.mock("../../services/compsService", () => ({
  requestComps: vi.fn(),
}));
vi.mock("../leads/comps/CompsMap", () => ({ default: () => null }));
vi.mock("../../services/marketListingsService", () => ({
  requestMarketListings: vi.fn(),
  requestListingDetails: vi.fn(),
}));

const home = (zpid, street, daysOnMarket, extra = {}) => ({
  zpid,
  address: `${street}, Pontiac, MI 48340`,
  street,
  city: "Pontiac",
  state: "MI",
  zip: "48340",
  price: 112000,
  beds: 3,
  baths: 1,
  sqft: 948,
  daysOnMarket,
  zestimate: 140000,
  lat: 42.67,
  lng: -83.31,
  photo: `https://photos.zillowstatic.com/fp/${zpid}-p_e.jpg`,
  zillowUrl: `https://www.zillow.com/homedetails/${zpid}_zpid/`,
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  requestMarketListings.mockReset();
  requestComps.mockReset();
  requestMarketListings.mockImplementation(async ({ keyword, redfin }) => {
    if (redfin) {
      return [
        {
          street: "372 W Columbia Ave",
          zip: "48340",
          yearBuilt: 1964,
          mls: "61042055",
          url: "https://www.redfin.com/home/1",
        },
      ];
    }
    if (keyword === "investor") {
      return [
        home("1", "372 W Columbia Ave", 34),
        home("2", "9 Elm St", 5), // too new
      ];
    }
    if (keyword === "tlc") return [home("1", "372 W Columbia Ave", 34)];
    return [];
  });
});

async function searchPontiac() {
  render(<OnMarketDeals />);
  act(() => pickCity.current({ city: "Pontiac", state: "MI" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Find deals/ }));
  });
}

describe("OnMarketDeals", () => {
  it("searches each keyword in the chosen city and shows homes on the market over 20 days", async () => {
    await searchPontiac();

    expect(requestMarketListings).toHaveBeenCalledWith({
      city: "Pontiac",
      state: "MI",
      redfin: true,
    });
    expect(requestMarketListings).toHaveBeenCalledWith({
      city: "Pontiac",
      state: "MI",
      keyword: '"as is"',
    });

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(1);
    const card = within(cards[0]);
    expect(card.getByText("$112,000")).toBeInTheDocument();
    expect(card.getByText("34 days on market")).toBeInTheDocument();
    expect(card.getByText(/20% under/)).toBeInTheDocument();
    expect(card.getByText("investor")).toBeInTheDocument();
    expect(card.getByText("tlc")).toBeInTheDocument();
    expect(card.getByText("built 1964", { exact: false })).toBeInTheDocument();
    expect(card.getByRole("img")).toHaveAttribute(
      "src",
      "https://photos.zillowstatic.com/fp/1-p_e.jpg",
    );
    expect(card.getByRole("link", { name: /Redfin/ })).toHaveAttribute(
      "href",
      "https://www.redfin.com/home/1",
    );
  });

  it("choosing Any days shows newer listings too", async () => {
    await searchPontiac();
    fireEvent.click(screen.getByRole("radio", { name: "Any" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("keeps the cities and results, so reopening doesn't search again", async () => {
    await searchPontiac();
    const calls = requestMarketListings.mock.calls.length;
    render(<OnMarketDeals />);
    expect(screen.getAllByText("Pontiac, MI").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Find deals/ }).at(-1),
    ).toBeDisabled();
    expect(requestMarketListings.mock.calls.length).toBe(calls);
  });

  it("opens a home's window with its photos, description and contacts to call or text", async () => {
    requestListingDetails.mockResolvedValue({
      description: "Investor opportunity! Sold as is.",
      photos: ["https://p/1.jpg", "https://p/2.jpg"],
      contacts: [
        { role: "Listing agent", name: "Donna Eller", phone: "248-765-9901" },
        { role: "Brokerage", name: "KW Domain", phone: "248-590-0800" },
      ],
      saleType: "For sale by agent",
      facts: [],
    });
    await searchPontiac();
    await act(async () => {
      fireEvent.click(screen.getByText("372 W Columbia Ave"));
    });
    expect(requestListingDetails).toHaveBeenCalledWith(
      "https://www.zillow.com/homedetails/1_zpid/",
    );
    const dialog = within(document.querySelector(".omd-modal"));
    expect(
      dialog.getByText("Investor opportunity! Sold as is."),
    ).toBeInTheDocument();
    expect(dialog.getByText("Donna Eller")).toBeInTheDocument();
    const calls = dialog.getAllByRole("link", { name: /Call/ });
    expect(calls.map((a) => a.getAttribute("href"))).toEqual([
      "tel:+12487659901",
      "tel:+12485900800",
    ]);
    expect(dialog.getAllByRole("link", { name: /Text/ })[0]).toHaveAttribute(
      "href",
      "sms:+12487659901",
    );
    expect(dialog.getByText("1 / 2")).toBeInTheDocument();
  });

  it("leaves auctions out, even from results saved before", async () => {
    localStorage.setItem(
      "onMarketDeals_v1",
      JSON.stringify({
        cities: [{ city: "Pontiac", state: "MI" }],
        results: {
          "pontiac, mi": {
            fetchedAt: new Date().toISOString(),
            keywordsSig: "",
            listings: [
              {
                ...home("7", "7 Oak St", 40),
                id: "7",
                keywords: ["investor"],
                statusText: "Auction",
              },
              { ...home("8", "8 Oak St", 40), id: "8", keywords: ["investor"] },
            ],
          },
        },
      }),
    );
    render(<OnMarketDeals />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("8 Oak St")).toBeInTheDocument();
  });

  it("runs comps when Run comps is clicked, and shows the ARV against the asking price", async () => {
    requestListingDetails.mockResolvedValue({
      contacts: [],
      photos: [],
      facts: [],
    });
    requestComps.mockResolvedValue({
      address: "372 W Columbia Ave, Pontiac, MI 48340",
      arvEstimate: 200000,
      rentEstimate: 1400,
      property: { beds: 3, baths: 1, sqft: 948 },
      summary: "ARV = upper-quartile $211/sq ft across 2 comps × 948 sq ft.",
      topComps: [
        {
          address: "1 Comp St, Pontiac, MI",
          price: 190000,
          sqft: 900,
          beds: 3,
          baths: 1,
        },
        {
          address: "2 Comp St, Pontiac, MI",
          price: 210000,
          sqft: 1000,
          beds: 3,
          baths: 1,
        },
      ],
    });
    await searchPontiac();
    await act(async () => {
      fireEvent.click(screen.getByText("372 W Columbia Ave"));
    });
    // Nothing runs until asked.
    expect(requestComps).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run comps" }));
    });
    // The listing's own facts and map position, so the API doesn't scrape.
    expect(requestComps).toHaveBeenCalledWith(
      "372 W Columbia Ave, Pontiac, MI 48340",
      {
        location: { lat: 42.67, lng: -83.31 },
        subject: expect.objectContaining({ beds: 3, baths: 1, sqft: 948 }),
      },
    );
    const dialog = within(document.querySelector(".omd-modal"));
    const snapshot = within(document.querySelector(".omd-snapshot"));
    expect(snapshot.getByText("$200,000")).toBeInTheDocument();
    expect(snapshot.getByText("56%")).toBeInTheDocument(); // 112,000 / 200,000
    expect(snapshot.getByText("$88,000")).toBeInTheDocument();
    expect(snapshot.getByText("$140,000")).toBeInTheDocument();
    expect(snapshot.getByText("At or under 70% of ARV")).toBeInTheDocument();
    expect(dialog.getByText(/upper-quartile \$211\/sq ft/)).toBeInTheDocument();
    expect(dialog.getByText("1 Comp St")).toBeInTheDocument();
    expect(dialog.getByText("2 Comp St")).toBeInTheDocument();
  });

  it("shows 20 homes a page", () => {
    const listings = Array.from({ length: 25 }, (_, i) => ({
      ...home(String(i), `${i} Oak St`, 30 + i),
      id: String(i),
      keywords: ["investor"],
    }));
    localStorage.setItem(
      "onMarketDeals_v1",
      JSON.stringify({
        cities: [{ city: "Pontiac", state: "MI" }],
        results: {
          "pontiac, mi": { fetchedAt: new Date().toISOString(), listings },
        },
      }),
    );
    render(<OnMarketDeals />);
    expect(screen.getAllByRole("article")).toHaveLength(20);
    expect(screen.getByText("1–20 of 25 homes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("marks a home as a favorite and keeps it under Favorites", async () => {
    requestListingDetails.mockResolvedValue({
      contacts: [],
      photos: [],
      facts: [],
    });
    await searchPontiac();
    fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(
      screen.getByRole("button", { name: "Remove from favorites" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("tab", { name: /Favorites/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("372 W Columbia Ave")).toBeInTheDocument();

    // Still there after the city is removed.
    fireEvent.click(screen.getByRole("button", { name: "Remove Pontiac, MI" }));
    expect(screen.getByText("372 W Columbia Ave")).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem("onMarketDeals_v1")).favorites,
    ).toHaveProperty("1");

    // Un-favorite from its window.
    await act(async () => {
      fireEvent.click(screen.getByText("372 W Columbia Ave"));
    });
    const dialog = within(document.querySelector(".omd-modal"));
    fireEvent.click(
      dialog.getByRole("button", { name: "Remove from favorites" }),
    );
    fireEvent.click(
      dialog
        .getAllByRole("button")
        .find((b) => b.className.includes("modal-close")),
    );
    // No city and no favorites left: nothing to show.
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
