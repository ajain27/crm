// Tests for the offer clause mode of api/run-comps.js ({ draftClause }).
// Claude is mocked at the Anthropic SDK.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const claudeCreate = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function () {
    this.beta = { messages: { create: claudeCreate } };
  }),
}));

import handler from "../../api/run-comps.js";

function call(body) {
  const res = {
    statusCode: 0,
    body: null,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
  return handler({ method: "POST", body }, res).then(() => res);
}

describe("run-comps: draft an offer clause", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    claudeCreate.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns Claude's heading and clause for the words typed", async () => {
    claudeCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            title: "Hoa Transfer Fee",
            subsections: [
              {
                heading: " Payment ",
                text: " Buyer shall pay the HOA transfer fee at closing. ",
              },
              { heading: "Empty", text: "  " },
            ],
          }),
        },
      ],
    });
    const res = await call({
      draftClause: "  buyer pays HOA transfer fee ",
      agreement: "8. LIENS, TAXES & ENCUMBRANCES\nSeller shall convey title...",
      sectionNumber: 11,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      title: "HOA TRANSFER FEE",
      subsections: [
        {
          heading: "Payment",
          text: "Buyer shall pay the HOA transfer fee at closing.",
        },
      ],
    });
    // Claude reads the agreement, and drafts it as the section it'll be.
    const request = claudeCreate.mock.calls[0][0];
    expect(request.messages).toEqual([
      {
        role: "user",
        content:
          "<agreement>\n8. LIENS, TAXES & ENCUMBRANCES\nSeller shall convey title...\n</agreement>\n\n<term>\nbuyer pays HOA transfer fee\n</term>",
      },
    ]);
    expect(request.system).toContain("Draft it as Section 11");
    expect(request.system).toContain('"Notwithstanding Section 8, ..."');
  });

  it("asks for the clause when none is typed, without calling Claude", async () => {
    const res = await call({ draftClause: "   " });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Type the clause/);
    expect(claudeCreate).not.toHaveBeenCalled();
  });

  it("reports a refusal as an error", async () => {
    claudeCreate.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const res = await call({ draftClause: "something" });
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe("Claude declined to write this clause.");
  });
});
