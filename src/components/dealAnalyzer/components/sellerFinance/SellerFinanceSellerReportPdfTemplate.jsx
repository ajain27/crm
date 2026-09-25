import { forwardRef } from "react";
import { fmt } from "../../../../utils/utils";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";

// Seller-facing copy of the seller-finance report: only what the seller
// cares about (what they're financing, what they collect up front, and what
// the note pays them over time) — no lender costs or buyer monthly cash
// flow, which are the buyer's concern, not the seller's.
const SellerFinanceSellerReportPdfTemplate = forwardRef(
  function SellerFinanceSellerReportPdfTemplate({ summary }, ref) {
    if (!summary) return null;

    // For a hybrid note, split the months actually collected between the
    // interest-only and amortized phases — clamped so an early balloon that
    // cuts the note short during the interest-only phase never lets the
    // amortized-phase term go negative.
    const ioMonthsCollected = summary.isHybrid
      ? Math.min(
          summary.sellerFinanceHybridIoMonths,
          summary.sellerNoteMonthsElapsed,
        )
      : 0;
    const amortizedMonthsCollected = summary.isHybrid
      ? Math.max(
          0,
          summary.sellerNoteMonthsElapsed - summary.sellerFinanceHybridIoMonths,
        )
      : 0;

    return (
      <DealPdfLayout
        ref={ref}
        tagline="Seller Finance — Seller Summary"
        verdictLabel="Monthly Payment You Receive"
        verdictValue={fmt(summary.sellerFinanceMonthly)}
        verdictPositive
      >
        {summary.propertyAddress && (
          <>
            <PdfSectionTitle>Property</PdfSectionTitle>
            <PdfRow label="Property Address" value={summary.propertyAddress} />
          </>
        )}

        <PdfSectionTitle>Sale Breakdown</PdfSectionTitle>
        <PdfRow label="Purchase Price" value={fmt(summary.purchasePrice)} />
        <PdfRow
          label="Down Payment (Cash at Closing)"
          value={fmt(summary.downPaymentAmount)}
          tone="positive"
        />
        <PdfRow
          label={`Amount You're Financing (${summary.sellerFinanceDisplayPct}%)`}
          value={fmt(summary.sellerFinanceAmount)}
        />

        <PdfSectionTitle>Promissory Note Terms</PdfSectionTitle>
        <PdfRow label="Note Rate" value={`${summary.sellerFinanceRatePct}%`} />
        <PdfRow
          label="Payment Type"
          value={
            summary.isInterestOnly
              ? "Interest only"
              : summary.isHybrid
                ? `Hybrid — interest only for ${summary.sellerFinanceHybridIoMonths} months, then amortized`
                : "Amortized (principal + interest)"
          }
        />
        <PdfRow
          label="Note Term"
          value={`${summary.sellerFinanceTermYears} years`}
        />
        <PdfRow
          label={
            summary.isInterestOnly
              ? "Monthly Payment (Interest Only)"
              : summary.isHybrid
                ? `Monthly Payment (Months 1–${summary.sellerFinanceHybridIoMonths}, Interest Only)`
                : "Monthly Payment"
          }
          value={fmt(summary.sellerFinanceMonthly)}
          tone="positive"
        />
        {summary.isHybrid && summary.sellerFinanceHybridPhase2Monthly > 0 && (
          <PdfRow
            label={`Monthly Payment (Month ${summary.sellerFinanceHybridIoMonths + 1}+, Amortized)`}
            value={fmt(summary.sellerFinanceHybridPhase2Monthly)}
            tone="positive"
          />
        )}
        <PdfRow
          label={
            summary.sellerFinanceBalloonIsFullPrincipal
              ? "Principal Due"
              : "Balloon Due"
          }
          value={
            summary.sellerFinanceBalloonYears > 0
              ? `${fmt(summary.sellerFinanceBalloon)} at year ${summary.sellerFinanceBalloonYears}`
              : "None"
          }
        />

        <PdfSectionTitle>Your Return</PdfSectionTitle>
        <PdfRow
          label="Total Payments Collected Over Note"
          value={fmt(summary.sellerNoteTotalReceived)}
          tone="positive"
        />
        <PdfRow
          label="Extra Income From Note Interest"
          value={fmt(summary.sellerNoteTotalInterest)}
          bold
          tone="positive"
        />

        {summary.isHybrid ? (
          <p className="mm-pdf-formula">
            Extra Income From Interest = (Interest-Only Payment × IO Months) +
            (Amortized Payment × Months After) +{" "}
            {summary.sellerFinanceBalloonIsFullPrincipal
              ? "Principal Repaid"
              : "Balloon"}{" "}
            − Amount Financed
            <br />({fmt(summary.sellerFinanceMonthly)} × {ioMonthsCollected}) +
            ({fmt(summary.sellerFinanceHybridPhase2Monthly || 0)} ×{" "}
            {amortizedMonthsCollected}) + {fmt(summary.sellerFinanceBalloon)} −{" "}
            {fmt(summary.sellerFinanceAmount)} ={" "}
            {fmt(summary.sellerNoteTotalInterest)}
          </p>
        ) : (
          <p className="mm-pdf-formula">
            Extra Income From Interest = (Monthly Payment × Months Collected) +{" "}
            {summary.sellerFinanceBalloonIsFullPrincipal
              ? "Principal Repaid"
              : "Balloon"}{" "}
            − Amount Financed
            <br />({fmt(summary.sellerFinanceMonthly)} ×{" "}
            {summary.sellerNoteMonthsElapsed}) +{" "}
            {fmt(summary.sellerFinanceBalloon)} −{" "}
            {fmt(summary.sellerFinanceAmount)} ={" "}
            {fmt(summary.sellerNoteTotalInterest)}
          </p>
        )}
      </DealPdfLayout>
    );
  },
);

export default SellerFinanceSellerReportPdfTemplate;
