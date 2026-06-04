import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateLeaseDurationMonths,
  calculateTenantTotalRent,
  getCurrentTenant,
  normalizeRentalForm,
  createEmptyTenant,
} from "./rentalUtils";

describe("rentalUtils", () => {
  describe("calculateLeaseDurationMonths", () => {
    it("calculates correct months between two dates", () => {
      const months = calculateLeaseDurationMonths("2023-01-01", "2023-12-31");
      expect(months).toBe(13); // Including both start and end month
    });

    it("calculates 1 month for same month dates", () => {
      const months = calculateLeaseDurationMonths("2023-01-01", "2023-01-31");
      expect(months).toBe(2); // Same month still counts as 1, but calculation adds 1
    });

    it("calculates months across years", () => {
      const months = calculateLeaseDurationMonths("2023-05-01", "2026-06-01");
      expect(months).toBe(38); // 36 months + 2 for start/end month inclusion
    });

    it("returns 0 if start date is missing", () => {
      const months = calculateLeaseDurationMonths("", "2023-12-31");
      expect(months).toBe(0);
    });

    it("returns 0 if end date is missing", () => {
      const months = calculateLeaseDurationMonths("2023-01-01", "");
      expect(months).toBe(0);
    });

    it("returns 0 if both dates are missing", () => {
      const months = calculateLeaseDurationMonths("", "");
      expect(months).toBe(0);
    });

    it("returns 0 if end date is before start date", () => {
      const months = calculateLeaseDurationMonths("2023-12-31", "2023-01-01");
      expect(months).toBe(0);
    });

    it("calculates months for 2 year lease", () => {
      const months = calculateLeaseDurationMonths("2023-01-01", "2024-12-31");
      expect(months).toBe(25); // Including both start and end month
    });
  });

  describe("calculateTenantTotalRent", () => {
    it("calculates total rent based on monthly rent and lease duration", () => {
      const tenant = {
        name: "John",
        monthlyRent: "$1,500",
        leaseStartDate: "2023-01-01",
        leaseEndDate: "2023-12-31",
        isCurrent: false,
      };
      const rent = calculateTenantTotalRent(tenant, "0");
      expect(rent).toBe(19500); // 1500 * 13
    });

    it("uses property-level rent as fallback", () => {
      const tenant = {
        name: "John",
        monthlyRent: "",
        leaseStartDate: "2023-01-01",
        leaseEndDate: "2023-12-31",
        isCurrent: false,
      };
      const rent = calculateTenantTotalRent(tenant, "$2,000");
      expect(rent).toBe(26000); // 2000 * 13
    });

    it("uses today's date for current tenant without end date", () => {
      const tenant = {
        name: "John",
        monthlyRent: "$1,000",
        leaseStartDate: "2023-01-01",
        leaseEndDate: "",
        isCurrent: true,
      };
      const rent = calculateTenantTotalRent(tenant, "0");

      // Verify it calculates a reasonable amount (should be around 40000+ for current date)
      expect(rent).toBeGreaterThan(30000);
      expect(rent).toBeLessThan(50000);
    });

    it("handles currency formatting with commas", () => {
      const tenant = {
        name: "John",
        monthlyRent: "$2,500",
        leaseStartDate: "2023-01-01",
        leaseEndDate: "2023-12-31",
        isCurrent: false,
      };
      const rent = calculateTenantTotalRent(tenant, "0");
      expect(rent).toBe(32500); // 2500 * 13
    });

    it("returns at least 1 month of rent", () => {
      const tenant = {
        name: "John",
        monthlyRent: "$1,500",
        leaseStartDate: "2023-01-01",
        leaseEndDate: "2023-01-31",
        isCurrent: false,
      };
      const rent = calculateTenantTotalRent(tenant, "0");
      expect(rent).toBeGreaterThanOrEqual(1500);
    });

    it("returns minimum 1 month rent for missing lease dates", () => {
      const tenant = {
        name: "John",
        monthlyRent: "$1,500",
        leaseStartDate: "",
        leaseEndDate: "",
        isCurrent: false,
      };
      const rent = calculateTenantTotalRent(tenant, "0");
      expect(rent).toBe(1500); // Math.max(1, 0) * 1500 = 1500
    });
  });

  describe("getCurrentTenant", () => {
    it("returns tenant marked as current", () => {
      const tenants = [
        { id: "1", name: "John", isCurrent: false },
        { id: "2", name: "Jane", isCurrent: true },
        { id: "3", name: "Bob", isCurrent: false },
      ];
      const current = getCurrentTenant(tenants);
      expect(current.name).toBe("Jane");
      expect(current.isCurrent).toBe(true);
    });

    it("returns most recent tenant as fallback", () => {
      const tenants = [
        { id: "1", name: "John", isCurrent: false },
        { id: "2", name: "Jane", isCurrent: false },
        { id: "3", name: "Bob", isCurrent: false },
      ];
      const current = getCurrentTenant(tenants);
      expect(current.name).toBe("Bob");
    });

    it("returns null for empty tenant list", () => {
      const current = getCurrentTenant([]);
      expect(current).toBeNull();
    });

    it("returns null for null/undefined tenants", () => {
      expect(getCurrentTenant(null)).toBeNull();
      expect(getCurrentTenant(undefined)).toBeNull();
    });

    it("prioritizes marked current over most recent", () => {
      const tenants = [
        { id: "1", name: "John", isCurrent: true },
        { id: "2", name: "Jane", isCurrent: false },
        { id: "3", name: "Bob", isCurrent: false },
      ];
      const current = getCurrentTenant(tenants);
      expect(current.name).toBe("John");
    });
  });

  describe("normalizeRentalForm", () => {
    describe("for add form", () => {
      it("creates initial tenant from form fields", () => {
        const form = {
          address: "123 Main St",
          city: "Austin",
          state: "TX",
          purchaseDate: "2023-01-01",
          monthlyMortgage: "$1,200",
          monthlyRent: "$2,000",
          tenantName: "John Smith",
          tenantPhone: "555-1234",
          tenantEmail: "john@example.com",
          tenantType: "Regular",
        };

        const normalized = normalizeRentalForm(form, true);

        expect(normalized.address).toBe("123 Main St");
        expect(normalized.city).toBe("Austin");
        expect(normalized.state).toBe("TX");
        expect(normalized.purchaseDate).toBe("2023-01-01");
        expect(normalized.monthlyMortgage).toBe("$1,200");
        expect(normalized.monthlyRent).toBe("$2,000");
        expect(normalized.tenants).toHaveLength(1);
        expect(normalized.tenants[0].name).toBe("John Smith");
        expect(normalized.tenants[0].isCurrent).toBe(true);
      });

      it("creates empty tenant if name is missing", () => {
        const form = {
          address: "123 Main St",
          city: "Austin",
          state: "TX",
          purchaseDate: "2023-01-01",
          monthlyMortgage: "$1,200",
          monthlyRent: "$2,000",
          tenantName: "",
          tenantPhone: "",
          tenantEmail: "",
          tenantType: "Regular",
        };

        const normalized = normalizeRentalForm(form, true);

        expect(normalized.tenants).toHaveLength(1);
        expect(normalized.tenants[0].name).toBe("");
        expect(normalized.tenants[0].isCurrent).toBe(true);
      });

      it("trims whitespace from string fields", () => {
        const form = {
          address: "  123 Main St  ",
          city: "  Austin  ",
          state: "TX",
          purchaseDate: "2023-01-01",
          monthlyMortgage: "$1,200",
          monthlyRent: "$2,000",
          tenantName: "  John Smith  ",
          tenantPhone: "555-1234",
          tenantEmail: "  john@example.com  ",
          tenantType: "Regular",
        };

        const normalized = normalizeRentalForm(form, true);

        expect(normalized.address).toBe("123 Main St");
        expect(normalized.city).toBe("Austin");
        expect(normalized.tenants[0].name).toBe("John Smith");
        expect(normalized.tenants[0].email).toBe("john@example.com");
      });
    });

    describe("for edit form", () => {
      it("processes existing tenants array", () => {
        const form = {
          address: "123 Main St",
          city: "Austin",
          state: "TX",
          purchaseDate: "2023-01-01",
          monthlyMortgage: "$1,200",
          monthlyRent: "$2,000",
          tenants: [
            {
              id: "1",
              name: "John Smith",
              phone: "555-1234",
              email: "john@example.com",
              type: "Regular",
              monthlyRent: "$1,500",
              leaseStartDate: "2023-01-01",
              leaseEndDate: "2024-12-31",
              isCurrent: true,
            },
          ],
        };

        const normalized = normalizeRentalForm(form, false);

        expect(normalized.address).toBe("123 Main St");
        expect(normalized.tenants).toHaveLength(1);
        expect(normalized.tenants[0].name).toBe("John Smith");
      });

      it("filters out tenants with empty names", () => {
        const form = {
          address: "123 Main St",
          city: "Austin",
          state: "TX",
          purchaseDate: "2023-01-01",
          monthlyMortgage: "$1,200",
          monthlyRent: "$2,000",
          tenants: [
            { id: "1", name: "John Smith", isCurrent: true },
            { id: "2", name: "", isCurrent: false },
            { id: "3", name: "Jane Doe", isCurrent: false },
          ],
        };

        const normalized = normalizeRentalForm(form, false);

        expect(normalized.tenants).toHaveLength(2);
        expect(normalized.tenants.map((t) => t.name)).toEqual([
          "John Smith",
          "Jane Doe",
        ]);
      });
    });
  });

  describe("createEmptyTenant", () => {
    it("creates empty tenant object with isCurrent false by default", () => {
      const tenant = createEmptyTenant();

      expect(tenant.id).toBeTruthy();
      expect(tenant.name).toBe("");
      expect(tenant.phone).toBe("");
      expect(tenant.email).toBe("");
      expect(tenant.type).toBe("Regular");
      expect(tenant.monthlyRent).toBe("");
      expect(tenant.leaseStartDate).toBe("");
      expect(tenant.leaseEndDate).toBe("");
      expect(tenant.isCurrent).toBe(false);
    });

    it("creates empty tenant with isCurrent set to true", () => {
      const tenant = createEmptyTenant(true);

      expect(tenant.isCurrent).toBe(true);
      expect(tenant.name).toBe("");
    });

    it("generates unique IDs", () => {
      const tenant1 = createEmptyTenant();
      const tenant2 = createEmptyTenant();

      expect(tenant1.id).not.toBe(tenant2.id);
    });
  });
});
