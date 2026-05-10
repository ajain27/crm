import { useState } from "react";
import Pagination from "../../../pagination/Pagination";
import { getContractVersions } from "../wholesaleConfig";
import { useDealsSort } from "./hooks/useDealsSort";
import { useDealUpdater } from "./hooks/useDealUpdater";
import { useContractManager } from "./hooks/useContractManager";
import { useBuyerEdit } from "./hooks/useBuyerEdit";
import DealRow from "./DealRow";
import NotesModal from "./modals/NotesModal";
import ContractPreviewModal from "./modals/ContractPreviewModal";

function Wholesale_data({
  filteredDeals,
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
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");

  const { currentDeals, currentPage, setCurrentPage, totalPages, renderSortableHeader } =
    useDealsSort(filteredDeals);

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

  const buyerEdit = useBuyerEdit({ updateDeal });

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

  const selectedContractDeal = deals.find((d) => d.id === selectedContractDealId);
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

  return (
    <div data-reveal="zoom" style={{ "--reveal-delay": "240ms" }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="notes-header">Notes</th>
              <th>Property Address</th>
              <th>City</th>
              <th>Zip Code</th>
              <th>State</th>
              <th>Property Type</th>
              <th>On Market</th>
              {renderSortableHeader("Listed Price", "listedPrice")}
              {renderSortableHeader("ARV", "arv")}
              {renderSortableHeader("Rehab Cost", "rehabCost")}
              {renderSortableHeader("MAO", "mao")}
              <th>Offer Status</th>
              {renderSortableHeader("Offer Date", "offerDate")}
              <th>Accepted</th>
              <th>Contract</th>
              {renderSortableHeader("Contract Price", "contractPrice")}
              <th>Assigned</th>
              {renderSortableHeader("Assigned Price", "assignedPrice")}
              <th>Buyer Info</th>
              <th>Closed</th>
              {renderSortableHeader("Closed On", "closedDate")}
              {renderSortableHeader("Gross Revenue", "grossRevenue")}
            </tr>
          </thead>
          <tbody>
            {currentDeals.map((deal, index) => (
              <DealRow
                key={deal.id}
                deal={deal}
                index={index}
                today={today}
                updateDeal={updateDeal}
                deleteDeal={deleteDeal}
                openContract={openContract}
                handleContractUpload={handleContractUpload}
                uploadingDealId={uploadingDealId}
                handleRowClick={handleRowClick}
                {...buyerEdit}
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
          Showing {currentDeals.length} of {filteredDeals.length} results
        </span>
      </Pagination>

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
