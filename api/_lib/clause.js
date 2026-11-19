// Turns a term typed in plain words into an added section of the You Win
// Estates Purchase and Sale Agreement, drafted the way an attorney would:
// complete and workable (definitions, mechanics, what happens if the main
// route fails, releases and indemnities the term implies, survival), and
// fitted to the rest of the agreement, which is sent along so the section
// can name the sections it overrides by number.

import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = "claude-opus-5-5";
// Inside run-comps' 60-second limit; a seven-part section takes about 30
// seconds at low effort (medium took over 50).
const CLAUDE_TIMEOUT_MS = 55_000;
export const MAX_CLAUSE_LENGTH = 2000;
export const MAX_AGREEMENT_LENGTH = 60_000;

const CLAUSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subsections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          text: { type: "string" },
        },
        required: ["heading", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "subsections"],
  additionalProperties: false,
};

function clausePrompt(sectionNumber) {
  const section = sectionNumber ? `Section ${sectionNumber}` : "a new section";
  return `You are an experienced real estate attorney drafting an additional section of a Purchase and Sale Agreement on behalf of the Buyer, You Win Estates, a real estate investor that usually assigns its contracts to an end buyer. The full agreement is given below. The user describes, in their own words, a term they want added. Draft it as ${section} of the agreement, to be placed after the last existing section.

Draft a fully elaborated section with all the details a careful attorney would include, not a one-line summary of the term:
- Do exactly what the user asks. Never contradict, weaken or leave out any part of it.
- Make it complete and workable, covering each of these that applies: definitions of every new term (broad enough to catch related notices, fines, liens, proceedings and the like); who the obligations fall on, including the Assignee/New Buyer if the Agreement is assigned and Buyer if it isn't; disclosure and acknowledgment; how, when and at whose cost each step happens, with the documents each party shall sign and a time to sign them; what happens if the main mechanism isn't possible (for example, a court or agency that won't allow a substitution) and the fallback that achieves the same result; allocation of costs, fines, penalties and attorneys' fees; the releases, indemnities and defense obligations the user's intent calls for; and whether it survives closing or termination.
- Fit it to the agreement. Use its defined terms (Agreement, Buyer, Seller, Property, Purchase Price, Earnest Money Deposit, Effective Date, Inspection Period, Closing Date, Assignee/New Buyer and others it defines) rather than new ones for the same thing. Where the term conflicts with an existing section, say expressly which controls and refer to that section by its number (e.g. "Notwithstanding Section 8, ..."). Don't repeat what the agreement already provides.
- Don't add anything unrelated to the user's term, and don't change the price, deposit or deadlines unless the term requires it.
- Use formal contract language ("shall", third person). Write numbers as words followed by digits, e.g. "five (5) business days", and money as "$5,000.00".
- Plain prose only: no markdown, bullets, quotation marks around the user's words, or notes to the user.

Return:
- title: a short heading in capital letters (2–5 words), without the section number.
- subsections: when the section has more than one distinct part, split it into subsections in a logical order (definitions first, if any), each with a short heading in title case (e.g. "Definitions", "Transfer of Cases", "Release of Seller") and its text. They are lettered (a), (b), ... when printed, so don't letter or number them yourself; refer to them as "Section ${sectionNumber || "N"}(a)" and so on. For a simple term, return one subsection with an empty heading.`;
}

// `context` is { agreement, sectionNumber }: the agreement's text and the
// number the new section gets.
export async function draftClause(text, apiKey, context = {}) {
  const client = new Anthropic({
    apiKey,
    timeout: CLAUDE_TIMEOUT_MS,
    maxRetries: 0,
  });
  const agreement = String(context.agreement || "").trim();
  const sectionNumber = Number(context.sectionNumber) || null;
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    // If Claude's safety checks decline the request, Anthropic re-runs it
    // on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      // Guarantees the reply is JSON matching CLAUSE_SCHEMA.
      format: { type: "json_schema", schema: CLAUSE_SCHEMA },
    },
    system: clausePrompt(sectionNumber),
    messages: [
      {
        role: "user",
        content: [
          agreement && `<agreement>\n${agreement}\n</agreement>`,
          `<term>\n${text}\n</term>`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to write this clause.");
  }
  const reply = response.content.find((block) => block.type === "text")?.text;
  if (!reply || response.stop_reason === "max_tokens") {
    throw new Error("Claude returned no clause.");
  }
  const { title, subsections } = JSON.parse(reply);
  const parts = (subsections || [])
    .map((s) => ({
      heading: String(s.heading || "").trim(),
      text: String(s.text || "").trim(),
    }))
    .filter((s) => s.text);
  if (parts.length === 0) throw new Error("Claude returned no clause.");
  return {
    title: String(title || "ADDITIONAL TERMS")
      .trim()
      .toUpperCase(),
    subsections: parts,
  };
}
