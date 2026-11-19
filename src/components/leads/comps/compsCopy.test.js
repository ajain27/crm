import { describe, it, expect, vi, afterEach } from "vitest";
import { compsToText, compsToHtml, copyComps } from "./compsCopy";

const comps = {
  date: "11/19/2026",
  arv: 220958,
  rent: 1500,
  estimates: { average: 155000, zestimate: 187900, redfinEstimate: 122798 },
  subject: {
    address: "1181 Windsor St SW, Atlanta, GA 30310, USA",
    beds: 2,
    baths: 1,
    sqft: 1047,
    lotSqft: 6899,
    yearBuilt: 1930,
  },
  comps: [
    {
      address: "481 Erin Ave SW, Atlanta, GA 30310",
      price: 230000,
      soldDate: "2026-09-30",
      beds: 2,
      baths: 1,
      sqft: 1209,
      lotSqft: 8820,
      yearBuilt: 1940,
      distance: 0.34,
      url: "https://example.com/481",
    },
    {
      address: "413 Hillside Dr SW, Atlanta, GA 30310",
      price: 150000,
      beds: 3,
      baths: 1,
      yearBuilt: 1940,
      distance: 0.39,
      condition: "renovated",
    },
  ],
};

describe("compsToText", () => {
  it("lists the subject, headline figures and a numbered block per comp", () => {
    expect(compsToText(comps, {})).toBe(
      [
        "Comps for 1181 Windsor St SW, Atlanta, GA 30310",
        "Subject: 2 bd / 1 ba · 1,047 sq ft · lot 6,899 sq ft · built 1930",
        "ARV: $220,958 (Zestimate $187,900 · Redfin $122,798)",
        "Median price/sq ft: $190",
        "Rent estimate: $1,500/mo",
        "",
        "1. 481 Erin Ave SW, Atlanta, GA 30310 — 0.34 mi",
        "   Sold $230,000 on 9/30/26 · $190/sq ft",
        "   2 bd / 1 ba · 1,209 sq ft · lot 8,820 sq ft · built 1940",
        "   https://example.com/481",
        "",
        "2. 413 Hillside Dr SW, Atlanta, GA 30310 — 0.39 mi [Renovated]",
        "   Sold $150,000",
        "   3 bd / 1 ba · built 1940",
        "",
        "Comps run 11/19/2026",
      ].join("\n"),
    );
  });

  it("uses the lead's own ARV when one is set", () => {
    expect(compsToText(comps, { arv: "$250,000" })).toContain("ARV: $250,000");
  });

  it("says so when there are no comps", () => {
    expect(compsToText({ ...comps, comps: [] }, {})).toContain(
      "No homes sold nearby.",
    );
  });
});

describe("compsToHtml", () => {
  it("makes a table row for the subject and each comp, escaping text", () => {
    const html = compsToHtml(
      {
        ...comps,
        comps: [{ ...comps.comps[0], address: "1 <A&B> St" }],
      },
      {},
    );
    expect(html.match(/<tr>/g)).toHaveLength(3);
    expect(html).toContain("1 &lt;A&amp;B&gt; St");
    expect(html).toContain("(subject)");
  });
});

describe("copyComps", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to plain text when rich copy isn't available", async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal("ClipboardItem", undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyComps(comps, {});
    expect(writeText).toHaveBeenCalledWith(compsToText(comps, {}));
  });
});
