// Tests for api/_lib/scraper.js: Firecrawl first, then Crawl4AI, then
// Jina, each mocked at fetch.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  extractJson,
  missingScraperKey,
  ogImageFromHtml,
  resetScraperState,
  scrapeHtml,
} from "../../api/_lib/scraper.js";

const ALL = {
  FIRECRAWL_API_KEY: "fc",
  CRAWL4AI_API_KEY: "c4",
  JINA_API_KEY: "jn",
};
const PAGE = "https://www.zillow.com/homedetails/1-Main-St/1_zpid/";

const reply = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

// Each scraper's answer by name; records which were asked.
function mockScrapers({ firecrawl, crawl4ai, jina }) {
  const fn = vi.fn(async (url, init) => {
    const body = JSON.parse(init.body);
    if (url.includes("firecrawl")) return firecrawl(body);
    if (url.includes("crawl4ai")) return crawl4ai(url, body);
    if (url.includes("r.jina.ai")) return jina(body);
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  const asked = () =>
    fn.mock.calls.map(([url]) =>
      url.includes("firecrawl")
        ? "firecrawl"
        : url.includes("crawl4ai")
          ? "crawl4ai"
          : "jina",
    );
  return { fn, asked };
}

const OUT_OF_CREDITS = {
  firecrawl: () =>
    reply(402, {
      success: false,
      error: "Insufficient credits to perform this request.",
    }),
  crawl4ai: () => reply(402, { error: "no_credit", message: "No credits" }),
  jina: () => reply(402, { message: "Insufficient balance" }),
};

describe("scraper", () => {
  beforeEach(() => resetScraperState());
  afterEach(() => vi.unstubAllGlobals());

  it("uses Firecrawl while it has credits", async () => {
    const { asked } = mockScrapers({
      firecrawl: () =>
        reply(200, { success: true, data: { rawHtml: "<html>fc</html>" } }),
      crawl4ai: () => reply(200, { ok: true, html: "<html>c4</html>" }),
    });
    expect(await scrapeHtml(PAGE, ALL)).toBe("<html>fc</html>");
    expect(asked()).toEqual(["firecrawl"]);
  });

  it("switches to Crawl4AI once Firecrawl is out of credits, and stops asking Firecrawl", async () => {
    const { asked } = mockScrapers({
      ...OUT_OF_CREDITS,
      crawl4ai: () => reply(200, { ok: true, html: "<html>c4</html>" }),
    });
    expect(await scrapeHtml(PAGE, ALL)).toBe("<html>c4</html>");
    expect(await scrapeHtml(PAGE, ALL)).toBe("<html>c4</html>");
    expect(asked()).toEqual(["firecrawl", "crawl4ai", "crawl4ai"]);
  });

  it("falls back to Jina for a page's HTML when both are out", async () => {
    const { asked } = mockScrapers({
      ...OUT_OF_CREDITS,
      jina: () => reply(200, { code: 200, data: { html: "<html>jn</html>" } }),
    });
    expect(await scrapeHtml(PAGE, ALL)).toBe("<html>jn</html>");
    expect(asked()).toEqual(["firecrawl", "crawl4ai", "jina"]);
  });

  it("hands a page Crawl4AI can't get (busy, blocked) to Jina", async () => {
    const { asked } = mockScrapers({
      ...OUT_OF_CREDITS,
      crawl4ai: () => reply(503, { ok: false, reason: "busy" }),
      jina: () => reply(200, { code: 200, data: { html: "<html>jn</html>" } }),
    });
    expect(await scrapeHtml(PAGE, ALL)).toBe("<html>jn</html>");
    // Busy isn't out of credits: Crawl4AI is asked again next time.
    await scrapeHtml(PAGE, ALL);
    expect(asked()).toEqual([
      "firecrawl",
      "crawl4ai",
      "jina",
      "crawl4ai",
      "jina",
    ]);
  });

  it("explains a page Crawl4AI can't get when there's no Jina", async () => {
    mockScrapers({
      ...OUT_OF_CREDITS,
      crawl4ai: () => reply(503, { ok: false, reason: "busy" }),
    });
    await expect(
      scrapeHtml(PAGE, { FIRECRAWL_API_KEY: "fc", CRAWL4AI_API_KEY: "c4" }),
    ).rejects.toThrow("Crawl4AI failed (busy)");
  });

  it("explains when every scraper is out of credits", async () => {
    mockScrapers(OUT_OF_CREDITS);
    await expect(scrapeHtml(PAGE, ALL)).rejects.toMatchObject({
      status: 503,
      message: expect.stringMatching(
        /Firecrawl, Crawl4AI and Jina are out of credits/,
      ),
    });
  });

  it("doesn't switch scrapers for an ordinary failure or a rate limit", async () => {
    const { asked } = mockScrapers({
      firecrawl: () => reply(500, { success: false, error: "Timed out" }),
      crawl4ai: () => reply(200, { ok: true, html: "<html>c4</html>" }),
    });
    await expect(scrapeHtml(PAGE, ALL)).rejects.toThrow("Timed out");

    mockScrapers({
      firecrawl: () =>
        reply(429, {
          success: false,
          error: "Rate limit exceeded, retry after 12s",
        }),
      crawl4ai: () => reply(200, { ok: true, html: "<html>c4</html>" }),
    });
    await expect(scrapeHtml(PAGE, ALL)).rejects.toMatchObject({
      status: 429,
      retryAfter: 12,
    });
    expect(asked()).toEqual(["firecrawl"]);
  });

  it("reads structured data with Crawl4AI's extract when Firecrawl is out", async () => {
    const { fn } = mockScrapers({
      ...OUT_OF_CREDITS,
      crawl4ai: () => reply(200, { ok: true, data: [{ beds: 3, baths: 1 }] }),
    });
    const schema = { type: "object", properties: { beds: { type: "number" } } };
    expect(
      await extractJson(PAGE, ALL, { schema, prompt: "The home's facts" }),
    ).toEqual({ data: { beds: 3, baths: 1 }, metadata: null });
    const [url, init] = fn.mock.calls[1];
    expect(url).toBe("https://api.crawl4ai.com/extract");
    expect(JSON.parse(init.body)).toEqual({
      url: PAGE,
      instruction: "The home's facts",
      schema,
    });
  });

  it("returns Firecrawl's metadata with what it extracted", async () => {
    mockScrapers({
      firecrawl: () =>
        reply(200, {
          success: true,
          data: { json: { beds: 3 }, metadata: { ogImage: "x.jpg" } },
        }),
    });
    expect(await extractJson(PAGE, ALL, { schema: {}, prompt: "" })).toEqual({
      data: { beds: 3 },
      metadata: { ogImage: "x.jpg" },
    });
  });

  it("names the keys to set when none is", () => {
    expect(missingScraperKey({}, "extract")).toBe(
      "FIRECRAWL_API_KEY or CRAWL4AI_API_KEY",
    );
    expect(missingScraperKey({ JINA_API_KEY: "jn" }, "extract")).toBe(
      "FIRECRAWL_API_KEY or CRAWL4AI_API_KEY",
    );
    expect(missingScraperKey({ JINA_API_KEY: "jn" }, "html")).toBeNull();
  });

  it("reads a page's share image from its HTML", () => {
    expect(
      ogImageFromHtml(
        '<meta content="https://photos.zillowstatic.com/fp/a.jpg?x=1&amp;y=2" property="og:image">',
      ),
    ).toBe("https://photos.zillowstatic.com/fp/a.jpg?x=1&y=2");
    expect(ogImageFromHtml("<html></html>")).toBeNull();
  });
});
