// POST { city, state, keyword } → Zillow homes for sale in the city whose
// description has the keyword; { city, state, redfin: true } → Redfin's
// homes for sale there; { detailsUrl } → one home's full details from its
// Zillow page (description, photos, agent and broker contacts). The page
// combines them. The steps live in api/_lib/marketListings.js.

import { fetchMarketListings } from "./_lib/marketListings.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const city = String(req.body?.city || "").trim();
  const state = String(req.body?.state || "").trim();
  const keyword = String(req.body?.keyword || "").trim();
  const redfin = req.body?.redfin === true;
  const detailsUrl = String(req.body?.detailsUrl || "").trim();
  if (detailsUrl) {
    try {
      return res.status(200).json(await fetchMarketListings({ detailsUrl }));
    } catch (err) {
      console.error("market-listings details error:", err);
      return res.status(err.status || 502).json({
        error: err.message || "Loading the home's details failed.",
        ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}),
      });
    }
  }
  if (!city || !/^[A-Za-z]{2}$/.test(state) || (!redfin && !keyword)) {
    return res
      .status(400)
      .json({ error: "Choose a city, and a keyword to search for." });
  }

  try {
    return res
      .status(200)
      .json(await fetchMarketListings({ city, state, keyword, redfin }));
  } catch (err) {
    console.error("market-listings error:", err);
    return res.status(err.status || 502).json({
      error: err.message || "Loading listings failed.",
      ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}),
    });
  }
}
