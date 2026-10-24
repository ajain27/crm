// A property's history ({ timeline, sales, taxes }) as comps and
// /api/property-history return it, and as leads keep it.

// The parts of a history worth keeping on a lead or in the Find Comps
// cache; null when there's no history.
export function historyToSave(history, fetchedAt = new Date()) {
  if (!history) return null;
  return {
    fetchedAt: fetchedAt.toISOString(),
    timeline: (history.timeline || []).map((e) => ({
      date: e.date,
      kind: e.kind,
      event: e.event,
      price: e.price ?? null,
      sources: e.sources || [],
    })),
    sales: history.sales || [],
    taxes: history.taxes || [],
  };
}

// A lead's history: the newer of the one loaded on its own
// (`propertyHistory`) and the one its last comps run read.
export function leadHistory(lead) {
  const loaded = lead?.propertyHistory;
  const fromComps = lead?.compsResult?.history;
  if (!loaded || !fromComps) return loaded || fromComps || null;
  return (fromComps.fetchedAt || "") > (loaded.fetchedAt || "")
    ? fromComps
    : loaded;
}
