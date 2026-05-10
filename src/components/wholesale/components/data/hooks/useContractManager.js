import { useState } from "react";
import {
  MAX_CONTRACT_FILE_SIZE,
  createContractVersion,
  getContractVersions,
} from "../../wholesaleConfig";

export function useContractManager({
  deals,
  saveContractVersion,
  fetchContractVersion,
  deleteContractById,
  currentUserId,
  updateDealPatch,
}) {
  const [uploadingDealId, setUploadingDealId] = useState(null);
  const [contractDataCache, setContractDataCache] = useState({});
  const [isFetchingContract, setIsFetchingContract] = useState(false);
  const [selectedContractDealId, setSelectedContractDealId] = useState(null);
  const [selectedContractVersionId, setSelectedContractVersionId] = useState(null);

  async function openContract(deal) {
    const versions = getContractVersions(deal);
    if (versions.length === 0) return;
    setSelectedContractDealId(deal.id);
    setSelectedContractVersionId(versions[0].id);

    const uncached = versions.filter((v) => !contractDataCache[v.id]);
    if (uncached.length === 0) return;

    setIsFetchingContract(true);
    try {
      const fetched = await Promise.all(
        uncached.map((v) => fetchContractVersion(deal.id, v.id)),
      );
      setContractDataCache((prev) => {
        const next = { ...prev };
        fetched.forEach((doc) => {
          if (doc?.id) next[doc.id] = doc.data || "";
        });
        return next;
      });
    } catch (error) {
      console.error("Failed to load contract", error);
    } finally {
      setIsFetchingContract(false);
    }
  }

  function buildContractPatch(versions) {
    const latestVersion = versions[0];
    return {
      contractVersions: versions.map(({ data, ...rest }) => rest),
      contractFileName: latestVersion?.name || "",
      contractFileType: latestVersion?.type || "",
      contractFileData: "",
    };
  }

  function handleContractUpload(deal, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSupportedType =
      file.type === "application/pdf" ||
      file.type === "application/vnd.oasis.opendocument.text" ||
      file.type === "application/vnd.oasis.opendocument.formula" ||
      file.type.startsWith("image/") ||
      /\.odt$/i.test(file.name) ||
      /\.odf$/i.test(file.name);

    if (!isSupportedType) {
      alert("Please choose a PDF, ODF/ODT, or image file for the contract.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_CONTRACT_FILE_SIZE) {
      alert("Contract file must be smaller than 700 KB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const encodedFile = typeof reader.result === "string" ? reader.result : "";
      const newVersion = createContractVersion({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: encodedFile,
      });
      const existingVersions = getContractVersions(deal);
      const nextVersions = [newVersion, ...existingVersions];

      setUploadingDealId(deal.id);
      try {
        await saveContractVersion({
          id: newVersion.id,
          dealId: deal.id,
          userId: currentUserId,
          name: newVersion.name,
          type: newVersion.type,
          data: encodedFile,
          uploadedAt: newVersion.uploadedAt,
        });
        setContractDataCache((prev) => ({ ...prev, [newVersion.id]: encodedFile }));
        await updateDealPatch(deal.id, buildContractPatch(nextVersions));
      } catch (error) {
        console.error("Failed to upload contract", error);
        const detail = error?.message ? `\n\n${error.message}` : "";
        alert(`Unable to upload contract. Check your database connection.${detail}`);
      } finally {
        setUploadingDealId(null);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleDeleteContractVersion(deal, versionId) {
    const versions = getContractVersions(deal);
    const versionToDelete = versions.find((v) => v.id === versionId);
    if (!versionToDelete) return;
    if (
      !window.confirm(
        `Delete contract${versionToDelete?.name ? ` (${versionToDelete.name})` : ""} for ${deal.address}?`,
      )
    )
      return;

    try {
      await deleteContractById(deal.id, versionId);
      setContractDataCache((prev) => {
        const next = { ...prev };
        delete next[versionId];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete contract", error);
    }

    const nextVersions = versions.filter((v) => v.id !== versionId);
    await updateDealPatch(deal.id, buildContractPatch(nextVersions));

    if (selectedContractDealId === deal.id) {
      if (nextVersions.length > 0) {
        setSelectedContractVersionId((currentId) =>
          currentId === versionId ? nextVersions[0].id : currentId,
        );
      } else {
        setSelectedContractDealId(null);
        setSelectedContractVersionId(null);
      }
    }
  }

  function closeContractModal() {
    setSelectedContractDealId(null);
    setSelectedContractVersionId(null);
  }

  return {
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
  };
}
