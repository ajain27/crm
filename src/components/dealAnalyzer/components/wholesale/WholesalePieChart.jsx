import { fmt } from "../fixAndFlip/fixAndFlipConfig";

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const sweep = endDeg - startDeg;
  if (sweep >= 360) {
    const mid = startDeg + 180;
    return (
      donutPath(cx, cy, outerR, innerR, startDeg, mid) +
      " " +
      donutPath(cx, cy, outerR, innerR, mid, endDeg)
    );
  }
  const o1 = polarToCartesian(cx, cy, outerR, startDeg);
  const o2 = polarToCartesian(cx, cy, outerR, endDeg);
  const i1 = polarToCartesian(cx, cy, innerR, endDeg);
  const i2 = polarToCartesian(cx, cy, innerR, startDeg);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

const SLICE_CONFIG = [
  { key: "mao", label: "Maximum Allowable Offer", color: "#3b82f6" },
  { key: "rehab", label: "Total Rehab", color: "#f97316" },
  { key: "wholesaleFee", label: "Assignment Fee", color: "#a855f7" },
  { key: "buyerMargin", label: "Buyer's Margin (30%)", color: "#16a34a" },
];

function WholesalePieChart({ summary }) {
  const rawSlices = SLICE_CONFIG.map((s) => ({
    ...s,
    value: Math.max(summary[s.key] ?? 0, 0),
  })).filter((s) => s.value > 0);

  const total = rawSlices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const cx = 120,
    cy = 120,
    outerR = 102,
    innerR = 60;
  let deg = 0;
  const slices = rawSlices.map((s) => {
    const sweep = (s.value / total) * 360;
    const path = donutPath(cx, cy, outerR, innerR, deg, deg + sweep);
    deg += sweep;
    return { ...s, path };
  });

  const pct = (v) => ((v / total) * 100).toFixed(1);

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
