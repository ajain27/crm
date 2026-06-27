import { useState } from "react";
import Pagination from "../../../pagination/Pagination";
import { Select } from "../../../elements/elements";
import { getContractVersions, months } from "../crmConfig";
import { useDealsSort } from "./hooks/useDealsSort";
import { useDealUpdater } from "./hooks/useDealUpdater";
import { useContractManager } from "./hooks/useContractManager";
import DealRow from "./DealRow";
import NotesModal from "./modals/NotesModal";
import ContractPreviewModal from "./modals/ContractPreviewModal";
import DealDetailModal from "./modals/DealDetailModal";

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
}) {
  const [tab, setTab] = useState("active");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [detailDeal, setDetailDeal] = useState(null);

  function isInactive(deal) {
    const isRejected =
      (deal.offerStatus || "Not Sent") === "Offer Sent" &&
      (deal.sellerAccepted || "No") === "No";
    const isWithdrawn = (deal.offerStatus || "Not Sent") === "Offer Withdrawn";
    return isRejected || isWithdrawn;
  }

  const isClosed = (deal) => (deal.closed || "No") === "Yes";

  const tabFilteredDeals = filteredDeals.filter((d) => {
    if (tab === "closed") return isClosed(d);
    if (tab === "inactive") return isInactive(d) && !isClosed(d);
    return !isInactive(d) && !isClosed(d);
  });

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

  function reactivateDeal(deal) {
    const patch = { sellerAccepted: "Waiting" };
    if (deal.offerStatus === "Offer Withdrawn")
      patch.offerStatus = "Offer Sent";
    updateDealPatch(deal.id, patch);
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

  const activeCount = filteredDeals.filter(
    (d) => !isInactive(d) && !isClosed(d),
  ).length;
  const inactiveCount = filteredDeals.filter(
    (d) => isInactive(d) && !isClosed(d),
  ).length;
  const closedCount = filteredDeals.filter((d) => isClosed(d)).length;

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
        <div style={{ display: "flex", gap: "0.5rem" }}>
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

      <div className="table-wrap dt-table-container acc-card-container">
        <table className="dt-table acc-card">
          <thead>
            <tr>
              <th>Address</th>
              {renderSortableHeader("ARV", "arv")}
              {renderSortableHeader("MAO", "mao")}
              {renderSortableHeader("Rehab", "rehabCost")}
              <th>Offer Sent</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {currentDeals.map((deal, index) => (
              <DealRow
                key={deal.id}
                deal={deal}
                index={index}
                onRowDetailClick={setDetailDeal}
              />
            ))}
          </tbody>
        </table>
      </div>

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
        onClose={() => setDetailDeal(null)}
        deal={detailDeal}
        updateDealPatch={updateDealPatch}
        deleteDeal={deleteDeal}
        openContract={openContract}
        handleContractUpload={handleContractUpload}
        uploadingDealId={uploadingDealId}
        onReactivate={
          detailDeal && isInactive(detailDeal)
            ? () => {
                reactivateDeal(detailDeal);
                setDetailDeal(null);
              }
            : undefined
        }
      />

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
