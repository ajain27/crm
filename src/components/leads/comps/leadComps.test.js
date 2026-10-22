import { describe, it, expect } from "vitest";
import { formatCompsNote } from "../../crm/components/data/comps/compsNote";
import {
  compsResultToSave,
  leadComps,
  medianPricePerSqft,
  parseFacts,
  shortPrice,
} from "./leadComps";

const RESULT = {
  address: "1 Main St, Austin, TX 78701",
  location: { lat: 30.1, lng: -97.7, matchedAddress: "1 MAIN ST" },
  arvEstimate: 400000,
  rentEstimate: 2100,
  property: { beds: 3, baths: 2, sqft: 1500, yearBuilt: 1990, annualTax: 5000 },
  topComps: [
    {
      address: "5 Oak St, Austin, TX 78701",
      price: 390000,
      beds: 3,
      baths: 2,
      sqft: 1450,
      yearBuilt: 1988,
      soldDate: "2026-09-30",
      distance: 0.3,
      lat: 30.11,
      lng: -97.71,
      url: "https://www.redfin.com/x",
      differs: null,
      reason: "Very similar",
    },
    {
      address: "9 Elm St, Austin, TX 78701",
      price: 420000,
      beds: 4,
      baths: 2,
      sqft: 1600,
      yearBuilt: 2015,
      soldDate: "2026-08-01",
      distance: 0.8,
      lat: 30.12,
      lng: -97.72,
      url: "",
      differs: "+1 bed · built 2015",
    },
  ],
};

describe("leadComps", () => {
  it("is null without comps", () => {
    expect(leadComps({ address: "1 Main St", notes: "Called." })).toBeNull();
  });

  it("uses the saved comps result, with coordinates", () => {
    const comps = leadComps({
      address: "1 Main St",
      compsResult: compsResultToSave(RESULT, new Date("2026-10-01T12:00:00")),
    });
    expect(comps.arv).toBe(400000);
    expect(comps.subject).toMatchObject({ beds: 3, lat: 30.1, lng: -97.7 });
    expect(comps.comps).toHaveLength(2);
    expect(comps.comps[1]).toMatchObject({
      price: 420000,
      sqft: 1600,
      lat: 30.12,
      differs: "+1 bed · built 2015",
    });
  });

  it("reads older leads' comps back out of the notes", () => {
    const comps = leadComps({
      address: "1 Main St",
      notes: `Called.\n\n${formatCompsNote(RESULT, new Date("2026-10-01"))}`,
    });
    expect(comps.arv).toBe(400000);
    expect(comps.rent).toBe(2100);
    expect(comps.subject).toMatchObject({
      address: "1 Main St",
      beds: 3,
      baths: 2,
      sqft: 1500,
      yearBuilt: 1990,
      lat: null,
    });
    expect(comps.comps[1]).toMatchObject({
      address: "9 Elm St, Austin, TX 78701",
      price: 420000,
      beds: 4,
      sqft: 1600,
      yearBuilt: 2015,
      soldDate: "2026-08-01",
      distance: 0.8,
      differs: "+1 bed · built 2015",
      lat: null,
    });
    expect(comps.comps[0].url).toBe("https://www.redfin.com/x");
  });
});

describe("parseFacts", () => {
  it("ignores the facts inside the differs note", () => {
    expect(
      parseFacts(
        "3 bd/2 ba (built 2015 · 1.98 mi away) · 2,260 sq ft · built 2001",
      ),
    ).toMatchObject({ beds: 3, baths: 2, sqft: 2260, yearBuilt: 2001 });
  });
});

describe("compsResultToSave", () => {
  it("keeps only what the table and map need", () => {
    const saved = compsResultToSave(RESULT);
    expect(saved.location).toEqual({ lat: 30.1, lng: -97.7 });
    expect(saved.topComps[0]).not.toHaveProperty("reason");
  });
});

describe("medianPricePerSqft", () => {
  it("takes the median across comps with a price and size", () => {
    expect(
      medianPricePerSqft([
        { price: 200000, sqft: 1000 },
        { price: 300000, sqft: 1000 },
        { price: 0, sqft: 1000 },
      ]),
    ).toBe(250);
    expect(medianPricePerSqft([])).toBeNull();
  });
});

describe("shortPrice", () => {
  it("shortens prices for map pins", () => {
    expect(shortPrice(595900)).toBe("$596k");
    expect(shortPrice(1250000)).toBe("$1.25M");
    expect(shortPrice(10000000)).toBe("$10M");
    expect(shortPrice(null)).toBe("—");
  });
});
