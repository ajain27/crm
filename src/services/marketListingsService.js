// Loads homes for sale through /api/market-listings: one keyword's Zillow
// search in a city (`keyword`), or Redfin's homes for sale there
// (`redfin: true`); and one home's full details from its Zillow page. Used
// by On Market Deals.
async function post(body) {
  const res = await fetch("/api/market-listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data) return data;
  if (data?.error) {
    const error = new Error(data.error);
    // Too many Zillow searches for the scraper's plan; retry after this.
    if (data.retryAfter) error.retryAfter = data.retryAfter;
    throw error;
  }
  // No JSON error from the function means it never ran. Locally that's the
  // API server not being up, or one started before this endpoint existed.
  if (res.status === 404) {
    throw new Error(
      "The listings service wasn't found. Running locally? Restart `npm run dev` so the API server picks it up.",
    );
  }
  throw new Error(
    [502, 503, 504].includes(res.status)
      ? "The listings service isn't reachable. Running locally? Start the app with `npm run dev` so the API server runs too."
      : `Loading listings failed (${res.status})`,
  );
}

export async function requestMarketListings({ city, state, keyword, redfin }) {
  const data = await post(
    redfin ? { city, state, redfin } : { city, state, keyword },
  );
  return data.listings || [];
}

// A home's description, photos and the agent, broker or owner contacts.
export async function requestListingDetails(zillowUrl) {
  const data = await post({ detailsUrl: zillowUrl });
  return data.details;
}
