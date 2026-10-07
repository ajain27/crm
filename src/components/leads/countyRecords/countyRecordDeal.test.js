import { describe, it, expect } from "vitest";
import {
  buildDealFromCountyRecord,
  countyRecordFields,
  countyRecordPropertyKey,
  propertyKey,
} from "./countyRecordDeal";

const columns = [
  "Parcel ID",
  "Owner Name",
  "Mailing Address",
  "Mailing City",
  "Situs Address",
  "Situs City",
  "Situs State",
  "Situs Zip",
  "Owner Phone",
  "Assessed Value",
];
const row = [
  "123-45",
  "Jane Q Doe",
  "PO Box 9",
  "Nashville",
  "164 Auburn St",
  "Russellville",
  "AL",
  "35654",
  "256-555-0100",
  "$90,000",
];

describe("countyRecordDeal", () => {
  it("finds the property (not mailing) address, owner and phone", () => {
    expect(countyRecordFields(columns, row)).toEqual({
      address: "164 Auburn St, Russellville, AL 35654",
      ownerName: "Jane Q Doe",
      firstName: "",
      lastName: "",
      phone: "256-555-0100",
    });
  });

  it("uses a single full-address column and separate owner name columns", () => {
    expect(
      countyRecordFields(
        ["Property Address", "Owner First Name", "Owner Last Name"],
        ["9 Elm St, Austin, TX 78701", "Sam", "Seller"],
      ),
    ).toMatchObject({
      address: "9 Elm St, Austin, TX 78701",
      ownerName: "Sam Seller",
      firstName: "Sam",
      lastName: "Seller",
    });
  });

  it("builds a CRM deal with the whole record in its notes", () => {
    const deal = buildDealFromCountyRecord({
      columns,
      row,
      fileName: "lawrence.csv",
      userId: "u1",
    });
    expect(deal).toMatchObject({
      userId: "u1",
      address: "164 Auburn St",
      city: "Russellville",
      state: "AL",
      zipCode: "35654",
      sellerFirstName: "Jane",
      sellerLastName: "Q Doe",
      sellerPhone: "256-555-0100",
      source: "County Records",
    });
    expect(deal.notes).toContain("County record (lawrence.csv):");
    expect(deal.notes).toContain("Assessed Value: $90,000");
    expect(deal.notes).toContain("Mailing Address: PO Box 9");
  });

  it("returns null without a property address", () => {
    expect(
      buildDealFromCountyRecord({
        columns: ["Owner Name", "Mailing Address"],
        row: ["Jane", "PO Box 9"],
        fileName: "x.csv",
        userId: "u1",
      }),
    ).toBeNull();
  });

  it("matches a record to an existing deal by street and city", () => {
    expect(countyRecordPropertyKey(columns, row)).toBe(
      propertyKey({ address: "164 AUBURN ST.", city: "russellville" }),
    );
  });
});
