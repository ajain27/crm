import { useEffect, useState } from "react";
import { withCompsNote } from "../../crm/components/data/comps/compsNote";
import { compsResultToSave, leadComps } from "./leadComps";

// State for a lead window's Comps tab: which tab is showing (Comps when
// the lead has comps, otherwise Details), the Run comps window, and
// putting a comps run's note and result on the draft (Save Changes keeps
// them). With `enabled` false the window stays on Details.
export function useLeadComps({ lead, draft, setDraft, enabled }) {
  const [tab, setTab] = useState("details");
  const [runOpen, setRunOpen] = useState(false);

  useEffect(() => {
    setTab(lead && leadComps(lead) ? "comps" : "details");
  }, [lead]);

  function saveRun(note, result) {
    setDraft((prev) => ({
      ...prev,
      notes: withCompsNote(prev.notes, note),
      ...(result ? { compsResult: compsResultToSave(result) } : {}),
    }));
    setTab("comps");
  }

  return {
    enabled,
    tab: enabled ? tab : "details",
    setTab,
    comps: enabled ? leadComps(draft) : null,
    runOpen: enabled && runOpen,
    openRun: () => setRunOpen(true),
    closeRun: () => setRunOpen(false),
    saveRun,
  };
}
