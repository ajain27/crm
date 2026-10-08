import { describe, it, expect, vi, afterEach } from "vitest";
import { requestComps } from "./compsService";

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

describe("requestComps", () => {
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
