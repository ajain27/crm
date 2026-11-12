import { AccordionHeaderCell } from "../../elements/elements";
import LeadListPanel, {
  LeadCallFilter,
  LeadClearFilters,
  LeadSearchInput,
} from "../components/LeadListPanel";
import {
  AutomationCell,
  CallCell,
  CrmCell,
  DeleteCell,
  EmailCell,
  NotesCell,
  PhoneCell,
  QualityCell,
  qualityRowClass,
  CardSelectCheckbox,
  SelectAllHeader,
  SelectCell,
  SellerAddresses,
  SellerPropertiesBadge,
} from "../components/LeadTableCells";
import LeadImportButton from "../components/LeadImportButton";
import AddLeadButton from "../components/AddLeadButton";
import LeadDedupeButton from "../components/LeadDedupeButton";
import LeadExportButton from "../components/LeadExportButton";
import LeadBulkDeleteButton from "../components/LeadBulkDeleteButton";
import {
  leadMatchesSearch,
  matchesCallFilter,
  parseAddress,
  groupLeadsBySeller,
  sellerGroupPhones,
  sellerNameOf,
} from "../leadUtils";

export const RESIDENTIAL_FILTERS = {
  source: "",
  state: "",
  called: "",
};

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
  onImport,
  onRemoveDuplicates,
  onAddLead,
  onAddToCrm,
  onSetCalls,
  onSetLeadQuality,
  onRunAutomation,
  onStopAutomation,
}) {
  const { search, filters, setFilter, selectedIds } = listState;
  const selectedLeads = leads.filter((l) => selectedIds.has(l.id));

  const filtered = leads
    .filter(
      (l) =>
        leadMatchesSearch(l, search) &&
        (!filters.source || l.source === filters.source) &&
        (!filters.state || parseAddress(l.address).state === filters.state) &&
        matchesCallFilter(l, filters.called),
    )
    .sort(byFollowUpDate);

  // A seller's properties share one row (the first listed), opening to a
  // tab for each.
  const sellerGroups = groupLeadsBySeller(filtered);
  const groupOf = new Map(sellerGroups.map((g) => [g[0].id, g]));

  const usedSources = unique(leads.map((l) => l.source));
  const usedStates = unique(
    leads.map((l) => parseAddress(l.address).state),
  ).sort();

  const filterBar = (
    <>
      <LeadSearchInput
        value={search}
        onChange={listState.setSearch}
        placeholder="Search anything: name, address, phone, notes…"
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
      <LeadCallFilter listState={listState} />
      <LeadClearFilters listState={listState} />
      <LeadBulkDeleteButton
        selectedLeads={selectedLeads}
        listState={listState}
        onDelete={onBulkDelete}
      />
      {onAddLead && <AddLeadButton onClick={onAddLead} />}
      {onImport && <LeadImportButton onImport={onImport} />}
      {onRemoveDuplicates && (
        <LeadDedupeButton leads={leads} onRemove={onRemoveDuplicates} />
      )}
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
      filteredLeads={sellerGroups.map((g) => g[0])}
      matchCount={filtered.length}
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
                ids={pageLeads.flatMap((l) =>
                  groupOf.get(l.id).map((g) => g.id),
                )}
                selectedIds={selectedIds}
                onChange={listState.setManySelected}
              />
              <th></th>
              <th>Address</th>
              <th>Seller</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Notes</th>
              <th>Called</th>
              <th>Quality</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageLeads.map((lead) => {
              const isMls = lead.source === "MLS / Zillow";
              const group = groupOf.get(lead.id);
              const groupIds = group.map((g) => g.id);
              const selected = groupIds.every((id) => selectedIds.has(id));
              const toggle = () =>
                listState.setManySelected(groupIds, !selected);
              return (
                <tr
                  key={lead.id}
                  className={`clickable-row${qualityRowClass(lead.quality)}`}
                  onClick={() => onOpen(lead)}
                >
                  <SelectCell checked={selected} onToggle={toggle} />
                  <DeleteCell
                    onDelete={() =>
                      group.length > 1 ? onBulkDelete(group) : onDelete(lead.id)
                    }
                  />
                  <AccordionHeaderCell
                    leading={
                      <CardSelectCheckbox
                        checked={selected}
                        onToggle={toggle}
                      />
                    }
                    id={lead.id}
                    label="Address"
                    value={<SellerAddresses leads={group} />}
                    card={{
                      title: (
                        <>
                          {sellerNameOf(lead)}
                          <SellerPropertiesBadge count={group.length} />
                        </>
                      ),
                      subtitle: group.map((g) => g.address).join("  ·  "),
                    }}
                    className="leads-address-cell"
                  />
                  <td data-label="Seller">
                    {sellerNameOf(lead) || "—"}
                    <SellerPropertiesBadge count={group.length} />
                  </td>
                  {/* MLS leads carry the agent's email, not the seller's. */}
                  <EmailCell email={isMls ? "" : lead.email} />
                  <PhoneCell
                    phones={
                      isMls
                        ? [lead.phone, lead.phone2]
                        : sellerGroupPhones(group)
                    }
                  />
                  <NotesCell notes={lead.notes} />
                  <CallCell
                    count={lead.callCount}
                    onChange={(count) => onSetCalls(lead, count)}
                  />
                  <QualityCell
                    quality={lead.quality}
                    onMarkGood={() => onSetLeadQuality(lead, "good")}
                    onMarkBad={() => onSetLeadQuality(lead, "bad")}
                    onClear={() => onSetLeadQuality(lead, "")}
                  />
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
