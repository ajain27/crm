// Runs comps for an address through /api/run-comps (Serper → Firecrawl,
// with Claude when available). Shared by the Deal Analyzer's Find Comps
// tab and the deal window's Run comps button.
//
// `adjust` ({ subject, location }) re-runs the comp rules with corrected
// subject facts at a known location — no searching or scraping. `known`
// ({ lotSqft }) is what the user entered for the property, used over what
// the sites say.
// A lot size as typed — "6,500", "6500 sq ft", "0.25 ac", "1.5 acres" —
// in sq ft, or null. A bare number under 100 is taken as acres (no lot is
// that small in sq ft).
export function lotSqftFromText(text) {
  const raw = String(text ?? "").toLowerCase();
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!raw.trim() || !Number.isFinite(n) || n <= 0) return null;
  const acres = /\bac/.test(raw) || (!/sq|ft|sf/.test(raw) && n < 100);
  return Math.round(acres ? n * 43560 : n);
}

// The property's own Redfin page, found by the comps service's search;
// null when there's none (or the search failed). Remembered per address.
const redfinPages = new Map();
export async function requestRedfinUrl(address) {
  if (!redfinPages.has(address)) {
    redfinPages.set(
      address,
      fetch("/api/run-comps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, redfinLink: true }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data?.url || null)
        .catch(() => null),
    );
  }
  const url = await redfinPages.get(address);
  if (!url) redfinPages.delete(address);
  return url;
}

export async function requestComps(address, adjust = null, known = null) {
  const res = await fetch("/api/run-comps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, ...adjust, ...(known ? { known } : {}) }),
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
