import { ReadOnlyCell } from "../../elements";
import { Trash2, FileText, Edit2, Check } from "lucide-react";
import { currency } from "../../../utils/utils";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../../pagination/Pagination";
import Modal from "../../modal/Modal";

function Wholesale_data({
  filteredDeals,
  deals,
  deleteDeal,
  persist,
  saveDeal,
  fetchBuyers,
  saveBuyer,
  setFilters = () => {},
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [editingBuyerId, setEditingBuyerId] = useState(null);
  const [editingBuyerField, setEditingBuyerField] = useState(null);
  const [editBuyerValue, setEditBuyerValue] = useState("");
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
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }

  function getAriaSort(key) {
    if (sortConfig.key !== key) return "none";
    return sortConfig.direction === "asc" ? "ascending" : "descending";
  }

  function renderSortableHeader(label, key) {
    const isActive = sortConfig.key === key;
    const indicator = !isActive ? " ↕" : sortConfig.direction === "asc" ? " ↑" : " ↓";

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
      await saveDeal(updatedDeal);
      persist(nextDeals);
      if (
        field === "offerDate" ||
        (field === "closed" && value === "Yes" && updatedDeal.closedDate)
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
        updatedDeal.assigned === "Yes" &&
        updatedDeal.buyerEmail?.trim() &&
        updatedDeal.buyerName?.trim()
      ) {
        const existingBuyers = await fetchBuyers();
        const buyerEmail = updatedDeal.buyerEmail.trim().toLowerCase();
        const existingBuyer = existingBuyers.find(
          (b) => b.email?.toLowerCase() === buyerEmail,
        );

        if (existingBuyer) {
          // Update existing buyer
          const updatedBuyer = {
            ...existingBuyer,
            fullName: updatedDeal.buyerName.trim(),
          };
          await saveBuyer(updatedBuyer);
        } else {
          // Add new buyer
          const newBuyer = {
            id: crypto.randomUUID(),
            userId: updatedDeal.userId,
            fullName: updatedDeal.buyerName.trim(),
            email: buyerEmail,
            phone: "",
            city: updatedDeal.city.trim(),
            state: updatedDeal.state.trim().toUpperCase(),
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
    <>
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
            {currentDeals.map((deal) => (
              <tr
                key={deal.id}
                data-deal-id={deal.id}
                className={deal.closed === "Yes" ? "closed-row" : ""}
              >
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
                    <input
                      type="text"
                      inputMode="numeric"
                      className="readonly-input table-input contract-input"
                      defaultValue={toEditableCurrency(deal.contractPrice)}
                      disabled={deal.closed === "Yes"}
                      onFocus={(e) => {
                        const numericValue = parseCurrencyInput(e.target.value);
                        e.target.value = numericValue ? String(numericValue) : "";
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
                        e.target.value = numericValue ? String(numericValue) : "";
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
    </>
  );
}

export default Wholesale_data;
