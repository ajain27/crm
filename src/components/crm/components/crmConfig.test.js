import { describe, expect, it } from "vitest";
import {
  createEmptyDealForm,
  getSuggestedWholesaleMao,
  getWholesaleRehabDetails,
} from "./crmConfig";

describe("getWholesaleRehabDetails", () => {
  it("calculates auto rehab from state and rehab type, then adds additional rehab", () => {
    const form = {
      ...createEmptyDealForm(),
      state: "AL",
      rehabType: "light",
      squareFootage: "1200",
      additionalRehabCost: "$5,000",
    };

    const result = getWholesaleRehabDetails(form);

    expect(result.autoRehabCost).toBe(10000);
    expect(result.additionalRehabCost).toBe(5000);
    expect(result.totalRehabCost).toBe(15000);
    expect(result.rehabCostReady).toBe(true);
  });

  it("returns zero total rehab for no-rehab deals", () => {
    const form = {
      ...createEmptyDealForm(),
      rehabType: "no-rehab",
      additionalRehabCost: "$5,000",
    };

    const result = getWholesaleRehabDetails(form);

    expect(result.totalRehabCost).toBe(0);
    expect(result.rehabCostReady).toBe(true);
  });

  it("uses manual rehab entry when square footage is too large for auto rehab", () => {
    const form = {
      ...createEmptyDealForm(),
      rehabType: "heavy",
      squareFootage: "5600",
      rehabCost: "$80,000",
      additionalRehabCost: "$5,000",
    };

    const result = getWholesaleRehabDetails(form);

    expect(result.autoRehabCost).toBeNull();
    expect(result.isManualRehab).toBe(true);
    expect(result.totalRehabCost).toBe(85000);
  });
});

describe("getSuggestedWholesaleMao", () => {
  it("calculates mao from ARV, total rehab, and desired profit", () => {
    const form = {
      ...createEmptyDealForm(),
      state: "AL",
      arv: "$100,000",
      rehabType: "light",
      squareFootage: "1200",
      additionalRehabCost: "$5,000",
      desiredProfit: "$10,000",
    };

    expect(getSuggestedWholesaleMao(form)).toBe(45000);
  });

  it("returns a negative mao when desired profit and rehab exceed the threshold", () => {
    const form = {
      ...createEmptyDealForm(),
      arv: "$100,000",
      rehabType: "heavy",
      squareFootage: "5600",
      rehabCost: "$80,000",
      desiredProfit: "$10,000",
    };

    expect(getSuggestedWholesaleMao(form)).toBe(-20000);
  });
});
