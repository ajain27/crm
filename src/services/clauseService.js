// Has a term typed in plain words drafted as a section of the offer,
// through /api/run-comps (see api/_lib/clause.js). `context` is
// { agreement, sectionNumber } (see offerAgreementText). Resolves to
// { title, subsections: [{ heading, text }] }.
export async function requestClauseDraft(text, context = {}) {
  const res = await fetch("/api/run-comps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftClause: text, ...context }),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data?.subsections?.length) return data;
  if (data?.error) throw new Error(data.error);
  throw new Error(
    [502, 503, 504].includes(res.status)
      ? "The clause service isn't reachable. Running locally? Start the app with `npm run dev` so the API server runs too."
      : `Writing the clause failed (${res.status})`,
  );
}
