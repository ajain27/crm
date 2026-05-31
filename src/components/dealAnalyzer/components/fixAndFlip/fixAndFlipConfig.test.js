import { describe, it, expect } from "vitest";
import {
  REHAB_LOOKUP,
  REHAB_OPTIONS,
  initialForm,
  CURRENCY_FIELDS,
  PERCENT_FIELDS,
  getRehabMultiplier,
  isCheapMarket,
  getAutoRehabCost,
} from "./fixAndFlipConfig";

describe("REHAB_LOOKUP", () => {
  it("has 5 tiers per type", () => {
    expect(REHAB_LOOKUP.light).toHaveLength(5);
    expect(REHAB_LOOKUP.average).toHaveLength(5);
    expect(REHAB_LOOKUP.heavy).toHaveLength(5);
  });

  it("heavy is most expensive across tiers", () => {
    REHAB_LOOKUP.light.forEach((cost, i) => {
      expect(REHAB_LOOKUP.heavy[i]).toBeGreaterThan(cost);
    });
  });
});

describe("getRehabMultiplier", () => {
  it("returns 1/3 for cheap-market states", () => {
    expect(getRehabMultiplier("AL")).toBeCloseTo(1 / 3, 5);
    expect(getRehabMultiplier("TN")).toBeCloseTo(1 / 3, 5);
  });

  it("returns 1 for non-cheap states", () => {
    expect(getRehabMultiplier("CA")).toBe(1);
    expect(getRehabMultiplier("NY")).toBe(1);
  });

  it("is case-insensitive and trim-tolerant", () => {
    expect(getRehabMultiplier(" al ")).toBeCloseTo(1 / 3, 5);
    expect(getRehabMultiplier("al")).toBeCloseTo(1 / 3, 5);
  });

  it("returns 1 for empty/invalid input", () => {
    expect(getRehabMultiplier("")).toBe(1);
    expect(getRehabMultiplier(null)).toBe(1);
    expect(getRehabMultiplier(undefined)).toBe(1);
  });
});

describe("isCheapMarket", () => {
  it("matches cheap-market states", () => {
    expect(isCheapMarket("AL")).toBe(true);
    expect(isCheapMarket("tn")).toBe(true);
  });

  it("rejects non-cheap states", () => {
    expect(isCheapMarket("CA")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(isCheapMarket("")).toBe(false);
    expect(isCheapMarket(undefined)).toBe(false);
  });
});

describe("REHAB_OPTIONS", () => {
  it("starts with a placeholder", () => {
    expect(REHAB_OPTIONS[0].value).toBe("");
  });

  it("contains no-rehab, light, average, heavy", () => {
    const values = REHAB_OPTIONS.map((o) => o.value);
    expect(values).toEqual(
      expect.arrayContaining(["no-rehab", "light", "average", "heavy"]),
    );
  });
});

describe("initialForm", () => {
  it("has every required field empty", () => {
    expect(initialForm).toMatchObject({
      state: "",
      arv: "",
      purchasePrice: "",
      rehabType: "",
      squareFootage: "",
    });
  });
});

describe("CURRENCY_FIELDS / PERCENT_FIELDS", () => {
  it("CURRENCY_FIELDS contains money inputs", () => {
    expect(CURRENCY_FIELDS.has("arv")).toBe(true);
    expect(CURRENCY_FIELDS.has("purchasePrice")).toBe(true);
    expect(CURRENCY_FIELDS.has("rehabCost")).toBe(true);
  });

  it("PERCENT_FIELDS contains percent inputs", () => {
    expect(PERCENT_FIELDS.has("points")).toBe(true);
    expect(PERCENT_FIELDS.has("interestRate")).toBe(true);
  });
});

describe("getAutoRehabCost", () => {
  it("returns null when rehabType is empty", () => {
    expect(getAutoRehabCost("", 2000)).toBeNull();
  });

  it("returns 0 with estimated=false for no-rehab", () => {
    expect(getAutoRehabCost("no-rehab", 2000)).toEqual({
      cost: 0,
      estimated: false,
    });
  });

  it("returns null when sqft exceeds 5500 (manual entry)", () => {
    expect(getAutoRehabCost("average", 6000)).toBeNull();
  });

  it("uses middle tier (1) with estimated=true when sqft is missing", () => {
    expect(getAutoRehabCost("light", 0)).toEqual({
      cost: REHAB_LOOKUP.light[1],
      estimated: true,
    });
  });

  it("selects tier 0 for sqft < 1500", () => {
    expect(getAutoRehabCost("light", 1200)).toEqual({
      cost: REHAB_LOOKUP.light[0],
      estimated: false,
    });
  });

  it("selects tier 1 for 1500–2500", () => {
    expect(getAutoRehabCost("average", 2000)).toEqual({
      cost: REHAB_LOOKUP.average[1],
      estimated: false,
    });
  });

  it("selects tier 2 for 2500–3500", () => {
    expect(getAutoRehabCost("average", 3000)).toEqual({
      cost: REHAB_LOOKUP.average[2],
      estimated: false,
    });
  });

  it("selects tier 3 for 3500–5000", () => {
    expect(getAutoRehabCost("heavy", 4500)).toEqual({
      cost: REHAB_LOOKUP.heavy[3],
      estimated: false,
    });
  });

  it("selects tier 4 for 5000–5500", () => {
    expect(getAutoRehabCost("heavy", 5300)).toEqual({
      cost: REHAB_LOOKUP.heavy[4],
      estimated: false,
    });
  });
});
