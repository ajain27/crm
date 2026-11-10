import { describe, expect, it } from "vitest";
import { prefillFromDeal } from "./dealPrefill";

describe("prefillFromDeal", () => {
  const deal = {
    state: "tx",
    arv: 450000,
    rehabCost: "$30,000",
    additionalRehabCost: 5000,
    squareFootage: "1,400",
    desiredProfit: "$20,000",
    buyersProfit: "25%",
    mao: 252500,
  };

  it("fills the wholesale, novation and fix-and-flip inputs from a deal", () => {
    expect(prefillFromDeal(deal, "1 Main St, Austin, TX 78701")).toEqual({
      wholesale: {
        propertyAddress: "1 Main St, Austin, TX 78701",
        state: "TX",
        arv: "$450,000",
        rehabType: "",
        squareFootage: "1400",
        rehabCost: "$30,000",
        additionalRehabCost: "$5,000",
        wholesaleFee: "$20,000",
        buyersProfit: "25%",
      },
      novation: {
        arv: "$450,000",
        repairs: "$35,000",
        wholesaleFee: "$20,000",
      },
      "fix-flip": {
        state: "TX",
        arv: "$450,000",
        purchasePrice: "$252,500",
        rehabType: "",
        squareFootage: "1400",
        rehabCost: "$30,000",
        additionalRehabCost: "$5,000",
      },
    });
  });

  it("uses the contract price as the purchase price, and 30% buyer's profit by default", () => {
    const prefill = prefillFromDeal({
      ...deal,
      buyersProfit: "",
      contractPrice: 240000,
    });
    expect(prefill["fix-flip"].purchasePrice).toBe("$240,000");
    expect(prefill.wholesale.buyersProfit).toBe("30%");
  });

  it("leaves missing numbers empty", () => {
    const prefill = prefillFromDeal({});
    expect(prefill.novation).toEqual({
      arv: "",
      repairs: "",
      wholesaleFee: "",
    });
  });
});
