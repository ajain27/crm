import { Trash2, Eye, Upload, Loader2 } from "lucide-react";
import { fmt, formatDate, parseCurrency } from "../../utils/utils";
import ClearFiltersButton from "../elements/ClearFiltersButton";

function addMonths(dateStr, months) {
  if (!dateStr || months <= 0) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekdaysBetween(fromStr, toStr) {
  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T00:00:00");
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return 0;
  let count = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + 1);
  while (cur <= to) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function computeDeal(deal, today) {
  const principal = parseCurrency(deal.amountLent);
  const rate = parseCurrency(deal.interestRate);
  const monthsNum = parseCurrency(deal.months);
  const dueDate =
    deal.lendDate && monthsNum > 0 ? addMonths(deal.lendDate, monthsNum) : "";
  const lateDays = dueDate ? weekdaysBetween(dueDate, today) : 0;
  const interest = principal > 0 && rate > 0 ? principal * (rate / 100) : 0;
  const lateFee = lateDays * 100;
  const totalPayout = principal + interest + lateFee;
  return { principal, dueDate, lateDays, interest, lateFee, totalPayout };
}

export default function PMDealsTable({
  deals,
  filteredDeals,
  today,
  filterBorrower,
  setFilterBorrower,
  filterCompany,
  setFilterCompany,
  uploadingId,
  onRowClick,
  onDelete,
  onOpenFile,
  onFileUpload,
}) {
  const totals = filteredDeals.reduce(
    (acc, d) => {
      const { principal, interest, lateFee, totalPayout } = computeDeal(
        d,
        today,
      );
      return {
        principal: acc.principal + principal,
        interest: acc.interest + interest,
        lateFee: acc.lateFee + lateFee,
        totalPayout: acc.totalPayout + totalPayout,
      };
    },
    { principal: 0, interest: 0, lateFee: 0, totalPayout: 0 },
  );

  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "140ms" }}
    >
      <div className="panel-header">
        <div>
          <h2>PML Deals</h2>
          <p>
            {deals.length === 0
              ? "No deals yet."
              : filteredDeals.length === deals.length
                ? `${deals.length} deal${deals.length !== 1 ? "s" : ""}`
                : `${filteredDeals.length} of ${deals.length} deal${deals.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {deals.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              value={filterBorrower}
              onChange={(e) => setFilterBorrower(e.target.value)}
              placeholder="Filter by borrower…"
              style={{
                minWidth: 160,
                border: "1px solid var(--input-border)",
                borderRadius: 8,
                padding: "0.4rem 0.65rem",
                fontSize: "0.85rem",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
            <input
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              placeholder="Filter by company…"
              style={{
                minWidth: 160,
                border: "1px solid var(--input-border)",
                borderRadius: 8,
                padding: "0.4rem 0.65rem",
                fontSize: "0.85rem",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
            <ClearFiltersButton
              onClear={() => {
                setFilterBorrower("");
                setFilterCompany("");
              }}
              hasActiveFilters={Boolean(filterBorrower || filterCompany)}
              label="Clear"
            />
          </div>
        )}
      </div>

      {deals.length === 0 ? (
        <div className="leads-empty">
          <p>Add your first PM deal above.</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="leads-empty">
          <p>No deals match your filters.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Borrower Name</th>
                <th>Company</th>
                <th>Property Address</th>
                <th>Amount Lent</th>
                <th>Rate</th>
                <th>Term</th>
                <th>Lend Date</th>
                <th>Due Date</th>
                <th>Days Late</th>
                <th>Interest</th>
                <th>Late Fee</th>
                <th>Total Payout</th>
                <th>Files</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => {
                const {
                  principal,
                  dueDate,
                  lateDays,
                  interest,
                  lateFee,
                  totalPayout,
                } = computeDeal(deal, today);
                const isUploading = uploadingId === deal.id;
                const fileCount = deal.files?.length ?? 0;

                return (
                  <tr
                    key={deal.id}
                    onClick={() => onRowClick(deal)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{deal.borrowerName}</td>
                    <td>{deal.borrowerCompany || "—"}</td>
                    <td>{deal.propertyAddress || "—"}</td>
                    <td>{fmt(principal)}</td>
                    <td>{deal.interestRate}</td>
                    <td>{deal.months}</td>
                    <td>{formatDate(deal.lendDate)}</td>
                    <td>{dueDate ? formatDate(dueDate) : "—"}</td>
                    <td>
                      {dueDate ? (
                        <span
                          style={{
                            color: lateDays > 0 ? "#dc2626" : "inherit",
                            fontWeight: lateDays > 0 ? 600 : "inherit",
                          }}
                        >
                          {lateDays}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ color: "#16a34a", fontWeight: 600 }}>
                      {fmt(interest)}
                    </td>
                    <td
                      style={{
                        color: lateFee > 0 ? "#dc2626" : "inherit",
                        fontWeight: lateFee > 0 ? 600 : "inherit",
                      }}
                    >
                      {fmt(lateFee)}
                    </td>
                    <td style={{ color: "#16a34a", fontWeight: 600 }}>
                      {fmt(totalPayout)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="contract-actions">
                        {fileCount > 0 && (
                          <button
                            type="button"
                            className="secondary-btn contract-action-btn"
                            onClick={() => onOpenFile(deal)}
                            title={`${fileCount} file${fileCount !== 1 ? "s" : ""} uploaded`}
                            aria-label={`View files for ${deal.borrowerName}`}
                          >
                            <Eye size={16} />
                            {fileCount > 1 && (
                              <span style={{ fontSize: 11, marginLeft: 2 }}>
                                {fileCount}
                              </span>
                            )}
                          </button>
                        )}
                        <label
                          htmlFor={`pm-upload-${deal.id}`}
                          className="secondary-btn contract-action-btn"
                          title={isUploading ? "Uploading…" : "Upload file"}
                          aria-label={
                            isUploading
                              ? "Uploading…"
                              : `Upload file for ${deal.borrowerName}`
                          }
                          style={
                            isUploading
                              ? { opacity: 0.5, pointerEvents: "none" }
                              : undefined
                          }
                        >
                          {isUploading ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <Upload size={16} />
                          )}
                        </label>
                        <input
                          id={`pm-upload-${deal.id}`}
                          type="file"
                          className="contract-upload-input"
                          accept=".pdf,.odt,.odf,image/*"
                          disabled={isUploading}
                          onChange={(e) => onFileUpload(deal, e)}
                        />
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="leads-delete-btn"
                        title="Delete deal"
                        onClick={() => onDelete(deal.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}
              >
                <td
                  colSpan={3}
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Totals ({filteredDeals.length})
                </td>
                <td>{fmt(totals.principal)}</td>
                <td colSpan={4} />
                <td />
                <td style={{ color: "#16a34a" }}>{fmt(totals.interest)}</td>
                <td
                  style={{
                    color: totals.lateFee > 0 ? "#dc2626" : "inherit",
                  }}
                >
                  {fmt(totals.lateFee)}
                </td>
                <td style={{ color: "#16a34a" }}>{fmt(totals.totalPayout)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
