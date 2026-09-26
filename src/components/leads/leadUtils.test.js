import { describe, it, expect } from "vitest";
import {
  buildDealFromLead,
  dedupeLeads,
  leadMatchesSearch,
  paginate,
  parseAddress,
} from "./leadUtils";

describe("leadUtils", () => {
  it("paginates and summarizes a page of leads", () => {
    const items = Array.from({ length: 23 }, (_, i) => ({ id: i }));
    const result = paginate(items, 3);
    expect(result.pageItems).toHaveLength(3);
    expect(result.totalPages).toBe(3);
    expect(result.summary).toBe("21–23 of 23 leads");
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
      address: "9 Elm St",
      city: "Austin",
      onMarket: "Yes",
      notes: "Source: MLS / Zillow\nSeller: Jo",
    });
  });
});
