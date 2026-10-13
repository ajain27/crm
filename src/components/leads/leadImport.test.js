import { describe, it, expect } from "vitest";
import { csvToPplLeads } from "./leadImport";
import { leadsToRows, rowsToCsv } from "./leadExport";
import { isPplLead } from "./leadUtils";

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
    const result = csvToPplLeads(csv, {
      existingLeads: [{ email: "DUP@x.com" }],
      now: NOW,
    });
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
