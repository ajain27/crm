import { useState } from "react";
import { ReadOnlyCell } from "../../elements/elements";
import { formatPhone } from "../../../utils/utils";
import { Edit2, Check } from "lucide-react";
import Pagination from "../../pagination/Pagination";

const EMPTY_SET = new Set();

function BuyerData({
  filteredBuyers,
  buyers,
  deleteBuyer,
  updateBuyer,
  selectedIds = EMPTY_SET,
  onToggleSelect = () => {},
  onSelectAll = () => {},
  onSelectAllFiltered = () => {},
  propertyTypes = [],
}) {
  const [editingBuyerId, setEditingBuyerId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editFieldValue, setEditFieldValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBuyers.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBuyers.length);
  const paginatedBuyers = filteredBuyers.slice(startIndex, endIndex);

  const allPageSelected =
    paginatedBuyers.length > 0 &&
    paginatedBuyers.every((b) => selectedIds.has(b.id));
  const somePageSelected =
    !allPageSelected && paginatedBuyers.some((b) => selectedIds.has(b.id));

  function startEditingField(buyer, field) {
    setEditingBuyerId(buyer.id);
    setEditingField(field);
    if (field === "realEstateType") {
      const val = buyer.realEstateType;
      setEditFieldValue(Array.isArray(val) ? val : val ? [val] : []);
    } else {
      setEditFieldValue(buyer[field] || "");
    }
  }

  function saveField(id) {
    if (!editingField) return;
    updateBuyer(id, editingField, editFieldValue);
    setEditingBuyerId(null);
    setEditingField(null);
    setEditFieldValue("");
  }

  return (
    <div data-reveal="zoom" style={{ "--reveal-delay": "240ms" }}>
      <div className="table-wrap">
        <table className="compact-table">
          <thead>
            <tr>
              <th className="buyer-checkbox-cell">
                <input
                  type="checkbox"
                  className="buyer-checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected;
                  }}
                  onChange={() => onSelectAll(paginatedBuyers, allPageSelected)}
                  title="Select all on this page"
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>State</th>
              <th>City</th>
              <th>Buys</th>
              <th>Phone Number</th>
              <th>Notes</th>
            </tr>
          </thead>
          {allPageSelected &&
            filteredBuyers.length > paginatedBuyers.length && (
              <thead>
                <tr>
                  <td colSpan={8} className="buyer-select-all-banner">
                    {selectedIds.size === filteredBuyers.length ? (
                      <>
                        All <strong>{filteredBuyers.length}</strong> buyers are
                        selected.{" "}
                        <button
                          className="buyer-select-all-link"
                          onClick={() => onSelectAllFiltered(false)}
                        >
                          Clear selection
                        </button>
                      </>
                    ) : (
                      <>
                        All <strong>{paginatedBuyers.length}</strong> buyers on
                        this page are selected.{" "}
                        <button
                          className="buyer-select-all-link"
                          onClick={() => onSelectAllFiltered(true)}
                        >
                          Select all {filteredBuyers.length} buyers
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              </thead>
            )}
          <tbody>
            {paginatedBuyers.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--muted)",
                  }}
                >
                  No buyers found.
                </td>
              </tr>
            )}
            {paginatedBuyers.map((buyer, index) => (
              <tr
                key={buyer.id}
                data-reveal
                data-selected={selectedIds.has(buyer.id) ? "true" : undefined}
                style={{ "--reveal-delay": `${index * 35}ms` }}
              >
                <td className="buyer-checkbox-cell">
                  <input
                    type="checkbox"
                    className="buyer-checkbox"
                    checked={selectedIds.has(buyer.id)}
                    onChange={() => onToggleSelect(buyer.id)}
                  />
                </td>
                <ReadOnlyCell value={buyer.fullName} wide />
                <td>
                  {editingBuyerId === buyer.id && editingField === "email" ? (
                    <div className="inline-edit-row">
                      <input
                        id={`edit-email-${buyer.id}`}
                        className="editable-input wide"
                        value={editFieldValue}
                        onChange={(e) => setEditFieldValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveField(buyer.id);
                          if (e.key === "Escape") {
                            setEditingBuyerId(null);
                            setEditingField(null);
                          }
                        }}
                      />
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => saveField(buyer.id)}
                        title="Save"
                      >
                        <Check size={16} color="var(--green)" />
                      </button>
                    </div>
                  ) : (
                    <div className="field-with-action">
                      <span className="table-text">{buyer.email || "—"}</span>
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => startEditingField(buyer, "email")}
                        title="Edit Email"
                      >
                        <Edit2 size={16} color="var(--muted)" />
                      </button>
                    </div>
                  )}
                </td>
                <ReadOnlyCell value={buyer.state} small />
                <ReadOnlyCell value={buyer.city} />
                <td>
                  {editingBuyerId === buyer.id &&
                  editingField === "realEstateType" ? (
                    <div className="buyer-type-edit">
                      {propertyTypes.map((type) => (
                        <label key={type} className="buyer-type-option">
                          <input
                            type="checkbox"
                            className="buyer-checkbox"
                            checked={
                              Array.isArray(editFieldValue) &&
                              editFieldValue.includes(type)
                            }
                            onChange={() =>
                              setEditFieldValue((prev) =>
                                Array.isArray(prev) && prev.includes(type)
                                  ? prev.filter((t) => t !== type)
                                  : [
                                      ...(Array.isArray(prev) ? prev : []),
                                      type,
                                    ],
                              )
                            }
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => saveField(buyer.id)}
                        title="Save"
                      >
                        <Check size={16} color="var(--green)" />
                      </button>
                    </div>
                  ) : (
                    <div className="field-with-action">
                      <span className="table-text">
                        {(Array.isArray(buyer.realEstateType)
                          ? buyer.realEstateType
                          : buyer.realEstateType
                            ? [buyer.realEstateType]
                            : []
                        ).join(", ") || "—"}
                      </span>
                      <button
                        className="ghost-btn icon-button"
                        onClick={() =>
                          startEditingField(buyer, "realEstateType")
                        }
                        title="Edit Types"
                      >
                        <Edit2 size={16} color="var(--muted)" />
                      </button>
                    </div>
                  )}
                </td>
                <td>
                  {editingBuyerId === buyer.id && editingField === "phone" ? (
                    <div className="inline-edit-row">
                      <input
                        id={`edit-phone-${buyer.id}`}
                        className="editable-input narrow"
                        value={editFieldValue}
                        onChange={(e) =>
                          setEditFieldValue(formatPhone(e.target.value))
                        }
                        maxLength={12}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveField(buyer.id);
                          if (e.key === "Escape") {
                            setEditingBuyerId(null);
                            setEditingField(null);
                          }
                        }}
                      />
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => saveField(buyer.id)}
                        title="Save"
                      >
                        <Check size={16} color="var(--green)" />
                      </button>
                    </div>
                  ) : (
                    <div className="field-with-action">
                      <span className="table-text">
                        {buyer.phone ? formatPhone(buyer.phone) : "—"}
                      </span>
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => startEditingField(buyer, "phone")}
                        title="Edit Phone"
                      >
                        <Edit2 size={16} color="var(--muted)" />
                      </button>
                    </div>
                  )}
                </td>
                <td>
                  {editingBuyerId === buyer.id && editingField === "notes" ? (
                    <div className="inline-edit-row">
                      <textarea
                        id={`edit-notes-${buyer.id}`}
                        className="editable-input wide"
                        value={editFieldValue}
                        onChange={(e) => setEditFieldValue(e.target.value)}
                        autoFocus
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditingBuyerId(null);
                            setEditingField(null);
                          }
                        }}
                      />
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => saveField(buyer.id)}
                        title="Save"
                      >
                        <Check size={16} color="var(--green)" />
                      </button>
                    </div>
                  ) : (
                    <div className="field-with-action">
                      <span
                        className="table-text"
                        style={{
                          maxWidth: "120px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "block",
                        }}
                      >
                        {buyer.notes || "—"}
                      </span>
                      <button
                        className="ghost-btn icon-button"
                        onClick={() => startEditingField(buyer, "notes")}
                        title="Edit Notes"
                      >
                        <Edit2 size={16} color="var(--muted)" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      >
        <div>
          Showing {filteredBuyers.length > 0 ? startIndex + 1 : 0} to {endIndex}{" "}
          of {filteredBuyers.length} results (Total Buyers: {buyers.length})
        </div>
      </Pagination>
    </div>
  );
}

export default BuyerData;
