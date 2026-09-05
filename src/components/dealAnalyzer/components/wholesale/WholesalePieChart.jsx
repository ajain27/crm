import { fmt } from "../fixAndFlip/fixAndFlipConfig";
import { buildPieSlices } from "./pieChartGeometry";

function WholesalePieChart({ summary }) {
  const result = buildPieSlices(summary);
  if (!result) return null;
  const { slices, total, pct } = result;

  return (
    <div className="deal-analyzer-pie-wrap">
      <div
        className="deal-analyzer-section-label"
        style={{ padding: "0 0 0.75rem" }}
      >
        ARV Allocation
      </div>
      <div className="deal-analyzer-pie-body">
        <div className="deal-analyzer-pie-svg-wrap">
          <svg viewBox="0 0 240 240" className="deal-analyzer-pie-svg">
            {slices.map((s) => (
              <path
                key={s.key}
                d={s.path}
                fill={s.color}
                stroke="var(--panel)"
                strokeWidth="2.5"
              />
            ))}
            <text
              x="120"
              y="111"
              textAnchor="middle"
              style={{
                fontSize: "10px",
                fill: "var(--muted)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              ARV
            </text>
            <text
              x="120"
              y="131"
              textAnchor="middle"
              style={{
                fontSize: "14px",
                fill: "var(--text)",
                fontWeight: 700,
              }}
            >
              {fmt(total)}
            </text>
          </svg>
        </div>

        <ul className="deal-analyzer-pie-legend">
          {slices.map((s) => (
            <li key={s.key} className="deal-analyzer-pie-legend-item">
              <span
                className="deal-analyzer-pie-dot"
                style={{ background: s.color }}
              />
              <span className="deal-analyzer-pie-legend-label">{s.label}</span>
              <span className="deal-analyzer-pie-legend-pct">
                {pct(s.value)}%
              </span>
              <strong className="deal-analyzer-pie-legend-val">
                {fmt(s.value)}
              </strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default WholesalePieChart;
