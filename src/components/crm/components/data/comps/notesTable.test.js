import { describe, it, expect } from "vitest";
import { hasFormattedNotes, splitQaTable } from "./notesTable";

const PROVIDER_NOTES = [
  "Property details",
  "Question",
  "Answer",
  "Repair scope",
  "Cosmetic updates: flooring, paint, etc.",
  "ZIP code",
  "78010",
  "Bedrooms",
  "2",
].join("\n\n");

describe("splitQaTable", () => {
  it("pairs a Question / Answer table's cells back into rows", () => {
    expect(splitQaTable(PROVIDER_NOTES)).toEqual({
      before: "",
      title: "Property details",
      rows: [
        {
          question: "Repair scope",
          answer: "Cosmetic updates: flooring, paint, etc.",
        },
        { question: "ZIP code", answer: "78010" },
        { question: "Bedrooms", answer: "2" },
      ],
      after: "",
    });
  });

  it("keeps a long line before the table as text, not a title", () => {
    const longLine =
      "Seller called back and wants to close before the end of the month";
    const table = splitQaTable(`${longLine}\nQuestion\nAnswer\nBeds\n3`);
    expect(table.title).toBe("");
    expect(table.before).toBe(longLine);
    expect(table.rows).toEqual([{ question: "Beds", answer: "3" }]);
  });

  it("keeps an odd cell left over at the end as text", () => {
    expect(
      splitQaTable("Question\nAnswer\nBeds\n3\nCall back Friday").after,
    ).toBe("Call back Friday");
  });

  it("finds a table whose header and first label were cut off", () => {
    const notes = [
      "Major remodel: kitchen, bathroom, roof, etc.",
      "ZIP code",
      "98043",
      "Property type",
      "Single family",
      "Square footage",
      "1222",
      "Lot size",
      "0.15",
      "Loss in the family",
      "Seller replied text - not selling.",
    ].join("\n\n");
    expect(splitQaTable(notes)).toEqual({
      before: "Major remodel: kitchen, bathroom, roof, etc.",
      title: "",
      rows: [
        { question: "ZIP code", answer: "98043" },
        { question: "Property type", answer: "Single family" },
        { question: "Square footage", answer: "1222" },
        { question: "Lot size", answer: "0.15" },
      ],
      after: "Loss in the family\nSeller replied text - not selling.",
    });
  });

  it("needs at least two known labels to call it a table", () => {
    expect(splitQaTable("Bedrooms\n3\nCall back Friday")).toBeNull();
  });

  it("returns null for notes without a table", () => {
    expect(splitQaTable("Seller wants $200k.\nCall back Friday.")).toBeNull();
    expect(splitQaTable("Question\nAnswer")).toBeNull();
  });
});

describe("hasFormattedNotes", () => {
  it("is true for a Question / Answer table and false for plain notes", () => {
    expect(hasFormattedNotes(PROVIDER_NOTES)).toBe(true);
    expect(hasFormattedNotes("Just a note")).toBe(false);
    expect(hasFormattedNotes("")).toBe(false);
  });
});
