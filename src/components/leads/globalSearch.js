// Search across every lead list at once: Residential, Commercial, PPC, PPL,
// Cold Calling and County Records.

import { leadAddress, leadTabOf, sellerNameOf } from "./leadUtils";
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

const digitsOf = (value) => String(value || "").replace(/\D/g, "");

// Whether `values` (a record's fields) match `query`. A query that's only
// a number ("313 682", "(313) 682-2695", "4601") matches by digits, so a
// phone is found however it's written; otherwise every word must appear
// somewhere ("leah allen park").
export function matchesQuery(values, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return false;
  const queryDigits = digitsOf(q);
  if (queryDigits.length >= 3 && /^[\d\s().+-]+$/.test(q)) {
    return values.some((v) => digitsOf(v).includes(queryDigits));
  }
  const text = values
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
    .join(" ");
  return q.split(/\s+/).every((word) => text.includes(word));
}

// Leads (from every tab) matching `query`, each with its tab.
export function searchLeads(leads, query) {
  return leads
    .filter((lead) =>
      matchesQuery(
        [
          sellerNameOf(lead),
          lead.name,
          leadAddress(lead),
          lead.city,
          lead.state,
          lead.zipCode,
          lead.phone,
          lead.phone2,
          lead.email,
          lead.sellerEmail,
        ],
        query,
      ),
    )
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
