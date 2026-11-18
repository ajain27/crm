import { useState } from "react";
import Pagination from "../../../pagination/Pagination";
import { Select } from "../../../elements/elements";
import {
  createDealFormForSeller,
  getContractVersions,
  isDealInactive,
  isDealInProgress,
  isDealRejected,
  isDealWithdrawn,
  months,
} from "../crmConfig";
import { useDealsSort } from "./hooks/useDealsSort";
import { useDealUpdater } from "./hooks/useDealUpdater";
import { useContractManager } from "./hooks/useContractManager";
import DealRow from "./DealRow";
import NotesModal from "./modals/NotesModal";
import ContractPreviewModal from "./modals/ContractPreviewModal";
import DealDetailModal from "./modals/DealDetailModal";
import LeadDedupeButton from "../../../leads/components/LeadDedupeButton";
import { dealAddress } from "../../../leads/leadDuplicates";
import { groupLeadsBySeller } from "../../../leads/leadUtils";
import AccordionTable from "../../../elements/AccordionTable";
import CallNotesModal from "../../../leads/components/CallNotesModal";
import { callCountOf } from "./comps/notesTable";
import { withNoteAdded } from "./comps/compsNote";

// Deals grouped by seller — the same phone, email or full name, as on the
// Leads page — in list order. Each group is an array of deals.
function groupDealsBySeller(deals) {
  const asSeller = (d) => ({
    id: d.id,
    source: d.source,
    firstName: d.sellerFirstName,
    lastName: d.sellerLastName,
    phone: d.sellerPhone,
    phone2: d.sellerPhones?.[0],
    email: d.sellerEmail,
  });
  const byId = new Map(deals.map((d) => [d.id, d]));
  return groupLeadsBySeller(deals.map(asSeller)).map((group) =>
    group.map((s) => byId.get(s.id)),
  );
}

function Wholesale_data({
  filteredDeals,
  filters,
  deals,
  deleteDeal,
  persist,
  saveDeal,
  fetchBuyers,
  saveBuyer,
  setFilters = () => {},
  saveContractVersion,
  fetchContractVersion,
  deleteContractById,
  currentUserId,
  photoStore,
  convertDealToRental,
  moveDealToLeads,
  leads = [],
  onRemoveDuplicates,
}) {
  const [tab, setTab] = useState("active");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [detailDealId, setDetailDealId] = useState(null);
  // The deal whose new call is being noted, and that call's number.
  const [callNotes, setCallNotes] = useState(null);
  // A property being added for a deal's seller: an unsaved deal shown as
  // its own tab in the deal window until it's saved.
  const [newProperty, setNewProperty] = useState(null);
  const detailDeal = detailDealId
    ? deals.find((d) => d.id === detailDealId) ||
      (newProperty?.draft.id === detailDealId ? newProperty.draft : null)
    : null;

  // The deal window's property tabs: every deal of this seller (same phone,
  // email or full name, as on the Leads page), plus one being added.
  function sellerPropertiesOf(deal) {
    if (!deal) return [];
    const anchorId = newProperty ? newProperty.sellerOfId : deal.id;
    const anchor = deals.find((d) => d.id === anchorId) || deal;
    const group = groupDealsBySeller(deals).find((g) =>
      g.some((d) => d.id === anchor.id),
    ) || [anchor];
    const unsaved =
      newProperty && !deals.some((d) => d.id === newProperty.draft.id);
    return unsaved ? [...group, newProperty.draft] : group;
  }

  // Opens a tab in the deal window for another property `deal`'s seller
  // owns, with their name, phones and emails filled in; it becomes a deal
  // when saved.
  function addPropertyTab(deal) {
    const draft = {
      ...createDealFormForSeller(deal),
      id: crypto.randomUUID(),
      userId: currentUserId || deal.userId || "",
      createdAt: new Date().toISOString(),
      isNewProperty: true,
    };
    setNewProperty({ draft, sellerOfId: newProperty?.sellerOfId || deal.id });
    setDetailDealId(draft.id);
  }

  // Saving anything on a property that's still being added (comps, an
  // offer, a photo) saves the whole property, not just that change.
  function patchDeal(id, patch) {
    if (newProperty?.draft.id === id && !deals.some((d) => d.id === id)) {
      const { isNewProperty, ...base } = newProperty.draft;
      return updateDealPatch(id, { ...base, ...patch });
    }
    return updateDealPatch(id, patch);
  }

  function closeDetail() {
    setDetailDealId(null);
    setNewProperty(null);
  }

  const isInactive = isDealInactive;

  const isClosed = (deal) => (deal.closed || "No") === "Yes";

  const inTab = (d, t) => {
    if (t === "closed") return isClosed(d);
    if (t === "inactive") return isInactive(d) && !isClosed(d);
    if (t === "inProgress") return isDealInProgress(d);
    return !isInactive(d) && !isClosed(d) && !isDealInProgress(d);
  };
  // A seller's properties on this tab share one row (the first listed);
  // the deal window opens with a tab for each of their properties.
  const sellerGroupsOn = (t) =>
    groupDealsBySeller(filteredDeals.filter((d) => inTab(d, t)));
  const sellerGroups = sellerGroupsOn(tab);
  const tabFilteredDeals = sellerGroups.map((g) => g[0]);
  const groupOf = new Map(sellerGroups.map((g) => [g[0].id, g]));

  const {
    currentDeals,
    currentPage,
    setCurrentPage,
    totalPages,
    renderSortableHeader,
  } = useDealsSort(tabFilteredDeals);

  const { updateDeal, updateDealPatch } = useDealUpdater({
    deals,
    persist,
    saveDeal,
    fetchBuyers,
    saveBuyer,
    setFilters,
  });

  const {
    uploadingDealId,
    contractDataCache,
    isFetchingContract,
    selectedContractDealId,
    selectedContractVersionId,
    setSelectedContractVersionId,
    openContract,
    handleContractUpload,
    handleDeleteContractVersion,
    closeContractModal,
  } = useContractManager({
    deals,
    saveContractVersion,
    fetchContractVersion,
    deleteContractById,
    currentUserId,
    updateDealPatch,
  });

  function handleRowClick(deal) {
    setSelectedDeal(deal);
    setNotesDraft(deal.notes || "");
  }

  function saveNotes() {
    if (selectedDeal) {
      updateDeal(selectedDeal.id, "notes", notesDraft);
      setSelectedDeal(null);
    }
  }

  // A call more opens the call notes; fewer just saves the count.
  function handleSetCalls(deal, count) {
    const callCount = Math.max(0, count);
    if (callCount > callCountOf(deal)) {
      setCallNotes({ deal, count: callCount });
      return;
    }
    updateDealPatch(deal.id, { callCount });
  }

  // Counts the call and adds what was said to the deal's notes as
  // "Call 2 (11/6/2026): …", above any comps note.
  function handleSaveCall(details) {
    const { deal: asked, count } = callNotes;
    const deal = deals.find((d) => d.id === asked.id) || asked;
    const line = details
      ? `Call ${count} (${new Date().toLocaleDateString("en-US")}): ${details}`
      : "";
    updateDealPatch(deal.id, {
      callCount: count,
      lastCalledAt: new Date().toISOString(),
      ...(line ? { notes: withNoteAdded(deal.notes, line) } : {}),
    });
  }

  function reactivateDeal(deal) {
    const patch = { inactive: false };
    if (isDealRejected(deal)) patch.sellerAccepted = "Waiting";
    if (isDealWithdrawn(deal)) {
      patch.offerStatus = "Offer Sent";
      patch.sellerAccepted = "Waiting";
    }
    updateDealPatch(deal.id, patch);
  }

  // Moves an active deal to the Inactive tab; Make Active brings it back.
  function makeDealInactive(deal) {
    updateDealPatch(deal.id, { inactive: true });
  }

  const selectedContractDeal = deals.find(
    (d) => d.id === selectedContractDealId,
  );
  const contractVersions = selectedContractDeal
    ? getContractVersions(selectedContractDeal)
    : [];
  const selectedContractVersion =
    contractVersions.find((v) => v.id === selectedContractVersionId) ||
    contractVersions[0] ||
    null;
  const selectedContractData =
    contractDataCache[selectedContractVersion?.id] ||
    selectedContractVersion?.data ||
    "";
  const contractMimeType = selectedContractVersion?.type || "";

  // Each tab counts its rows: sellers, not properties.
  const activeCount = sellerGroupsOn("active").length;
  const inProgressCount = sellerGroupsOn("inProgress").length;
  const inactiveCount = sellerGroupsOn("inactive").length;
  const closedCount = sellerGroupsOn("closed").length;

  return (
    <div data-reveal="zoom" style={{ "--reveal-delay": "240ms" }}>
      <div
        className="deal-tab-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="deal-tab-group"
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <button
            className={`deal-tab-btn${tab === "active" ? " deal-tab-btn--active" : ""}`}
            onClick={() => {
              setTab("active");
              setCurrentPage(1);
            }}
          >
            Active
            <span className="deal-tab-count">{activeCount}</span>
          </button>
          <button
            className={`deal-tab-btn${tab === "inProgress" ? " deal-tab-btn--active" : ""}`}
            onClick={() => {
              setTab("inProgress");
              setCurrentPage(1);
            }}
          >
            In Progress
            <span className="deal-tab-count">{inProgressCount}</span>
          </button>
          <button
            className={`deal-tab-btn${tab === "inactive" ? " deal-tab-btn--active" : ""}`}
            onClick={() => {
              setTab("inactive");
              setCurrentPage(1);
            }}
          >
            Inactive
            <span className="deal-tab-count">{inactiveCount}</span>
          </button>
          <button
            className={`deal-tab-btn${tab === "closed" ? " deal-tab-btn--active" : ""}`}
            onClick={() => {
              setTab("closed");
              setCurrentPage(1);
            }}
          >
            Closed
            <span className="deal-tab-count">{closedCount}</span>
          </button>
        </div>

        {onRemoveDuplicates && (
          <LeadDedupeButton
            leads={deals}
            addressOf={dealAddress}
            noun="deals"
            onRemove={onRemoveDuplicates}
          />
        )}

        {tab === "closed" && (
          <div style={{ minWidth: "200px" }}>
            <Select
              label="Closed In"
              value={filters?.closedMonth || "All"}
              onChange={(e) => {
                setFilters({
                  ...filters,
                  closedMonth: e.target.value,
                });
              }}
              options={months}
            />
          </div>
        )}
      </div>

      {/* Collapses into cards at the same width as the Leads tables. */}
      <AccordionTable
        wide
        resizeKey="deals"
        className="dt-table"
        wrapClassName="dt-table-container"
      >
        <thead>
          <tr>
            <th>Address</th>
            {renderSortableHeader("ARV", "arv")}
            {renderSortableHeader("MAO", "mao")}
            {renderSortableHeader("Rehab", "rehabCost")}
            <th>Offer Sent</th>
            <th>Seller</th>
            <th>Phone</th>
            <th>Called</th>
          </tr>
        </thead>
        <tbody>
          {currentDeals.map((deal, index) => (
            <DealRow
              key={deal.id}
              deal={deal}
              group={groupOf.get(deal.id)}
              index={index}
              onRowDetailClick={(d) => setDetailDealId(d.id)}
              onSetCalls={handleSetCalls}
            />
          ))}
        </tbody>
      </AccordionTable>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      >
        <span>
          Showing {currentDeals.length} of {tabFilteredDeals.length} results
        </span>
      </Pagination>

      <DealDetailModal
        isOpen={!!detailDeal}
        onClose={closeDetail}
        deal={detailDeal}
        sellerProperties={sellerPropertiesOf(detailDeal)}
        onSwitchProperty={(property) => setDetailDealId(property.id)}
        updateDealPatch={patchDeal}
        deleteDeal={deleteDeal}
        convertDealToRental={convertDealToRental}
        moveDealToLeads={moveDealToLeads}
        onAddPropertyForSeller={addPropertyTab}
        existingDeals={deals}
        existingLeads={leads}
        openContract={openContract}
        handleContractUpload={handleContractUpload}
        handleDeleteContractVersion={handleDeleteContractVersion}
        uploadingDealId={uploadingDealId}
        photoStore={photoStore}
        currentUserId={currentUserId}
        onReactivate={
          detailDeal && isInactive(detailDeal)
            ? () => {
                reactivateDeal(detailDeal);
                setDetailDealId(null);
              }
            : undefined
        }
        onMakeInactive={
          detailDeal && !isInactive(detailDeal) && !isClosed(detailDeal)
            ? () => {
                makeDealInactive(detailDeal);
                setDetailDealId(null);
              }
            : undefined
        }
      />

      {callNotes && (
        <CallNotesModal
          lead={{
            firstName: callNotes.deal.sellerFirstName,
            lastName: callNotes.deal.sellerLastName,
            address: callNotes.deal.address,
          }}
          callNumber={callNotes.count}
          onSave={handleSaveCall}
          onClose={() => setCallNotes(null)}
        />
      )}

      <NotesModal
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        selectedDeal={selectedDeal}
        notesDraft={notesDraft}
        setNotesDraft={setNotesDraft}
        saveNotes={saveNotes}
      />

      <ContractPreviewModal
        isOpen={!!selectedContractDeal}
        onClose={closeContractModal}
        selectedContractDeal={selectedContractDeal}
        contractVersions={contractVersions}
        selectedContractVersion={selectedContractVersion}
        setSelectedContractVersionId={setSelectedContractVersionId}
        isFetchingContract={isFetchingContract}
        selectedContractData={selectedContractData}
        isImageContract={contractMimeType.startsWith("image/")}
        isPdfContract={contractMimeType === "application/pdf"}
        handleDeleteContractVersion={handleDeleteContractVersion}
      />
    </div>
  );
}

export default Wholesale_data;
