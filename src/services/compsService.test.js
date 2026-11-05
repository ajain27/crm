import { describe, it, expect, vi, afterEach } from "vitest";
import { lotSqftFromText, requestComps } from "./compsService";

const respond = (status, body) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => {
        if (body === undefined) throw new Error("not json");
        return body;
      },
    }),
  );

describe("lotSqftFromText", () => {
  it("reads sq ft or acres", () => {
    expect(lotSqftFromText("6,500")).toBe(6500);
    expect(lotSqftFromText("6500 sq ft")).toBe(6500);
    expect(lotSqftFromText("0.25 ac")).toBe(10890);
    expect(lotSqftFromText("1.5 acres")).toBe(65340);
    expect(lotSqftFromText("0.25")).toBe(10890);
    expect(lotSqftFromText("")).toBeNull();
    expect(lotSqftFromText(undefined)).toBeNull();
  });
});

describe("requestComps", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the lot size the user entered", async () => {
    respond(200, {});
    await requestComps("1 Main St", null, { lotSqft: 7405 });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      address: "1 Main St",
      known: { lotSqft: 7405 },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("returns the comps result", async () => {
    respond(200, { arvEstimate: 160000 });
    await expect(requestComps("1 Main St")).resolves.toEqual({
      arvEstimate: 160000,
    });
  });

  it("shows the function's own error message", async () => {
    respond(404, { error: "Couldn't read this property" });
    await expect(requestComps("1 Main St")).rejects.toThrow(
      "Couldn't read this property",
    );
  });

  it("explains when the API server isn't reachable", async () => {
    respond(502);
    await expect(requestComps("1 Main St")).rejects.toThrow(/npm run dev/);
  });
});
