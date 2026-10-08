import { describe, it, expect } from "vitest";
import { formatCompsNote } from "./compsNote";

describe("formatCompsNote", () => {
  it("lists the estimates, property facts and each comp with its link", () => {
    const note = formatCompsNote(
      {
        property: {
          beds: 3,
          baths: 2,
          sqft: 1400,
          yearBuilt: 1978,
          annualTax: 900,
        },
        arvEstimate: 160000,
        rentEstimate: 1250,
        topComps: [
          {
            address: "1 Oak St",
            price: 154000,
            beds: 3,
            baths: 2,
            sqft: 1400,
            soldDate: "2026-08-01",
            url: "https://www.zillow.com/homedetails/1",
            source: "Zillow",
          },
        ],
        summary: "Based on recent 3/2 sales.",
        listingUrls: {
          zillow: "https://www.zillow.com/homedetails/s",
          redfin: null,
        },
      },
      new Date(2026, 9, 8),
    );
    expect(note.split("\n")).toEqual([
      "Comps (10/8/2026):",
      "ARV estimate: $160,000 · Rent estimate: $1,250/mo",
      "Property: 3 bd · 2 ba · 1,400 sq ft · built 1978 · tax $900/yr",
      "1. 1 Oak St — $154,000 ($110/sq ft) · 3 bd/2 ba · 1,400 sq ft · sold 2026-08-01 · Zillow: https://www.zillow.com/homedetails/1",
      "Based on recent 3/2 sales.",
      "Comps picked by matching beds, baths, size and sale date.",
      "Sources: https://www.zillow.com/homedetails/s",
    ]);
  });
});
