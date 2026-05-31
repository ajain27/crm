import { describe, it, expect } from "vitest";
import {
  createEmptyLender,
  calcLenderMonthlyPayment,
  calcLenderTotal,
} from "./AdditionalLenders";

describe("createEmptyLender", () => {
  it("returns an object with id, amount, rate, term", () => {
    const lender = createEmptyLender();
    expect(lender).toMatchObject({ amount: "", rate: "", term: "" });
    expect(typeof lender.id).toBe("string");
    expect(lender.id.length).toBeGreaterThan(0);
  });

  it("generates a unique id each call", () => {
    expect(createEmptyLender().id).not.toBe(createEmptyLender().id);
  });
});

describe("calcLenderTotal", () => {
  it("returns 0 for empty array", () => {
    expect(calcLenderTotal([])).toBe(0);
  });

  it("sums amounts from formatted currency strings", () => {
    const lenders = [
      { id: "1", amount: "$25,000", rate: "10%", term: "5" },
      { id: "2", amount: "$10,500", rate: "8%", term: "3" },
    ];
    expect(calcLenderTotal(lenders)).toBe(35500);
  });

  it("treats blank amounts as 0", () => {
    expect(
      calcLenderTotal([{ id: "1", amount: "", rate: "10%", term: "5" }]),
    ).toBe(0);
  });
});

describe("calcLenderMonthlyPayment", () => {
  it("returns 0 for empty array", () => {
    expect(calcLenderMonthlyPayment([])).toBe(0);
  });

  it("falls back to interest-only when term is empty", () => {
    // $10,000 at 12%/yr interest-only = $100/mo
    const result = calcLenderMonthlyPayment([
      { id: "1", amount: "$10,000", rate: "12%", term: "" },
    ]);
    expect(result).toBeCloseTo(100, 2);
  });

  it("amortizes when term is provided", () => {
    // PMT for $10,000 at 12% over 5 yr = ~$222.44
    const result = calcLenderMonthlyPayment([
      { id: "1", amount: "$10,000", rate: "12%", term: "5" },
    ]);
    expect(result).toBeCloseTo(222.44, 1);
  });

  it("returns 0 when principal is 0", () => {
    expect(
      calcLenderMonthlyPayment([
        { id: "1", amount: "", rate: "10%", term: "5" },
      ]),
    ).toBe(0);
  });

  it("returns 0 when rate is 0 and no term (no interest, no schedule)", () => {
    expect(
      calcLenderMonthlyPayment([
        { id: "1", amount: "$10,000", rate: "", term: "" },
      ]),
    ).toBe(0);
  });

  it("uses straight-line when rate is 0 but term is set", () => {
    // $12,000 / (5 years × 12 months) = $200/mo
    const result = calcLenderMonthlyPayment([
      { id: "1", amount: "$12,000", rate: "0%", term: "5" },
    ]);
    expect(result).toBeCloseTo(200, 2);
  });

  it("sums payments across multiple lenders", () => {
    const result = calcLenderMonthlyPayment([
      { id: "1", amount: "$10,000", rate: "12%", term: "" }, // interest-only $100
      { id: "2", amount: "$10,000", rate: "12%", term: "" }, // interest-only $100
    ]);
    expect(result).toBeCloseTo(200, 2);
  });
});
