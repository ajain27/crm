import { ReadOnlyCell } from "../../../elements/elements";
import { Trash2, Edit2, Check, Eye, Upload, Loader2 } from "lucide-react";
import { currency } from "../../../../utils/utils";
import { getContractVersions } from "../crmConfig";

function toEditableCurrency(value) {
  const amount = Number(value || 0);
  return amount > 0 ? currency(amount) : "";
}

function parseCurrencyInput(value) {
  return Number(String(value || "").replace(/[^0-9]/g, ""));
}

function DealRow({
  deal,
  index,
  today,
  updateDeal,
  deleteDeal,
  openContract,
  handleContractUpload,
  uploadingDealId,
  onRowDetailClick,
  isSelected,
  onToggleSelect,
  editingBuyerId,
  editingBuyerField,
  editBuyerValue,
  setEditBuyerValue,
  startEditingBuyer,
  cancelBuyerEdit,
  saveBuyerEdit,
}) {
  const contractVersions = getContractVersions(deal);
  const latestContractVersion = contractVersions[0];

  const isRejected =
    deal.offerStatus === "Offer Sent" && deal.sellerAccepted === "No";
  const isWithdrawn = deal.offerStatus === "Offer Withdrawn";

  function handleTrClick(e) {
    const tag = e.target.tagName.toLowerCase();
    if (
      ["input", "select", "button", "a", "label", "svg", "path"].includes(tag)
    )
      return;
    onRowDetailClick(deal);
  }

  return (
    <tr
      data-deal-id={deal.id}
      data-reveal
      style={{ "--reveal-delay": `${index * 35}ms` }}
      className={`clickable-row ${deal.closed === "Yes" ? "closed-row" : isRejected ? "rejected-row" : isWithdrawn ? "withdrawn-row" : ""}`}
      onClick={handleTrClick}
    >
      <td className="text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="row-checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(deal.id)}
        />
      </td>
      <td className="text-center" onClick={(e) => e.stopPropagation()}>
        <button
          className="danger-btn"
          title="Delete"
          onClick={() => deleteDeal(deal.id)}
        >
          <Trash2 size={16} />
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
      <td>
        {deal.onMarket === "Yes" &&
        (deal.agentName || deal.agentPhone || deal.listingUrl) ? (
          <div className="buyer-info-cell">
            {deal.agentName ? (
              <div className="buyer-line">
                <span className="buyer-label">Name</span>
                <span className="table-text">{deal.agentName}</span>
              </div>
            ) : null}
            {deal.agentPhone ? (
              <div className="buyer-line">
                <span className="buyer-label">Phone</span>
                <span className="table-text">{deal.agentPhone}</span>
              </div>
            ) : null}
            {deal.listingUrl ? (
              <div className="buyer-line">
                <span className="buyer-label">Link</span>
                <a
                  href={deal.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="table-text"
                  title={deal.listingUrl}
                >
                  View ↗
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <span className="placeholder-dash">—</span>
        )}
      </td>
      <ReadOnlyCell value={currency(deal.arv)} />
      <ReadOnlyCell value={currency(deal.rehabCost)} />
      <ReadOnlyCell value={currency(deal.mao)} />

      <td>
        <select
          className={`badge ${deal.offerStatus?.toLowerCase()?.replaceAll(" ", "-")}`}
          value={deal.offerStatus}
          disabled={deal.closed === "Yes"}
          onChange={(e) => updateDeal(deal.id, "offerStatus", e.target.value)}
        >
          <option value="Not Sent">Not Sent</option>
          <option value="Offer Sent">Offer Sent</option>
          <option value="Offer Withdrawn">Offer Withdrawn</option>
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
            onBlur={(e) => updateDeal(deal.id, "offerDate", e.target.value)}
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
              aria-disabled={
                deal.closed === "Yes" || uploadingDealId === deal.id
              }
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
              e.target.value = numericValue ? String(numericValue) : "";
            }}
            onBlur={(e) => {
              const val = parseCurrencyInput(e.target.value);
              if (val > deal.arv && deal.arv > 0) {
                alert(
                  `Contract price cannot be more than ARV (${currency(deal.arv)}).`,
                );
                e.target.value = toEditableCurrency(deal.contractPrice);
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
            onChange={(e) => updateDeal(deal.id, "assigned", e.target.value)}
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
                e.target.value = toEditableCurrency(deal.assignedPrice);
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
                    onChange={(e) => setEditBuyerValue(e.target.value)}
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
                  <span className="table-text">{deal.buyerName || "—"}</span>
                  <button
                    className="ghost-btn icon-button"
                    onClick={() => startEditingBuyer(deal, "buyerName")}
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
                    onChange={(e) => setEditBuyerValue(e.target.value)}
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
                  <span className="table-text">{deal.buyerEmail || "—"}</span>
                  <button
                    className="ghost-btn icon-button"
                    onClick={() => startEditingBuyer(deal, "buyerEmail")}
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
        <div className="buyer-info-cell">
          <div className="buyer-line">
            <select
              className={`badge ${(deal.jvDeal || "no")?.toLowerCase()}`}
              value={deal.jvDeal || "No"}
              onChange={(e) => {
                updateDeal(deal.id, "jvDeal", e.target.value);
                if (e.target.value === "No") {
                  updateDeal(deal.id, "jvPartnerName", "");
                  updateDeal(deal.id, "jvPartnerEmail", "");
                  updateDeal(deal.id, "jvSplit", 0);
                }
              }}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {deal.jvDeal === "Yes" && (
            <>
              <div className="buyer-line">
                <span className="buyer-label">Partner</span>
                {editingBuyerId === deal.id &&
                editingBuyerField === "jvPartnerName" ? (
                  <>
                    <input
                      type="text"
                      className="readonly-input table-input buyer-edit-input"
                      value={editBuyerValue}
                      onChange={(e) => setEditBuyerValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveBuyerEdit(deal.id);
                        if (e.key === "Escape") cancelBuyerEdit();
                      }}
                    />
                    <button
                      className="ghost-btn icon-button"
                      onClick={() => saveBuyerEdit(deal.id)}
                      title="Save"
                    >
                      <Check size={16} color="var(--green)" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="table-text">
                      {deal.jvPartnerName || "—"}
                    </span>
                    <button
                      className="ghost-btn icon-button"
                      onClick={() => startEditingBuyer(deal, "jvPartnerName")}
                      title="Edit Partner Name"
                    >
                      <Edit2 size={16} color="var(--muted)" />
                    </button>
                  </>
                )}
              </div>
              <div className="buyer-line">
                <span className="buyer-label">Email</span>
                {editingBuyerId === deal.id &&
                editingBuyerField === "jvPartnerEmail" ? (
                  <>
                    <input
                      type="email"
                      className="readonly-input table-input buyer-edit-input"
                      value={editBuyerValue}
                      onChange={(e) => setEditBuyerValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveBuyerEdit(deal.id);
                        if (e.key === "Escape") cancelBuyerEdit();
                      }}
                    />
                    <button
                      className="ghost-btn icon-button"
                      onClick={() => saveBuyerEdit(deal.id)}
                      title="Save"
                    >
                      <Check size={16} color="var(--green)" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="table-text">
                      {deal.jvPartnerEmail || "—"}
                    </span>
                    <button
                      className="ghost-btn icon-button"
                      onClick={() => startEditingBuyer(deal, "jvPartnerEmail")}
                      title="Edit Partner Email"
                    >
                      <Edit2 size={16} color="var(--muted)" />
                    </button>
                  </>
                )}
              </div>
              <div className="buyer-line">
                <span className="buyer-label">Split</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="readonly-input table-input contract-input"
                  defaultValue={toEditableCurrency(deal.jvSplit)}
                  onFocus={(e) => {
                    const num = parseCurrencyInput(e.target.value);
                    e.target.value = num ? String(num) : "";
                  }}
                  onBlur={(e) => {
                    const val = parseCurrencyInput(e.target.value);
                    e.target.value = toEditableCurrency(val);
                    updateDeal(deal.id, "jvSplit", val);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </td>

      <td>
        <select
          className={`badge ${deal.closed?.toLowerCase()}`}
          value={deal.closed}
          disabled={deal.closed === "Yes"}
          onChange={(e) => updateDeal(deal.id, "closed", e.target.value)}
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
              Number(deal.assignedPrice || 0) - Number(deal.contractPrice || 0),
            )}
          </strong>
        ) : (
          <span className="placeholder-dash">—</span>
        )}
      </td>
    </tr>
  );
}

export default DealRow;
