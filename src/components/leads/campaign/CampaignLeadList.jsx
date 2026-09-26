import { useState } from "react";
import { Trash2 } from "lucide-react";
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
  SelectAllHeader,
  SelectCell,
} from "../components/LeadTableCells";
import MarkBadLeadModal from "../components/MarkBadLeadModal";
import { leadMatchesSearch } from "../leadUtils";

const SEARCH_FIELDS = ["address", "sellerName", "email", "phone"];

function rowClassName(lead, clickable) {
  const quality =
    lead.ppcQuality === "bad"
      ? " ppc-row-bad"
      : lead.ppcQuality === "good"
        ? " ppc-row-good"
        : "";
  return `${clickable ? "clickable-row" : ""}${quality}`;
}

// Paid-campaign lead list, shared by the PPC and PPL tabs. `readOnly` (for
// PPC-only users) hides selection, quality, delete, CRM and automation, and
// stops rows from opening the detail modal. Leads marked bad don't open
// either.
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
}) {
  const [badModalLead, setBadModalLead] = useState(null);
  const { selectedIds } = listState;

  const filtered = leads.filter((l) =>
    leadMatchesSearch(l, listState.search, SEARCH_FIELDS),
  );

  async function handleBulkDelete() {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    if (await onBulkDelete(selected)) listState.clearSelection();
  }

  const filterBar = (
    <>
      <LeadSearchInput
        value={listState.search}
        onChange={listState.setSearch}
        placeholder="Search name, email, phone or address…"
      />
      <LeadClearFilters listState={listState} />
      {!readOnly && selectedIds.size > 0 && (
        <button className="leads-bulk-delete-btn" onClick={handleBulkDelete}>
          <Trash2 size={13} />
          Delete ({selectedIds.size})
        </button>
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
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Notes</th>
                <th>Added</th>
                {!readOnly && (
                  <>
                    <th>Quality</th>
                    <th></th>
                    <th></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {pageLeads.map((lead) => {
                const isBad = lead.ppcQuality === "bad";
                const clickable = !readOnly && !isBad;
                return (
                  <tr
                    key={lead.id}
                    onClick={clickable ? () => onOpen(lead) : undefined}
                    className={rowClassName(lead, clickable)}
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
                      id={lead.id}
                      label="Name"
                      value={
                        <span className="leads-accordion-name-stack">
                          <span>{lead.sellerName || "—"}</span>
                          <span className="leads-accordion-date">
                            {formatDate(lead.dateAdded)}
                          </span>
                        </span>
                      }
                    />
                    <EmailCell email={lead.email} />
                    <PhoneCell phone={lead.phone} />
                    <td className="leads-address-cell" data-label="Address">
                      {lead.address || "—"}
                    </td>
                    <NotesCell notes={lead.notes} />
                    <DateAddedCell date={lead.dateAdded} />
                    {!readOnly && (
                      <>
                        <QualityCell
                          quality={lead.ppcQuality}
                          onMarkGood={() => onSetQuality(lead, "good")}
                          onMarkBad={() => setBadModalLead(lead)}
                        />
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
