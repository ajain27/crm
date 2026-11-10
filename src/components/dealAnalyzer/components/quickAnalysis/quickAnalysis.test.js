import { describe, expect, it } from "vitest";
import {
  analysisDefaults,
  estimateRepairs,
  novationNumbers,
  wholesaleNumbers,
} from "./quickAnalysis";

describe("wholesaleNumbers", () => {
  it("takes the buyer's profit, repairs and the fee off the ARV", () => {
    expect(
      wholesaleNumbers({
        arv: 255000,
        repairs: 40000,
        wholesaleFee: 10000,
        buyersProfitPct: 30,
      }),
    ).toEqual({
      arv: 255000,
      buyersProfit: 76500,
      repairs: 40000,
      wholesaleFee: 10000,
      mao: 128500,
      buyerPrice: 138500,
    });
  });
});

describe("novationNumbers", () => {
  it("holds back 10% of the ARV, then repairs and the fee", () => {
    expect(
      novationNumbers({ arv: 255000, repairs: 40000, wholesaleFee: 10000 }),
    ).toEqual({
      arv: 255000,
      agentCommission: 15300,
      buffer: 7650,
      closingCosts: 2550,
      repairs: 40000,
      wholesaleFee: 10000,
      offer: 179500,
    });
  });
});

describe("analysisDefaults", () => {
  it("reads a lead's ARV, asking price, size and state", () => {
    expect(
      analysisDefaults({
        address: "3102 Carmel St, Houston, TX 77091",
        arv: "$255,363",
        askingPrice: "$200,000",
        compsResult: { property: { sqft: 1400 } },
      }),
    ).toEqual({
      arv: 255363,
      rehabType: "",
      repairCost: "",
      wholesaleFee: 10000,
      buyersProfitPct: 30,
      askingPrice: 200000,
      sqft: 1400,
      state: "TX",
    });
  });

  it("uses a deal's fee, buyer's profit and repair figure", () => {
    const defaults = analysisDefaults({
      arv: 300000,
      state: "ga",
      rehabType: "light",
      rehabCost: "$25,000",
      squareFootage: "6000",
      desiredProfit: "$15,000",
      buyersProfit: "25%",
    });
    expect(defaults).toMatchObject({
      rehabType: "light",
      repairCost: 25000,
      wholesaleFee: 15000,
      buyersProfitPct: 25,
      state: "GA",
    });
  });
});

describe("estimateRepairs", () => {
  it("estimates from the work, size and state; none for a very big house", () => {
    expect(estimateRepairs("no-rehab", 1400, "TX")).toBe(0);
    expect(estimateRepairs("light", 1400, "TX")).toBeGreaterThan(0);
    expect(estimateRepairs("light", 6000, "TX")).toBeNull();
    expect(estimateRepairs("", 1400, "TX")).toBeNull();
  });
});
