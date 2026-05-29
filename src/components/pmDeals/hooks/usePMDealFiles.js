import { useState } from "react";

const MAX_FILE_SIZE = 700 * 1024;

export function usePMDealFiles({
  deals,
  setDeals,
  currentUser,
  savePmDeal,
  savePmDealFile,
  fetchPmDealFile,
  deletePmDealFileById,
}) {
  const [uploadingId, setUploadingId] = useState(null);
  const [fileDataCache, setFileDataCache] = useState({});
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [isFetchingFile, setIsFetchingFile] = useState(false);

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

  return {
    uploadingId,
    isFetchingFile,
    selectedDeal,
    modalDeal,
    fileVersions,
    selectedFileVersion,
    fileData,
    mimeType,
    handleFileUpload,
    openFile,
    handleSelectFileVersion,
    handleDeleteFile,
    closeModal,
  };
}
