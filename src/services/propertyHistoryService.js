// Loads a property's sale, listing and tax history through
// /api/property-history (Serper → Firecrawl on its Zillow, Redfin and
// Realtor.com pages). Used by the Deal Analyzer's Property History tab.
export async function requestPropertyHistory(address) {
  const res = await fetch("/api/property-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data) return data;
  if (data?.error) throw new Error(data.error);
  // No JSON error from the function means it never ran. Locally that's
  // the API server not being up (`npm start` serves only the web app), or
  // one started before this endpoint existed (404).
  if ([502, 503, 504].includes(res.status)) {
    throw new Error(
      "The property history service isn't reachable. Running locally? Start the app with `npm run dev` so the API server runs too.",
    );
  }
  throw new Error(
    res.status === 404
      ? "The property history service wasn't found. Running locally? Restart `npm run dev` so the API server picks it up."
      : `Loading the property history failed (${res.status})`,
  );
}
