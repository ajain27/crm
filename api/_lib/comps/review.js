// Step 4 (optional): Claude reviews the top candidates, drops bad or
// irrelevant comps and picks the 5 closest. It never estimates value.

import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = "claude-opus-5-5";
// Claude's review must finish inside the function's 60s limit
// (vercel.json); on timeout the ranking's top 5 are used.
const CLAUDE_TIMEOUT_MS = 25000;

const ID_REASON_LIST = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "reason"],
    properties: { id: { type: "string" }, reason: { type: "string" } },
  },
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["selected", "removed"],
  properties: { selected: ID_REASON_LIST, removed: ID_REASON_LIST },
};

const REVIEW_PROMPT = `You are helping a real estate wholesaler pick comps for a subject property.
The comp rules: sold within 0.5 miles in the last 90 days, same beds and baths, built within 5 years, same property type.
You get the subject and nearby sales ranked by how well they match. Each lists "misses": the rules it doesn't meet (empty = meets every rule).
Remove bad or irrelevant comps: price outliers versus the others, likely distressed or non-arm's-length sales, a clearly different kind of property, or duplicates.
Then select the 5 closest matches to the subject (fewer only if there aren't 5 reasonable ones). Prefer sales that meet every rule, then those missing the fewest and smallest rules.
Do NOT estimate the subject's value. Only use ids from the list. Give a short reason for each selected and removed id.`;

export async function claudeReview(subject, candidates, apiKey) {
  const client = new Anthropic({
    apiKey,
    timeout: CLAUDE_TIMEOUT_MS,
    maxRetries: 1,
  });
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // If Claude's safety checks decline the request, Anthropic re-runs it
    // on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      // Guarantees the reply is JSON matching REVIEW_SCHEMA.
      format: { type: "json_schema", schema: REVIEW_SCHEMA },
    },
    system: REVIEW_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          subject,
          candidates: candidates.map((m, i) => ({
            id: String(i),
            address: m.address,
            soldDate: m.soldDate,
            price: m.price,
            beds: m.beds,
            baths: m.baths,
            sqft: m.sqft,
            yearBuilt: m.yearBuilt,
            propertyType: m.propertyType,
            distanceMiles: m.distance,
            misses: m.misses.map(([, label]) => label),
          })),
        }),
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to review these comps.");
  }
  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text || response.stop_reason === "max_tokens") {
    throw new Error("Claude returned no result.");
  }
  const review = JSON.parse(text);
  // Keep only ids that exist; Claude can't add homes.
  const valid = (list) =>
    (list || []).filter((x) => /^\d+$/.test(x.id) && candidates[Number(x.id)]);
  return { selected: valid(review.selected), removed: valid(review.removed) };
}
