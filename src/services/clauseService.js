// Has a clause typed in plain words written as contract language for the
// offer, through /api/run-comps (see api/_lib/clause.js). Resolves to
// { title, body }.
export async function requestClauseDraft(text) {
  const res = await fetch("/api/run-comps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftClause: text }),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data?.body) return data;
  if (data?.error) throw new Error(data.error);
  throw new Error(
    [502, 503, 504].includes(res.status)
      ? "The clause service isn't reachable. Running locally? Start the app with `npm run dev` so the API server runs too."
      : `Writing the clause failed (${res.status})`,
  );
}
