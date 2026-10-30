import { describe, it, expect } from "vitest";
import { pathForRoute, routeFromPath } from "./viewRoute";

describe("routeFromPath", () => {
  it("reads the page and Leads tab from the path", () => {
    expect(routeFromPath("/")).toEqual({ view: "dashboard", leadsTab: null });
    expect(routeFromPath("/buyers")).toEqual({
      view: "buyers",
      leadsTab: null,
    });
    expect(routeFromPath("/leads/ppl")).toEqual({
      view: "leads",
      leadsTab: "ppl",
    });
    expect(routeFromPath("/leads/")).toEqual({ view: "leads", leadsTab: null });
  });

  it("treats unknown pages as the dashboard and unknown tabs as none", () => {
    expect(routeFromPath("/nope")).toEqual({
      view: "dashboard",
      leadsTab: null,
    });
    expect(routeFromPath("/leads/nope")).toEqual({
      view: "leads",
      leadsTab: null,
    });
    expect(routeFromPath("/buyers/ppl")).toEqual({
      view: "buyers",
      leadsTab: null,
    });
  });
});

describe("pathForRoute", () => {
  it("builds the path for a page and Leads tab", () => {
    expect(pathForRoute("dashboard", null)).toBe("/");
    expect(pathForRoute("rental-management", null)).toBe("/rental-management");
    expect(pathForRoute("leads", "coldcall")).toBe("/leads/coldcall");
    expect(pathForRoute("leads", null)).toBe("/leads");
  });

  it("round-trips through routeFromPath", () => {
    const route = routeFromPath(pathForRoute("leads", "county"));
    expect(route).toEqual({ view: "leads", leadsTab: "county" });
  });
});
