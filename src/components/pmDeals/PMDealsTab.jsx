import { useState, useEffect } from "react";
import { fmtCurrencyInput } from "../../utils/utils";
import ContractPreviewModal from "../crm/components/data/modals/ContractPreviewModal";
import PMDealAddForm from "./PMDealAddForm";
import PMDealsTable from "./PMDealsTable";
import PMDealEditModal from "./PMDealEditModal";

const MAX_FILE_SIZE = 700 * 1024;

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

function createEmptyForm() {
  return {
    borrowerName: "",
    borrowerCompany: "",
    propertyAddress: "",
    amountLent: "",
    interestRate: "",
    months: "",
    lendDate: "",
  };
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
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [fileDataCache, setFileDataCache] = useState({});
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const [today, setToday] = useState(todayStr);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [filterBorrower, setFilterBorrower] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  // Advance `today` exactly at midnight so late-day counts stay current
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

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "amountLent") {
      setForm((p) => ({ ...p, amountLent: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "interestRate") {
      setForm((p) => ({ ...p, interestRate: value.replace(/[^0-9.%]/g, "") }));
      return;
    }
    if (name === "months") {
      setForm((p) => ({ ...p, months: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (name === "interestRate" && value) {
      const n = value.replace(/[^0-9.]/g, "");
      if (n) setForm((p) => ({ ...p, interestRate: `${n}%` }));
    }
  }

  const isFormComplete =
    form.borrowerName.trim() &&
    form.amountLent &&
    form.interestRate &&
    form.months &&
    form.lendDate;

  async function handleAdd(e) {
    e.preventDefault();
    if (!isFormComplete) return;
    setSaving(true);
    try {
      const deal = {
        ...form,
        id: crypto.randomUUID(),
        userId: currentUser?.id || "",
        createdAt: today,
        files: [],
      };
      await savePmDeal(deal);
      setDeals((p) => [deal, ...p]);
      setForm(createEmptyForm());
    } catch {
      alert("Failed to save deal. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this PM deal?")) return;
    await deletePmDealById(id);
    setDeals((p) => p.filter((d) => d.id !== id));
  }

  async function handleFileUpload(deal, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("File must be smaller than 700 KB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      const fileId = crypto.randomUUID();
      const uploadedAt = new Date().toISOString();
      setUploadingId(deal.id);
      try {
        await savePmDealFile({
          id: fileId,
          pmDealId: deal.id,
          userId: currentUser?.id || "",
          name: file.name,
          type: file.type || "application/octet-stream",
          data,
          uploadedAt,
        });
        const newEntry = {
          id: fileId,
          name: file.name,
          type: file.type || "application/octet-stream",
          uploadedAt,
        };
        const updated = { ...deal, files: [...(deal.files || []), newEntry] };
        await savePmDeal(updated);
        setDeals((p) => p.map((d) => (d.id === deal.id ? updated : d)));
        setFileDataCache((p) => ({ ...p, [fileId]: data }));
      } catch {
        alert("Failed to upload file.");
      } finally {
        setUploadingId(null);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  async function openFile(deal) {
    if (!deal.files?.length) return;
    setSelectedDealId(deal.id);
    const first = deal.files[0];
    setSelectedFileId(first.id);
    if (fileDataCache[first.id]) return;
    setIsFetchingFile(true);
    try {
      const fetched = await fetchPmDealFile(deal.id, first.id);
      if (fetched?.data) {
        setFileDataCache((p) => ({ ...p, [first.id]: fetched.data }));
      }
    } catch {
      alert("Failed to load file.");
    } finally {
      setIsFetchingFile(false);
    }
  }

  async function handleSelectFileVersion(fileId) {
    setSelectedFileId(fileId);
    if (fileDataCache[fileId]) return;
    setIsFetchingFile(true);
    try {
      const fetched = await fetchPmDealFile(selectedDealId, fileId);
      if (fetched?.data) {
        setFileDataCache((p) => ({ ...p, [fileId]: fetched.data }));
      }
    } catch {
      alert("Failed to load file.");
    } finally {
      setIsFetchingFile(false);
    }
  }

  async function handleDeleteFile(modalDeal, fileId) {
    const deal = deals.find((d) => d.id === modalDeal.id);
    if (!deal) return;
    try {
      await deletePmDealFileById(deal.id, fileId);
      const updatedFiles = (deal.files || []).filter((f) => f.id !== fileId);
      const updated = { ...deal, files: updatedFiles };
      await savePmDeal(updated);
      setDeals((p) => p.map((d) => (d.id === deal.id ? updated : d)));
      setFileDataCache((p) => {
        const next = { ...p };
        delete next[fileId];
        return next;
      });
      if (updatedFiles.length === 0) {
        setSelectedDealId(null);
        setSelectedFileId(null);
      } else {
        setSelectedFileId(updatedFiles[0].id);
      }
    } catch {
      alert("Failed to delete file.");
    }
  }

  function closeModal() {
    setSelectedDealId(null);
    setSelectedFileId(null);
  }

  function handleRowClick(deal) {
    setEditingDeal(deal);
    setEditForm({
      borrowerName: deal.borrowerName || "",
      borrowerCompany: deal.borrowerCompany || "",
      propertyAddress: deal.propertyAddress || "",
      amountLent: deal.amountLent || "",
      interestRate: deal.interestRate || "",
      months: deal.months || "",
      lendDate: deal.lendDate || "",
    });
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "amountLent") {
      setEditForm((p) => ({ ...p, amountLent: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "interestRate") {
      setEditForm((p) => ({
        ...p,
        interestRate: value.replace(/[^0-9.%]/g, ""),
      }));
      return;
    }
    if (name === "months") {
      setEditForm((p) => ({ ...p, months: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setEditForm((p) => ({ ...p, [name]: value }));
  }

  function handleEditBlur(e) {
    const { name, value } = e.target;
    if (name === "interestRate" && value) {
      const n = value.replace(/[^0-9.]/g, "");
      if (n) setEditForm((p) => ({ ...p, interestRate: `${n}%` }));
    }
  }

  async function handleEditSave() {
    if (!editingDeal) return;
    setEditSaving(true);
    try {
      const updated = { ...editingDeal, ...editForm };
      await savePmDeal(updated);
      setDeals((p) => p.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDeal(null);
      setEditForm(null);
    } catch {
      alert("Failed to save changes. Check your connection.");
    } finally {
      setEditSaving(false);
    }
  }

  function closeEditModal() {
    setEditingDeal(null);
    setEditForm(null);
  }

  const filteredDeals = deals.filter((d) => {
    const bq = filterBorrower.trim().toLowerCase();
    const cq = filterCompany.trim().toLowerCase();
    if (bq && !d.borrowerName?.toLowerCase().includes(bq)) return false;
    if (cq && !d.borrowerCompany?.toLowerCase().includes(cq)) return false;
    return true;
  });

  const selectedDeal = deals.find((d) => d.id === selectedDealId) || null;
  const modalDeal = selectedDeal
    ? { id: selectedDeal.id, address: selectedDeal.borrowerName }
    : null;
  const fileVersions = selectedDeal?.files ?? [];
  const selectedFileVersion =
    fileVersions.find((f) => f.id === selectedFileId) ||
    fileVersions[0] ||
    null;
  const fileData = fileDataCache[selectedFileId] || "";
  const mimeType = selectedFileVersion?.type || "";

  return (
    <>
      <div className="deal-analyzer-hero">
        <span className="deal-analyzer-eyebrow">{tab.eyebrow}</span>
        <h2>{tab.title}</h2>
        <p>{tab.description}</p>
      </div>

      <PMDealAddForm
        form={form}
        onChange={handleChange}
        onBlur={handleBlur}
        onSubmit={handleAdd}
        saving={saving}
        isFormComplete={isFormComplete}
      />

      <PMDealsTable
        deals={deals}
        filteredDeals={filteredDeals}
        today={today}
        filterBorrower={filterBorrower}
        setFilterBorrower={setFilterBorrower}
        filterCompany={filterCompany}
        setFilterCompany={setFilterCompany}
        uploadingId={uploadingId}
        onRowClick={handleRowClick}
        onDelete={handleDelete}
        onOpenFile={openFile}
        onFileUpload={handleFileUpload}
      />

      <ContractPreviewModal
        isOpen={!!selectedDeal}
        onClose={closeModal}
        selectedContractDeal={modalDeal}
        contractVersions={fileVersions}
        selectedContractVersion={selectedFileVersion}
        setSelectedContractVersionId={handleSelectFileVersion}
        isFetchingContract={isFetchingFile}
        selectedContractData={fileData}
        isImageContract={mimeType.startsWith("image/")}
        isPdfContract={mimeType === "application/pdf"}
        handleDeleteContractVersion={handleDeleteFile}
      />

      <PMDealEditModal
        editingDeal={editingDeal}
        editForm={editForm}
        editSaving={editSaving}
        onClose={closeEditModal}
        onSave={handleEditSave}
        onChange={handleEditChange}
        onBlur={handleEditBlur}
      />
    </>
  );
}
