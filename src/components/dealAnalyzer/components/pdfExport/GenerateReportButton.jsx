import { Download } from "lucide-react";

export default function GenerateReportButton({ onClick, exporting }) {
  return (
    <div className="deal-analyzer-actions" style={{ marginTop: "1.25rem" }}>
      <button
        className="primary-btn form-btn"
        type="button"
        onClick={onClick}
        disabled={exporting}
      >
        <Download size={14} />
        {exporting ? "Generating…" : "Generate Report"}
      </button>
    </div>
  );
}
