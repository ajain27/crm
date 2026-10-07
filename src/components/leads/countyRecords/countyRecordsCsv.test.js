import { describe, it, expect } from "vitest";
import { chunkRows, parseCsv, toCountyRecords } from "./countyRecordsCsv";

describe("parseCsv", () => {
  it("handles quotes, embedded commas/newlines, CRLF and a BOM", () => {
    const text =
      '﻿Owner,Address,Notes\r\n"Doe, Jane","1 Main St","line 1\nline 2"\r\nBob,"2 ""Oak"" Ave",\r\n';
    expect(parseCsv(text)).toEqual([
      ["Owner", "Address", "Notes"],
      ["Doe, Jane", "1 Main St", "line 1\nline 2"],
      ["Bob", '2 "Oak" Ave', ""],
    ]);
  });

  it("detects tab- and semicolon-separated files", () => {
    expect(parseCsv("A\tB\n1\t2")).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
    expect(parseCsv("A;B\n1;2")).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});

describe("toCountyRecords", () => {
  it("names blank/duplicate headers, pads rows and drops blank rows", () => {
    expect(
      toCountyRecords([
        ["Owner", "", "Owner"],
        [" Jane ", "x"],
        ["", "", ""],
        ["Bob", "y", "z", "extra"],
      ]),
    ).toEqual({
      columns: ["Owner", "Column 2", "Owner (2)", "Column 4"],
      rows: [
        ["Jane", "x", "", ""],
        ["Bob", "y", "z", "extra"],
      ],
    });
  });
});

describe("chunkRows", () => {
  it("splits rows into JSON chunks under the byte limit, keeping order", () => {
    const rows = Array.from({ length: 50 }, (_, i) => [
      `row ${i}`,
      "x".repeat(40),
    ]);
    const chunks = chunkRows(rows, 500);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) =>
      expect(new TextEncoder().encode(c).length).toBeLessThanOrEqual(500),
    );
    expect(chunks.flatMap((c) => JSON.parse(c))).toEqual(rows);
  });
});
