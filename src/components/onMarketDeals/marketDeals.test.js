import { describe, it, expect } from "vitest";
import { uniqueListings } from "./marketDeals";

describe("uniqueListings", () => {
  it("shows a home two city searches both found once, with both keywords", () => {
    const home = { id: "z1", street: "1621 NE 7th St", keywords: ["fixer"] };
    const sameHome = { ...home, keywords: ["fixer", "as is"] };
    const neighbor = {
      id: "z2",
      street: "1617 NE 7th St",
      keywords: ["fixer"],
    };
    expect(uniqueListings([home, neighbor, sameHome])).toEqual([
      { ...home, keywords: ["fixer", "as is"] },
      neighbor,
    ]);
  });
});
