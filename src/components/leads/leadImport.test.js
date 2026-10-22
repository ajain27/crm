import { describe, it, expect } from "vitest";
import {
  csvToCommercialLeads,
  csvToPplLeads,
  csvToResidentialLeads,
} from "./leadImport";
import { leadsToRows, rowsToCsv } from "./leadExport";
import { isPplLead, isResidentialLead } from "./leadUtils";

const NOW = new Date("2026-10-13T12:00:00Z");

describe("csvToPplLeads", () => {
  it("maps common vendor headers, joins city/state/zip and cleans phones", () => {
    const csv = [
      "Full Name,E-mail Address,Phone Number,Property Address,City,State,Zip Code,Comments",
      'Jane Doe,jane@x.com,+1 (206) 555-0100,12 Oak St,Dallas,TX,75201,"Needs roof, fast"',
    ].join("\n");
    const { leads } = csvToPplLeads(csv, { userId: "u1", now: NOW });

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      sellerName: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@x.com",
      phone: "206-555-0100",
      address: "12 Oak St, Dallas, TX 75201",
      notes: "Needs roof, fast",
      source: "PPL",
      userId: "u1",
      leadType: "residential",
    });
    expect(isPplLead(leads[0])).toBe(true);
  });

  it("re-imports the app's own PPL export", () => {
    const original = {
      sellerName: "Sam Lee",
      firstName: "Sam",
      lastName: "Lee",
      email: "sam@x.com",
      phone: "512-555-0199",
      address: "9 Elm St, Austin, TX 78701",
      sellingUrgency: "ASAP",
      dateAdded: "2026-10-01",
      notes: "Call after 5",
    };
    const csv = rowsToCsv(leadsToRows([original], { includeAgent: false }));
    const { leads } = csvToPplLeads(csv, { now: NOW });
    expect(leads[0]).toMatchObject(original);
  });

  it("skips rows matching an existing lead or an earlier row", () => {
    const csv = [
      "Name,Email,Phone,Address",
      "A,a@x.com,111-222-3333,1 First St",
      "B,dup@x.com,999-888-7777,2 Second St", // email matches existing
      "C,c@x.com,111.222.3333,3 Third St", // phone matches row A
      'D,d@x.com,,"1 First St, Dallas"', // street matches row A
      "E,e@x.com,444-555-6666,5 Fifth St",
      ",,,",
    ].join("\n");
    // The existing lead already has everything row B has, so B is skipped.
    const existing = {
      id: "x",
      email: "DUP@x.com",
      firstName: "B",
      sellerName: "B",
      phone: "999-888-7777",
      address: "2 Second St",
    };
    const result = csvToPplLeads(csv, { existingLeads: [existing], now: NOW });
    expect(result.leads.map((l) => l.sellerName)).toEqual(["A", "E"]);
    expect(result.skippedDuplicates).toBe(3);
    expect(result.skippedEmpty).toBe(0);
  });

  it("counts rows with no name, email, phone or address as skipped", () => {
    const csv = "Name,Email,Notes\n,,just a note\nAl,,";
    const result = csvToPplLeads(csv, { now: NOW });
    expect(result.leads).toHaveLength(1);
    expect(result.skippedEmpty).toBe(1);
  });

  it("explains when no column looks like lead data", () => {
    const result = csvToPplLeads("Foo,Bar\n1,2", { now: NOW });
    expect(result.error).toMatch(/Couldn't find any lead columns/);
  });

  it("uses today when the file has no readable date", () => {
    const { leads } = csvToPplLeads("Name,Date\nAl,not a date", { now: NOW });
    expect(leads[0].dateAdded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(leads[0].dateAddedAt).toBe(NOW.toISOString());
  });
});

// Keep the import in step with the export: every export column is read back.
it("reads every column the PPL export writes", () => {
  const [header] = leadsToRows([], { includeAgent: false });
  // Imported leads are always PPL, so Source is ignored on purpose.
  const ignored = ["Source"];
  const csv = `${header.join(",")}\n`;
  const { unmatchedHeaders } = csvToPplLeads(csv);
  expect(unmatchedHeaders.filter((h) => !ignored.includes(h))).toEqual([]);
});

describe("csvToCommercialLeads", () => {
  it("maps business columns into a commercial lead", () => {
    const csv = [
      "Business Name,Owner,Email,Phone,Address,City,State,Zip,Website,Property Type",
      "Starlight Hills Campground,Ann Bell,ann@x.com,(830) 998-7050,1 Hill Rd,Kerrville,TX,78028,https://starlight.example,RV Park",
    ].join("\n");
    const { leads } = csvToCommercialLeads(csv, { userId: "u1", now: NOW });

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      name: "Starlight Hills Campground",
      sellerName: "Ann Bell",
      sellerEmail: "ann@x.com",
      phone: "830-998-7050",
      address: "1 Hill Rd, Kerrville, TX 78028",
      state: "TX",
      website: "https://starlight.example",
      propertyType: "RV Park",
      leadType: "commercial",
      userId: "u1",
    });
  });

  it("skips rows already in the commercial list", () => {
    const csv = ["Name,Address", "Outback Springs,5 Main St, Austin, TX"].join(
      "\n",
    );
    const existing = [
      {
        id: "c1",
        leadType: "commercial",
        name: "Outback Springs",
        address: "5 Main St",
      },
    ];
    const result = csvToCommercialLeads(csv, { existingLeads: existing });
    expect(result.leads).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
    expect(result.skippedDuplicates).toBe(1);
  });

  it("reads Seller First / Last Name and Phone 2 columns", () => {
    const csv = [
      "Business Name,Seller First Name,Seller Last Name,Phone,Phone 2",
      "Yacht Haven,Ann,Bell,516-695-1008,(954) 555 0101",
    ].join("\n");
    const { leads } = csvToCommercialLeads(csv, { now: NOW });
    expect(leads[0]).toMatchObject({
      name: "Yacht Haven",
      firstName: "Ann",
      lastName: "Bell",
      sellerName: "Ann Bell",
      phone: "516-695-1008",
      phone2: "954-555-0101",
    });
  });

  it("fills in blank details on a lead already in the list, keeping the rest", () => {
    const csv = [
      "Business Name,Seller First Name,Seller Last Name,Phone,Phone 2,Notes",
      "Yacht Haven Park,Ann,Bell,516-695-1008,954-555-0101,From the file",
    ].join("\n");
    const existing = {
      id: "c1",
      leadType: "commercial",
      name: "Yacht Haven",
      phone: "516-695-1008",
      notes: "Called twice",
      source: "Cold Call",
    };
    const result = csvToCommercialLeads(csv, { existingLeads: [existing] });
    expect(result.leads).toHaveLength(0);
    expect(result.updates).toEqual([
      expect.objectContaining({
        id: "c1",
        name: "Yacht Haven",
        notes: "Called twice",
        source: "Cold Call",
        firstName: "Ann",
        lastName: "Bell",
        sellerName: "Ann Bell",
        phone2: "954-555-0101",
      }),
    ]);
  });

  it("errors when no lead columns are found", () => {
    expect(csvToCommercialLeads("Foo,Bar\n1,2").error).toMatch(/headers/);
  });
});

describe("csvToResidentialLeads", () => {
  it("keeps the file's source, agent and listed price", () => {
    const csv = [
      "Name,Phone,Address,Source,Agent Name,Agent Phone,Listed Price,Asking Price",
      "Jane Doe,2065550100,12 Oak St,Driving for Dollars,Sam Agent,+1 512 555 0199,250000,200000",
    ].join("\n");
    const { leads } = csvToResidentialLeads(csv, { userId: "u1", now: NOW });

    expect(leads[0]).toMatchObject({
      sellerName: "Jane Doe",
      phone: "206-555-0100",
      source: "Driving for Dollars",
      agentName: "Sam Agent",
      agentPhone: "512-555-0199",
      listedPrice: "$250,000",
      askingPrice: "$200,000",
      leadType: "residential",
    });
    expect(leads[0]).not.toHaveProperty("pplSource");
    expect(isResidentialLead(leads[0])).toBe(true);
  });

  it("re-imports the app's own residential export", () => {
    const original = {
      sellerName: "Sam Lee",
      phone: "512-555-0199",
      address: "9 Elm St, Austin, TX 78701",
      source: "Cold Call",
      agentName: "Pat",
      agentPhone: "512-555-0100",
      askingPrice: "$150,000",
      dateAdded: "2026-10-01",
    };
    const { leads, unmatchedHeaders } = csvToResidentialLeads(
      rowsToCsv(leadsToRows([original])),
      { now: NOW },
    );
    expect(leads[0]).toMatchObject(original);
    expect(unmatchedHeaders).toEqual([]);
  });

  it("skips leads already in the list", () => {
    const csv = "Name,Phone\nJane,206-555-0100";
    const result = csvToResidentialLeads(csv, {
      existingLeads: [
        {
          id: "r1",
          phone: "(206) 555-0100",
          firstName: "Jane",
          sellerName: "Jane",
        },
      ],
    });
    expect(result.leads).toHaveLength(0);
    expect(result.skippedDuplicates).toBe(1);
  });
});

describe("extra columns", () => {
  it("keeps columns the app has no field for as extra details", () => {
    const csv = [
      "First Name,Last Name,Street,City,State,Mobile,Email,Phone-2,Website,Sites,Acres",
      "Deborah,Halm,3000 Clarcona Rd,Apopka,FL,(407) 375-6065,Contact@PrincessRVResort.com,(407) 654-5788,https://princess.example,120,15",
    ].join("\n");
    const { leads } = csvToCommercialLeads(csv, { now: NOW });
    expect(leads[0]).toMatchObject({
      firstName: "Deborah",
      lastName: "Halm",
      sellerName: "Deborah Halm",
      address: "3000 Clarcona Rd, Apopka, FL",
      phone: "407-375-6065",
      phone2: "407-654-5788",
      sellerEmail: "Contact@PrincessRVResort.com",
      website: "https://princess.example",
      extraFields: { Sites: "120", Acres: "15" },
    });
  });

  it("doesn't keep the app's own export columns as extras", () => {
    const csv = "Name,Phone,Source,Agent Name\nJo,206-555-0100,PPL,Sam";
    const { leads } = csvToPplLeads(csv, { now: NOW });
    expect(leads[0]).not.toHaveProperty("extraFields");
  });
});
