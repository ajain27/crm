import { useState, useEffect } from "react";
import Modal from "../modal/Modal";
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
import CountyRecords from "./countyRecords/CountyRecords";
import {
  csvToCommercialLeads,
  csvToPplLeads,
  csvToResidentialLeads,
} from "./leadImport";
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
import { findAddressDuplicates } from "./leadDuplicates";
import "./Leads.css";

export default function PotentialLeads({
  currentUser,
  leads,
  setLeads,
  saveLead,
  deleteLeadById,
  saveDeal,
  deals,
  setDeals,
  setActiveView,
  ppcOnly = false,
}) {
  const [activeTab, setActiveTab] = useState(ppcOnly ? "ppc" : "residential");
  const [detailLead, setDetailLead] = useState(null);
  const [commercialDetailLead, setCommercialDetailLead] = useState(null);
  const [ppcDeletedCount, setPpcDeletedCount] = useState(0);
  // "ppc" or "ppl" while that tab's Add a lead window is open.
  const [addLeadTab, setAddLeadTab] = useState(null);

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
  // Match by id too: once a lead is edited its content no longer matches the
  // stale WordPress copy, which would otherwise show up as a second row.
  const localLeadKeys = new Set(leads.flatMap(leadIdentityKeys));
  const localLeadIds = new Set(leads.map((l) => l.id));
  const visibleLeads = [
    ...leads,
    ...wpSync.fetchedLeads.filter(
      (lead) =>
        !localLeadIds.has(lead.id) && !leadMatchesAnyKey(lead, localLeadKeys),
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
  // Added by hand on the PPC / PPL tabs: a residential lead with the source
  // fixed, which is what files it under that tab.
  const ppcForm = useLeadForm({
    createEmpty: () => ({ ...createEmptyResidentialForm(), source: "PPC" }),
    leadType: "residential",
    existingLeads: ppcLeads,
    duplicateMessage: (address) => `"${address}" is already in your PPC leads.`,
    currentUser,
    saveLead,
    setLeads,
    onSaved: () => setAddLeadTab(null),
  });
  const pplForm = useLeadForm({
    createEmpty: () => ({ ...createEmptyResidentialForm(), source: "PPL" }),
    leadType: "residential",
    existingLeads: pplLeads,
    duplicateMessage: (address) => `"${address}" is already in your PPL leads.`,
    currentUser,
    saveLead,
    setLeads,
    onSaved: () => setAddLeadTab(null),
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
    [residentialList, commercialList, ppcList, pplList].forEach((list) =>
      list.setManySelected(removedIds, false),
    );
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

  // Saves leads parsed from a CSV — new ones, and existing ones with blank
  // details filled in from the file — and reports what happened.
  async function importCsvLeads(result) {
    if (result.error) {
      alert(result.error);
      return;
    }
    const {
      leads: imported,
      updates = [],
      skippedEmpty,
      skippedDuplicates,
    } = result;

    // Saved a few at a time so a large file doesn't flood Firestore.
    async function saveAll(list) {
      const saved = [];
      for (let i = 0; i < list.length; i += 20) {
        const batch = list.slice(i, i + 20);
        const results = await Promise.allSettled(
          batch.map((lead) => saveLead(lead)),
        );
        batch.forEach((lead, j) => {
          if (results[j].status === "fulfilled") saved.push(lead);
        });
      }
      return saved;
    }

    const saved = await saveAll(imported);
    const savedUpdates = await saveAll(updates);
    if (saved.length || savedUpdates.length) {
      const byId = new Map(savedUpdates.map((l) => [l.id, l]));
      setLeads((prev) => [...saved, ...prev.map((l) => byId.get(l.id) || l)]);
    }

    const failed =
      imported.length - saved.length + (updates.length - savedUpdates.length);
    alert(
      [
        `Imported ${saved.length} ${pluralizeLeads(saved.length)}.`,
        savedUpdates.length &&
          `Filled in missing details on ${savedUpdates.length} ${pluralizeLeads(savedUpdates.length)} already in your list.`,
        skippedDuplicates &&
          `Skipped ${skippedDuplicates} already in your leads (same phone, email or address).`,
        skippedEmpty &&
          `Skipped ${skippedEmpty} ${skippedEmpty === 1 ? "row" : "rows"} with no name, email, phone or address.`,
        failed && `${failed} couldn't be saved — try importing again.`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  // Removes leads in `listLeads` that share an address, keeping one per
  // address with any details the others had. Deleted by id only — the
  // kept lead shares their address (and maybe phone/email), so matching
  // by those would delete it too.
  async function handleRemoveDuplicates(listLeads) {
    const groups = findAddressDuplicates(listLeads);
    const count = groups.reduce((n, g) => n + g.duplicates.length, 0);
    if (count === 0) {
      alert("No leads share an address in this list.");
      return;
    }
    const confirmed = window.confirm(
      `Remove ${count} duplicate ${pluralizeLeads(count)}?\n\n` +
        `${groups.length} ${groups.length === 1 ? "address has" : "addresses have"} more than one lead. ` +
        "The lead with the most details is kept for each, and any details only the others had are copied to it.",
    );
    if (!confirmed) return;

    const saved = [];
    const removedIds = [];
    let failed = 0;
    for (const { keep, changed, duplicates } of groups) {
      if (changed) {
        try {
          await saveLead(keep);
          saved.push(keep);
        } catch {
          // The merged details didn't save: keep the duplicates, so
          // nothing is lost.
          failed += duplicates.length;
          continue;
        }
      }
      const results = await Promise.allSettled(
        duplicates.map((l) => deleteLeadById(l.id)),
      );
      duplicates.forEach((l, i) => {
        if (results[i].status === "fulfilled") removedIds.push(l.id);
        else failed += 1;
      });
    }

    const removed = new Set(removedIds);
    const byId = new Map(saved.map((l) => [l.id, l]));
    setLeads((prev) =>
      prev.filter((l) => !removed.has(l.id)).map((l) => byId.get(l.id) || l),
    );
    [residentialList, commercialList, ppcList, pplList].forEach((list) =>
      list.setManySelected(removedIds, false),
    );

    alert(
      [
        `Removed ${removedIds.length} duplicate ${pluralizeLeads(removedIds.length)}.`,
        saved.length &&
          `Copied missing details to ${saved.length} ${pluralizeLeads(saved.length)}.`,
        failed && `${failed} couldn't be removed — try again.`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  function handlePplImport(text) {
    return importCsvLeads(
      csvToPplLeads(text, { existingLeads: leads, userId: currentUser.id }),
    );
  }

  function handleResidentialImport(text) {
    return importCsvLeads(
      csvToResidentialLeads(text, {
        existingLeads: leads,
        userId: currentUser.id,
      }),
    );
  }

  function handleCommercialImport(text) {
    return importCsvLeads(
      csvToCommercialLeads(text, {
        existingLeads: commercialLeads,
        userId: currentUser.id,
      }),
    );
  }

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

  // Residential and commercial bulk delete: same as deleting each one —
  // gone locally first, then any WordPress copy.
  async function handleBulkDelete(selected) {
    if (ppcOnly || selected.length === 0) return false;
    if (!confirmBulkDelete(selected.length)) return false;
    await removeLeads(selected);
    selected.forEach((lead) => deleteWordPressLead(lead));
    return true;
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
    ...(ppcOnly ? [] : [{ id: "county", label: "County Records" }]),
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
            onBulkDelete={handleBulkDelete}
            onImport={handleResidentialImport}
            onRemoveDuplicates={() => handleRemoveDuplicates(residentialLeads)}
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
            onBulkDelete={handleBulkDelete}
            onImport={handleCommercialImport}
            onRemoveDuplicates={() => handleRemoveDuplicates(commercialLeads)}
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
          onAddLead={() => setAddLeadTab("ppc")}
          {...leadActions}
        />
      )}

      {activeTab === "ppl" && (
        <CampaignLeadList
          title="PPL Leads"
          leads={pplLeads}
          listState={pplList}
          noLeadsSubtitle="No PPL leads yet."
          noLeadsMessage="PPL leads will appear here."
          onBulkDelete={handlePplBulkDelete}
          onImport={handlePplImport}
          onRemoveDuplicates={() => handleRemoveDuplicates(pplLeads)}
          onAddLead={() => setAddLeadTab("ppl")}
          {...leadActions}
        />
      )}

      {!ppcOnly && (
        <Modal
          isOpen={!!addLeadTab}
          onClose={() => setAddLeadTab(null)}
          title={addLeadTab === "ppl" ? "Add PPL Lead" : "Add PPC Lead"}
          className="leads-add-modal"
          style={{
            width: "min(960px, 96vw)",
            maxWidth: "min(960px, 96vw)",
            height: "auto",
          }}
        >
          {addLeadTab && (
            <ResidentialLeadForm
              key={addLeadTab}
              leadForm={addLeadTab === "ppl" ? pplForm : ppcForm}
              fixedSource
              inModal
            />
          )}
        </Modal>
      )}

      {activeTab === "county" && !ppcOnly && (
        <CountyRecords
          currentUser={currentUser}
          deals={deals}
          saveDeal={saveDeal}
          setDeals={setDeals}
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
