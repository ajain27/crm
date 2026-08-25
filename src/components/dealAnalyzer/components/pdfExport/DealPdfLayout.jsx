import { forwardRef } from "react";
import { createPortal } from "react-dom";

// Shared building blocks for every deal-analyzer PDF report (Seller
// Finance, DSCR, Morby Method, Multi-Family). Kept generic — no
// tab-specific copy or fields — so each tab supplies its own line items as
// children while the chrome (header/footer/portal-off-screen rendering)
// stays identical across reports.

export function PdfRow({ label, value, tone, bold }) {
  return (
    <div className={`mm-pdf-row${bold ? " mm-pdf-row-total" : ""}`}>
      <span className="mm-pdf-row-label">{label}</span>
      <span className={`mm-pdf-row-value${tone ? ` mm-pdf-${tone}` : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function PdfSectionTitle({ children }) {
  return <p className="mm-pdf-section-title">{children}</p>;
}

const DealPdfLayout = forwardRef(function DealPdfLayout(
  {
    tagline,
    verdictLabel,
    verdictValue,
    verdictPositive,
    footerNote,
    children,
  },
  ref,
) {
  if (typeof document === "undefined") return null;

  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return createPortal(
    <div className="mm-pdf-container" ref={ref}>
      <div className="mm-pdf-header">
        <div>
          <p className="mm-pdf-company-name">You Win Estates</p>
          <p className="mm-pdf-tagline">{tagline}</p>
        </div>
        <div className="mm-pdf-meta">
          <p className="mm-pdf-meta-label">Generated</p>
          <p className="mm-pdf-meta-value">{generatedOn}</p>
        </div>
      </div>
      <div className="mm-pdf-rule" />

      <div className="mm-pdf-body">
        {verdictLabel != null && (
          <div
            className={`mm-pdf-verdict ${verdictPositive ? "mm-pdf-verdict-positive" : "mm-pdf-verdict-negative"}`}
          >
            <span>{verdictLabel}</span>
            <strong>{verdictValue}</strong>
          </div>
        )}
        {children}
      </div>

      <div className="mm-pdf-footer">
        {footerNote ||
          "You Win Estates — This summary is an estimate for planning purposes only and does not constitute financial or legal advice."}
      </div>
    </div>,
    document.body,
  );
});

export default DealPdfLayout;
