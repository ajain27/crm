import { Globe, RefreshCw } from "lucide-react";
import { AccordionHeaderCell } from "../../elements/elements";
import LeadListPanel, {
  LeadClearFilters,
  LeadSearchInput,
} from "../components/LeadListPanel";
import {
  DateAddedCell,
  DeleteCell,
  PhoneCell,
  SourceCell,
} from "../components/LeadTableCells";
import { leadMatchesSearch } from "../leadUtils";

const SEARCH_FIELDS = ["address", "source", "phone"];

export default function CommercialLeadList({
  leads,
  listState,
  wpSyncing,
  onSyncWordPress,
  onOpen,
  onDelete,
}) {
  const filtered = leads.filter((l) =>
    leadMatchesSearch(l, listState.search, SEARCH_FIELDS),
  );

  const filterBar = (
    <>
      <button
        type="button"
        className="leads-sync-btn"
        onClick={onSyncWordPress}
        disabled={wpSyncing}
      >
        <RefreshCw size={13} />
        {wpSyncing ? "Syncing..." : "Sync WordPress"}
      </button>
      <LeadSearchInput
        value={listState.search}
        onChange={listState.setSearch}
        placeholder="Search address, source or phone…"
      />
      <LeadClearFilters listState={listState} />
    </>
  );

  return (
    <LeadListPanel
      title="Commercial Lead List"
      totalCount={leads.length}
      filteredLeads={filtered}
      listState={listState}
      filters={filterBar}
      noLeadsSubtitle="No commercial leads yet."
      noLeadsMessage="Add your first commercial lead above to get started."
      revealDelay="140ms"
    >
      {(pageLeads) => (
        <>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Address</th>
              <th>State</th>
              <th>Source</th>
              <th>Website</th>
              <th>Phone</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {pageLeads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onOpen(lead)}
                style={{ cursor: "pointer" }}
              >
                <DeleteCell onDelete={() => onDelete(lead.id)} />
                <AccordionHeaderCell
                  id={lead.id}
                  label="Name"
                  value={lead.name || "—"}
                />
                <td className="leads-address-cell" data-label="Address">
                  {lead.address}
                </td>
                <td data-label="State">{lead.state || "—"}</td>
                <SourceCell source={lead.source} />
                <td data-label="Website">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="leads-mls-link"
                      title={lead.website}
                    >
                      <Globe size={12} />
                      Site
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <PhoneCell phone={lead.phone} />
                <DateAddedCell date={lead.dateAdded} />
              </tr>
            ))}
          </tbody>
        </>
      )}
    </LeadListPanel>
  );
}
