import { describe, it, expect } from "vitest";
import { addressMatchKey, findAddressDuplicates } from "./leadDuplicates";

describe("addressMatchKey", () => {
  it("matches the same street and city however it's written", () => {
    expect(addressMatchKey("1 Main St, Dallas, TX 75201, USA")).toBe(
      addressMatchKey("1 main st., dallas, TX"),
    );
  });

  it("tells apart the same street in different cities", () => {
    expect(addressMatchKey("1 Main St, Dallas, TX")).not.toBe(
      addressMatchKey("1 Main St, Austin, TX"),
    );
  });

  it("is null without a street", () => {
    expect(addressMatchKey("")).toBeNull();
    expect(addressMatchKey(", Dallas")).toBeNull();
  });
});

describe("findAddressDuplicates", () => {
  it("keeps the most complete lead per address, filled in from the others", () => {
    const leads = [
      {
        id: "a",
        address: "3000 Clarcona Rd, Apopka, FL",
        phone: "407-375-6065",
        dateAdded: "2026-10-01",
      },
      {
        id: "b",
        address: "3000 Clarcona Rd, Apopka, FL 32703",
        phone: "407-375-6065",
        firstName: "Deborah",
        lastName: "Halm",
        sellerName: "Deborah Halm",
        dateAdded: "2026-10-02",
      },
      {
        id: "c",
        address: "3000 CLARCONA RD, Apopka",
        phone2: "407-654-5788",
        firstName: "Debbie",
        dateAdded: "2026-10-03",
      },
      { id: "d", address: "9770 County Rd 769, Arcadia, FL" },
    ];
    const groups = findAddressDuplicates(leads);
    expect(groups).toHaveLength(1);
    const [{ keep, changed, duplicates }] = groups;
    expect(keep).toMatchObject({
      id: "b",
      firstName: "Deborah",
      sellerName: "Deborah Halm",
      phone2: "407-654-5788",
    });
    expect(changed).toBe(true);
    expect(duplicates.map((l) => l.id).sort()).toEqual(["a", "c"]);
  });

  it("finds nothing when every address is different", () => {
    expect(
      findAddressDuplicates([
        { id: "a", address: "1 Main St, Dallas" },
        { id: "b", address: "2 Main St, Dallas" },
        { id: "c" },
      ]),
    ).toEqual([]);
  });
});

describe("findAddressDuplicates with the same lead listed twice", () => {
  it("doesn't treat a lead as a duplicate of itself", () => {
    const lead = { id: "a", address: "1 Main St, Dallas, TX" };
    expect(findAddressDuplicates([lead, { ...lead }])).toEqual([]);
  });

  it("still finds real duplicates alongside repeated entries", () => {
    const a = { id: "a", address: "1 Main St, Dallas", phone: "1" };
    const b = { id: "b", address: "1 Main St, Dallas" };
    const groups = findAddressDuplicates([a, b, { ...a }, { ...b }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].keep.id).toBe("a");
    expect(groups[0].duplicates.map((l) => l.id)).toEqual(["b"]);
  });
});
