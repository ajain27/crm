// Runs comps for an address through /api/run-comps (Serper → Firecrawl,
// with OpenAI when available). Shared by the Deal Analyzer's Find Comps
// tab and the deal window's Run comps button.
export async function requestComps(address) {
  const res = await fetch("/api/run-comps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data) return data;
  if (data?.error) throw new Error(data.error);
  // No JSON error from the function means it never ran. Locally that's
  // the API server not being up (`npm start` serves only the web app).
  throw new Error(
    [502, 503, 504].includes(res.status)
      ? "The comps service isn't reachable. Running locally? Start the app with `npm run dev` so the API server runs too."
      : `Running comps failed (${res.status})`,
  );
}
