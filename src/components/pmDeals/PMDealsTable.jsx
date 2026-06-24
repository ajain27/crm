import { useMemo } from "react";
import { fmt, formatDate, parseCurrency } from "../../utils/utils";
import ClearFiltersButton from "../elements/ClearFiltersButton";
import { AccordionHeaderCell } from "../elements/elements";
import "./PMDealsTable.css";

// When a borrower has more than one deal, number them "Deal 1", "Deal 2"…
// (earliest lendDate first) so the accordion heading can tell them apart.
function buildDealNumbers(deals) {
  const byBorrower = new Map();
  deals.forEach((deal) => {
    const key = (deal.borrowerName || "").trim().toLowerCase();
    if (!byBorrower.has(key)) byBorrower.set(key, []);
    byBorrower.get(key).push(deal);
  });

  const numbers = {};
  byBorrower.forEach((group) => {
    if (group.length < 2) return;
    [...group]
      .sort((a, b) => (a.lendDate || "").localeCompare(b.lendDate || ""))
      .forEach((deal, index) => {
        numbers[deal.id] = index + 1;
      });
  });
  return numbers;
}

// Groups deals (in their existing order) by borrower so deals belonging to
// the same borrower render inside a single accordion card on mobile, divided
// by their "Deal N" numbering, instead of one card per deal.
function groupDealsByBorrower(deals, dealNumbers) {
  const groups = [];
  const byKey = new Map();
  deals.forEach((deal) => {
    const key = (deal.borrowerName || "").trim().toLowerCase();
    if (!byKey.has(key)) {
      const group = { key, borrowerName: deal.borrowerName, deals: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).deals.push(deal);
  });
  groups.forEach((group) => {
    if (group.deals.length > 1) {
      group.deals.sort(
        (a, b) => (dealNumbers[a.id] || 0) - (dealNumbers[b.id] || 0),
      );
    }
  });
  return groups;
}

// Desktop-visible columns only: Borrower Name, Company, Amount Lent, Term,
// Details. Every other column still exists in the DOM (so the mobile
// accordion can expand into it) but is hidden at desktop widths.
const PM_VISIBLE_COLUMN_COUNT = 5;

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
  onRowClick,
}) {
  const dealNumbers = useMemo(() => buildDealNumbers(deals), [deals]);
  const groupedDeals = useMemo(
    () => groupDealsByBorrower(filteredDeals, dealNumbers),
    [filteredDeals, dealNumbers],
  );

  function renderDealRow(deal, { isGroupMember = false } = {}) {
    const { principal, dueDate, lateDays, interest, lateFee, totalPayout } =
      computeDeal(deal, today);
    const headerValue = dealNumbers[deal.id]
      ? `${deal.borrowerName} — Deal ${dealNumbers[deal.id]}`
      : deal.borrowerName;

    return (
      <tr
        key={deal.id}
        className={isGroupMember ? "acc-group-deal-row" : undefined}
        onClick={() => onRowClick(deal)}
        style={{ cursor: "pointer" }}
      >
        {isGroupMember ? (
          <td className="acc-group-deal-label" data-label="Deal">
            Deal {dealNumbers[deal.id]}
          </td>
        ) : (
          <AccordionHeaderCell
            id={deal.id}
            label="Borrower Name"
            value={headerValue}
          />
        )}
        <td data-label="Company">{deal.borrowerCompany || "—"}</td>
        <td className="pm-col-extra" data-label="Property Address">
          {deal.propertyAddress || "—"}
        </td>
        <td data-label="Amount Lent">{fmt(principal)}</td>
        <td className="pm-col-extra" data-label="Rate">
          {deal.interestRate}
        </td>
        <td data-label="Term">{deal.months}</td>
        <td className="pm-col-extra" data-label="Lend Date">
          {formatDate(deal.lendDate)}
        </td>
        <td className="pm-col-extra" data-label="Due Date">
          {dueDate ? formatDate(dueDate) : "—"}
        </td>
        <td className="pm-col-extra" data-label="Days Late">
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
        <td
          className="pm-col-extra"
          data-label="Interest"
          style={{ color: "#16a34a", fontWeight: 600 }}
        >
          {fmt(interest)}
        </td>
        <td
          className="pm-col-extra"
          data-label="Late Fee"
          style={{
            color: lateFee > 0 ? "#dc2626" : "inherit",
            fontWeight: lateFee > 0 ? 600 : "inherit",
          }}
        >
          {fmt(lateFee)}
        </td>
        <td
          className="pm-col-extra"
          data-label="Total Payout"
          style={{ color: "#16a34a", fontWeight: 600 }}
        >
          {fmt(totalPayout)}
        </td>
        <td
          className="acc-col-hide-mobile"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="pm-details-link"
            onClick={() => onRowClick(deal)}
          >
            Details
          </button>
        </td>
      </tr>
    );
  }

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
                borderRadius: 4,
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
                borderRadius: 4,
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
        <div className="table-wrap acc-card-container">
          <table className="compact-table acc-card pm-deals-table">
            <thead>
              <tr>
                <th>Borrower Name</th>
                <th>Company</th>
                <th className="pm-col-extra">Property Address</th>
                <th>Amount Lent</th>
                <th className="pm-col-extra">Rate</th>
                <th>Term</th>
                <th className="pm-col-extra">Lend Date</th>
                <th className="pm-col-extra">Due Date</th>
                <th className="pm-col-extra">Days Late</th>
                <th className="pm-col-extra">Interest</th>
                <th className="pm-col-extra">Late Fee</th>
                <th className="pm-col-extra">Total Payout</th>
                <th className="acc-col-hide-mobile">Details</th>
              </tr>
            </thead>
            {groupedDeals.map((group) =>
              group.deals.length > 1 ? (
                <tbody className="acc-group" key={group.key}>
                  <tr className="acc-group-header-row">
                    <AccordionHeaderCell
                      id={`group-${group.key}`}
                      label="Borrower Name"
                      value={`${group.borrowerName} · ${group.deals.length} deals`}
                      colSpan={PM_VISIBLE_COLUMN_COUNT}
                    />
                  </tr>
                  {group.deals.map((deal) =>
                    renderDealRow(deal, { isGroupMember: true }),
                  )}
                </tbody>
              ) : (
                <tbody key={group.key}>{renderDealRow(group.deals[0])}</tbody>
              ),
            )}
            <tfoot>
              <tr
                style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}
              >
                <td
                  colSpan={2}
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Totals ({filteredDeals.length})
                  <div className="pm-totals-breakdown">
                    Interest {fmt(totals.interest)} · Late Fee{" "}
                    {fmt(totals.lateFee)} · Payout {fmt(totals.totalPayout)}
                  </div>
                </td>
                <td>{fmt(totals.principal)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
