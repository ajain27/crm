import { Trash2, X } from "lucide-react";

// "Delete (N)" for a lead list's selected rows, and Cancel to unselect
// them. Hidden until something is selected. `onDelete` resolves true when the leads were deleted, which
// clears the selection.
export default function LeadBulkDeleteButton({
  selectedLeads,
  listState,
  onDelete,
}) {
  if (selectedLeads.length === 0) return null;

  async function handleClick() {
    if (await onDelete(selectedLeads)) listState.clearSelection();
  }

  return (
    <>
      <button
        type="button"
        className="leads-bulk-delete-btn"
        onClick={handleClick}
      >
        <Trash2 size={13} />
        Delete ({selectedLeads.length})
      </button>
      <button
        type="button"
        className="leads-export-btn"
        onClick={listState.clearSelection}
      >
        <X size={13} />
        Cancel
      </button>
    </>
  );
}
