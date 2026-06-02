import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeDeal,
  getSavedDeals,
  getSavedBuyers,
  BUYERS_STORAGE_KEY,
  currency,
  monthKey,
  formatPhone,
  calculateMonthlyPayment,
  parseCurrency,
  parsePercent,
  fmt,
  fmtCurrencyInput,
  formatDate,
  findDuplicateByAddress,
  findDuplicateByField,
  trimFieldOnBlur,
} from "./utils";

beforeEach(() => {
  localStorage.clear();
});

describe("normalizeDeal", () => {
  it("preserves existing zipCode", () => {
    const result = normalizeDeal({ id: "1", zipCode: "78701" });
    expect(result.zipCode).toBe("78701");
  });

  it("falls back to county when zipCode is missing", () => {
    const result = normalizeDeal({ id: "1", county: "Travis" });
    expect(result.zipCode).toBe("Travis");
  });

  it("returns empty string when neither zipCode nor county exist", () => {
    expect(normalizeDeal({ id: "1" }).zipCode).toBe("");
  });
});

describe("getSavedDeals", () => {
  it("returns seedDeals when localStorage is empty", () => {
    const result = getSavedDeals();
    expect(result.length).toBe(1);
    expect(result[0].address).toBe("123 Main St");
  });

  it("returns saved deals when localStorage has data", () => {
    const deals = [{ id: "x", address: "Saved St", zipCode: "12345" }];
    localStorage.setItem("wholesale-real-estate-crm-v2", JSON.stringify(deals));
    const result = getSavedDeals();
    expect(result.length).toBe(1);
    expect(result[0].address).toBe("Saved St");
  });

  it("normalizes deals from localStorage (zipCode fallback)", () => {
    const deals = [{ id: "x", address: "S", county: "Bexar" }];
    localStorage.setItem("wholesale-real-estate-crm-v2", JSON.stringify(deals));
    expect(getSavedDeals()[0].zipCode).toBe("Bexar");
  });

  it("returns seedDeals on parse failure", () => {
    localStorage.setItem("wholesale-real-estate-crm-v2", "not-json");
    expect(getSavedDeals()[0].address).toBe("123 Main St");
  });
});

describe("getSavedBuyers", () => {
  it("returns [] when localStorage is empty", () => {
    expect(getSavedBuyers()).toEqual([]);
  });

  it("returns saved buyers when set", () => {
    const buyers = [{ id: "b1", name: "Test Buyer" }];
    localStorage.setItem(BUYERS_STORAGE_KEY, JSON.stringify(buyers));
    expect(getSavedBuyers()).toEqual(buyers);
  });

  it("returns [] on parse failure", () => {
    localStorage.setItem(BUYERS_STORAGE_KEY, "bad-json");
    expect(getSavedBuyers()).toEqual([]);
  });
});

describe("currency", () => {
  it("formats numbers as USD without decimals", () => {
    expect(currency(1500)).toBe("$1,500");
  });

  it("treats null/undefined as 0", () => {
    expect(currency(null)).toBe("$0");
    expect(currency(undefined)).toBe("$0");
  });

  it("handles negatives", () => {
    expect(currency(-200)).toMatch(/-\$200/);
  });
});

describe("monthKey", () => {
  it("returns YYYY-MM substring", () => {
    expect(monthKey("2026-04-12")).toBe("2026-04");
  });

  it("returns empty string for empty input", () => {
    expect(monthKey("")).toBe("");
    expect(monthKey(undefined)).toBe("");
  });
});

describe("formatPhone", () => {
  it("returns digits-only when length <= 3", () => {
    expect(formatPhone("12")).toBe("12");
  });

  it("formats as 555-123 when 4–6 digits", () => {
    expect(formatPhone("555123")).toBe("555-123");
  });

  it("formats as 555-867-5309 when 10 digits", () => {
    expect(formatPhone("5558675309")).toBe("555-867-5309");
  });

  it("strips non-digits before formatting", () => {
    expect(formatPhone("(555) 867-5309abc")).toBe("555-867-5309");
  });

  it("trims to 10 digits max", () => {
    expect(formatPhone("12345678901234")).toBe("123-456-7890");
  });
});

describe("calculateMonthlyPayment", () => {
  it("returns 0 when principal is 0 or negative", () => {
    expect(calculateMonthlyPayment(0, 0.06, 360)).toBe(0);
    expect(calculateMonthlyPayment(-100, 0.06, 360)).toBe(0);
  });

  it("returns 0 when payments is 0 or negative", () => {
    expect(calculateMonthlyPayment(100000, 0.06, 0)).toBe(0);
  });

  it("falls back to principal/payments when rate is 0", () => {
    expect(calculateMonthlyPayment(120000, 0, 360)).toBeCloseTo(333.33, 2);
  });

  it("computes amortized payment for typical mortgage", () => {
    // $200,000 at 6%/yr (0.06) for 30 yr = $1,199.10
    const payment = calculateMonthlyPayment(200000, 0.06, 360);
    expect(payment).toBeCloseTo(1199.1, 1);
  });
});

describe("parseCurrency", () => {
  it("strips $ and commas, returns number", () => {
    expect(parseCurrency("$1,500")).toBe(1500);
  });

  it("returns 0 for empty/null/undefined", () => {
    expect(parseCurrency("")).toBe(0);
    expect(parseCurrency(null)).toBe(0);
    expect(parseCurrency(undefined)).toBe(0);
  });

  it("preserves decimals", () => {
    expect(parseCurrency("$1,500.75")).toBe(1500.75);
  });

  it("returns 0 for non-numeric input", () => {
    expect(parseCurrency("abc")).toBe(0);
  });
});

describe("parsePercent", () => {
  it("strips % and returns float", () => {
    expect(parsePercent("7.5%")).toBe(7.5);
  });

  it("returns 0 for empty input", () => {
    expect(parsePercent("")).toBe(0);
    expect(parsePercent(undefined)).toBe(0);
  });

  it("returns 0 for non-numeric input", () => {
    expect(parsePercent("abc")).toBe(0);
  });
});

describe("fmt", () => {
  it("formats with 2 decimals by default", () => {
    expect(fmt(1500)).toBe("$1,500.00");
  });

  it("formats decimals correctly", () => {
    expect(fmt(1500.75)).toBe("$1,500.75");
  });
});

describe("fmtCurrencyInput", () => {
  it("formats numeric string as $1,500", () => {
    expect(fmtCurrencyInput("1500")).toBe("$1,500");
  });

  it("strips non-digits before formatting", () => {
    expect(fmtCurrencyInput("$1,abc500")).toBe("$1,500");
  });

  it("returns empty string for empty input", () => {
    expect(fmtCurrencyInput("")).toBe("");
    expect(fmtCurrencyInput(undefined)).toBe("");
  });
});

describe("formatDate", () => {
  it("converts YYYY-MM-DD to MM/DD/YYYY", () => {
    expect(formatDate("2026-04-12")).toBe("04/12/2026");
  });

  it("returns em-dash for empty input", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("findDuplicateByField", () => {
  const items = [
    { id: "1", address: "123 Main St" },
    { id: "2", address: "456 Oak Ave" },
  ];

  it("finds a duplicate by normalized (case-insensitive, trimmed) value", () => {
    expect(findDuplicateByField(items, "address", "  123 main st  ")).toEqual(
      items[0],
    );
  });

  it("returns null when no match", () => {
    expect(findDuplicateByField(items, "address", "789 Pine")).toBeNull();
  });

  it("returns null when value is empty", () => {
    expect(findDuplicateByField(items, "address", "")).toBeNull();
  });

  it("excludes the record being edited", () => {
    expect(
      findDuplicateByField(items, "address", "123 Main St", "1"),
    ).toBeNull();
  });
});

describe("findDuplicateByAddress", () => {
  it("delegates to findDuplicateByField with 'address'", () => {
    const items = [{ id: "1", address: "X St" }];
    expect(findDuplicateByAddress(items, "x st")).toEqual(items[0]);
  });
});

describe("trimFieldOnBlur", () => {
  it("reports the trimmed value through onChange for text inputs", () => {
    const onChange = vi.fn();
    trimFieldOnBlur(onChange)({
      target: { type: "text", name: "fullName", value: "  John Smith  " },
    });
    expect(onChange).toHaveBeenCalledWith({
      target: { name: "fullName", value: "John Smith" },
    });
  });

  it("trims email inputs too", () => {
    const onChange = vi.fn();
    trimFieldOnBlur(onChange)({
      target: { type: "email", name: "email", value: "a@b.com " },
    });
    expect(onChange).toHaveBeenCalledWith({
      target: { name: "email", value: "a@b.com" },
    });
  });

  it("does not call onChange when nothing needs trimming", () => {
    const onChange = vi.fn();
    trimFieldOnBlur(onChange)({
      target: { type: "text", name: "fullName", value: "John" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores non-text input types like number and date", () => {
    const onChange = vi.fn();
    trimFieldOnBlur(onChange)({
      target: { type: "number", name: "arv", value: "100 " },
    });
    trimFieldOnBlur(onChange)({
      target: { type: "date", name: "lendDate", value: "2026-01-01" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is a no-op when no onChange handler is provided", () => {
    expect(() =>
      trimFieldOnBlur(undefined)({
        target: { type: "text", name: "x", value: " y " },
      }),
    ).not.toThrow();
  });
});
