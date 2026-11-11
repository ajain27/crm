import { describe, it, expect } from "vitest";
import { matchesQuery, searchCountyRecords, searchLeads } from "./globalSearch";

describe("globalSearch", () => {
  it("matches every word, in any field, ignoring case", () => {
    expect(matchesQuery(["Leah Holben", "Allen Park"], "leah allen")).toBe(
      true,
    );
    expect(matchesQuery(["Leah Holben", "Allen Park"], "leah dearborn")).toBe(
      false,
    );
    expect(matchesQuery(["Leah"], "  ")).toBe(false);
  });

  it("matches phone numbers by their digits", () => {
    expect(matchesQuery(["(313) 682-2695"], "313-682-2695")).toBe(true);
    expect(matchesQuery(["313.682.2695"], "682 2695")).toBe(true);
    expect(matchesQuery(["(313) 682-2695"], "999")).toBe(false);
  });

  it("finds leads with the tab each one is on", () => {
    const results = searchLeads(
      [
        { id: "1", source: "PPL", firstName: "Ann", address: "1 Main St" },
        { id: "2", leadType: "commercial", name: "Ann's Plaza" },
        { id: "3", source: "Cold Call", firstName: "Bob" },
      ],
      "ann",
    );
    expect(results.map((r) => [r.lead.id, r.group])).toEqual([
      ["1", "ppl"],
      ["2", "commercial"],
    ]);
  });

  it("finds county records in any column, skipping deleted ones", () => {
    const list = {
      id: "i1",
      name: "MI_TAX",
      columns: ["Owner", "Address", "City", "Phone"],
      rows: [
        ["LEAH HOLBEN", "19026 PHILOMENE", "ALLEN PARK", "(313) 682-2695"],
        ["LEAH GONE", "1 X ST", "ALLEN PARK", ""],
      ],
      deletedRows: [1],
    };
    expect(searchCountyRecords([list], "allen park")).toEqual([
      {
        key: "county-i1-0",
        group: "county",
        importId: "i1",
        rowIndex: 0,
        listName: "MI_TAX",
        name: "LEAH HOLBEN",
        address: "19026 PHILOMENE, ALLEN PARK",
        phones: ["(313) 682-2695"],
      },
    ]);
  });
});
