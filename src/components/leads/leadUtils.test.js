import { describe, it, expect } from "vitest";
import {
  uniqueById,
  sellerNameOf,
  buildDealFromLead,
  buildLeadFromDeal,
  dealLeadTab,
  dedupeLeads,
  leadMatchesSearch,
  paginate,
  parseAddress,
  leadForTab,
  leadTabOf,
  LEAD_TAB_IDS,
} from "./leadUtils";

describe("leadUtils", () => {
  it("paginates and summarizes a page of leads", () => {
    const items = Array.from({ length: 43 }, (_, i) => ({ id: i }));
    const result = paginate(items, 3);
    expect(result.pageItems).toHaveLength(3);
    expect(result.totalPages).toBe(3);
    expect(result.summary).toBe("41–43 of 43 leads");
  });

  it("clamps an out-of-range page to the last page", () => {
    const result = paginate([{ id: 1 }], 5);
    expect(result.page).toBe(1);
    expect(result.summary).toBe("1–1 of 1 lead");
    expect(paginate([], 1).summary).toBe("No leads");
  });

  it("matches a search query case-insensitively across fields", () => {
    const lead = { sellerName: "Jane Doe", phone: null };
    expect(leadMatchesSearch(lead, "jane", ["sellerName", "phone"])).toBe(true);
    expect(leadMatchesSearch(lead, "bob", ["sellerName", "phone"])).toBe(false);
    expect(leadMatchesSearch(lead, "", ["sellerName"])).toBe(true);
  });

  it("parses a full address into parts", () => {
    expect(parseAddress("123 Main St, Dallas, TX 75201")).toEqual({
      address: "123 Main St",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
    });
  });

  it("collapses leads that share a WordPress id", () => {
    const leads = [
      { id: "a", wpLeadId: 7 },
      { id: "b", wpLeadId: 7 },
      { id: "c", wpLeadId: 8 },
    ];
    expect(dedupeLeads(leads).map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("builds a CRM deal only when the lead has an address", () => {
    expect(buildDealFromLead({ address: "—" }, "u1")).toBeNull();
    const deal = buildDealFromLead(
      {
        propertyAddress: "9 Elm St, Austin, TX 78701",
        sellerName: "Jo",
        source: "MLS / Zillow",
      },
      "u1",
    );
    expect(deal).toMatchObject({
      userId: "u1",
      sellerFirstName: "Jo",
      sellerLastName: "",
      address: "9 Elm St",
      city: "Austin",
      onMarket: "Yes",
      notes: "Source: MLS / Zillow\nSeller: Jo",
    });
  });

  it("moves a CRM deal back to the lead it came from, with CRM notes", () => {
    const lead = {
      id: "l1",
      address: "9 Elm St, Austin, TX 78701",
      sellerName: "Jo",
      phone: "512-555-0100",
      source: "PPL",
      notes: "Roof leaks",
      photos: [{ id: "p1" }],
    };
    const deal = buildDealFromLead(lead, "u1");
    expect(dealLeadTab(deal)).toBe("ppl");
    expect(buildLeadFromDeal(deal, "u1")).toEqual({ ...lead, photos: [] });

    const edited = {
      ...deal,
      sellerPhone: "512-555-0199",
      notes: `${deal.notes}\nOffered 90k`,
    };
    expect(buildLeadFromDeal(edited, "u1")).toMatchObject({
      id: "l1",
      phone: "512-555-0199",
      notes: "Roof leaks\n\nOffered 90k",
    });
  });

  it("builds a lead for a deal that wasn't made from one", () => {
    const deal = {
      address: "1 Main St",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      sellerFirstName: "Al",
      sellerLastName: "Bo",
      sellerPhone: "512-555-0100",
      source: "Cold Call",
      notes: "Call back",
    };
    expect(dealLeadTab(deal)).toBe("coldcall");
    expect(buildLeadFromDeal(deal, "u1")).toMatchObject({
      userId: "u1",
      leadType: "residential",
      sellerName: "Al Bo",
      phone: "512-555-0100",
      address: "1 Main St, Austin, TX 78701",
      source: "Cold Call",
      notes: "Call back",
    });
  });

  it("carries a PPL lead's ARV onto the CRM deal as a number", () => {
    const deal = buildDealFromLead(
      {
        address: "9 Elm St, Austin, TX 78701",
        source: "PPL",
        arv: "$135,000.50",
      },
      "u1",
    );
    expect(deal.arv).toBe(135001);
    expect(deal.notes).toContain("ARV: $135,000.50");
    expect(
      buildDealFromLead({ address: "9 Elm St, Austin, TX 78701" }, "u1").arv,
    ).toBe("");
  });

  it("copies the seller's first and last name onto the CRM deal", () => {
    const deal = buildDealFromLead(
      {
        address: "9 Elm St, Austin, TX 78701",
        firstName: "Jane",
        lastName: "Q Doe",
        sellerName: "Jane Q Doe",
      },
      "u1",
    );
    expect(deal).toMatchObject({
      sellerFirstName: "Jane",
      sellerLastName: "Q Doe",
    });
    expect(
      buildDealFromLead(
        { address: "9 Elm St, Austin, TX 78701", sellerName: "Jane Q Doe" },
        "u1",
      ),
    ).toMatchObject({ sellerFirstName: "Jane", sellerLastName: "Q Doe" });
  });
});

describe("sellerNameOf", () => {
  it("joins first and last name, falling back to the combined name", () => {
    expect(sellerNameOf({ firstName: "Ann", lastName: "Bell" })).toBe(
      "Ann Bell",
    );
    expect(sellerNameOf({ firstName: "Ann", sellerName: "x" })).toBe("Ann");
    expect(sellerNameOf({ sellerName: " Old Name " })).toBe("Old Name");
    expect(sellerNameOf({})).toBe("");
  });
});

describe("uniqueById", () => {
  it("keeps the first entry for each id", () => {
    expect(
      uniqueById([{ id: "a", v: 1 }, { id: "b" }, { id: "a", v: 2 }]),
    ).toEqual([{ id: "a", v: 1 }, { id: "b" }]);
  });
});

describe("parseAddress state", () => {
  it("skips a county between the city and the state", () => {
    expect(parseAddress("1191 6th St NW, Atlanta, Fulton, GA 30318")).toEqual({
      address: "1191 6th St NW",
      city: "Atlanta",
      state: "GA",
      zipCode: "30318",
    });
    expect(
      parseAddress("15516 Elderwood Avenue, Cleveland, Cuyahoga County, OH"),
    ).toMatchObject({ city: "Cleveland", state: "OH", zipCode: "" });
  });

  it("reads full state names and ignores the country", () => {
    expect(
      parseAddress("4059 Hammock Trace, Atlanta, Georgia 30349, USA"),
    ).toMatchObject({ state: "GA", zipCode: "30349" });
    expect(
      parseAddress("205 Elm Pass II Rd E, Center Point, TX 78010, USA"),
    ).toMatchObject({ state: "TX", zipCode: "78010" });
  });

  it("leaves the state blank rather than guessing a county", () => {
    expect(parseAddress("25233 Lyndon, Monroe, Snohomish").state).toBe("");
    expect(parseAddress("1 Main St, Dallas")).toMatchObject({
      city: "Dallas",
      state: "",
    });
  });
});

describe("leadForTab", () => {
  const ppl = {
    id: "l1",
    leadType: "residential",
    source: "PPL",
    pplSource: true,
    email: "ann@x.com",
    address: "1 Main St",
  };

  it("lists the lead under whichever tab it's moved to", () => {
    for (const tab of LEAD_TAB_IDS) {
      expect(leadTabOf(leadForTab(ppl, tab))).toBe(tab);
    }
  });

  it("sets a source that matches the tab, keeping one that already does", () => {
    expect(leadForTab(ppl, "coldcall").source).toBe("Cold Call");
    expect(leadForTab(ppl, "ppc").source).toBe("PPC");
    expect(leadForTab(ppl, "residential").source).toBe("");
    expect(
      leadForTab({ ...ppl, source: "Driving for Dollars" }, "residential")
        .source,
    ).toBe("Driving for Dollars");
    expect(leadForTab({ ...ppl, source: "Facebook Ads" }, "ppc").source).toBe(
      "Facebook Ads",
    );
  });

  it("gives a lead moved to Commercial a name and its seller email", () => {
    expect(leadForTab(ppl, "commercial")).toMatchObject({
      leadType: "commercial",
      name: "1 Main St",
      sellerEmail: "ann@x.com",
    });
  });
});
