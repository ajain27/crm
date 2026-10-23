import { Plus } from "lucide-react";

// "Add a lead" in a lead list's toolbar; opens that tab's add-lead window.
export default function AddLeadButton({ onClick }) {
  return (
    <button type="button" className="leads-export-btn" onClick={onClick}>
      <Plus size={13} />
      Add a lead
    </button>
  );
}
