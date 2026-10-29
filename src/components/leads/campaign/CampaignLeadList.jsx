import { useState } from "react";
import { AccordionHeaderCell } from "../../elements/elements";
import { formatDate } from "../../../utils/utils";
import LeadListPanel, {
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
  QualityCell,
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
import { leadMatchesSearch, sellerNameOf } from "../leadUtils";

const SEARCH_FIELDS = [
  "address",
  "sellerName",
  "firstName",
  "lastName",
  "email",
  "phone",
  "phone2",
];

function rowClassName(lead, clickable, showQuality) {
  const quality = !showQuality
    ? ""
    : lead.ppcQuality === "bad"
      ? " ppc-row-bad"
      : lead.ppcQuality === "good"
        ? " ppc-row-good"
        : "";
  return `${clickable ? "clickable-row" : ""}${quality}`;
}

// Campaign lead list, shared by the PPC, PPL and Cold Calling tabs. `readOnly` (for
// PPC-only users) hides selection, quality, delete, CRM and automation, and
// stops rows from opening the detail modal. Leads marked bad don't open
// either. The quality column only shows when `onSetQuality` is passed.
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
  onAddToCrm,
  onRunAutomation,
  onStopAutomation,
  onImport,
  onRemoveDuplicates,
  onAddLead,
}) {
  const [badModalLead, setBadModalLead] = useState(null);
  const { selectedIds } = listState;
  const showQuality = !readOnly && Boolean(onSetQuality);

  const filtered = leads.filter((l) =>
    leadMatchesSearch(l, listState.search, SEARCH_FIELDS),
  );

  const selectedLeads = leads.filter((l) => selectedIds.has(l.id));

  const filterBar = (
    <>
      <LeadSearchInput
        value={listState.search}
        onChange={listState.setSearch}
        placeholder="Search name, email, phone or address…"
      />
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
                    {showQuality && <th>Quality</th>}
                    <th></th>
                    <th></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {pageLeads.map((lead) => {
                const isBad = showQuality && lead.ppcQuality === "bad";
                const clickable = !readOnly && !isBad;
                return (
                  <tr
                    key={lead.id}
                    onClick={clickable ? () => onOpen(lead) : undefined}
                    className={rowClassName(lead, clickable, showQuality)}
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
                      value={
                        <span className="leads-accordion-name-stack">
                          <span>{sellerNameOf(lead) || "—"}</span>
                          <span className="leads-accordion-date">
                            {formatDate(lead.dateAdded)}
                          </span>
                        </span>
                      }
                    />
                    <EmailCell email={lead.email} />
                    <PhoneCell phone={lead.phone} phone2={lead.phone2} />
                    <td className="leads-address-cell" data-label="Address">
                      {lead.address || "—"}
                    </td>
                    <NotesCell notes={lead.notes} />
                    <DateAddedCell date={lead.dateAdded} />
                    {!readOnly && (
                      <>
                        {showQuality && (
                          <QualityCell
                            quality={lead.ppcQuality}
                            onMarkGood={() => onSetQuality(lead, "good")}
                            onMarkBad={() => setBadModalLead(lead)}
                            onClear={() => onSetQuality(lead, "")}
                          />
                        )}
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
