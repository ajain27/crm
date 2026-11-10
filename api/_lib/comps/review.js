// Step 4 (optional): Claude reviews the top candidates, drops bad or
// irrelevant comps and picks the 5 closest, preferring sales that look
// renovated (ARV is the value after repair), and says each picked sale's
// condition. It never estimates value.

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

export const CONDITIONS = ["renovated", "as-is", "unknown"];

const SELECTED_LIST = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "reason", "condition"],
    properties: {
      id: { type: "string" },
      reason: { type: "string" },
      condition: { type: "string", enum: CONDITIONS },
    },
  },
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["selected", "removed"],
  properties: { selected: SELECTED_LIST, removed: ID_REASON_LIST },
};

const REVIEW_PROMPT = `You are helping a real estate wholesaler pick comps for a subject property.
The comp rules: sold within 0.5 miles in the last 90 days, same beds and baths, built within 5 years, size within 25%, lot size within 50%, same property type.
You get the subject and nearby sales ranked by how well they match. Each lists "misses": the rules it doesn't meet (empty = meets every rule).
Remove bad or irrelevant comps: price outliers versus the others, likely distressed or non-arm's-length sales, a clearly different kind of property, or duplicates.
The comps set the subject's ARV (after-repair value), so judge each sale's condition:
- "renovated": the listing notes say renovated, remodeled, updated, rehabbed, new roof/kitchen/baths/flooring, move-in ready; or it's a flip (bought cheaply or at auction, then resold soon after for much more); or its price per sq ft is well above the other sales' with nothing saying otherwise.
- "as-is": the notes say fixer, TLC, needs work, investor special, cash only, as-is, estate sale, foreclosure or auction; or its price per sq ft is well below the others'.
- "unknown": nothing points either way. Don't guess from age alone.
"listingNotes" are search results about that address; they can mix in an older sale or a neighbor's home, so only trust what clearly describes this sale.
Then select the 5 closest matches to the subject (fewer only if there aren't 5 reasonable ones). Prefer renovated sales, then unknown ones; pick as-is sales only when there aren't enough others. Among those, prefer sales that meet every rule, then those missing the fewest and smallest rules.
Do NOT estimate the subject's value. Only use ids from the list. Give a short reason for each selected and removed id; for a selected sale, say what its condition is based on.`;

// `listingNotes[i]` is what the web says about candidate i (see
// fetchListingNotes); each candidate's price per sq ft is sent too, as a
// condition signal.
export async function claudeReview(
  subject,
  candidates,
  apiKey,
  listingNotes = [],
) {
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
            lotSqft: m.lotSqft,
            yearBuilt: m.yearBuilt,
            propertyType: m.propertyType,
            pricePerSqft: m.sqft > 0 ? Math.round(m.price / m.sqft) : null,
            distanceMiles: m.distance,
            misses: m.misses.map(([, label]) => label),
            listingNotes: listingNotes[i] || "",
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
  return {
    selected: valid(review.selected).map((x) => ({
      ...x,
      condition: CONDITIONS.includes(x.condition) ? x.condition : "unknown",
    })),
    removed: valid(review.removed),
  };
}
