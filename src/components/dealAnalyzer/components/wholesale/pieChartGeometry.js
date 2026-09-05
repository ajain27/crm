// Shared donut-chart geometry for the Wholesale ARV allocation chart, used
// by both the on-screen chart (theme-aware colors) and the PDF report
// version (fixed light colors) so the arc math isn't duplicated.
export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function donutPath(cx, cy, outerR, innerR, startDeg, endDeg) {
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

export const PIE_SLICE_CONFIG = [
  { key: "mao", label: "Maximum Allowable Offer", color: "#3b82f6" },
  { key: "rehab", label: "Total Rehab", color: "#f97316" },
  { key: "wholesaleFee", label: "Assignment Fee", color: "#a855f7" },
  { key: "buyerMargin", label: "Buyer's Margin", color: "#16a34a" },
];

export function buildPieSlices(summary) {
  const cx = 120,
    cy = 120,
    outerR = 102,
    innerR = 60;
  const rawSlices = PIE_SLICE_CONFIG.map((s) => ({
    ...s,
    value: Math.max(summary[s.key] ?? 0, 0),
  })).filter((s) => s.value > 0);

  const total = rawSlices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let deg = 0;
  const slices = rawSlices.map((s) => {
    const sweep = (s.value / total) * 360;
    const path = donutPath(cx, cy, outerR, innerR, deg, deg + sweep);
    deg += sweep;
    return { ...s, path };
  });

  return { slices, total, pct: (v) => ((v / total) * 100).toFixed(1) };
}
