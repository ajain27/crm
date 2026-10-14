import { describe, it, expect } from "vitest";
import {
  compDetailsText,
  compsCriteriaText,
  compsStatsText,
  formatCompsNote,
  splitCompsNotes,
} from "./compsNote";

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
      "1. 1 Oak St — $154,000 ($110/sq ft) · 3 bd/2 ba · 1,400 sq ft · sold 2026-08-01 · https://www.zillow.com/homedetails/1",
      "Based on recent 3/2 sales.",
      "Comps ordered by distance, then most recent sale.",
      "Sources: https://www.zillow.com/homedetails/s",
    ]);
  });

  it("describes the rules, the search area, and how a comp differs", () => {
    const result = {
      criteria: {
        radiusMiles: 0.5,
        soldWithinDays: 90,
        beds: 3,
        baths: 1.5,
        yearBuiltFrom: 1967,
        yearBuiltTo: 1977,
        searchRadiusMiles: 1,
        searchDays: 180,
        unknown: [],
      },
      stats: {
        nearbySales: 30,
        matched: 3,
        outsideRules: 2,
        excluded: {
          distance: 12,
          soldDate: 5,
          beds: 6,
          baths: 4,
          yearBuilt: 0,
          propertyType: 0,
        },
        removedByAi: [],
      },
    };
    expect(compsCriteriaText(result)).toBe(
      "Sold within 0.5 mi in the last 90 days · 3 bd · 1.5 ba · built 1967–1977",
    );
    expect(compsStatsText(result)).toBe(
      "30 homes sold within 1 mi in the last 6 months; 3 meet every rule (others: 12 too far, 5 sold too long ago, 6 different beds, 4 different baths). 2 of the comps shown fall outside the rules.",
    );
    expect(
      compDetailsText({
        beds: 3,
        baths: 1,
        differs: "0.52 mi away · +0.5 bath",
        distance: 0.52,
      }),
    ).toBe("3 bd/1 ba (0.52 mi away · +0.5 bath) · 0.52 mi away");
  });
});

describe("splitCompsNotes", () => {
  const compsNote = [
    "Comps (10/13/2026):",
    "ARV estimate: $376,182 · Rent estimate: $2,514/mo",
    "Property: 3 bd · 2 ba · 1,174 sq ft · built 1976 · tax $4,123/yr",
    "Rules: Sold within 0.5 mi in the last 90 days · 3 bd · 2 ba",
    "128 homes sold within 1 mi in the last 6 months; 1 meets every rule.",
    "1. 5712 NE 62nd Ave, Vancouver, WA 98661 — $450,000 ($357/sq ft) · 3 bd/2 ba (0.53 mi away · +0.5 bath) · 1,261 sq ft · https://www.redfin.com/home/1",
    "2. 9 Elm St — $330,000 · 3 bd/1 ba · 1,040 sq ft",
    "ARV = median $320/sq ft across 5 comps.",
    "Comps ordered by distance, then most recent sale.",
    "Sources: https://www.zillow.com/a · https://www.redfin.com/b",
  ].join("\n");

  it("lays out a comps note between plain notes", () => {
    const segments = splitCompsNotes(
      `Called, no answer.\n\n${compsNote}\n\nCall back Friday.`,
    );
    expect(segments.map((s) => s.type)).toEqual(["text", "comps", "text"]);
    expect(segments[0].text).toBe("Called, no answer.");
    expect(segments[1].comps).toEqual({
      date: "10/13/2026",
      arv: "$376,182",
      rent: "$2,514",
      property: "3 bd · 2 ba · 1,174 sq ft · built 1976 · tax $4,123/yr",
      rules: "Sold within 0.5 mi in the last 90 days · 3 bd · 2 ba",
      stats:
        "128 homes sold within 1 mi in the last 6 months; 1 meets every rule.",
      comps: [
        {
          address: "5712 NE 62nd Ave, Vancouver, WA 98661",
          price: "$450,000",
          ppsf: "$357",
          details: "3 bd/2 ba (0.53 mi away · +0.5 bath) · 1,261 sq ft",
          url: "https://www.redfin.com/home/1",
        },
        {
          address: "9 Elm St",
          price: "$330,000",
          ppsf: "",
          details: "3 bd/1 ba · 1,040 sq ft",
          url: "",
        },
      ],
      summary: "ARV = median $320/sq ft across 5 comps.",
      method: "Comps ordered by distance, then most recent sale.",
      sources: ["https://www.zillow.com/a", "https://www.redfin.com/b"],
    });
  });

  it("keeps notes without a comps note as plain text", () => {
    expect(splitCompsNotes("Motivated seller.\n\nComps: none yet")).toEqual([
      { type: "text", text: "Motivated seller.\n\nComps: none yet" },
    ]);
    expect(splitCompsNotes("")).toEqual([]);
  });
});
