import { useState, useEffect } from "react";
import ContractPreviewModal from "../crm/components/data/modals/ContractPreviewModal";
import PMDealAddForm from "./PMDealAddForm";
import PMDealsTable, { computeDeal } from "./PMDealsTable";
import PMDealEditModal from "./PMDealEditModal";
import { usePMDealAdd } from "./hooks/usePMDealAdd";
import { usePMDealEdit } from "./hooks/usePMDealEdit";
import { usePMDealFiles } from "./hooks/usePMDealFiles";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeDeal(deal) {
  if (Array.isArray(deal.files)) return deal;
  const files = deal.fileId
    ? [
        {
          id: deal.fileId,
          name: deal.fileName || "File",
          type: deal.fileType || "",
          uploadedAt: deal.fileUploadedAt || "",
        },
      ]
    : [];
  return { ...deal, files };
}

export default function PMDealsTab({
  tab,
  currentUser,
  fetchPmDeals,
  savePmDeal,
  deletePmDealById,
  savePmDealFile,
  fetchPmDealFile,
  deletePmDealFileById,
}) {
  const [deals, setDeals] = useState([]);
  const [today, setToday] = useState(todayStr);
  const [filterBorrower, setFilterBorrower] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  useEffect(() => {
    function scheduleNextMidnight() {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
      return setTimeout(() => {
        setToday(todayStr());
        timerId = scheduleNextMidnight();
      }, msUntilMidnight);
    }
    let timerId = scheduleNextMidnight();
    return () => clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!fetchPmDeals || !currentUser?.id) return;
    fetchPmDeals(currentUser.id)
      .then((loaded) => setDeals(loaded.map(normalizeDeal)))
      .catch(() => {});
  }, [currentUser?.id]);

  const add = usePMDealAdd({ setDeals, currentUser, savePmDeal, today });
  const edit = usePMDealEdit({ setDeals, savePmDeal });
  const files = usePMDealFiles({
    deals,
    setDeals,
    currentUser,
    savePmDeal,
    savePmDealFile,
    fetchPmDealFile,
    deletePmDealFileById,
  });

  async function handleDelete(id) {
    if (!window.confirm("Delete this PM deal?")) return;
    await deletePmDealById(id);
    setDeals((p) => p.filter((d) => d.id !== id));
  }

  async function handleDeleteFromModal() {
    if (!edit.editingDeal) return;
    await handleDelete(edit.editingDeal.id);
    edit.closeEditModal();
  }

  const filteredDeals = deals.filter((d) => {
    const bq = filterBorrower.trim().toLowerCase();
    const cq = filterCompany.trim().toLowerCase();
    if (bq && !d.borrowerName?.toLowerCase().includes(bq)) return false;
    if (cq && !d.borrowerCompany?.toLowerCase().includes(cq)) return false;
    return true;
  });

  return (
    <>
      <div className="deal-analyzer-hero">
        <span className="deal-analyzer-eyebrow">{tab.eyebrow}</span>
        <h2>{tab.title}</h2>
        <p>{tab.description}</p>
      </div>

      <PMDealAddForm
        form={add.form}
        onChange={add.handleChange}
        onBlur={add.handleBlur}
        onSubmit={add.handleAdd}
        saving={add.saving}
        isFormComplete={add.isFormComplete}
      />

      <PMDealsTable
        deals={deals}
        filteredDeals={filteredDeals}
        today={today}
        filterBorrower={filterBorrower}
        setFilterBorrower={setFilterBorrower}
        filterCompany={filterCompany}
        setFilterCompany={setFilterCompany}
        onRowClick={edit.handleRowClick}
      />

      <ContractPreviewModal
        isOpen={!!files.selectedDeal}
        onClose={files.closeModal}
        selectedContractDeal={files.modalDeal}
        contractVersions={files.fileVersions}
        selectedContractVersion={files.selectedFileVersion}
        setSelectedContractVersionId={files.handleSelectFileVersion}
        isFetchingContract={files.isFetchingFile}
        selectedContractData={files.fileData}
        isImageContract={files.mimeType.startsWith("image/")}
        isPdfContract={files.mimeType === "application/pdf"}
        handleDeleteContractVersion={files.handleDeleteFile}
      />

      <PMDealEditModal
        editingDeal={edit.editingDeal}
        editForm={edit.editForm}
        editSaving={edit.editSaving}
        {...computeDeal(edit.editingDeal || {}, today)}
        isUploading={files.uploadingId === edit.editingDeal?.id}
        onOpenFile={files.openFile}
        onFileUpload={files.handleFileUpload}
        onClose={edit.closeEditModal}
        onSave={edit.handleEditSave}
        onChange={edit.handleEditChange}
        onBlur={edit.handleEditBlur}
        onDelete={handleDeleteFromModal}
      />
    </>
  );
}
