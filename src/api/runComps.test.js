// Tests for api/run-comps.js (the serverless function). Serper, Firecrawl
// and OpenAI are mocked at fetch.
import { describe, it, expect, vi, afterEach } from "vitest";
import { pickListingUrls, runComps } from "../../api/run-comps.js";

const ENV = {
  SERPER_API_KEY: "serper",
  FIRECRAWL_API_KEY: "firecrawl",
  OPENAI_API_KEY: "openai",
};

const LISTINGS = {
  zillow: "https://www.zillow.com/homedetails/164-Auburn-St/123_zpid/",
  redfin: "https://www.redfin.com/AL/Russellville/164-Auburn-St-35654/home/456",
  realtor:
    "https://www.realtor.com/realestateandhomes-detail/164-Auburn-St_Russellville_AL_35654_M1",
};

const RESULT = {
  property: {
    beds: 3,
    baths: 2,
    sqft: 1400,
    yearBuilt: 1978,
    valueEstimate: 150000,
    rentEstimate: 1200,
    annualTax: 900,
  },
  arvEstimate: 160000,
  rentEstimate: 1250,
  topComps: Array.from({ length: 6 }, (_, i) => ({
    address: `${i} Oak St`,
    price: 150000 + i * 1000,
    beds: 3,
    baths: 2,
    sqft: 1400,
    soldDate: "2026-08-01",
    url: `https://www.zillow.com/homedetails/${i}`,
    source: "Zillow",
    reason: "Same size, sold recently",
  })),
  summary: "ARV based on 5 recent 3/2 sales nearby.",
};

const json = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

// Routes each outside API to a handler; records the calls.
function mockFetch({ serper, firecrawl, openai }) {
  const fn = vi.fn(async (url, init) => {
    const body = JSON.parse(init.body);
    if (url.includes("serper")) return serper(body);
    if (url.includes("firecrawl")) return firecrawl(body);
    if (url.includes("openai")) return openai(body);
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const serperBatch = () =>
  json(
    200,
    ["zillow", "redfin", "realtor"].map((key) => ({
      organic: [
        { link: `https://www.${key}.com/some/search/page` },
        { link: LISTINGS[key] },
      ],
    })),
  );

const firecrawlOk = (body) =>
  json(200, {
    success: true,
    data: { json: { beds: 3, sourceUrl: body.url, comps: [] } },
  });

const openaiOk = () =>
  json(200, { choices: [{ message: { content: JSON.stringify(RESULT) } }] });

describe("run-comps", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("prefers each site's property page over other results", () => {
    expect(
      pickListingUrls([
        [
          { link: "https://www.zillow.com/agent/jane" },
          { link: LISTINGS.zillow },
        ],
        [{ link: "https://www.redfin.com/city/123" }],
        [{ link: "https://www.zillow.com/homedetails/x" }],
      ]),
    ).toEqual({
      zillow: LISTINGS.zillow,
      redfin: "https://www.redfin.com/city/123",
      realtor: null,
    });
  });

  it("searches once, scrapes each site, and returns OpenAI's top 5", async () => {
    const fetchMock = mockFetch({
      serper: serperBatch,
      firecrawl: firecrawlOk,
      openai: openaiOk,
    });

    const out = await runComps("164 Auburn St, Russellville, AL 35654", ENV);

    const calls = fetchMock.mock.calls.map(([url]) => new URL(url).hostname);
    expect(calls.filter((h) => h.includes("serper"))).toHaveLength(1);
    expect(calls.filter((h) => h.includes("firecrawl"))).toHaveLength(3);
    expect(calls.filter((h) => h.includes("openai"))).toHaveLength(1);

    const serperBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(serperBody.map((q) => q.q)).toEqual([
      "164 Auburn St, Russellville, AL 35654 site:zillow.com",
      "164 Auburn St, Russellville, AL 35654 site:redfin.com",
      "164 Auburn St, Russellville, AL 35654 site:realtor.com",
    ]);
    const scraped = fetchMock.mock.calls
      .filter(([url]) => url.includes("firecrawl"))
      .map(([, init]) => JSON.parse(init.body));
    expect(scraped.map((b) => b.url).sort()).toEqual(
      Object.values(LISTINGS).sort(),
    );
    expect(scraped[0].formats[0].type).toBe("json");

    const openaiBody = JSON.parse(
      fetchMock.mock.calls.find(([url]) => url.includes("openai"))[1].body,
    );
    const sent = JSON.parse(openaiBody.messages[1].content);
    expect(Object.keys(sent.sources)).toEqual(["zillow", "redfin", "realtor"]);
    expect(openaiBody.response_format.json_schema.strict).toBe(true);

    expect(out.listingUrls).toEqual(LISTINGS);
    expect(out.arvEstimate).toBe(160000);
    expect(out.topComps).toHaveLength(5);
    expect(out.sourceErrors).toEqual({});
  });

  it("falls back to one search per site when batching isn't answered", async () => {
    const fetchMock = mockFetch({
      serper: (body) =>
        Array.isArray(body)
          ? json(400, { message: "batch not allowed" })
          : json(200, {
              organic: [
                {
                  link: Object.values(LISTINGS).find((l) =>
                    l.includes(body.q.split("site:")[1]),
                  ),
                },
              ],
            }),
      firecrawl: firecrawlOk,
      openai: openaiOk,
    });
    const out = await runComps("164 Auburn St, Russellville, AL 35654", ENV);
    expect(
      fetchMock.mock.calls.filter(([url]) => url.includes("serper")),
    ).toHaveLength(4);
    expect(out.listingUrls).toEqual(LISTINGS);
  });

  it("keeps going when one site can't be scraped", async () => {
    mockFetch({
      serper: serperBatch,
      firecrawl: (body) =>
        body.url.includes("redfin")
          ? json(500, { success: false, error: "Blocked" })
          : firecrawlOk(body),
      openai: openaiOk,
    });
    const out = await runComps("164 Auburn St, Russellville, AL 35654", ENV);
    expect(out.sourceErrors).toEqual({ redfin: "Blocked" });
    expect(out.arvEstimate).toBe(160000);
  });

  it("stops before OpenAI when no site could be read", async () => {
    const fetchMock = mockFetch({
      serper: () =>
        json(200, [{ organic: [] }, { organic: [] }, { organic: [] }]),
      firecrawl: firecrawlOk,
      openai: openaiOk,
    });
    await expect(runComps("1 Nowhere Rd, Austin, TX", ENV)).rejects.toThrow(
      /Couldn't read this property/,
    );
    expect(fetchMock.mock.calls.some(([url]) => url.includes("openai"))).toBe(
      false,
    );
  });

  it("names the missing API keys", async () => {
    await expect(
      runComps("164 Auburn St", { SERPER_API_KEY: "x" }),
    ).rejects.toThrow("missing FIRECRAWL_API_KEY, OPENAI_API_KEY");
  });
});
