import { useState } from "react";
import { AccordionHeaderCell } from "../../elements/elements";
import { formatDate } from "../../../utils/utils";
import LeadListPanel, {
  LeadCallFilter,
  LeadClearFilters,
  LeadSearchInput,
} from "../components/LeadListPanel";
import {
  AutomationCell,
  CrmCell,
  DateAddedCell,
  DeleteCell,
  EmailCell,
  NotesCell,
  PhoneCell,
  CallCell,
  QualityCell,
  qualityRowClass,
  CardSelectCheckbox,
  SelectAllHeader,
  SelectCell,
} from "../components/LeadTableCells";
import MarkBadLeadModal from "../components/MarkBadLeadModal";
import LeadExportButton from "../components/LeadExportButton";
import LeadImportButton from "../components/LeadImportButton";
import AddLeadButton from "../components/AddLeadButton";
import LeadDedupeButton from "../components/LeadDedupeButton";
import LeadBulkDeleteButton from "../components/LeadBulkDeleteButton";
import {
  cashOfferText,
  leadMatchesSearch,
  matchesCallFilter,
  sellerNameOf,
} from "../leadUtils";

const SEARCH_FIELDS = [
  "address",
  "sellerName",
  "firstName",
  "lastName",
  "email",
  "phone",
  "phone2",
];

// PPC leads are tinted by their PPC rating, the others by their own.
function rowClassName(lead, clickable, isPpc, readOnly) {
  const quality = readOnly
    ? ""
    : qualityRowClass(isPpc ? lead.ppcQuality : lead.quality);
  return `${clickable ? "clickable-row" : ""}${quality}`;
}

// Campaign lead list, shared by the PPC, PPL and Cold Calling tabs. `readOnly` (for
// PPC-only users) hides selection, quality, delete, CRM and automation, and
// stops rows from opening the detail modal. On the PPC tab
// (`onSetQuality`), leads are rated with a reason when bad, and bad ones
// don't open; on the others the thumbs (`onSetLeadQuality`) just mark them.
export default function CampaignLeadList({
  title,
  leads,
  listState,
  readOnly = false,
  statusMessage,
  noLeadsSubtitle,
  noLeadsMessage,
  onOpen,
  onDelete,
  onBulkDelete,
  onSetQuality,
  onSetLeadQuality,
  onSetCalls,
  onAddToCrm,
  onRunAutomation,
  onStopAutomation,
  onImport,
  onRemoveDuplicates,
  onAddLead,
}) {
  const [badModalLead, setBadModalLead] = useState(null);
  const { selectedIds } = listState;
  const isPpc = Boolean(onSetQuality);
  const showQuality = !readOnly && (isPpc || Boolean(onSetLeadQuality));
  const showCalls = !readOnly && Boolean(onSetCalls);

  const filtered = leads.filter(
    (l) =>
      leadMatchesSearch(l, listState.search, SEARCH_FIELDS) &&
      (!showCalls || matchesCallFilter(l, listState.filters.called)),
  );

  const selectedLeads = leads.filter((l) => selectedIds.has(l.id));

  const filterBar = (
    <>
      <LeadSearchInput
        value={listState.search}
        onChange={listState.setSearch}
        placeholder="Search name, email, phone or address…"
      />
      {showCalls && <LeadCallFilter listState={listState} />}
      <LeadClearFilters listState={listState} />
      {!readOnly && (
        <LeadBulkDeleteButton
          selectedLeads={selectedLeads}
          listState={listState}
          onDelete={onBulkDelete}
        />
      )}
      {!readOnly && onAddLead && <AddLeadButton onClick={onAddLead} />}
      {!readOnly && onImport && <LeadImportButton onImport={onImport} />}
      {!readOnly && onRemoveDuplicates && (
        <LeadDedupeButton leads={leads} onRemove={onRemoveDuplicates} />
      )}
      {!readOnly && (
        <LeadExportButton
          selectedLeads={selectedLeads}
          listTitle={title}
          includeAgent={false}
        />
      )}
    </>
  );

  return (
    <>
      <LeadListPanel
        title={title}
        totalCount={leads.length}
        filteredLeads={filtered}
        listState={listState}
        filters={filterBar}
        statusMessage={statusMessage}
        noLeadsSubtitle={noLeadsSubtitle}
        noLeadsMessage={noLeadsMessage}
        resizeKey={title}
      >
        {(pageLeads) => (
          <>
            <thead>
              <tr>
                {!readOnly && (
                  <>
                    <SelectAllHeader
                      ids={pageLeads.map((l) => l.id)}
                      selectedIds={selectedIds}
                      onChange={listState.setManySelected}
                    />
                    <th></th>
                  </>
                )}
                <th>Seller Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Notes</th>
                <th>Added</th>
                {!readOnly && (
                  <>
                    {showCalls && <th>Called</th>}
                    {showQuality && <th>Quality</th>}
                    <th></th>
                    <th></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {pageLeads.map((lead) => {
                const isBad = isPpc && !readOnly && lead.ppcQuality === "bad";
                const clickable = !readOnly && !isBad;
                return (
                  <tr
                    key={lead.id}
                    onClick={clickable ? () => onOpen(lead) : undefined}
                    className={rowClassName(lead, clickable, isPpc, readOnly)}
                  >
                    {!readOnly && (
                      <>
                        <SelectCell
                          checked={selectedIds.has(lead.id)}
                          onToggle={() => listState.toggleSelected(lead.id)}
                        />
                        <DeleteCell onDelete={() => onDelete(lead.id)} />
                      </>
                    )}
                    <AccordionHeaderCell
                      leading={
                        !readOnly && (
                          <CardSelectCheckbox
                            checked={selectedIds.has(lead.id)}
                            onToggle={() => listState.toggleSelected(lead.id)}
                          />
                        )
                      }
                      id={lead.id}
                      label="Seller Name"
                      value={sellerNameOf(lead) || "—"}
                      card={{
                        title: sellerNameOf(lead),
                        subtitle: lead.address,
                        aside: (
                          <span className="leads-accordion-date">
                            {formatDate(lead.dateAdded)}
                          </span>
                        ),
                      }}
                    />
                    <EmailCell email={lead.email} />
                    <PhoneCell
                      phone={lead.phone}
                      phone2={lead.phone2}
                      textBody={cashOfferText(lead)}
                    />
                    <td className="leads-address-cell" data-label="Address">
                      {lead.address || "—"}
                    </td>
                    <NotesCell notes={lead.notes} />
                    <DateAddedCell date={lead.dateAdded} />
                    {!readOnly && (
                      <>
                        {showCalls && (
                          <CallCell
                            count={lead.callCount}
                            onChange={(count) => onSetCalls(lead, count)}
                          />
                        )}
                        {showQuality &&
                          (isPpc ? (
                            <QualityCell
                              quality={lead.ppcQuality}
                              onMarkGood={() => onSetQuality(lead, "good")}
                              onMarkBad={() => setBadModalLead(lead)}
                              onClear={() => onSetQuality(lead, "")}
                            />
                          ) : (
                            <QualityCell
                              quality={lead.quality}
                              onMarkGood={() => onSetLeadQuality(lead, "good")}
                              onMarkBad={() => onSetLeadQuality(lead, "bad")}
                              onClear={() => onSetLeadQuality(lead, "")}
                            />
                          ))}
                        <CrmCell
                          isBad={isBad}
                          onAdd={() => onAddToCrm(lead.id)}
                        />
                        <AutomationCell
                          lead={lead}
                          isBad={isBad}
                          onRun={() => onRunAutomation(lead)}
                          onStop={() => onStopAutomation(lead)}
                        />
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </>
        )}
      </LeadListPanel>

      {badModalLead && (
        <MarkBadLeadModal
          lead={badModalLead}
          onConfirm={(reason) => onSetQuality(badModalLead, "bad", reason)}
          onClose={() => setBadModalLead(null)}
        />
      )}
    </>
  );
}
