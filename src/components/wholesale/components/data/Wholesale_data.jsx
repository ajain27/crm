import { ReadOnlyCell } from "../../../elements/elements";
import { Trash2, FileText, Edit2, Check, Eye, Upload, Loader2 } from "lucide-react";
import { currency } from "../../../../utils/utils";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../../../pagination/Pagination";
import Modal from "../../../modal/Modal";
import {
  MAX_CONTRACT_FILE_SIZE,
  createContractVersion,
  getContractVersions,
} from "../wholesaleConfig";

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
  const [selectedContractDealId, setSelectedContractDealId] = useState(null);
  const [selectedContractVersionId, setSelectedContractVersionId] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [editingBuyerId, setEditingBuyerId] = useState(null);
  const [editingBuyerField, setEditingBuyerField] = useState(null);
  const [editBuyerValue, setEditBuyerValue] = useState("");
  const [uploadingDealId, setUploadingDealId] = useState(null);
  const [contractDataCache, setContractDataCache] = useState({});
  const [isFetchingContract, setIsFetchingContract] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "closedDate",
    direction: "desc",
  });
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredDeals, sortConfig]);

  const sortedDeals = useMemo(() => {
    const getSortValue = (deal) => {
      switch (sortConfig.key) {
        case "listedPrice":
        case "arv":
        case "rehabCost":
        case "mao":
        case "contractPrice":
        case "assignedPrice":
          return Number(deal[sortConfig.key] || 0);
        case "grossRevenue":
          return (
            Number(deal.assignedPrice || 0) - Number(deal.contractPrice || 0)
          );
        case "offerDate":
          return deal.offerDate || "";
        case "closedDate":
          return deal.closedDate || "";
        default:
          return "";
      }
    };

    return [...filteredDeals].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      if (aValue === bValue) return 0;

      if (sortConfig.direction === "asc") {
        return aValue > bValue ? 1 : -1;
      }

      return aValue < bValue ? 1 : -1;
    });
  }, [filteredDeals, sortConfig]);

  const totalPages = Math.ceil(sortedDeals.length / itemsPerPage) || 1;
  const currentDeals = sortedDeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }

  function getAriaSort(key) {
    if (sortConfig.key !== key) return "none";
    return sortConfig.direction === "asc" ? "ascending" : "descending";
  }

  function renderSortableHeader(label, key) {
    const isActive = sortConfig.key === key;
    const indicator = !isActive
      ? " ↕"
      : sortConfig.direction === "asc"
        ? " ↑"
        : " ↓";

    return (
      <th aria-sort={getAriaSort(key)}>
        <button
          type="button"
          className={`sort-header ${isActive ? "active" : ""}`}
          onClick={() => handleSort(key)}
        >
          {label}
          <span className="sort-indicator" aria-hidden="true">
            {indicator}
          </span>
        </button>
      </th>
    );
  }

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

  function updateDealPatch(id, patch) {
    const nextDeals = deals.map((dealItem) =>
      dealItem.id === id ? { ...dealItem, ...patch } : dealItem,
    );
    const updatedDeal = nextDeals.find((deal) => deal.id === id);

    return saveDeal(updatedDeal)
      .then((savedDeal) => {
        const persistedDeals = nextDeals.map((dealItem) =>
          dealItem.id === id ? savedDeal || updatedDeal : dealItem,
        );
        persist(persistedDeals);
      })
      .catch((error) => {
        console.error("Failed to update property", error);
        const detail = error?.message ? `\n\n${error.message}` : "";
        alert(`Unable to save contract. Check your database connection.${detail}`);
      });
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
      const encodedFile =
        typeof reader.result === "string" ? reader.result : "";
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
        setContractDataCache((prev) => ({
          ...prev,
          [newVersion.id]: encodedFile,
        }));
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
    const versionToDelete = versions.find((version) => version.id === versionId);
    if (!versionToDelete) return;
    if (
      !window.confirm(
        `Delete contract${versionToDelete?.name ? ` (${versionToDelete.name})` : ""} for ${deal.address}?`,
      )
    ) {
      return;
    }

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

    const nextVersions = versions.filter((version) => version.id !== versionId);
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

  function toEditableCurrency(value) {
    const amount = Number(value || 0);
    return amount > 0 ? currency(amount) : "";
  }

  function parseCurrencyInput(value) {
    return Number(String(value || "").replace(/[^0-9]/g, ""));
  }

  function startEditingBuyer(deal, field) {
    setEditingBuyerId(deal.id);
    setEditingBuyerField(field);
    setEditBuyerValue(deal[field] || "");
  }

  function cancelBuyerEdit() {
    setEditingBuyerId(null);
    setEditingBuyerField(null);
    setEditBuyerValue("");
  }

  function saveBuyerEdit(id) {
    if (!editingBuyerField) return;
    updateDeal(id, editingBuyerField, editBuyerValue);
    cancelBuyerEdit();
  }

  const handleRowClick = (deal) => {
    setSelectedDeal(deal);
    setNotesDraft(deal.notes || "");
  };

  const saveNotes = () => {
    if (selectedDeal) {
      updateDeal(selectedDeal.id, "notes", notesDraft);
      setSelectedDeal(null);
    }
  };

  const selectedContractDeal = deals.find(
    (deal) => deal.id === selectedContractDealId,
  );
  const contractVersions = selectedContractDeal
    ? getContractVersions(selectedContractDeal)
    : [];
  const selectedContractVersion =
    contractVersions.find((version) => version.id === selectedContractVersionId) ||
    contractVersions[0] ||
    null;
  const selectedContractData =
    contractDataCache[selectedContractVersion?.id] ||
    selectedContractVersion?.data ||
    "";
  const contractMimeType = selectedContractVersion?.type || "";
  const isImageContract = contractMimeType.startsWith("image/");
  const isPdfContract = contractMimeType === "application/pdf";
  const contractPreviewTitle = selectedContractDeal?.address
    ? `Contract for ${selectedContractDeal.address}`
    : "Contract Preview";

  async function updateDeal(id, field, value) {
    const deal = deals.find((d) => d.id === id);
    let resolvedClosedDate = deal?.closedDate || "";

    // Business Rule: Enforce the "Closed" requirements even on updates
    if (field === "closed" && value === "Yes") {
      const canClose = deal.sellerAccepted === "Yes" && deal.assigned === "Yes";

      if (!canClose) {
        alert(
          "Cannot Close: Offer must be 'Accepted', and 'Assigned' must be 'Yes'.",
        );
        return;
      }

      resolvedClosedDate = window.prompt(
        "Enter the close date (YYYY-MM-DD).",
        deal.closedDate || "",
      );

      if (!resolvedClosedDate) {
        return;
      }

      const isValidClosedDate = /^\d{4}-\d{2}-\d{2}$/.test(resolvedClosedDate);
      if (!isValidClosedDate) {
        alert("Please enter a valid close date in YYYY-MM-DD format.");
        return;
      }
    }

    const nextDeals = deals.map((dealItem) => {
      if (dealItem.id !== id) return dealItem;

      const nextDeal = { ...dealItem, [field]: value };
      if (field === "closed") {
        if (value === "Yes") {
          nextDeal.closedDate = resolvedClosedDate;
          nextDeal.closedInMonth = resolvedClosedDate.slice(5, 7);
        } else {
          nextDeal.closedDate = "";
          nextDeal.closedInMonth = "";
        }
      }

      return nextDeal;
    });

    const updatedDeal = nextDeals.find((deal) => deal.id === id);
    try {
      const savedDeal = (await saveDeal(updatedDeal)) || updatedDeal;
      const persistedDeals = nextDeals.map((dealItem) =>
        dealItem.id === id ? savedDeal : dealItem,
      );
      persist(persistedDeals);
      if (
        field === "offerDate" ||
        (field === "closed" && value === "Yes" && savedDeal.closedDate)
      ) {
        setFilters({
          state: "All",
          propertyType: "All",
          offerAccepted: "All",
          assigned: "All",
          search: "",
          closed: "All",
          offerMonth: "All",
          closedMonth: "All",
          year: "All",
        });
      }

      // Sync buyer info to buyers list if assigned and buyer details provided
      if (
        (field === "buyerName" || field === "buyerEmail") &&
        savedDeal.assigned === "Yes" &&
        savedDeal.buyerEmail?.trim() &&
        savedDeal.buyerName?.trim()
      ) {
        const existingBuyers = await fetchBuyers();
        const buyerEmail = savedDeal.buyerEmail.trim().toLowerCase();
        const existingBuyer = existingBuyers.find(
          (b) => b.email?.toLowerCase() === buyerEmail,
        );

        if (existingBuyer) {
          // Update existing buyer
          const updatedBuyer = {
            ...existingBuyer,
            fullName: savedDeal.buyerName.trim(),
          };
          await saveBuyer(updatedBuyer);
        } else {
          // Add new buyer
          const newBuyer = {
            id: crypto.randomUUID(),
            userId: savedDeal.userId,
            fullName: savedDeal.buyerName.trim(),
            email: buyerEmail,
            phone: "",
            city: savedDeal.city.trim(),
            state: savedDeal.state.trim().toUpperCase(),
            realEstateType: "Single Family",
          };
          await saveBuyer(newBuyer);
        }
      }
    } catch (error) {
      console.error("Failed to update property", error);
      alert("Unable to update property. Check your database connection.");
    }
  }

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
              <tr
                key={deal.id}
                data-deal-id={deal.id}
                data-reveal
                style={{ "--reveal-delay": `${index * 35}ms` }}
                className={deal.closed === "Yes" ? "closed-row" : ""}
              >
                {(() => {
                  const contractVersions = getContractVersions(deal);
                  const latestContractVersion = contractVersions[0];

                  return (
                    <>
                <td className="text-center">
                  <button
                    className="secondary-btn note-btn"
                    onClick={() => handleRowClick(deal)}
                    title="View/Edit Notes"
                  >
                    <FileText size={16} />
                  </button>
                </td>
                <ReadOnlyCell value={deal.address} wide />
                <ReadOnlyCell value={deal.city} />
                <ReadOnlyCell value={deal.zipCode} />
                <ReadOnlyCell value={deal.state} small />
                <ReadOnlyCell value={deal.propertyType || "—"} />
                <ReadOnlyCell value={deal.onMarket || "No"} />
                <ReadOnlyCell
                  value={
                    deal.onMarket === "Yes" && Number(deal.listedPrice || 0) > 0
                      ? currency(deal.listedPrice)
                      : "—"
                  }
                />
                <ReadOnlyCell value={currency(deal.arv)} />
                <ReadOnlyCell value={currency(deal.rehabCost)} />
                <ReadOnlyCell value={currency(deal.mao)} />
                <td>
                  <select
                    className={`badge ${deal.offerStatus?.toLowerCase()?.replaceAll(" ", "-")}`}
                    value={deal.offerStatus}
                    disabled={deal.closed === "Yes"}
                    onChange={(e) =>
                      updateDeal(deal.id, "offerStatus", e.target.value)
                    }
                  >
                    <option value="Not Sent">Not Sent</option>
                    <option value="Offer Sent">Offer Sent</option>
                  </select>
                </td>
                <td>
                  {deal.offerStatus === "Not Sent" ? (
                    <span className="placeholder-dash">—</span>
                  ) : (
                    <input
                      type="date"
                      className="readonly-input table-input date-input"
                      defaultValue={deal.offerDate || ""}
                      max={today}
                      disabled={deal.closed === "Yes"}
                      onBlur={(e) =>
                        updateDeal(deal.id, "offerDate", e.target.value)
                      }
                    />
                  )}
                </td>
                <td>
                  {deal.offerStatus === "Not Sent" ? (
                    <span className="placeholder-dash">—</span>
                  ) : (
                    <select
                      className={`badge ${deal.sellerAccepted?.toLowerCase()}`}
                      value={deal.sellerAccepted}
                      disabled={deal.closed === "Yes"}
                      onChange={(e) =>
                        updateDeal(deal.id, "sellerAccepted", e.target.value)
                      }
                    >
                      <option value="No">No</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Yes">Yes</option>
                    </select>
                  )}
                </td>
                <td>
                  {deal.offerStatus === "Not Sent" ? (
                    <span className="placeholder-dash">—</span>
                  ) : (
                    <div className="contract-actions">
                      {latestContractVersion ? (
                        <button
                          type="button"
                          className="secondary-btn contract-action-btn"
                          onClick={() => openContract(deal)}
                          title={
                            latestContractVersion.name || "View latest uploaded contract"
                          }
                          aria-label={`View contract for ${deal.address}`}
                        >
                          <Eye size={16} />
                        </button>
                      ) : null}
                      <label
                        htmlFor={`contract-upload-${deal.id}`}
                        className="secondary-btn contract-action-btn"
                        title={
                          uploadingDealId === deal.id
                            ? "Uploading…"
                            : latestContractVersion
                              ? "Replace uploaded contract"
                              : "Upload contract"
                        }
                        aria-label={
                          uploadingDealId === deal.id
                            ? "Uploading contract…"
                            : latestContractVersion
                              ? `Replace contract for ${deal.address}`
                              : `Upload contract for ${deal.address}`
                        }
                        aria-disabled={deal.closed === "Yes" || uploadingDealId === deal.id}
                        style={
                          deal.closed === "Yes" || uploadingDealId === deal.id
                            ? { opacity: 0.5, pointerEvents: "none" }
                            : undefined
                        }
                      >
                        {uploadingDealId === deal.id ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                      </label>
                      <input
                        id={`contract-upload-${deal.id}`}
                        className="contract-upload-input"
                        type="file"
                        accept="application/pdf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.formula,.odt,.odf,image/*"
                        disabled={deal.closed === "Yes" || uploadingDealId === deal.id}
                        onChange={(event) => handleContractUpload(deal, event)}
                      />
                    </div>
                  )}
                </td>
                <td>
                  {deal.offerStatus === "Not Sent" ? (
                    <span className="placeholder-dash">—</span>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      className="readonly-input table-input contract-input"
                      defaultValue={toEditableCurrency(deal.contractPrice)}
                      disabled={deal.closed === "Yes"}
                      onFocus={(e) => {
                        const numericValue = parseCurrencyInput(e.target.value);
                        e.target.value = numericValue
                          ? String(numericValue)
                          : "";
                      }}
                      onBlur={(e) => {
                        const val = parseCurrencyInput(e.target.value);
                        if (val > deal.arv && deal.arv > 0) {
                          alert(
                            `Contract price cannot be more than ARV (${currency(deal.arv)}).`,
                          );
                          e.target.value = toEditableCurrency(
                            deal.contractPrice,
                          );
                          return;
                        }
                        e.target.value = toEditableCurrency(val);
                        updateDeal(deal.id, "contractPrice", val);
                      }}
                    />
                  )}
                </td>
                <td>
                  {deal.sellerAccepted === "No" ? (
                    <span className="placeholder-dash">—</span>
                  ) : (
                    <select
                      className={`badge ${deal.assigned?.toLowerCase()}`}
                      value={deal.assigned}
                      disabled={deal.closed === "Yes"}
                      onChange={(e) =>
                        updateDeal(deal.id, "assigned", e.target.value)
                      }
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  )}
                </td>
                <td>
                  {deal.assigned === "Yes" ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      className="readonly-input table-input contract-input"
                      defaultValue={toEditableCurrency(deal.assignedPrice)}
                      disabled={deal.closed === "Yes"}
                      onFocus={(e) => {
                        const numericValue = parseCurrencyInput(e.target.value);
                        e.target.value = numericValue
                          ? String(numericValue)
                          : "";
                      }}
                      onBlur={(e) => {
                        const val = parseCurrencyInput(e.target.value);
                        if (
                          val < deal.contractPrice &&
                          val > 0 &&
                          deal.contractPrice > 0
                        ) {
                          alert(
                            `Assigned price needs to be more than or equal to contract price (${currency(deal.contractPrice)}).`,
                          );
                          e.target.value = toEditableCurrency(
                            deal.assignedPrice,
                          );
                          return;
                        }
                        e.target.value = toEditableCurrency(val);
                        updateDeal(deal.id, "assignedPrice", val);
                      }}
                    />
                  ) : (
                    <span className="placeholder-dash">—</span>
                  )}
                </td>
                <td>
                  {deal.assigned === "Yes" ? (
                    <div className="buyer-info-cell">
                      <div className="buyer-line">
                        <span className="buyer-label">Name</span>
                        {editingBuyerId === deal.id &&
                        editingBuyerField === "buyerName" ? (
                          <>
                            <input
                              type="text"
                              className="readonly-input table-input buyer-edit-input"
                              value={editBuyerValue}
                              onChange={(e) =>
                                setEditBuyerValue(e.target.value)
                              }
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveBuyerEdit(deal.id);
                                if (e.key === "Escape") cancelBuyerEdit();
                              }}
                            />
                            <button
                              className="ghost-btn icon-button"
                              onClick={() => saveBuyerEdit(deal.id)}
                              title="Save Name"
                            >
                              <Check size={16} color="var(--green)" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="table-text">
                              {deal.buyerName || "—"}
                            </span>
                            <button
                              className="ghost-btn icon-button"
                              onClick={() =>
                                startEditingBuyer(deal, "buyerName")
                              }
                              title="Edit Name"
                            >
                              <Edit2 size={16} color="var(--muted)" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="buyer-line">
                        <span className="buyer-label">Email</span>
                        {editingBuyerId === deal.id &&
                        editingBuyerField === "buyerEmail" ? (
                          <>
                            <input
                              type="email"
                              className="readonly-input table-input buyer-edit-input"
                              value={editBuyerValue}
                              onChange={(e) =>
                                setEditBuyerValue(e.target.value)
                              }
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveBuyerEdit(deal.id);
                                if (e.key === "Escape") cancelBuyerEdit();
                              }}
                            />
                            <button
                              className="ghost-btn icon-button"
                              onClick={() => saveBuyerEdit(deal.id)}
                              title="Save Email"
                            >
                              <Check size={16} color="var(--green)" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="table-text">
                              {deal.buyerEmail || "—"}
                            </span>
                            <button
                              className="ghost-btn icon-button"
                              onClick={() =>
                                startEditingBuyer(deal, "buyerEmail")
                              }
                              title="Edit Email"
                            >
                              <Edit2 size={16} color="var(--muted)" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="placeholder-dash">—</span>
                  )}
                </td>
                <td>
                  <select
                    className={`badge ${deal.closed?.toLowerCase()}`}
                    value={deal.closed}
                    disabled={deal.closed === "Yes"}
                    onChange={(e) =>
                      updateDeal(deal.id, "closed", e.target.value)
                    }
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </td>
                <td>
                  {deal.closed === "Yes" ? (
                    <input
                      type="date"
                      className="readonly-input date-input closed-date-input"
                      value={deal.closedDate || ""}
                      disabled
                      readOnly
                    />
                  ) : (
                    <span className="placeholder-dash">—</span>
                  )}
                </td>
                <td>
                  {deal.closed === "Yes" ? (
                    <strong className="revenue-value">
                      {currency(
                        Number(deal.assignedPrice || 0) -
                          Number(deal.contractPrice || 0),
                      )}
                    </strong>
                  ) : (
                    <span className="placeholder-dash">—</span>
                  )}
                </td>
                <td>
                  <button
                    className="danger-btn"
                    title="Delete"
                    onClick={() => deleteDeal(deal.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
                    </>
                  );
                })()}
              </tr>
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

      <Modal
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        title={`Notes for ${selectedDeal?.address}`}
        actions={
          <>
            <button
              className="secondary-btn"
              onClick={() => setSelectedDeal(null)}
            >
              Cancel
            </button>
            <button className="primary-btn" onClick={saveNotes}>
              Save Notes
            </button>
          </>
        }
      >
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows="6"
          placeholder="Add your notes here..."
        />
      </Modal>

      <Modal
        isOpen={!!selectedContractDeal}
        onClose={() => {
          setSelectedContractDealId(null);
          setSelectedContractVersionId(null);
        }}
        title={contractPreviewTitle}
        className="contract-preview-dialog"
      >
        <div className="contract-preview-modal">
          {contractVersions.length > 0 ? (
            <div className="contract-version-list">
              {contractVersions.map((version) => (
                <div
                  key={version.id}
                  className={`contract-version-item ${
                    selectedContractVersion?.id === version.id ? "active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="contract-version-select"
                    onClick={() => setSelectedContractVersionId(version.id)}
                  >
                    <div className="contract-version-copy">
                      <strong>{version.name}</strong>
                      <span>
                        {version.uploadedAt
                          ? new Date(version.uploadedAt).toLocaleString()
                          : "Uploaded contract"}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn contract-version-delete"
                    onClick={() => {
                      handleDeleteContractVersion(selectedContractDeal, version.id);
                    }}
                    aria-label={`Delete ${version.name}`}
                    title={`Delete ${version.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {selectedContractVersion?.name ? (
            <div className="contract-preview-meta">
              {selectedContractVersion.name}
            </div>
          ) : null}
          {isFetchingContract ? (
            <div className="contract-preview-fallback">
              <Loader2 size={20} className="spin" /> Loading contract…
            </div>
          ) : selectedContractData ? (
            isImageContract ? (
              <img
                src={selectedContractData}
                alt={selectedContractVersion.name || "Contract preview"}
                className="contract-preview-image"
              />
            ) : isPdfContract ? (
              <iframe
                title={selectedContractVersion.name || "Contract preview"}
                src={selectedContractData}
                className="contract-preview-frame"
              />
            ) : (
              <object
                data={selectedContractData}
                type={selectedContractVersion.type || "application/octet-stream"}
                className="contract-preview-frame"
              >
                <div className="contract-preview-fallback">
                  Preview is limited for this file type.
                </div>
              </object>
            )
          ) : (
            <div className="contract-preview-fallback">
              {contractVersions.length > 0
                ? "Contract data could not be loaded. Delete this version and re-upload the file."
                : "No contract file has been uploaded for this deal."}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default Wholesale_data;
