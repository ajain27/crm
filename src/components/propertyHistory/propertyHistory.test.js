import { describe, it, expect } from "vitest";
import { leadHistory } from "./propertyHistory";

describe("leadHistory", () => {
  const older = { fetchedAt: "2026-01-01T00:00:00.000Z", timeline: [] };
  const newer = { fetchedAt: "2026-10-01T00:00:00.000Z", timeline: [] };

  it("uses the newer of a loaded history and a comps run's", () => {
    expect(
      leadHistory({ propertyHistory: older, compsResult: { history: newer } }),
    ).toBe(newer);
    expect(
      leadHistory({ propertyHistory: newer, compsResult: { history: older } }),
    ).toBe(newer);
  });

  it("uses whichever one there is, or null", () => {
    expect(leadHistory({ compsResult: { history: older } })).toBe(older);
    expect(leadHistory({ propertyHistory: older })).toBe(older);
    expect(leadHistory({ compsResult: {} })).toBeNull();
  });
});
