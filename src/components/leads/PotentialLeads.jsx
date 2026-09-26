import { useState, useEffect } from "react";
import LeadDetailModal from "./LeadDetailModal";
import CommercialLeadDetailModal from "./CommercialLeadDetailModal";
import LeadsStatsRow from "./components/LeadsStatsRow";
import LeadsTabBar from "./components/LeadsTabBar";
import ResidentialLeadForm from "./residential/ResidentialLeadForm";
import ResidentialLeadList, {
  RESIDENTIAL_FILTERS,
} from "./residential/ResidentialLeadList";
import CommercialLeadForm from "./commercial/CommercialLeadForm";
import CommercialLeadList from "./commercial/CommercialLeadList";
import CampaignLeadList from "./campaign/CampaignLeadList";
import { useLeadForm } from "./hooks/useLeadForm";
import { useLeadListState } from "./hooks/useLeadListState";
import { useWordPressLeadSync } from "./hooks/useWordPressLeadSync";
import { deleteWordPressLead } from "./wordpressLeadsApi";
import {
  buildDealFromLead,
  createEmptyCommercialForm,
  createEmptyResidentialForm,
  dedupeLeads,
  isCommercialLead,
  isPpcLead,
  isPplLead,
  isResidentialLead,
  leadIdentityKeys,
  leadMatchesAnyKey,
  pluralizeLeads,
  sortNewestFirst,
} from "./leadUtils";
import {
  fetchUserStats,
  incrementPpcDeleted,
} from "../../firebase/firestoreService";
import {
  startEmailSequence,
  stopEmailSequence,
} from "../../constants/emailSequence";
import "./Leads.css";

export default function PotentialLeads({
  currentUser,
  leads,
  setLeads,
  saveLead,
  deleteLeadById,
  saveDeal,
  setDeals,
  setActiveView,
  ppcOnly = false,
}) {
  const [activeTab, setActiveTab] = useState(ppcOnly ? "ppc" : "residential");
  const [detailLead, setDetailLead] = useState(null);
  const [commercialDetailLead, setCommercialDetailLead] = useState(null);
  const [ppcDeletedCount, setPpcDeletedCount] = useState(0);

  const residentialList = useLeadListState(RESIDENTIAL_FILTERS);
  const commercialList = useLeadListState();
  const ppcList = useLeadListState();
  const pplList = useLeadListState();

  const wpSync = useWordPressLeadSync({
    currentUser,
    leads,
    setLeads,
    saveLead,
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchUserStats(currentUser.id)
      .then((stats) => setPpcDeletedCount(stats.ppcDeletedCount || 0))
      .catch((err) => console.warn("[PPC stats] failed to load", err));
  }, [currentUser?.id]);

  useEffect(() => {
    if (ppcOnly && activeTab !== "ppc") setActiveTab("ppc");
  }, [ppcOnly, activeTab]);

  // ── Split leads by type ────────────────────────────────────────────────────
  // WordPress leads show in the PPC list straight from the sync, even before
  // (or without) being imported into the local lead list.
  const localLeadKeys = new Set(leads.flatMap(leadIdentityKeys));
  const visibleLeads = [
    ...leads,
    ...wpSync.fetchedLeads.filter(
      (lead) => !leadMatchesAnyKey(lead, localLeadKeys),
    ),
  ];
  const ppcLeads = sortNewestFirst(dedupeLeads(visibleLeads.filter(isPpcLead)));
  const pplLeads = sortNewestFirst(dedupeLeads(visibleLeads.filter(isPplLead)));
  const residentialLeads = leads.filter(isResidentialLead);
  const commercialLeads = leads.filter(isCommercialLead);

  const residentialForm = useLeadForm({
    createEmpty: createEmptyResidentialForm,
    leadType: "residential",
    existingLeads: residentialLeads,
    duplicateMessage: (address) => `"${address}" is already in your lead list.`,
    currentUser,
    saveLead,
    setLeads,
  });
  const commercialForm = useLeadForm({
    createEmpty: createEmptyCommercialForm,
    leadType: "commercial",
    existingLeads: commercialLeads,
    duplicateMessage: (address) =>
      `"${address}" is already in your commercial lead list.`,
    currentUser,
    saveLead,
    setLeads,
  });

  // ── Shared lead actions ────────────────────────────────────────────────────
  // Deletes every local copy of the given leads (same id, or the same lead
  // under another id — see leadIdentityKeys) and drops them from all lists.
  async function removeLeads(leadsToRemove) {
    const ids = new Set(leadsToRemove.map((l) => l.id));
    const keys = new Set(leadsToRemove.flatMap(leadIdentityKeys));
    const matches = (l) => ids.has(l.id) || leadMatchesAnyKey(l, keys);
    const matchingLocalLeads = leads.filter(matches);

    await Promise.all(
      matchingLocalLeads.map((l) => deleteLeadById(l.id).catch(() => null)),
    );
    setLeads((prev) => prev.filter((l) => !matches(l)));
    wpSync.setFetchedLeads((prev) => prev.filter((l) => !matches(l)));

    const removedIds = [...ids, ...matchingLocalLeads.map((l) => l.id)];
    ppcList.setManySelected(removedIds, false);
    pplList.setManySelected(removedIds, false);
  }

  async function recordPpcDeleted(count) {
    await incrementPpcDeleted(currentUser.id, count);
    setPpcDeletedCount((prev) => prev + count);
  }

  function confirmBulkDelete(count) {
    return window.confirm(`Delete ${count} selected ${pluralizeLeads(count)}?`);
  }

  async function handleDelete(id) {
    if (ppcOnly) return;
    if (!window.confirm("Delete this lead?")) return;
    const lead = visibleLeads.find((l) => l.id === id);
    const isPpc = isPpcLead(lead);
    // PPC leads must be gone from WordPress first, or the next sync would
    // just re-import them.
    if (isPpc && !(await deleteWordPressLead(lead))) return;
    await removeLeads([lead]);
    if (isPpc) {
      await recordPpcDeleted(1);
    } else {
      deleteWordPressLead(lead);
    }
  }

  async function handlePpcBulkDelete(selected) {
    if (ppcOnly || selected.length === 0) return false;
    if (!confirmBulkDelete(selected.length)) return false;
    const wpResults = await Promise.all(selected.map(deleteWordPressLead));
    const synced = selected.filter((_, index) => wpResults[index]);
    if (synced.length === 0) return false;
    await removeLeads(synced);
    await recordPpcDeleted(synced.length);
    return true;
  }

  // PPL leads come in straight from the Leadzolo webhook, not WordPress —
  // no WP sync-delete step or deleted-count stat to keep in sync.
  async function handlePplBulkDelete(selected) {
    if (selected.length === 0) return false;
    if (!confirmBulkDelete(selected.length)) return false;
    await removeLeads(selected);
    return true;
  }

  async function handleLeadSave(updated) {
    await saveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleSetQuality(lead, quality, reason = "") {
    if (ppcOnly) return;
    await handleLeadSave({
      ...lead,
      ppcQuality: quality,
      ppcBadReason: reason,
    });
  }

  async function handleRunAutomation(lead) {
    const senderName = [currentUser?.firstName, currentUser?.lastName]
      .filter(Boolean)
      .join(" ");
    await handleLeadSave({
      ...lead,
      emailSequence: startEmailSequence(senderName),
    });
  }

  async function handleStopAutomation(lead) {
    await handleLeadSave({
      ...lead,
      emailSequence: stopEmailSequence(lead.emailSequence),
    });
  }

  async function handleAddToCrm(leadId) {
    if (
      !window.confirm(
        "Add this lead to the CRM pipeline? It will be removed from Leads.",
      )
    )
      return;

    const lead = visibleLeads.find((l) => l.id === leadId);
    if (!lead) return;

    const deal = buildDealFromLead(lead, currentUser.id);
    if (!deal) {
      alert(
        "This lead does not have a property address, so it was not added to CRM.",
      );
      return;
    }

    await saveDeal(deal);
    if (isPpcLead(lead)) await deleteWordPressLead(lead);
    setDeals((prev) => [deal, ...prev]);
    await removeLeads([lead]);
    setActiveView("dashboard");
  }

  async function handleCommercialLeadDelete(id) {
    if (!window.confirm("Delete this commercial lead?")) return;
    const lead = leads.find((l) => l.id === id);
    await deleteLeadById(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setCommercialDetailLead(null);
    deleteWordPressLead(lead);
  }

  const leadActions = {
    onOpen: setDetailLead,
    onDelete: handleDelete,
    onAddToCrm: handleAddToCrm,
    onRunAutomation: handleRunAutomation,
    onStopAutomation: handleStopAutomation,
  };

  const tabs = [
    ...(ppcOnly
      ? []
      : [
          { id: "residential", label: "Residential" },
          { id: "commercial", label: "Commercial" },
        ]),
    { id: "ppc", label: "PPC Leads", count: ppcLeads.length },
    { id: "ppl", label: "PPL Leads", count: pplLeads.length },
  ];

  return (
    <>
      <LeadsStatsRow
        showTypeStats={!ppcOnly}
        residentialCount={residentialLeads.length}
        commercialCount={commercialLeads.length}
        ppcActiveCount={ppcLeads.length}
        ppcDeletedCount={ppcDeletedCount}
        pplCount={pplLeads.length}
      />

      <LeadsTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "residential" && (
        <>
          <ResidentialLeadForm leadForm={residentialForm} />
          <ResidentialLeadList
            leads={residentialLeads}
            listState={residentialList}
            {...leadActions}
          />
        </>
      )}

      {activeTab === "commercial" && (
        <>
          <CommercialLeadForm leadForm={commercialForm} />
          <CommercialLeadList
            leads={commercialLeads}
            listState={commercialList}
            wpSyncing={wpSync.syncing}
            onSyncWordPress={() => wpSync.sync()}
            onOpen={setCommercialDetailLead}
            onDelete={handleDelete}
          />
        </>
      )}

      {activeTab === "ppc" && (
        <CampaignLeadList
          title="PPC Leads"
          leads={ppcLeads}
          listState={ppcList}
          readOnly={ppcOnly}
          statusMessage={wpSync.status}
          noLeadsSubtitle="No PPC leads yet."
          noLeadsMessage="Leads submitted through the website form will appear here."
          onBulkDelete={handlePpcBulkDelete}
          onSetQuality={handleSetQuality}
          {...leadActions}
        />
      )}

      {activeTab === "ppl" && (
        <CampaignLeadList
          title="PPL Leads"
          leads={pplLeads}
          listState={pplList}
          noLeadsSubtitle="No PPL leads yet."
          noLeadsMessage="Leads from Leadzolo will appear here."
          onBulkDelete={handlePplBulkDelete}
          onSetQuality={handleSetQuality}
          {...leadActions}
        />
      )}

      {!ppcOnly && (
        <LeadDetailModal
          isOpen={!!detailLead}
          onClose={() => setDetailLead(null)}
          lead={detailLead}
          onSave={handleLeadSave}
          isPpc={detailLead ? isPpcLead(detailLead) : false}
          isPpl={detailLead ? isPplLead(detailLead) : false}
        />
      )}
      <CommercialLeadDetailModal
        isOpen={!!commercialDetailLead}
        onClose={() => setCommercialDetailLead(null)}
        lead={commercialDetailLead}
        onSave={handleLeadSave}
        onDelete={
          commercialDetailLead
            ? () => handleCommercialLeadDelete(commercialDetailLead.id)
            : undefined
        }
      />
    </>
  );
}
