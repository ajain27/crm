// Tests for api/_lib/propertyHistory.js. Serper and Firecrawl are mocked
// at fetch.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  eventKind,
  fetchPropertyHistory,
  isoDate,
  mergeTaxes,
  mergeTimeline,
  salesSummary,
} from "../../api/_lib/propertyHistory.js";

const ENV = { SERPER_API_KEY: "serper", FIRECRAWL_API_KEY: "firecrawl" };
const ADDRESS = "1211 Starr Ave, Toledo, OH 43605";
const LISTINGS = {
  zillow:
    "https://www.zillow.com/homedetails/1211-Starr-Ave-Toledo-OH-43605/1_zpid/",
  redfin: "https://www.redfin.com/OH/Toledo/1211-Starr-Ave-43605/home/2",
  realtor:
    "https://www.realtor.com/realestateandhomes-detail/1211-Starr-Ave_Toledo_OH_43605_M3",
};

const json = (body) => ({ ok: true, status: 200, json: async () => body });

function mockFetch(pages) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init = {}) => {
      if (url.includes("serper")) {
        return json(
          ["zillow", "redfin", "realtor"].map((key) => ({
            organic: [{ link: LISTINGS[key] }],
          })),
        );
      }
      const { url: page } = JSON.parse(init.body);
      const key = Object.keys(LISTINGS).find((k) => LISTINGS[k] === page);
      return json({ success: true, data: { json: pages[key] } });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("property history", () => {
  it("names each site's events by kind", () => {
    expect(eventKind("Sold - Public Record")).toBe("sold");
    expect(eventKind("Listed for sale")).toBe("listed");
    expect(eventKind("Price decreased - NWOhio")).toBe("priceChange");
    expect(eventKind("Contingent")).toBe("pending");
    expect(eventKind("Listing removed")).toBe("delisted");
    expect(eventKind("Listed for rent")).toBe("rental");
  });

  it("reads the sites' date formats", () => {
    expect(isoDate("4/29/2025")).toBe("2025-04-29");
    expect(isoDate("2022-09-16")).toBe("2022-09-16");
    expect(isoDate("Sep 16, 2022")).toBe("2022-09-16");
    expect(isoDate("—")).toBeNull();
  });

  it("merges the same event from several sites into one row, newest first", () => {
    const timeline = mergeTimeline({
      redfin: [
        { date: "9/16/2022", event: "Sold", price: 116000 },
        { date: "4/29/2022", event: "Listed", price: 145000 },
      ],
      realtor: [
        { date: "2022-09-16", event: "Sold - MLS", price: null },
        { date: "2023-10-11", event: "Sold - Public Record", price: 155000 },
      ],
    });
    expect(timeline).toEqual([
      expect.objectContaining({ date: "2023-10-11", kind: "sold" }),
      {
        date: "2022-09-16",
        kind: "sold",
        event: "Sold",
        price: 116000,
        sources: ["Redfin", "Realtor.com"],
      },
      expect.objectContaining({ date: "2022-04-29", kind: "listed" }),
    ]);
  });

  it("gives each sale its change and years from the sale before", () => {
    expect(
      salesSummary([
        { date: "2022-09-16", kind: "sold", price: 116000 },
        { date: "2022-04-29", kind: "listed", price: 145000 },
        { date: "2018-04-16", kind: "sold", price: 40000 },
      ]),
    ).toEqual([
      { date: "2022-09-16", price: 116000, heldYears: 4.4, change: 76000 },
      { date: "2018-04-16", price: 40000, heldYears: null, change: null },
    ]);
  });

  it("merges tax years, Zillow's values first", () => {
    expect(
      mergeTaxes({
        redfin: [{ year: 2024, tax: 5100, assessedValue: 57610 }],
        zillow: [
          { year: 2024, tax: 5055 },
          { year: 2025, tax: 5273 },
        ],
      }),
    ).toEqual([
      { year: 2025, tax: 5273, assessedValue: null },
      { year: 2024, tax: 5055, assessedValue: 57610 },
    ]);
  });

  it("returns the timeline, sales and taxes from the property's pages, never a neighbor's", async () => {
    mockFetch({
      zillow: {
        propertyType: "Multi Family",
        sqft: 6636,
        priceHistory: [{ date: "9/16/2022", event: "Sold", price: 116000 }],
        taxHistory: [{ year: 2025, tax: 5273 }],
      },
      redfin: {
        priceHistory: [{ date: "4/16/2018", event: "Sold", price: 40000 }],
      },
      realtor: {
        address: "1215 Starr Ave",
        priceHistory: [{ date: "1/1/2020", event: "Sold", price: 1 }],
      },
    });
    const out = await fetchPropertyHistory(ADDRESS, ENV);
    expect(out.property).toMatchObject({ sqft: 6636 });
    expect(out.timeline.map((e) => e.date)).toEqual([
      "2022-09-16",
      "2018-04-16",
    ]);
    expect(out.sales[0]).toMatchObject({ price: 116000, change: 76000 });
    expect(out.taxes).toEqual([{ year: 2025, tax: 5273, assessedValue: null }]);
    expect(out.listingUrls).toEqual(LISTINGS);
  });

  it("explains when no site has the property", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json([{ organic: [] }, { organic: [] }, { organic: [] }]),
      ),
    );
    await expect(fetchPropertyHistory(ADDRESS, ENV)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("names the missing API keys", async () => {
    await expect(fetchPropertyHistory(ADDRESS, {})).rejects.toThrow(
      /SERPER_API_KEY, FIRECRAWL_API_KEY/,
    );
  });
});
