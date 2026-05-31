import { describe, it, expect } from "vitest";
import { STATE_OPTIONS } from "./stateOptions";

describe("STATE_OPTIONS", () => {
  it("starts with an empty placeholder option", () => {
    expect(STATE_OPTIONS[0]).toEqual({ value: "", label: "Select State..." });
  });

  it("includes a placeholder plus 51 state entries", () => {
    expect(STATE_OPTIONS.length).toBe(52);
  });

  it("each non-placeholder entry has a 2-char value and matching label suffix", () => {
    STATE_OPTIONS.slice(1).forEach(({ value, label }) => {
      expect(value).toMatch(/^[A-Z]{2}$/);
      expect(label).toMatch(new RegExp(`\\(${value}\\)$`));
    });
  });

  it("contains common states", () => {
    const values = STATE_OPTIONS.map((s) => s.value);
    expect(values).toContain("CA");
    expect(values).toContain("TX");
    expect(values).toContain("NY");
    expect(values).toContain("FL");
  });
});
