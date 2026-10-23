// POST { address } → the property's sale, listing and tax history from
// its Zillow, Redfin and Realtor.com pages. The steps live in
// api/_lib/propertyHistory.js.

import { fetchPropertyHistory } from "./_lib/propertyHistory.js";

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
    return res.status(200).json(await fetchPropertyHistory(address));
  } catch (err) {
    console.error("property-history error:", err);
    return res.status(err.status || 502).json({
      error: err.message || "Loading the property history failed.",
    });
  }
}
