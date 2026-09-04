import { Download } from "lucide-react";

// `bare` skips the wrapping `.deal-analyzer-actions` div — use it when
// rendering more than one report button so the caller supplies a single
// shared wrapper instead of stacking padded wrappers side by side.
export default function GenerateReportButton({
  onClick,
  exporting,
  label = "Generate Report",
  bare = false,
}) {
  const button = (
    <button
      className="primary-btn form-btn"
      type="button"
      onClick={onClick}
      disabled={exporting}
    >
      <Download size={14} />
      {exporting ? "Generating…" : label}
    </button>
  );

  if (bare) return button;

  return (
    <div className="deal-analyzer-actions" style={{ marginTop: "1.25rem" }}>
      {button}
    </div>
  );
}
