// Search across every lead list at once: Residential, Commercial, PPC, PPL,
// Cold Calling and County Records.

import {
  leadAddress,
  leadMatchesSearch,
  leadTabOf,
  matchesQuery,
  sellerNameOf,
} from "./leadUtils";
import {
  countyRecordFields,
  phoneNumbers,
} from "./countyRecords/countyRecordDeal";

// Result groups, in the Leads page's tab order.
export const SEARCH_GROUPS = [
  { id: "residential", label: "Residential" },
  { id: "commercial", label: "Commercial" },
  { id: "ppc", label: "PPC" },
  { id: "ppl", label: "PPL" },
  { id: "coldcall", label: "Cold Calling" },
  { id: "county", label: "County Records" },
];

export { matchesQuery };

// Leads (from every tab) matching `query` in any field, each with its
// tab.
export function searchLeads(leads, query) {
  return leads
    .filter((lead) => leadMatchesSearch(lead, query))
    .map((lead) => ({
      key: `lead-${lead.id}`,
      group: leadTabOf(lead),
      lead,
      name: sellerNameOf(lead) || lead.name || "",
      address: leadAddress(lead),
      phones: [lead.phone, lead.phone2].filter(Boolean),
    }));
}

// County records matching `query` in any column. `lists` are
// { id, name, columns, rows, deletedRows }.
export function searchCountyRecords(lists, query) {
  return lists.flatMap((list) => {
    const deleted = new Set(list.deletedRows || []);
    return list.rows.flatMap((row, rowIndex) => {
      if (deleted.has(rowIndex) || !matchesQuery(row, query)) return [];
      const fields = countyRecordFields(list.columns, row);
      return [
        {
          key: `county-${list.id}-${rowIndex}`,
          group: "county",
          importId: list.id,
          rowIndex,
          listName: list.name,
          name: fields.ownerName,
          address: fields.address,
          phones: fields.phones.length
            ? fields.phones
            : phoneNumbers(fields.phone),
        },
      ];
    });
  });
}
