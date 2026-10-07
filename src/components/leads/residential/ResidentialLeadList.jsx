import { ExternalLink } from "lucide-react";
import { AccordionHeaderCell } from "../../elements/elements";
import { formatDate } from "../../../utils/utils";
import LeadListPanel, {
  LeadClearFilters,
  LeadSearchInput,
} from "../components/LeadListPanel";
import {
  ActionCell,
  AutomationCell,
  CrmCell,
  DateAddedCell,
  DeleteCell,
  EmailCell,
  NotesCell,
  PhoneCell,
  PhoneLink,
  CardSelectCheckbox,
  SelectAllHeader,
  SelectCell,
  SourceCell,
  ZillowLink,
} from "../components/LeadTableCells";
import LeadExportButton from "../components/LeadExportButton";
import LeadBulkDeleteButton from "../components/LeadBulkDeleteButton";
import { followUpStatus, leadMatchesSearch, parseAddress } from "../leadUtils";

export const RESIDENTIAL_FILTERS = {
  source: "",
  state: "",
  followUpStatus: "",
};

const SEARCH_FIELDS = [
  "address",
  "phone",
  "agentPhone",
  "sellerName",
  "agentName",
];

const FOLLOW_UP_STATUSES = [
  { status: "overdue", label: "Overdue" },
  { status: "today", label: "Today" },
  { status: "upcoming", label: "Upcoming" },
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// Soonest follow-up first; leads without a follow-up date go last.
function byFollowUpDate(a, b) {
  if (!a.followUpDate) return 1;
  if (!b.followUpDate) return -1;
  return a.followUpDate.localeCompare(b.followUpDate);
}

export default function ResidentialLeadList({
  leads,
  listState,
  onOpen,
  onDelete,
  onBulkDelete,
  onAddToCrm,
  onRunAutomation,
  onStopAutomation,
}) {
  const { search, filters, setFilter, selectedIds } = listState;
  const selectedLeads = leads.filter((l) => selectedIds.has(l.id));

  const filtered = leads
    .filter(
      (l) =>
        leadMatchesSearch(l, search, SEARCH_FIELDS) &&
        (!filters.source || l.source === filters.source) &&
        (!filters.state || parseAddress(l.address).state === filters.state) &&
        (!filters.followUpStatus ||
          followUpStatus(l.followUpDate) === filters.followUpStatus),
    )
    .sort(byFollowUpDate);

  const usedSources = unique(leads.map((l) => l.source));
  const usedStates = unique(
    leads.map((l) => parseAddress(l.address).state),
  ).sort();

  const filterBar = (
    <>
      <LeadSearchInput
        value={search}
        onChange={listState.setSearch}
        placeholder="Search address, name or phone…"
      />
      <select
        value={filters.source}
        onChange={(e) => setFilter("source", e.target.value)}
        className="leads-filter-select"
      >
        <option value="">All sources</option>
        {usedSources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={filters.state}
        onChange={(e) => setFilter("state", e.target.value)}
        className="leads-filter-select"
      >
        <option value="">All states</option>
        {usedStates.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div
        className="leads-status-filter"
        role="group"
        aria-label="Filter by follow-up status"
      >
        {FOLLOW_UP_STATUSES.map(({ status, label }) => {
          const active = filters.followUpStatus === status;
          return (
            <button
              key={status}
              type="button"
              title={label}
              aria-pressed={active}
              className={`leads-status-dot leads-status-dot-${status}${
                active ? " leads-status-dot--active" : ""
              }`}
              onClick={() => setFilter("followUpStatus", active ? "" : status)}
            />
          );
        })}
      </div>
      <LeadClearFilters listState={listState} />
      <LeadBulkDeleteButton
        selectedLeads={selectedLeads}
        listState={listState}
        onDelete={onBulkDelete}
      />
      <LeadExportButton
        selectedLeads={selectedLeads}
        listTitle="Residential Leads"
      />
    </>
  );

  return (
    <LeadListPanel
      title="Residential Lead List"
      totalCount={leads.length}
      filteredLeads={filtered}
      listState={listState}
      filters={filterBar}
      noLeadsSubtitle="No leads yet."
      noLeadsMessage="Add your first lead above to get started."
      noMatchMessage="No leads match the current filters."
      revealDelay="140ms"
    >
      {(pageLeads) => (
        <>
          <thead>
            <tr>
              <SelectAllHeader
                ids={pageLeads.map((l) => l.id)}
                selectedIds={selectedIds}
                onChange={listState.setManySelected}
              />
              <th></th>
              <th>Address</th>
              <th>Source</th>
              <th>Seller</th>
              <th>Agent</th>
              <th>Follow-Up</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Notes</th>
              <th>Added</th>
              <th>Links</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageLeads.map((lead) => {
              const isMls = lead.source === "MLS / Zillow";
              return (
                <tr
                  key={lead.id}
                  className="clickable-row"
                  onClick={() => onOpen(lead)}
                >
                  <SelectCell
                    checked={selectedIds.has(lead.id)}
                    onToggle={() => listState.toggleSelected(lead.id)}
                  />
                  <DeleteCell onDelete={() => onDelete(lead.id)} />
                  <AccordionHeaderCell
                    leading={
                      <CardSelectCheckbox
                        checked={selectedIds.has(lead.id)}
                        onToggle={() => listState.toggleSelected(lead.id)}
                      />
                    }
                    id={lead.id}
                    label="Address"
                    value={lead.address}
                    className="leads-address-cell"
                  />
                  <SourceCell source={lead.source} />
                  <td data-label="Seller">{lead.sellerName || "—"}</td>
                  <ActionCell className="acc-col-block" data-label="Agent">
                    {lead.agentName || lead.agentPhone ? (
                      <div className="leads-agent-cell">
                        {lead.agentName && <span>{lead.agentName}</span>}
                        {lead.agentPhone && (
                          <PhoneLink phone={lead.agentPhone} />
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </ActionCell>
                  <td data-label="Follow-Up">
                    {lead.followUpDate ? (
                      <span
                        className={`leads-followup-badge leads-followup-${followUpStatus(lead.followUpDate)}`}
                      >
                        {formatDate(lead.followUpDate)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {/* MLS leads carry the agent's email, not the seller's. */}
                  <EmailCell email={isMls ? "" : lead.email} />
                  <PhoneCell phone={lead.phone} />
                  <NotesCell notes={lead.notes} />
                  <DateAddedCell date={lead.dateAdded} />
                  <ActionCell data-label="Links">
                    {lead.url || lead.address ? (
                      <div className="leads-link-stack">
                        {lead.url && (
                          <a
                            href={lead.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="leads-mls-link"
                            title={lead.url}
                          >
                            <ExternalLink size={12} />
                            {isMls ? "MLS" : "Link"}
                          </a>
                        )}
                        <ZillowLink address={lead.address} />
                      </div>
                    ) : (
                      "—"
                    )}
                  </ActionCell>
                  <CrmCell onAdd={() => onAddToCrm(lead.id)} />
                  <AutomationCell
                    lead={lead}
                    requireEmailToStop
                    onRun={() => onRunAutomation(lead)}
                    onStop={() => onStopAutomation(lead)}
                  />
                </tr>
              );
            })}
          </tbody>
        </>
      )}
    </LeadListPanel>
  );
}
