import { Download } from "lucide-react";
import { downloadCsv, exportBaseName, leadsToRows } from "../leadExport";

// "Export CSV (N)" for a lead list's selected rows — downloads them as a
// CSV file. Hidden until at least one lead is selected.
export default function LeadExportButton({ selectedLeads, listTitle }) {
  const count = selectedLeads.length;
  if (count === 0) return null;

  return (
    <button
      type="button"
      className="leads-export-btn"
      onClick={() =>
        downloadCsv(leadsToRows(selectedLeads), exportBaseName(listTitle))
      }
    >
      <Download size={13} />
      Export CSV ({count})
    </button>
  );
}
