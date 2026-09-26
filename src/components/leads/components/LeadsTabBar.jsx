// Tab buttons above the lead lists. Each tab is { id, label, count? }; a
// positive count shows as a badge.
export default function LeadsTabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="deal-tab-bar" style={{ padding: "0 0 1rem 0" }} data-reveal>
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          className={`deal-tab-btn${activeTab === id ? " deal-tab-btn--active" : ""}`}
          onClick={() => onChange(id)}
        >
          {label}
          {count > 0 && <span className="deal-tab-count">{count}</span>}
        </button>
      ))}
    </div>
  );
}
