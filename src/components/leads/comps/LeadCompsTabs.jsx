import RunCompsModal from "../../crm/components/data/comps/RunCompsModal";
import LeadCompsPanel from "./LeadCompsPanel";

// Building blocks for a lead window with comps; `compsState` is what
// useLeadComps returns.

// "Comps (n) | Details" tabs.
export function LeadCompsTabBar({ compsState }) {
  const { tab, setTab, comps } = compsState;
  const tabs = [
    { id: "comps", label: "Comps", count: comps?.comps.length },
    { id: "details", label: "Details" },
  ];
  return (
    <div className="ldm-tabs" role="tablist" aria-label="Lead">
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          className={`ldm-tab ${tab === id ? "active" : ""}`}
          onClick={() => setTab(id)}
        >
          {label}
          {count !== undefined && (
            <span className="ldm-tab-count">{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// "Run comps" — needs an address to run.
export function RunCompsButton({ compsState, address, disabled }) {
  return (
    <button
      type="button"
      className="secondary-btn"
      onClick={compsState.openRun}
      disabled={disabled || !String(address || "").trim()}
      title="Pull comps from Zillow, Redfin and Realtor.com"
    >
      Run comps
    </button>
  );
}

// The Comps tab: the comps table and map, or a prompt to run comps.
export function LeadCompsTab({ compsState, lead, disabled }) {
  if (compsState.comps) {
    return <LeadCompsPanel comps={compsState.comps} lead={lead} />;
  }
  return (
    <div className="ldm-comps-empty">
      No comps for this lead yet.
      <RunCompsButton
        compsState={compsState}
        address={lead.address}
        disabled={disabled}
      />
    </div>
  );
}

// The Run comps window for a lead; `onApplyArv(arv)` (optional) offers to
// fill the lead's ARV from the result.
export function LeadRunCompsModal({ compsState, address, onApplyArv }) {
  if (!compsState.runOpen) return null;
  return (
    <RunCompsModal
      address={String(address || "").trim()}
      onSaveNote={compsState.saveRun}
      onApply={onApplyArv ? ({ arv }) => onApplyArv(arv) : undefined}
      onClose={compsState.closeRun}
      noteSavedLabel="Added to the lead's notes — Save Changes to keep"
      applyLabel="Use ARV"
    />
  );
}
