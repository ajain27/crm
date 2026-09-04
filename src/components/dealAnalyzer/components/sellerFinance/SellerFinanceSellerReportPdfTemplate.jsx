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

    return (
      <DealPdfLayout
        ref={ref}
        tagline="Seller Finance — Seller Summary"
        verdictLabel="Monthly Payment You Receive"
        verdictValue={fmt(summary.sellerFinanceMonthly)}
        verdictPositive
      >
        <PdfSectionTitle>Sale Breakdown</PdfSectionTitle>
        <PdfRow label="Purchase Price" value={fmt(summary.purchasePrice)} />
        <PdfRow
          label="Down Payment (Cash at Closing)"
          value={fmt(summary.downPaymentAmount)}
          tone="positive"
        />
        <PdfRow
          label={`Amount You're Financing (${summary.sellerFinancePct}%)`}
          value={fmt(summary.sellerFinanceAmount)}
        />

        <PdfSectionTitle>Promissory Note Terms</PdfSectionTitle>
        <PdfRow label="Note Rate" value={`${summary.sellerFinanceRatePct}%`} />
        <PdfRow
          label="Note Term"
          value={`${summary.sellerFinanceTermYears} years`}
        />
        <PdfRow
          label="Monthly Payment"
          value={fmt(summary.sellerFinanceMonthly)}
          tone="positive"
        />
        <PdfRow
          label="Balloon Due"
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

        <p className="mm-pdf-formula">
          Extra Income From Interest = (Monthly Payment × Months Collected) +
          Balloon − Amount Financed
          <br />({fmt(summary.sellerFinanceMonthly)} ×{" "}
          {summary.sellerNoteMonthsElapsed}) +{" "}
          {fmt(summary.sellerFinanceBalloon)} −{" "}
          {fmt(summary.sellerFinanceAmount)} ={" "}
          {fmt(summary.sellerNoteTotalInterest)}
        </p>
      </DealPdfLayout>
    );
  },
);

export default SellerFinanceSellerReportPdfTemplate;
