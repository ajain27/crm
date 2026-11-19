// POST { address } → comps for that address; { address, redfinLink: true }
// → just the property's Redfin page ({ url }, null when there's none),
// for the Redfin link (kept in this endpoint: Vercel's plan allows only
// 12 functions); with { subject, location }
// (and the first run's `estimates`) too, re-runs them with corrected
// subject facts. `known` ({ lotSqft }) is what the user entered for the
// property, used over what the sites say. The steps live in
// api/_lib/comps/ (the "_" keeps Vercel from serving them as endpoints).

import { runComps } from "./_lib/comps/runComps.js";
import { findRedfinUrl } from "./_lib/comps/subject.js";
import { draftClause, MAX_CLAUSE_LENGTH } from "./_lib/clause.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // { draftClause: "text" } → { title, body }: a clause for the offer typed
  // in plain words, written as contract language (kept in this endpoint
  // for the same 12-function limit).
  if (req.body?.draftClause !== undefined) {
    const text = String(req.body.draftClause || "").trim();
    if (!text || text.length > MAX_CLAUSE_LENGTH) {
      return res.status(400).json({
        error: `Type the clause (up to ${MAX_CLAUSE_LENGTH} characters).`,
      });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY." });
    }
    try {
      return res
        .status(200)
        .json(await draftClause(text, process.env.ANTHROPIC_API_KEY));
    } catch (err) {
      console.error("run-comps draft clause error:", err);
      return res
        .status(502)
        .json({ error: err.message || "Writing the clause failed." });
    }
  }

  const address = String(req.body?.address || "").trim();
  if (address.length < 8 || address.length > 200) {
    return res
      .status(400)
      .json({ error: "Enter the property's full address." });
  }

  if (req.body?.redfinLink) {
    if (!process.env.SERPER_API_KEY) {
      return res.status(500).json({ error: "Missing SERPER_API_KEY." });
    }
    try {
      const url = await findRedfinUrl(address, process.env.SERPER_API_KEY);
      return res.status(200).json({ url });
    } catch (err) {
      console.error("run-comps redfin link error:", err);
      return res.status(502).json({ error: err.message });
    }
  }

  try {
    const { subject, location, estimates, known } = req.body || {};
    const adjust =
      subject && location ? { subject, location, estimates } : null;
    return res
      .status(200)
      .json(await runComps(address, process.env, Date.now(), adjust, known));
  } catch (err) {
    console.error("run-comps error:", err);
    return res.status(err.status || 502).json({
      error: err.message || "Running comps failed.",
    });
  }
}
