// POST { address } → comps for that address; with { subject, location }
// (and the first run's `estimates`) too, re-runs them with corrected
// subject facts. `known` ({ lotSqft }) is what the user entered for the
// property, used over what the sites say. The steps live in
// api/_lib/comps/ (the "_" keeps Vercel from serving them as endpoints).

import { runComps } from "./_lib/comps/runComps.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const address = String(req.body?.address || "").trim();
  if (address.length < 8 || address.length > 200) {
    return res
      .status(400)
      .json({ error: "Enter the property's full address." });
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
