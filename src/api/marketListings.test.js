// Tests for api/_lib/marketListings.js (Zillow pages are mocked at fetch)
// and the page's combining and filtering (marketDeals.js).
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchMarketListings,
  parseZillowDetailsHtml,
  parseZillowSearchHtml,
  zillowCitySlug,
  zillowSearchUrl,
} from "../../api/_lib/marketListings.js";
import {
  combineCityResults,
  visibleListings,
} from "../components/onMarketDeals/marketDeals.js";

const zillowResult = (overrides = {}) => ({
  zpid: "24404805",
  imgSrc: "https://photos.zillowstatic.com/fp/abc-p_e.jpg",
  hasImage: true,
  detailUrl:
    "https://www.zillow.com/homedetails/372-W-Columbia-Ave/24404805_zpid/",
  statusText: "House for sale",
  unformattedPrice: 112000,
  address: "372 W Columbia Ave, Pontiac, MI 48340",
  addressStreet: "372 W Columbia Ave",
  addressCity: "Pontiac",
  addressState: "MI",
  addressZipcode: "48340",
  beds: 3,
  baths: 1,
  area: 948,
  latLong: { latitude: 42.67, longitude: -83.31 },
  zestimate: 134100,
  brokerName: "KW Showcase Realty",
  hdpData: {
    homeInfo: {
      homeType: "SINGLE_FAMILY",
      daysOnZillow: 34,
      listing_sub_type: { is_FSBA: true },
      rentZestimate: 1413,
      taxAssessedValue: 91600,
      lotAreaValue: 10018.8,
      lotAreaUnit: "sqft",
    },
  },
  ...overrides,
});

const zillowPage = (results, totalPages = 1) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        searchPageState: {
          cat1: {
            searchResults: { listResults: results },
            searchList: { totalPages },
          },
        },
      },
    },
  })}</script></html>`;

afterEach(() => vi.unstubAllGlobals());

describe("Zillow search", () => {
  it("builds the city's keyword search URL", () => {
    expect(zillowCitySlug("San Antonio", "TX")).toBe("san-antonio-tx");
    const url = zillowSearchUrl("Pontiac", "MI", '"as is"', 2);
    expect(url).toMatch(/^https:\/\/www\.zillow\.com\/pontiac-mi\/2_p\/\?/);
    const query = JSON.parse(
      decodeURIComponent(url.split("searchQueryState=")[1]),
    );
    expect(query.filterState.att.value).toBe('"as is"');
    expect(query.pagination.currentPage).toBe(2);
    // By owner too; no auctions.
    expect(query.filterState.fsbo).toEqual({ value: true });
    expect(query.filterState.auc).toEqual({ value: false });
  });

  it("reads each listing's photo and details from the page's data", () => {
    const { listings, totalPages } = parseZillowSearchHtml(
      zillowPage([zillowResult()], 3),
    );
    expect(totalPages).toBe(3);
    expect(listings).toEqual([
      {
        zpid: "24404805",
        address: "372 W Columbia Ave, Pontiac, MI 48340",
        street: "372 W Columbia Ave",
        city: "Pontiac",
        state: "MI",
        zip: "48340",
        price: 112000,
        beds: 3,
        baths: 1,
        sqft: 948,
        lotSqft: 10019,
        homeType: "SINGLE_FAMILY",
        statusText: "House for sale",
        saleType: "For sale by agent",
        isAuction: false,
        daysOnMarket: 34,
        zestimate: 134100,
        rentZestimate: 1413,
        taxAssessedValue: 91600,
        broker: "KW Showcase Realty",
        photo: "https://photos.zillowstatic.com/fp/abc-p_e.jpg",
        zillowUrl:
          "https://www.zillow.com/homedetails/372-W-Columbia-Ave/24404805_zpid/",
        lat: 42.67,
        lng: -83.31,
      },
    ]);
    expect(parseZillowSearchHtml("<html></html>")).toBeNull();
  });

  it("labels homes for sale by owner and leaves out auctions", () => {
    const { listings } = parseZillowSearchHtml(
      zillowPage([
        zillowResult({
          zpid: "1",
          hdpData: { homeInfo: { listing_sub_type: { is_FSBO: true } } },
        }),
        zillowResult({
          zpid: "2",
          hdpData: { homeInfo: { listing_sub_type: { is_forAuction: true } } },
        }),
        zillowResult({ zpid: "3", statusText: "Auction" }),
      ]),
    );
    expect(listings.map((l) => [l.zpid, l.saleType])).toEqual([
      ["1", "For sale by owner"],
    ]);
  });

  it("loads a keyword's pages through Firecrawl, keeping only the city's homes", async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const { url: page } = JSON.parse(init.body);
      const html = page.includes("/2_p/")
        ? zillowPage([zillowResult({ zpid: "2", addressStreet: "2 B St" })], 2)
        : zillowPage(
            [
              zillowResult(),
              zillowResult({ zpid: "9", addressCity: "Waterford" }),
            ],
            2,
          );
      return {
        ok: true,
        json: async () => ({ success: true, data: { rawHtml: html } }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { listings } = await fetchMarketListings(
      { city: "Pontiac", state: "MI", keyword: "investor" },
      { FIRECRAWL_API_KEY: "fc" },
    );
    expect(listings.map((l) => l.zpid)).toEqual(["24404805", "2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("names the missing API key", async () => {
    await expect(
      fetchMarketListings({ city: "Pontiac", state: "MI", keyword: "x" }, {}),
    ).rejects.toThrow(/FIRECRAWL_API_KEY/);
  });
});

describe("combining a city's results", () => {
  const listing = (zpid, street, days) => ({
    zpid,
    street,
    zip: "48340",
    price: 100000,
    daysOnMarket: days,
  });

  it("lists a home found by several keywords once, naming each, with Redfin's details", () => {
    const combined = combineCityResults(
      {
        investor: [listing("1", "372 W Columbia Ave", 34)],
        '"as is"': [
          listing("1", "372 W Columbia Ave", 34),
          listing("2", "9 Elm St", 5),
        ],
      },
      [
        {
          street: "372 W. Columbia Ave",
          zip: "48340",
          yearBuilt: 1964,
          hoa: null,
          mls: "61042055",
          url: "https://www.redfin.com/home/1",
          propertyType: "Single Family Residential",
        },
      ],
    );
    expect(combined).toHaveLength(2);
    expect(combined[0]).toMatchObject({
      id: "1",
      keywords: ["investor", '"as is"'],
      yearBuilt: 1964,
      mls: "61042055",
      redfinUrl: "https://www.redfin.com/home/1",
    });
    expect(combined[1]).toMatchObject({ id: "2", yearBuilt: null });
  });

  it("shows only homes on the market more than the set days, longest first", () => {
    const shown = visibleListings(
      [
        { id: "a", daysOnMarket: 21, keywords: [] },
        { id: "b", daysOnMarket: 20, keywords: [] },
        { id: "c", daysOnMarket: 90, keywords: [] },
        { id: "d", daysOnMarket: null, keywords: [] },
      ],
      { minDays: 20, sort: "longest" },
    );
    expect(shown.map((l) => l.id)).toEqual(["c", "a"]);
  });
});

describe("a home's Zillow page", () => {
  const detailsPage = (property) =>
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: {
        pageProps: {
          componentProps: {
            gdpClientCache: JSON.stringify({
              "ForSalePriorityQuery{}": { property },
            }),
          },
        },
      },
    })}</script>`;

  it("reads the description, photos and every contact with their phone", () => {
    const details = parseZillowDetailsHtml(
      detailsPage({
        description: "Investor opportunity in Pontiac!",
        responsivePhotos: [
          {
            mixedSources: {
              jpeg: [
                { url: "https://p/a-384.jpg", width: 384 },
                { url: "https://p/a-960.jpg", width: 960 },
                { url: "https://p/a-1536.jpg", width: 1536 },
              ],
            },
          },
        ],
        listedBy: [
          {
            id: "LISTING_AGENT",
            elements: [
              { id: "NAME", text: "Donna Eller" },
              { id: "PHONE", text: "248-765-9901" },
            ],
          },
          {
            id: "BROKER",
            elements: [
              { id: "NAME", text: "KW Domain" },
              { id: "PHONE", text: "248-590-0800" },
            ],
          },
          {
            id: "CO_LISTING_AGENT",
            elements: [
              { id: "NAME", text: "Marzen Baldonado" },
              { id: "PHONE", text: "248-797-5205" },
            ],
          },
        ],
        attributionInfo: { mlsName: "Realcomp II", mlsId: "2026108" },
        listingSubType: { isFSBA: true },
        resoFacts: { yearBuilt: 1920, parkingFeatures: ["No Garage"] },
        pageViewCount: 362,
        favoriteCount: 38,
      }),
    );
    expect(details).toMatchObject({
      description: "Investor opportunity in Pontiac!",
      photos: ["https://p/a-960.jpg"],
      contacts: [
        { role: "Listing agent", name: "Donna Eller", phone: "248-765-9901" },
        { role: "Brokerage", name: "KW Domain", phone: "248-590-0800" },
        {
          role: "Co-listing agent",
          name: "Marzen Baldonado",
          phone: "248-797-5205",
        },
      ],
      saleType: "For sale by agent",
      mlsName: "Realcomp II",
      yearBuilt: 1920,
      pageViews: 362,
    });
    expect(details.facts).toContainEqual({
      label: "Parking Features",
      value: "No Garage",
    });
  });

  it("only loads Zillow home pages", async () => {
    await expect(
      fetchMarketListings(
        { detailsUrl: "https://example.com/homedetails/1" },
        { FIRECRAWL_API_KEY: "fc" },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
