import { fmt } from "../fixAndFlip/fixAndFlipConfig";
import { buildPieSlices } from "./pieChartGeometry";

// Same chart as WholesalePieChart, but with fixed light colors instead of
// the app's theme CSS variables — the PDF report is always rendered light
// (see DealPdfLayout/mm-pdf-*), and the on-screen chart's `var(--text)` /
// `var(--muted)` / `var(--panel)` would resolve to dark-mode values here
// since they cascade from `<html class="dark">`, regardless of this being
// off-screen. That would put light text on this chart's white background.
function WholesalePieChartPdf({ summary }) {
  const result = buildPieSlices(summary);
  if (!result) return null;
  const { slices, total, pct } = result;

  return (
    <div className="mm-pdf-pie-wrap">
      <div className="mm-pdf-pie-body">
        <svg viewBox="0 0 240 240" className="mm-pdf-pie-svg">
          {slices.map((s) => (
            <path
              key={s.key}
              d={s.path}
              fill={s.color}
              stroke="#fff"
              strokeWidth="2.5"
            />
          ))}
          <text
            x="120"
            y="111"
            textAnchor="middle"
            style={{
              fontSize: "10px",
              fill: "#6b7280",
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
            style={{ fontSize: "14px", fill: "#1a1a2e", fontWeight: 700 }}
          >
            {fmt(total)}
          </text>
        </svg>

        <ul className="mm-pdf-pie-legend">
          {slices.map((s) => (
            <li key={s.key} className="mm-pdf-pie-legend-item">
              <span className="mm-pdf-pie-dot-cell">
                <span
                  className="mm-pdf-pie-dot"
                  style={{ background: s.color }}
                />
              </span>
              <span className="mm-pdf-pie-legend-label">{s.label}</span>
              <span className="mm-pdf-pie-legend-pct">{pct(s.value)}%</span>
              <strong className="mm-pdf-pie-legend-val">{fmt(s.value)}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default WholesalePieChartPdf;
