import { forwardRef } from "react";
import { fmt } from "../../../../utils/utils";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";

const PROP_MGMT_PCT = 10;

const SellerFinancePdfTemplate = forwardRef(function SellerFinancePdfTemplate(
  { summary },
  ref,
) {
  if (!summary) return null;

  return (
    <DealPdfLayout
      ref={ref}
      tagline="Seller Finance Deal Summary"
      verdictLabel={
        summary.hasHybridPhase2
          ? `Monthly Cash Flow (Months 1–${summary.sellerFinanceHybridIoMonths})`
          : "Monthly Cash Flow"
      }
      verdictValue={fmt(summary.cashFlow)}
      verdictPositive={!summary.isCashFlowNegative}
    >
      {summary.propertyAddress && (
        <>
          <PdfSectionTitle>Property</PdfSectionTitle>
          <PdfRow label="Property Address" value={summary.propertyAddress} />
        </>
      )}

      <PdfSectionTitle>Capital Stack</PdfSectionTitle>
      <PdfRow label="Purchase Price" value={fmt(summary.purchasePrice)} />
      <PdfRow
        label={`Seller Financing (${summary.sellerFinanceDisplayPct}%)`}
        value={fmt(summary.sellerFinanceAmount)}
        tone="negative"
      />
      {summary.downPaymentAmount > 0 && (
        <PdfRow
          label="Down Payment (Cash at Closing)"
          value={fmt(summary.downPaymentAmount)}
          tone="negative"
        />
      )}
      {summary.lenderTotal > 0 && (
        <PdfRow
          label={`Lender Total (${summary.lenderCount} lender${
            summary.lenderCount !== 1 ? "s" : ""
          })`}
          value={fmt(summary.lenderTotal)}
          tone="negative"
        />
      )}
      {summary.originationFeesAmt > 0 && (
        <PdfRow
          label="Origination Fees"
          value={fmt(summary.originationFeesAmt)}
          tone="negative"
        />
      )}
      {summary.legalFeesAmt > 0 && (
        <PdfRow
          label="Doc Fees"
          value={fmt(summary.legalFeesAmt)}
          tone="negative"
        />
      )}
      {summary.appraisalFeesAmt > 0 && (
        <PdfRow
          label="Appraisal Fees"
          value={fmt(summary.appraisalFeesAmt)}
          tone="negative"
        />
      )}
      {summary.underwritingFeesAmt > 0 && (
        <PdfRow
          label="Underwriting Fees"
          value={fmt(summary.underwritingFeesAmt)}
          tone="negative"
        />
      )}
      {summary.closingCostsAmt > 0 && (
        <PdfRow
          label="Closing Costs"
          value={fmt(summary.closingCostsAmt)}
          tone="negative"
        />
      )}
      <PdfRow
        label="Buyer Cash to Close"
        value={fmt(summary.buyerCashToClose)}
        tone={summary.buyerCashToClose > 0 ? "negative" : "positive"}
      />
      {summary.cashBackToBuyer > 0 && (
        <PdfRow
          label="Cash Back to Buyer"
          value={fmt(summary.cashBackToBuyer)}
          tone="positive"
        />
      )}
      <PdfSectionTitle>Seller Note — Promissory Note</PdfSectionTitle>
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
        label={`Seller Note Monthly Payment${
          summary.isInterestOnly
            ? " (Interest Only)"
            : summary.isHybrid
              ? ` (Months 1–${summary.sellerFinanceHybridIoMonths}, Interest Only)`
              : ""
        }`}
        value={fmt(summary.sellerFinanceMonthly)}
        tone="negative"
      />
      {summary.isHybrid && summary.sellerFinanceHybridPhase2Monthly > 0 && (
        <PdfRow
          label={`Seller Note Monthly Payment (Month ${summary.sellerFinanceHybridIoMonths + 1}+, Amortized)`}
          value={fmt(summary.sellerFinanceHybridPhase2Monthly)}
          tone="negative"
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
        tone="negative"
      />

      {summary.lenderBreakdown.length > 0 && (
        <>
          <PdfSectionTitle>Lender Payments</PdfSectionTitle>
          {summary.lenderBreakdown.map((lender) => (
            <PdfRow
              key={lender.id}
              label={`Lender ${lender.index} (${fmt(lender.amount)}${
                lender.rate > 0 ? ` @ ${lender.rate}%` : ""
              }${lender.term > 0 ? `, ${lender.term} yr` : ""})`}
              value={
                lender.term > 0
                  ? fmt(lender.monthlyPayment)
                  : "Add a term to amortize"
              }
              tone="negative"
            />
          ))}
          <PdfRow
            label="Total Lender Payment"
            value={fmt(summary.lenderMonthlyPayment)}
            tone="negative"
          />
        </>
      )}

      <PdfSectionTitle>
        Cash Flow
        {summary.hasHybridPhase2
          ? ` — Months 1–${summary.sellerFinanceHybridIoMonths} (Interest Only)`
          : ""}
      </PdfSectionTitle>
      <PdfRow
        label="Monthly Rent"
        value={fmt(summary.monthlyRentAmount)}
        tone="positive"
      />
      <PdfRow
        label="Total Monthly Debt Service"
        value={fmt(summary.totalMonthlyPayment)}
        tone="negative"
      />
      {summary.monthlyTaxes > 0 && (
        <PdfRow
          label="Property Tax (÷ 12 monthly)"
          value={fmt(summary.monthlyTaxes)}
          tone="negative"
        />
      )}
      {summary.monthlyInsurance > 0 && (
        <PdfRow
          label="Insurance (÷ 12 monthly)"
          value={fmt(summary.monthlyInsurance)}
          tone="negative"
        />
      )}
      {summary.applianceInsuranceAmt > 0 && (
        <PdfRow
          label="Appliance Insurance"
          value={fmt(summary.applianceInsuranceAmt)}
          tone="negative"
        />
      )}
      {summary.propMgmtFee > 0 && (
        <PdfRow
          label={`Property Management (${PROP_MGMT_PCT}%)`}
          value={fmt(summary.propMgmtFee)}
          tone="negative"
        />
      )}
      <PdfRow
        label="Total Monthly Expenses"
        value={fmt(summary.totalMonthlyExpenses)}
        tone="negative"
      />
      <PdfRow
        label={
          summary.hasHybridPhase2
            ? `Cash Flow (Months 1–${summary.sellerFinanceHybridIoMonths})`
            : "Cash Flow"
        }
        value={fmt(summary.cashFlow)}
        bold
        tone={summary.isCashFlowNegative ? "negative" : "positive"}
      />

      <p className="mm-pdf-formula">
        Monthly Cash Flow = Monthly Rent − (Seller Note Payment + Lender
        Payments + Property Tax + Insurance + Appliance Insurance + Property
        Management)
        <br />
        {fmt(summary.monthlyRentAmount)} − ({fmt(summary.sellerFinanceMonthly)}{" "}
        + {fmt(summary.lenderMonthlyPayment)} + {fmt(summary.monthlyTaxes)} +{" "}
        {fmt(summary.monthlyInsurance)} + {fmt(summary.applianceInsuranceAmt)} +{" "}
        {fmt(summary.propMgmtFee)}) = {fmt(summary.cashFlow)}
      </p>

      {summary.hasHybridPhase2 && (
        <>
          <PdfSectionTitle>
            Cash Flow — Month {summary.sellerFinanceHybridIoMonths + 1}+
            (Amortized)
          </PdfSectionTitle>
          <PdfRow
            label="Monthly Rent"
            value={fmt(summary.monthlyRentAmount)}
            tone="positive"
          />
          <PdfRow
            label="Total Monthly Debt Service"
            value={fmt(summary.totalMonthlyPaymentAfterIo)}
            tone="negative"
          />
          {summary.monthlyTaxes > 0 && (
            <PdfRow
              label="Property Tax (÷ 12 monthly)"
              value={fmt(summary.monthlyTaxes)}
              tone="negative"
            />
          )}
          {summary.monthlyInsurance > 0 && (
            <PdfRow
              label="Insurance (÷ 12 monthly)"
              value={fmt(summary.monthlyInsurance)}
              tone="negative"
            />
          )}
          {summary.applianceInsuranceAmt > 0 && (
            <PdfRow
              label="Appliance Insurance"
              value={fmt(summary.applianceInsuranceAmt)}
              tone="negative"
            />
          )}
          {summary.propMgmtFee > 0 && (
            <PdfRow
              label={`Property Management (${PROP_MGMT_PCT}%)`}
              value={fmt(summary.propMgmtFee)}
              tone="negative"
            />
          )}
          <PdfRow
            label="Total Monthly Expenses"
            value={fmt(summary.totalMonthlyExpensesAfterIo)}
            tone="negative"
          />
          <PdfRow
            label={`Cash Flow (Month ${summary.sellerFinanceHybridIoMonths + 1}+)`}
            value={fmt(summary.cashFlowAfterIo)}
            bold
            tone={summary.isCashFlowAfterIoNegative ? "negative" : "positive"}
          />

          <p className="mm-pdf-formula">
            Monthly Cash Flow = Monthly Rent − (Seller Note Payment + Lender
            Payments + Property Tax + Insurance + Appliance Insurance + Property
            Management)
            <br />
            {fmt(summary.monthlyRentAmount)} − (
            {fmt(summary.sellerFinanceHybridPhase2Monthly)} +{" "}
            {fmt(summary.lenderMonthlyPayment)} + {fmt(summary.monthlyTaxes)} +{" "}
            {fmt(summary.monthlyInsurance)} +{" "}
            {fmt(summary.applianceInsuranceAmt)} + {fmt(summary.propMgmtFee)}) ={" "}
            {fmt(summary.cashFlowAfterIo)}
            <br />
            Once the interest-only period ends, the seller note payment steps up
            from {fmt(summary.sellerFinanceMonthly)}/mo to{" "}
            {fmt(summary.sellerFinanceHybridPhase2Monthly)}/mo, which lowers
            cash flow accordingly.
          </p>
        </>
      )}
    </DealPdfLayout>
  );
});

export default SellerFinancePdfTemplate;
