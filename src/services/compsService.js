// Runs comps for an address through /api/run-comps (Serper → Firecrawl →
// OpenAI). Shared by the Deal Analyzer's Find Comps tab and the deal
// window's Run comps button.
export async function requestComps(address) {
  const res = await fetch("/api/run-comps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.error || `Running comps failed (${res.status})`);
  return data;
}
