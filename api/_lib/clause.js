// Turns a clause typed in plain words into one written the way the rest of
// the You Win Estates Purchase and Sale Agreement is: a short heading and a
// formal paragraph using the agreement's defined terms. It keeps the
// user's meaning and adds nothing they didn't ask for.

import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = "claude-opus-5-5";
const CLAUDE_TIMEOUT_MS = 60_000;
export const MAX_CLAUSE_LENGTH = 2000;

const CLAUSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
  required: ["title", "body"],
  additionalProperties: false,
};

const CLAUSE_PROMPT = `You draft additional clauses for a real estate Purchase and Sale Agreement. The Buyer is "You Win Estates, and/or assigns" (an investor that may assign the contract); the other party is the "Seller". The agreement already defines: "Agreement", "Buyer", "Seller", "Property", "Purchase Price", "Earnest Money Deposit" (or "EMD"), "Effective Date", "Inspection Period", "Closing Date", and "Assignee/New Buyer".

The user gives you a term in their own words. Rewrite it as one professionally written contract clause:
- Keep exactly what the user means. Do not add conditions, obligations, deadlines, amounts, remedies or protections they did not state, and do not leave out anything they did.
- Use the defined terms above where they fit, in clear formal contract language ("shall", not "will"), in the third person.
- Write numbers as words followed by digits, e.g. "five (5) business days"; write money as "$5,000.00".
- Keep it to one paragraph of plain prose: no numbering, bullets, markdown or quotation of the user's words.

Return a short heading in capital letters (2–5 words, e.g. "SELLER MOVE-OUT", "PERSONAL PROPERTY") and the clause.`;

export async function draftClause(text, apiKey) {
  const client = new Anthropic({
    apiKey,
    timeout: CLAUDE_TIMEOUT_MS,
    maxRetries: 1,
  });
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    // If Claude's safety checks decline the request, Anthropic re-runs it
    // on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      // Guarantees the reply is JSON matching CLAUSE_SCHEMA.
      format: { type: "json_schema", schema: CLAUSE_SCHEMA },
    },
    system: CLAUSE_PROMPT,
    messages: [{ role: "user", content: text }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to write this clause.");
  }
  const reply = response.content.find((block) => block.type === "text")?.text;
  if (!reply || response.stop_reason === "max_tokens") {
    throw new Error("Claude returned no clause.");
  }
  const { title, body } = JSON.parse(reply);
  if (!String(body || "").trim()) throw new Error("Claude returned no clause.");
  return {
    title: String(title || "ADDITIONAL TERMS")
      .trim()
      .toUpperCase(),
    body: String(body).trim(),
  };
}
