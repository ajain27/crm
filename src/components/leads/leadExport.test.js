import { describe, it, expect } from "vitest";
import { exportBaseName, leadsToRows, rowsToCsv } from "./leadExport";

describe("leadExport", () => {
  it("builds a header row plus one row per lead, blank for missing fields", () => {
    const rows = leadsToRows([
      {
        sellerName: "Jane Doe",
        email: "jane@x.com",
        address: "1 Main St",
        arv: "$135,000",
      },
      { name: "Acme Plaza", website: "https://acme.com" },
    ]);
    const header = rows[0];
    const col = (name) => header.indexOf(name);
    expect(rows).toHaveLength(3);
    expect(rows[1][col("Name")]).toBe("Jane Doe");
    expect(rows[1][col("ARV")]).toBe("$135,000");
    expect(rows[1][col("Phone")]).toBe("");
    expect(header).not.toContain("First Name");
    expect(header).not.toContain("Last Name");
    expect(rows[2][col("Name")]).toBe("Acme Plaza");
    expect(rows[2][col("Listing / Website URL")]).toBe("https://acme.com");
  });

  it("trims blank lines around values so notes don't get a formula guard", () => {
    const rows = leadsToRows([{ notes: "\r\nMajor remodel\nZIP code\n" }]);
    const notes = rows[1][rows[0].indexOf("Notes")];
    expect(notes).toBe("Major remodel\nZIP code");
    expect(rowsToCsv([[notes]])).toBe('"Major remodel\nZIP code"');
  });

  it("quotes commas, quotes and newlines, and neutralizes formulas", () => {
    const csv = rowsToCsv([
      ["Name", "Notes"],
      ['Doe, "JJ"', "line 1\nline 2"],
      ['=HYPERLINK("x")', "@SUM(1)"],
    ]);
    expect(csv.split("\r\n")[0]).toBe("Name,Notes");
    expect(csv).toContain('"Doe, ""JJ""","line 1\nline 2"');
    expect(csv).toContain(`"'=HYPERLINK(""x"")",'@SUM(1)`);
  });

  it("makes a dated file name from the list title", () => {
    expect(exportBaseName("PPL Leads")).toMatch(
      /^ppl-leads-\d{4}-\d{2}-\d{2}$/,
    );
  });
});
