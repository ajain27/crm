// Tests for api/run-comps.js (the serverless function). Serper,
// Firecrawl, the Census geocoder and Redfin are mocked at fetch; Claude is
// mocked at the Anthropic SDK.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const claudeCreate = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function () {
    this.beta = { messages: { create: claudeCreate } };
  }),
}));

const CLAUDE_REVIEW = {
  stop_reason: "end_turn",
  content: [
    {
      type: "text",
      text: JSON.stringify({
        selected: [
          { id: "1", reason: "Recent, same layout" },
          { id: "0", reason: "Closest" },
        ],
        removed: [{ id: "2", reason: "Price outlier" }],
      }),
    },
  ],
};
import { rankComps } from "../../api/_lib/comps/rank.js";
import { cleanScraped, pickListingUrls } from "../../api/_lib/comps/subject.js";
import { distanceMiles } from "../../api/_lib/comps/rules.js";
import { estimateArv } from "../../api/_lib/comps/arv.js";
import { highwayBetween } from "../../api/_lib/comps/highways.js";
import { parseRedfinSoldCsv } from "../../api/_lib/comps/sales.js";
import { runComps } from "../../api/_lib/comps/runComps.js";

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
    crawl4ai: (url) =>
      url.endsWith("/extract")
        ? json(200, { ok: true, data: [SUBJECT_PAGE] })
        : json(200, { ok: true, html: "<html></html>" }),
    redfin: () => text(200, REDFIN_CSV),
    osm: () => json(200, []),
    overpass: () => json(200, { elements: [] }),
    photo: () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }),
    ...overrides,
  };
  const fn = vi.fn(async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    if (url.includes("serper")) return handlers.serper(body);
    if (url.includes("firecrawl")) return handlers.firecrawl(body);
    if (url.includes("crawl4ai")) return handlers.crawl4ai(url, body);
    if (url.includes("geocoding.geo.census.gov")) return handlers.census(url);
    if (url.includes("nominatim.openstreetmap.org")) return handlers.osm(url);
    if (url.includes("redfin.com/stingray")) return handlers.redfin(url);
    if (url.includes("/api/interpreter")) return handlers.overpass(url);
    if (
      url.includes("zillowstatic") ||
      url.includes("cdn-redfin") ||
      url.includes("maps.googleapis.com")
    ) {
      return handlers.photo(url);
    }
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const ADDRESS = "5055 Belfast Dr, Memphis, TN 38127";

describe("run-comps", () => {
  beforeEach(() => claudeCreate.mockReset());
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

  it("matches a site's page that spells the street out (Hwy → Highway)", () => {
    expect(
      pickListingUrls(
        [
          [
            {
              link: "https://www.zillow.com/homedetails/15315-Highway-99-Lynnwood-WA-98087/81367370_zpid/",
            },
          ],
          [
            {
              link: "https://www.redfin.com/WA/Edmonds/15315-50th-Ave-W-98026/home/2782119",
            },
          ],
          [],
        ],
        "15315 Hwy 99, Lynnwood, WA 98087, USA",
      ),
    ).toEqual({
      zillow:
        "https://www.zillow.com/homedetails/15315-Highway-99-Lynnwood-WA-98087/81367370_zpid/",
      redfin: null,
      realtor: null,
    });
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

  it("downloads the listing's main photo, Zillow's first, skipping logos", async () => {
    const ZILLOW_PHOTO = "https://photos.zillowstatic.com/fp/abc-cc_ft_960.jpg";
    const fetchMock = mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: SUBJECT_PAGE,
            metadata: {
              ogImage: body.url.includes("zillow")
                ? ZILLOW_PHOTO
                : body.url.includes("redfin")
                  ? "https://ssl.cdn-redfin.com/photo/1/bigphoto/1.jpg"
                  : "https://www.realtor.com/logo.png",
            },
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.photo).toEqual({
      url: ZILLOW_PHOTO,
      data: "data:image/jpeg;base64,AQID",
    });
    const photoCalls = fetchMock.mock.calls.filter(([url]) =>
      url.includes("zillowstatic"),
    );
    expect(photoCalls).toHaveLength(1);
  });

  it("runs on Crawl4AI alone, reading the photo from the Zillow page's HTML", async () => {
    const fetchMock = mockFetch({
      crawl4ai: (url, body) =>
        url.endsWith("/extract")
          ? json(200, { ok: true, data: [SUBJECT_PAGE] })
          : json(200, {
              ok: true,
              html: body.url.includes("zillow")
                ? '<meta property="og:image" content="https://photos.zillowstatic.com/fp/z.jpg">'
                : "",
            }),
    });
    const out = await runComps(
      ADDRESS,
      { SERPER_API_KEY: "serper", CRAWL4AI_API_KEY: "c4" },
      NOW,
    );
    expect(out.property).toMatchObject({ beds: 3, baths: 1, sqft: 1165 });
    expect(out.photo).toEqual({
      url: "https://photos.zillowstatic.com/fp/z.jpg",
      data: "data:image/jpeg;base64,AQID",
    });
    const scrapes = fetchMock.mock.calls
      .filter(([url]) => url === "https://api.crawl4ai.com/scrape")
      .map(([, init]) => JSON.parse(init.body).url);
    expect(scrapes).toEqual([LISTINGS.zillow]);
    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("firecrawl")),
    ).toBe(false);
  });

  it("uses the Street View image for a home with no listing photos", async () => {
    const STREET_VIEW =
      "https://maps.googleapis.com/maps/api/streetview?location=5055+Belfast&size=1536x1152";
    const fetchMock = mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: SUBJECT_PAGE,
            metadata: {
              ogImage: body.url.includes("zillow")
                ? STREET_VIEW
                : "https://www.realtor.com/logo.png",
            },
          },
        }),
      photo: () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.photo).toEqual({
      url: STREET_VIEW,
      data: "data:image/jpeg;base64,AQID",
    });
    expect(fetchMock.mock.calls.some(([url]) => url.includes("crawl4ai"))).toBe(
      false,
    );
  });

  it("looks on the next site's page for a photo when Zillow has none", async () => {
    mockFetch({
      crawl4ai: (url, body) =>
        url.endsWith("/extract")
          ? json(200, { ok: true, data: [SUBJECT_PAGE] })
          : json(200, {
              ok: true,
              html: body.url.includes("redfin")
                ? '<meta property="og:image" content="https://ssl.cdn-redfin.com/photo/1/bigphoto/1.jpg">'
                : '<meta property="og:image" content="https://maps.googleapis.com/maps/api/streetview?location=x">',
            }),
    });
    const out = await runComps(
      ADDRESS,
      { SERPER_API_KEY: "serper", CRAWL4AI_API_KEY: "c4" },
      NOW,
    );
    expect(out.photo.url).toBe(
      "https://ssl.cdn-redfin.com/photo/1/bigphoto/1.jpg",
    );
  });

  it("has no photo when the pages only share a logo", async () => {
    mockFetch({
      firecrawl: () =>
        json(200, {
          success: true,
          data: {
            json: SUBJECT_PAGE,
            metadata: { "og:image": "https://www.zillow.com/logo.png" },
          },
        }),
    });
    expect((await runComps(ADDRESS, ENV, NOW)).photo).toBeNull();
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

  it("leaves out sales across a major highway from the subject", async () => {
    // An interstate running east–west 0.25 mi north of the subject.
    const lat = SUBJECT.lat + 0.25 / 69;
    mockFetch({
      overpass: () =>
        json(200, {
          elements: [
            {
              type: "way",
              tags: { highway: "motorway", ref: "I 40" },
              geometry: [
                { lat, lon: SUBJECT.lng - 0.05 },
                { lat, lon: SUBJECT.lng + 0.05 },
              ],
            },
          ],
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.criteria.highwayCheck).toBe(true);
    expect(out.stats.acrossHighway).toBeGreaterThan(0);
    expect(out.topComps.length).toBeGreaterThan(0);
    expect(out.topComps.every((c) => c.distance < 0.25)).toBe(true);
    expect(out.topComps.map((c) => c.address)).not.toContain(
      expect.stringContaining("794 Margie Dr"),
    );
  });

  it("still runs comps when the highway check can't be reached", async () => {
    mockFetch({ overpass: () => json(504, {}) });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.criteria.highwayCheck).toBe(false);
    expect(out.stats.acrossHighway).toBe(0);
    expect(out.topComps).toHaveLength(5);
  });

  it("lets Claude drop bad comps and pick from the ranked candidates, never adding homes", async () => {
    mockFetch();
    claudeCreate.mockResolvedValue(CLAUDE_REVIEW);
    const out = await runComps(
      ADDRESS,
      { ...ENV, ANTHROPIC_API_KEY: "k" },
      NOW,
    );

    expect(out.method).toBe("claude");
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

    // Claude gets the ranked candidates with how each misses the rules,
    // must answer in the review schema, and isn't asked for a value.
    const request = claudeCreate.mock.calls[0][0];
    expect(request).toMatchObject({
      model: "claude-opus-5-5",
      fallbacks: "default",
      betas: ["server-side-fallback-2026-07-01"],
      output_config: { format: { type: "json_schema" } },
    });
    expect(request.system).toMatch(/Do NOT estimate the subject's value/);
    const sent = JSON.parse(request.messages[0].content);
    expect(sent.candidates).toHaveLength(7);
    expect(sent.candidates[0].misses).toEqual([]);
    expect(sent.candidates[3].misses).toEqual(["+1 bath"]);
    // Upper quartile of the 2 picked, in code.
    expect(out.arvEstimate).toBe(107100);
  });

  it("uses the ranking when Claude fails or declines", async () => {
    mockFetch();
    claudeCreate.mockRejectedValueOnce(
      new Error("Your credit balance is too low."),
    );
    let out = await runComps(ADDRESS, { ...ENV, ANTHROPIC_API_KEY: "k" }, NOW);
    expect(out.method).toBe("rules");
    expect(out.aiError).toBe("Your credit balance is too low.");
    expect(out.topComps).toHaveLength(5);

    claudeCreate.mockResolvedValueOnce({ stop_reason: "refusal", content: [] });
    out = await runComps(ADDRESS, { ...ENV, ANTHROPIC_API_KEY: "k" }, NOW);
    expect(out.method).toBe("rules");
    expect(out.aiError).toMatch(/declined/);
  });

  it("doesn't call Claude without an API key", async () => {
    mockFetch();
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.method).toBe("rules");
    expect(claudeCreate).not.toHaveBeenCalled();
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

  it("widens to 2 mi over 12 months when nothing sold within 1 mi in 6 months", async () => {
    // Redfin's first two calls (1 mi, 90 and 180 days) find nothing.
    let redfinCalls = 0;
    const fetchMock = mockFetch({
      redfin: () => text(200, (redfinCalls += 1) <= 2 ? HEADER : REDFIN_CSV),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.criteria).toMatchObject({
      searchRadiusMiles: 2,
      searchDays: 365,
      widened: true,
    });
    expect(out.topComps).toHaveLength(5);
    const redfinUrls = fetchMock.mock.calls
      .map(([url]) => url)
      .filter((url) => url.includes("redfin.com/stingray"));
    expect(redfinUrls).toHaveLength(4);
    expect(redfinUrls.some((u) => u.includes("sold_within_days=365"))).toBe(
      true,
    );
  });

  it("doesn't widen when sales were found within 1 mi", async () => {
    mockFetch();
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.criteria).toMatchObject({
      searchRadiusMiles: 1,
      widened: false,
    });
  });

  it("says when no homes sold nearby at all, even after widening", async () => {
    mockFetch({ redfin: () => text(200, HEADER) });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.topComps).toEqual([]);
    expect(out.arvEstimate).toBeNull();
    expect(out.summary).toBe(
      "No homes sold within 2 mi in the last 12 months.",
    );
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

  it("returns the property's own history, read in the same scrape", async () => {
    mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: {
              ...SUBJECT_PAGE,
              priceHistory: body.url.includes("redfin")
                ? [{ date: "4/16/2018", event: "Sold", price: 40000 }]
                : [],
              taxHistory: [{ year: 2025, tax: 560 }],
            },
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.history.timeline).toEqual([
      expect.objectContaining({
        date: "2018-04-16",
        kind: "sold",
        price: 40000,
      }),
    ]);
    expect(out.history.taxes).toEqual([
      { year: 2025, tax: 560, assessedValue: null },
    ]);
  });

  it("goes by the public records type over the listings'", async () => {
    mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: body.url.includes("realtor")
              ? {
                  ...SUBJECT_PAGE,
                  propertyType: "Townhomes",
                  publicRecordsType: "Duplex",
                }
              : SUBJECT_PAGE,
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.property).toMatchObject({
      propertyType: "Multi-Family",
      publicRecordsType: "Duplex",
    });
    expect(out.subjectSources.realtor.publicRecordsType).toBe("Duplex");
  });

  it("leaves the type open when the listings disagree and there are no public records", async () => {
    mockFetch({
      firecrawl: (body) =>
        json(200, {
          success: true,
          data: {
            json: {
              ...SUBJECT_PAGE,
              propertyType: body.url.includes("zillow")
                ? "Single Family"
                : "Townhouse",
              annualTax: 56500, // the assessed value, misread
            },
          },
        }),
    });
    const out = await runComps(ADDRESS, ENV, NOW);
    expect(out.property.propertyType).toBeNull();
    expect(out.property.annualTax).toBeNull();
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
    // Only Redfin's sales and OpenStreetMap's highways: no searching or
    // scraping.
    expect(
      hosts.every((h) => h === "www.redfin.com" || h.startsWith("overpass")),
    ).toBe(true);
    expect(hosts.filter((h) => h === "www.redfin.com")).toHaveLength(2);
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

  it("names the missing API keys (Claude is optional)", async () => {
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

  it("finds the highway between two points, ignoring ones off to the side", () => {
    const i40 = {
      name: "I 40",
      points: [
        { lat: 35.27, lng: -90.1 },
        { lat: 35.27, lng: -90.0 },
      ],
    };
    const from = { lat: 35.26, lng: -90.05 };
    expect(highwayBetween(from, { lat: 35.28, lng: -90.05 }, [i40])).toBe(
      "I 40",
    );
    expect(highwayBetween(from, { lat: 35.265, lng: -90.04 }, [i40])).toBe(
      null,
    );
    // Past the highway's end: not crossed.
    expect(highwayBetween(from, { lat: 35.28, lng: -89.95 }, [i40])).toBe(null);
    expect(highwayBetween(from, { lat: 35.28, lng: -90.05 }, null)).toBe(null);
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
    ).toMatchObject({ arvEstimate: 106818 });
    expect(
      estimateArv(
        [{ price: 69900 }, { price: 119500, sqft: 1053 }, { price: 74900 }],
        1165,
      ),
    ).toMatchObject({ arvEstimate: 97200 });
  });

  it("leaves out distressed sales, far under the area's price per sq ft", () => {
    const at = (street, price, sqft) => ({
      street,
      soldDate: "2026-09-01",
      price,
      sqft,
      beds: 3,
      lat: SUBJECT.lat,
      lng: SUBJECT.lng,
    });
    const { ranked, distressed } = rankComps({
      subject: { beds: 3 },
      location: SUBJECT,
      sales: [
        at("1 A St", 100000, 1000),
        at("2 B St", 110000, 1000),
        at("3 C St", 95000, 1000),
        at("4 D St", 15000, 1596), // $9/sq ft
        { ...at("5 E St", 12000), sqft: null }, // no size: by price
      ],
      subjectAddress: "9 Z St",
      now: NOW,
    });
    expect(ranked.map((r) => r.street).sort()).toEqual([
      "1 A St",
      "2 B St",
      "3 C St",
    ]);
    expect(distressed).toBe(2);
  });
});

describe("cleanScraped", () => {
  it("drops placeholder values like N/A, dashes and zeros", () => {
    expect(
      cleanScraped({ beds: 3, sqft: 0, yearBuilt: "N/A", propertyType: " — " }),
    ).toEqual({ beds: 3 });
  });
});
