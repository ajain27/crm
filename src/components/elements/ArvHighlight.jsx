const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// The after repair value, big and bold. `arv` is the value entered on the
// deal or lead; `compsArv` / `compsDate` the latest comps run's estimate,
// shown on its own when no ARV is entered yet, and noted when it differs.
// Renders nothing without either.
export default function ArvHighlight({ arv, compsArv, compsDate }) {
  const entered = arv > 0 ? arv : null;
  const estimate = compsArv > 0 ? compsArv : null;
  const value = entered ?? estimate;
  if (!value) return null;

  const run = compsDate ? ` · run ${compsDate}` : "";
  let caption = null;
  if (estimate && !entered) caption = `Comps estimate${run}`;
  else if (estimate && Math.round(estimate) !== Math.round(entered))
    caption = `Comps estimate ${money(estimate)}${run}`;
  else if (estimate) caption = `Matches comps${run}`;

  return (
    <div className="arv-highlight">
      <span className="arv-highlight-label">After repair value</span>
      <strong className="arv-highlight-value">{money(value)}</strong>
      {caption && <span className="arv-highlight-caption">{caption}</span>}
    </div>
  );
}
