// What the web says about each candidate sale's condition, for Claude's
// review (step 4): one batched Serper search per candidate's address, its
// top results' snippets kept. Listing sites' snippets sometimes describe
// the sale ("fully renovated", "investor special", a foreclosure auction),
// which Redfin's sold data never does. Best-effort: on any failure the
// candidates go to the review without notes.

import { serperSearch } from "./subject.js";

const RESULTS_PER_SALE = 5;
const SNIPPET_CHARS = 280;

// [snippet text per candidate], "" for one with nothing found.
export async function fetchListingNotes(candidates, apiKey) {
  if (!apiKey || candidates.length === 0) return candidates.map(() => "");
  try {
    const results = await serperSearch(
      candidates.map((c) => c.address),
      apiKey,
    );
    return results.map((organic) =>
      (organic || [])
        .slice(0, RESULTS_PER_SALE)
        .map((r) => {
          let site = "";
          try {
            site = new URL(r.link).hostname.replace(/^www\./, "");
          } catch {
            // no link: keep the snippet alone
          }
          const text = String(r.snippet || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, SNIPPET_CHARS);
          return text ? `${site ? `[${site}] ` : ""}${text}` : "";
        })
        .filter(Boolean)
        .join("\n"),
    );
  } catch (err) {
    console.warn("run-comps: listing notes unavailable:", err.message);
    return candidates.map(() => "");
  }
}
