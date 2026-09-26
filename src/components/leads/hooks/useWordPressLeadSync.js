import { useEffect, useRef, useState } from "react";
import { leadIdentityKeys, stableWpLeadId } from "../leadUtils";
import { fetchWordPressLeads } from "../wordpressLeadsApi";

// Pulls website-form leads from WordPress (once automatically on load, and
// again on demand), shows them in the PPC list, and imports any the CRM
// doesn't have yet into Firestore.
export function useWordPressLeadSync({
  currentUser,
  leads,
  setLeads,
  saveLead,
}) {
  const [fetchedLeads, setFetchedLeads] = useState([]);
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const autoSyncStarted = useRef(false);

  async function sync({ silent = false } = {}) {
    if (!currentUser?.id || syncing) return;
    setSyncing(true);
    if (!silent) setStatus("Syncing WordPress leads...");

    try {
      const wpLeads = await fetchWordPressLeads();
      const existingKeys = new Set(leads.flatMap(leadIdentityKeys));
      const imported = [];
      const fetched = wpLeads.map((wpLead) => ({
        ...wpLead,
        id: stableWpLeadId(wpLead),
        userId: currentUser.id,
        ppcSource: true,
        source: wpLead.source || "Website",
      }));

      setFetchedLeads(fetched);

      for (const lead of fetched) {
        const keys = leadIdentityKeys(lead);
        if (keys.some((key) => existingKeys.has(key))) continue;

        await saveLead(lead);
        imported.push(lead);
        keys.forEach((key) => existingKeys.add(key));
      }

      if (imported.length) {
        setLeads((prev) => {
          const prevKeys = new Set(prev.flatMap(leadIdentityKeys));
          const freshImported = imported.filter(
            (lead) => !leadIdentityKeys(lead).some((key) => prevKeys.has(key)),
          );
          return [...freshImported, ...prev];
        });
      }

      const shown = `Showing ${fetched.length} WordPress lead${fetched.length !== 1 ? "s" : ""}.`;
      setStatus(
        imported.length
          ? `${shown} Imported ${imported.length}.`
          : `${shown} Local CRM is up to date.`,
      );
    } catch (err) {
      console.error("[WP sync] fetch failed", err);
      setStatus(err.message || "Failed to sync WordPress leads.");
      if (!silent) alert(err.message || "Failed to sync WordPress leads.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (!currentUser?.id || autoSyncStarted.current) return;
    autoSyncStarted.current = true;
    sync({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  return { fetchedLeads, setFetchedLeads, status, syncing, sync };
}
