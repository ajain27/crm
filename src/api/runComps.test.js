// Tests for api/run-comps.js (the serverless function). Serper,
// Firecrawl, the Census geocoder, Redfin and OpenAI are mocked at fetch.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  rankComps,
  cleanScraped,
  distanceMiles,
  estimateArv,
  parseRedfinSoldCsv,
  pickListingUrls,
  runComps,
} from "../../api/run-comps.js";

const NOW = Date.parse("2026-10-08T12:00:00");
const ENV = { SERPER_API_KEY: "serper", FIRECRAWL_API_KEY: "firecrawl" };
const SUBJECT = { lat: 35.2638, lng: -90.0353 };

const LISTINGS = {
  zillow: "https://www.zillow.com/homedetails/5055-Belfast-Dr/1_zpid/",
  redfin: "https://www.redfin.com/TN/Memphis/5055-Belfast-Dr-38127/home/2",
  realtor:
    "https://www.realtor.com/realestateandhomes-detail/5055-Belfast-Dr_Memphis_TN_38127_M3",
};

// A point `miles` north of the subject.
const north = (miles) => (SUBJECT.lat + miles / 69).toFixed(7);

const HEADER =
  "SALE TYPE,SOLD DATE,PROPERTY TYPE,ADDRESS,CITY,STATE OR PROVINCE,ZIP OR POSTAL CODE,PRICE,BEDS,BATHS,LOCATION,SQUARE FEET,LOT SIZE,YEAR BUILT,DAYS ON MARKET,$/SQUARE FEET,HOA/MONTH,STATUS,NEXT OPEN HOUSE START TIME,NEXT OPEN HOUSE END TIME,URL (SEE https://www.redfin.com/buy-a-home/comparative-market-analysis FOR INFO ON PRICING),SOURCE,MLS#,FAVORITE,INTERESTED,LATITUDE,LONGITUDE";

const sale = ({ date, address, price, beds, baths, sqft = "", built, miles }) =>
  `PAST SALE,${date},Single Family Residential,${address},Memphis,TN,38127,${price},${beds},${baths},Northaven,${sqft},6969,${built},,,,Sold,,,https://www.redfin.com/TN/Memphis/${address.replace(/ /g, "-")}/home/9,MAAR,1,N,Y,${north(miles)},${SUBJECT.lng}`;

const REDFIN_CSV = [
  HEADER,
  '"In accordance with local MLS rules, some MLS listings are not included in the download"',
  sale({
    date: "September-18-2026",
    address: "794 Margie Dr",
    price: 69900,
    beds: 3,
    baths: 1.0,
    built: 1972,
    miles: 0.29,
  }),
  sale({
    date: "September-24-2026",
    address: "608 Northaven Dr",
    price: 74900,
    beds: 3,
    baths: 1.0,
    built: 1971,
    miles: 0.48,
  }),
  sale({
    date: "August-1-2026",
    address: "5258 Beaverton Dr",
    price: 119500,
    beds: 3,
    baths: 1.0,
    sqft: 1053,
    built: 1973,
    miles: 0.41,
  }),
  sale({
    date: "August-11-2026",
    address: "5092 Breckenwood Dr",
    price: 82500,
    beds: 4,
    baths: 1.5,
    built: 1974,
    miles: 0.1,
  }),
  sale({
    date: "August-20-2026",
    address: "11 Far Rd",
    price: 70000,
    beds: 3,
    baths: 1.0,
    built: 1972,
    miles: 0.7,
  }),
  sale({
    date: "August-21-2026",
    address: "12 New Rd",
    price: 190000,
    beds: 3,
    baths: 1.0,
    built: 2024,
    miles: 0.2,
  }),
  sale({
    date: "August-22-2026",
    address: "13 Two Bath Rd",
    price: 99000,
    beds: 3,
    baths: 2.0,
    built: 1972,
    miles: 0.2,
  }),
  sale({
    date: "September-1-2026",
    address: "5055 Belfast Dr",
    price: 1,
    beds: 3,
    baths: 1.0,
    built: 1972,
    miles: 0,
  }),
].join("\n");

const SUBJECT_PAGE = {
  propertyType: "Single Family",
  beds: 3,
  baths: 1,
  sqft: 1165,
  yearBuilt: 1972,
  rentEstimate: 939,
  annualTax: 560,
};

const json = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});
const text = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => JSON.parse(body),
  text: async () => body,
});

// Routes each outside service to a handler; records the calls.
function mockFetch(overrides = {}) {
  const handlers = {
    serper: () =>
      json(
        200,
        ["zillow", "redfin", "realtor"].map((key) => ({
          organic: [{ link: LISTINGS[key] }],
        })),
      ),
    firecrawl: () => json(200, { success: true, data: { json: SUBJECT_PAGE } }),
    census: () =>
      json(200, {
        result: {
          addressMatches: [
            {
              matchedAddress: "5055 BELFAST DR, MEMPHIS, TN, 38127",
              coordinates: { x: SUBJECT.lng, y: SUBJECT.lat },
            },
          ],
        },
      }),
    redfin: () => text(200, REDFIN_CSV),
    osm: () => json(200, []),
    openai: () =>
      json(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                selected: [
                  { id: "1", reason: "Recent, same layout" },
                  { id: "0", reason: "Closest" },
                ],
                removed: [{ id: "2", reason: "Price outlier" }],
              }),
            },
          },
        ],
      }),
    ...overrides,
  };
  const fn = vi.fn(async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    if (url.includes("serper")) return handlers.serper(body);
    if (url.includes("firecrawl")) return handlers.firecrawl(body);
    if (url.includes("geocoding.geo.census.gov")) return handlers.census(url);
    if (url.includes("nominatim.openstreetmap.org")) return handlers.osm(url);
    if (url.includes("redfin.com/stingray")) return handlers.redfin(url);
    if (url.includes("openai")) return handlers.openai(body);
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const ADDRESS = "5055 Belfast Dr, Memphis, TN 38127";

describe("run-comps", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("only uses each site's page for this exact address, never a neighbor's", () => {
    expect(
      pickListingUrls(
        [
          [
            {
              link: "https://www.zillow.com/homedetails/5039-Belfast-Dr-Memphis-TN-38127/2_zpid/",
            },
            { link: LISTINGS.zillow },
          ],
          [
            {
              link: "https://www.redfin.com/TN/Memphis/5067-Bowdoin-Dr-38127/home/87749429",
            },
          ],
          [
            {
              link: "https://www.realtor.com/realestateandhomes-detail/5055-Bowdoin-Dr_Memphis_TN_38127_M8",
            },
          ],
        ],
        ADDRESS,
      ),
    ).toEqual({ zillow: LISTINGS.zillow, redfin: null, realtor: null });
  });

  it("ignores a page whose data is for another house, and impossible values", async () => {
    mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: body.url.includes("realtor")
              ? {
                  ...SUBJECT_PAGE,
                  address: "5039 Belfast Dr",
                  beds: 4,
                  baths: 2,
                }
              : body.url.includes("redfin")
                ? { ...SUBJECT_PAGE, beds: 4, baths: 2, rentEstimate: 93161 }
                : SUBJECT_PAGE,
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    // Zillow (3/1) vs Redfin (4/2): no majority → Zillow; Realtor ignored.
    expect(out.property).toMatchObject({
      beds: 3,
      baths: 1,
      rentEstimate: 939,
    });
  });

  it("returns the 5 best matches: those meeting every rule first, then the closest others, labeled", async () => {
    const fetchMock = mockFetch();
    const out = await runComps(ADDRESS, ENV, NOW);

    expect(out.property).toMatchObject({ beds: 3, baths: 1, yearBuilt: 1972 });
    expect(out.criteria).toMatchObject({
      radiusMiles: 0.5,
      soldWithinDays: 90,
      beds: 3,
      baths: 1,
      yearBuiltFrom: 1967,
      yearBuiltTo: 1977,
      searchRadiusMiles: 1,
      searchDays: 180,
    });
    expect(out.topComps.map((c) => c.address.split(",")[0])).toEqual([
      "794 Margie Dr",
      "5258 Beaverton Dr",
      "608 Northaven Dr",
      "13 Two Bath Rd",
      "11 Far Rd",
    ]);
    expect(out.topComps[0]).toMatchObject({
      price: 69900,
      soldDate: "2026-09-18",
      distance: 0.29,
      meetsRules: true,
      differs: null,
      source: "Redfin",
    });
    expect(out.topComps[3]).toMatchObject({
      meetsRules: false,
      differs: "+1 bath",
    });
    expect(out.topComps[4]).toMatchObject({
      meetsRules: false,
      differs: "0.70 mi away",
    });
    // 7 nearby sales (the subject itself is skipped); 3 meet every rule.
    expect(out.stats).toMatchObject({
      nearbySales: 7,
      matched: 3,
      outsideRules: 2,
      excluded: { distance: 1, beds: 1, baths: 1, yearBuilt: 1 },
    });
    expect(out.summary).toMatch(/2 comps fall outside the comp rules/);
    expect(out.method).toBe("rules");

    // Redfin was asked for sold homes over 90 and 180 days.
    const redfinUrls = fetchMock.mock.calls
      .map(([url]) => url)
      .filter((url) => url.includes("redfin.com/stingray"));
    expect(redfinUrls).toHaveLength(2);
    expect(redfinUrls.every((u) => u.includes("status=9"))).toBe(true);
    expect(redfinUrls.some((u) => u.includes("sold_within_days=90"))).toBe(
      true,
    );
    expect(redfinUrls.some((u) => u.includes("sold_within_days=180"))).toBe(
      true,
    );
  });

  it("lets OpenAI drop bad comps and pick from the ranked candidates, never adding homes", async () => {
    const fetchMock = mockFetch();
    const out = await runComps(ADDRESS, { ...ENV, OPENAI_API_KEY: "k" }, NOW);

    expect(out.method).toBe("openai");
    expect(out.topComps.map((c) => c.address.split(",")[0])).toEqual([
      "5258 Beaverton Dr",
      "794 Margie Dr",
    ]);
    expect(out.topComps[0].reason).toBe("Recent, same layout");
    expect(out.stats.removedByAi).toEqual([
      {
        address: "608 Northaven Dr, Memphis, TN 38127",
        reason: "Price outlier",
      },
    ]);

    // OpenAI sees the ranked candidates with how each misses the rules,
    // and isn't asked for a value.
    const sent = JSON.parse(
      JSON.parse(
        fetchMock.mock.calls.find(([url]) => url.includes("openai"))[1].body,
      ).messages[1].content,
    );
    expect(sent.candidates).toHaveLength(7);
    expect(sent.candidates[0].misses).toEqual([]);
    expect(sent.candidates[3].misses).toEqual(["+1 bath"]);
    expect(out.arvEstimate).toBe(94700); // median of the 2 picked, in code
  });

  it("uses the ranking when OpenAI fails, e.g. no credit", async () => {
    mockFetch({
      openai: () =>
        json(429, { error: { message: "You have no credits remaining." } }),
    });
    const out = await runComps(ADDRESS, { ...ENV, OPENAI_API_KEY: "k" }, NOW);
    expect(out.method).toBe("rules");
    expect(out.aiError).toBe("You have no credits remaining.");
    expect(out.topComps).toHaveLength(5);
  });

  it("still returns the 5 closest when none meet every rule", async () => {
    mockFetch({
      firecrawl: () =>
        json(200, {
          success: true,
          data: { json: { ...SUBJECT_PAGE, beds: 7 } },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.stats.matched).toBe(0);
    expect(out.topComps).toHaveLength(5);
    expect(out.topComps.every((c) => !c.meetsRules)).toBe(true);
    expect(out.topComps[0].differs).toMatch(/−[34] bed/);
    expect(out.summary).toMatch(/5 comps fall outside the comp rules/);
  });

  it("says when no homes sold nearby at all", async () => {
    mockFetch({ redfin: () => text(200, HEADER) });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.topComps).toEqual([]);
    expect(out.arvEstimate).toBeNull();
    expect(out.summary).toBe("No homes sold nearby in the last 6 months.");
  });

  it("retries the Census geocoder, then falls back to OpenStreetMap", async () => {
    let censusCalls = 0;
    const fetchMock = mockFetch({
      census: (url) => {
        censusCalls += 1;
        expect(decodeURIComponent(url)).not.toMatch(/USA/);
        return censusCalls === 1
          ? json(500, {})
          : json(200, { result: { addressMatches: [] } });
      },
      osm: () =>
        json(200, [
          {
            lat: String(SUBJECT.lat),
            lon: String(SUBJECT.lng),
            display_name: "5055 Belfast Drive",
          },
        ]),
    });
    const out = await runComps(
      `${ADDRESS}, USA`,
      {
        ...ENV,
      },
      NOW,
    );
    expect(censusCalls).toBe(2);
    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("nominatim")),
    ).toBe(true);
    expect(out.location.lat).toBeCloseTo(SUBJECT.lat, 4);
    expect(out.topComps).toHaveLength(5);
  });

  it("uses the listing pages' own map coordinates when geocoding fails", async () => {
    const fetchMock = mockFetch({
      census: () => json(200, { result: { addressMatches: [] } }),
      firecrawl: () =>
        json(200, {
          success: true,
          data: {
            json: {
              ...SUBJECT_PAGE,
              latitude: SUBJECT.lat,
              longitude: SUBJECT.lng,
            },
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.location).toMatchObject({ lat: SUBJECT.lat, lng: SUBJECT.lng });
    expect(out.topComps).toHaveLength(5);
    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("nominatim")),
    ).toBe(false);
  });

  it("returns what each site said about the house", async () => {
    mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: body.url.includes("zillow")
              ? { ...SUBJECT_PAGE, baths: 4 }
              : SUBJECT_PAGE,
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.subjectSources.zillow).toMatchObject({ beds: 3, baths: 4 });
    expect(out.subjectSources.redfin).toMatchObject({ beds: 3, baths: 1 });
    // Redfin and Realtor.com agree on 1 bath.
    expect(out.property.baths).toBe(1);
    expect(out.adjusted).toBe(false);
  });

  it("re-runs with corrected facts at a known location, without searching or scraping", async () => {
    const fetchMock = mockFetch();
    const out = await runComps(ADDRESS, {}, NOW, {
      location: SUBJECT,
      subject: {
        propertyType: "Single Family",
        beds: "3",
        baths: 2,
        sqft: 1165,
        yearBuilt: 1972,
      },
    });
    const hosts = fetchMock.mock.calls.map(([url]) => new URL(url).hostname);
    expect(hosts).toEqual(["www.redfin.com", "www.redfin.com"]);
    expect(out.adjusted).toBe(true);
    expect(out.property).toMatchObject({ beds: 3, baths: 2 });
    // 3 bd / 2 ba: 13 Two Bath Rd meets every rule and ranks first.
    expect(out.topComps[0]).toMatchObject({ meetsRules: true });
    expect(out.topComps[0].address).toMatch(/^13 Two Bath Rd/);
    expect(out.stats.matched).toBe(1);
    expect(out.listingUrls).toBeNull();
  });

  it("needs a location to re-run with corrected facts", async () => {
    mockFetch();
    await expect(
      runComps(ADDRESS, {}, NOW, { subject: { beds: 3 }, location: {} }),
    ).rejects.toThrow(/needs the property's location/);
  });

  it("explains when the address can't be located", async () => {
    mockFetch({ census: () => json(200, { result: { addressMatches: [] } }) });
    await expect(
      runComps("1 Nowhere Rd, Austin, TX", ENV, NOW),
    ).rejects.toThrow(/Couldn't locate this address/);
  });

  it("explains when Redfin's sales can't be loaded", async () => {
    mockFetch({ redfin: () => text(403, "Forbidden") });
    await expect(runComps(ADDRESS, ENV, NOW)).rejects.toThrow(
      /Couldn't load recent sales from Redfin \(403\)/,
    );
  });

  it("names the missing API keys (OpenAI is optional)", async () => {
    await expect(runComps(ADDRESS, {})).rejects.toThrow(
      "missing SERPER_API_KEY, FIRECRAWL_API_KEY",
    );
  });
});

describe("comp rules", () => {
  it("parses Redfin's sold CSV, skipping the MLS notice line", () => {
    const sales = parseRedfinSoldCsv(REDFIN_CSV);
    expect(sales).toHaveLength(8);
    expect(sales[0]).toMatchObject({
      address: "794 Margie Dr, Memphis, TN 38127",
      soldDate: "2026-09-18",
      price: 69900,
      beds: 3,
      baths: 1,
      yearBuilt: 1972,
    });
  });

  it("measures distance in miles", () => {
    expect(
      distanceMiles(SUBJECT, { lat: SUBJECT.lat + 0.5 / 69, lng: SUBJECT.lng }),
    ).toBeCloseTo(0.5, 2);
  });

  it("labels old sales, and doesn't apply rules it can't check", () => {
    const { ranked, unknown } = rankComps({
      subject: { beds: 3, baths: null, yearBuilt: null },
      location: SUBJECT,
      sales: [
        {
          street: "1 A St",
          soldDate: "2026-04-01",
          beds: 3,
          baths: 2,
          lat: SUBJECT.lat,
          lng: SUBJECT.lng,
        },
        {
          street: "2 B St",
          soldDate: "2026-09-01",
          beds: 3,
          baths: 2,
          lat: SUBJECT.lat,
          lng: SUBJECT.lng,
        },
        // Redfin's 90-day results, with no date: counts as recent.
        {
          street: "3 C St",
          soldDate: null,
          recent: true,
          beds: 3,
          lat: SUBJECT.lat,
          lng: SUBJECT.lng,
        },
      ],
      subjectAddress: "9 Z St",
      now: NOW,
    });
    expect(ranked.map((r) => [r.street, r.misses.map(([, l]) => l)])).toEqual([
      ["2 B St", []],
      ["3 C St", []],
      ["1 A St", ["sold 6 months ago"]],
    ]);
    expect(unknown).toEqual(["baths", "yearBuilt"]);
  });

  it("uses price per sq ft only when enough comps have a size", () => {
    expect(
      estimateArv(
        [
          { price: 100000, sqft: 1000 },
          { price: 120000, sqft: 1100 },
          { price: 90000 },
        ],
        1000,
      ),
    ).toMatchObject({ arvEstimate: 104545 });
    expect(
      estimateArv(
        [{ price: 69900 }, { price: 119500, sqft: 1053 }, { price: 74900 }],
        1165,
      ),
    ).toMatchObject({ arvEstimate: 74900 });
  });
});

describe("cleanScraped", () => {
  it("drops placeholder values like N/A, dashes and zeros", () => {
    expect(
      cleanScraped({ beds: 3, sqft: 0, yearBuilt: "N/A", propertyType: " — " }),
    ).toEqual({ beds: 3 });
  });
});
