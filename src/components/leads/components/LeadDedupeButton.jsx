import { useState } from "react";
import { CopyMinus, Loader2 } from "lucide-react";
import { findAddressDuplicates } from "../leadDuplicates";

// "Remove duplicates (N)" — shown only while some records in the list
// share an address. `onRemove` (async) does the removing and confirming.
// Used for leads and, with `addressOf` (e.g. dealAddress), CRM deals.
export default function LeadDedupeButton({
  leads,
  onRemove,
  addressOf,
  noun = "leads",
}) {
  const [removing, setRemoving] = useState(false);
  const count = findAddressDuplicates(leads, addressOf).reduce(
    (n, group) => n + group.duplicates.length,
    0,
  );
  if (count === 0) return null;

  async function handleClick() {
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      type="button"
      className="leads-export-btn"
      onClick={handleClick}
      disabled={removing}
      title={`Remove ${noun} with the same address, keeping one for each`}
    >
      {removing ? (
        <Loader2 size={13} className="spin" />
      ) : (
        <CopyMinus size={13} />
      )}
      {removing ? "Removing…" : `Remove duplicates (${count})`}
    </button>
  );
}
