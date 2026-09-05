import { forwardRef } from "react";
import { fmt } from "../fixAndFlip/fixAndFlipConfig";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";
import WholesalePieChartPdf from "./WholesalePieChartPdf";

const WholesalePdfTemplate = forwardRef(function WholesalePdfTemplate(
  { result },
  ref,
) {
  if (!result) return null;

  return (
    <DealPdfLayout
      ref={ref}
      tagline="Wholesale Deal Summary"
      verdictLabel="Maximum Allowable Offer (MAO)"
      verdictValue={fmt(result.mao)}
      verdictPositive={result.mao > 0}
    >
      {result.propertyAddress && (
        <>
          <PdfSectionTitle>Property</PdfSectionTitle>
          <PdfRow label="Property Address" value={result.propertyAddress} />
        </>
      )}

      <PdfSectionTitle>Breakdown</PdfSectionTitle>
      <PdfRow label="ARV" value={fmt(result.arv)} tone="positive" />
      <PdfRow
        label="Rehab Cost"
        value={fmt(result.baseRehab)}
        tone="negative"
      />
      {result.additionalRehab > 0 && (
        <PdfRow
          label="Additional Rehab"
          value={fmt(result.additionalRehab)}
          tone="negative"
        />
      )}
      <PdfRow label="Total Rehab" value={fmt(result.rehab)} tone="negative" />
      <PdfRow
        label="Assignment Fee"
        value={fmt(result.wholesaleFee)}
        tone="positive"
      />
      <PdfRow label="Buyer's Profit" value={`${result.buyersProfitPct}%`} />
      <PdfRow
        label="Assign Deal (MAO + Assignment Fee)"
        value={fmt(result.assignDeal)}
        bold
        tone="positive"
      />

      <PdfSectionTitle>ARV Allocation</PdfSectionTitle>
      <WholesalePieChartPdf summary={result} />

      <p className="mm-pdf-formula">
        MAO = ARV × (1 − Buyer's Profit %) − Total Rehab − Assignment Fee
        <br />
        {fmt(result.arv)} × (1 − {result.buyersProfitPct}%) −{" "}
        {fmt(result.rehab)} − {fmt(result.wholesaleFee)} = {fmt(result.mao)}
      </p>
    </DealPdfLayout>
  );
});

export default WholesalePdfTemplate;
