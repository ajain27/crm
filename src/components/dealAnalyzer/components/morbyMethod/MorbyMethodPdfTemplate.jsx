import { forwardRef } from "react";
import { fmt } from "../../../../utils/utils";
import { PROP_MGMT_PCT } from "./morbyMethodConfig";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";

const MorbyMethodPdfTemplate = forwardRef(function MorbyMethodPdfTemplate(
  { summary },
  ref,
) {
  if (!summary) return null;

  return (
    <DealPdfLayout
      ref={ref}
      tagline="Morby Method Deal Summary"
      verdictLabel="Monthly Cash Flow"
      verdictValue={fmt(summary.monthlyCashFlow)}
      verdictPositive={summary.monthlyCashFlow >= 0}
    >
      <PdfSectionTitle>Capital Stack</PdfSectionTitle>
      <PdfRow label="Purchase Price" value={fmt(summary.purchasePrice)} />
      <PdfRow
        label={`DSCR Loan (${100 - summary.downPct}% LTV — 1st lien)`}
        value={fmt(summary.dscrLoanAmount)}
      />
      <PdfRow
        label={`Seller Carryback (${summary.sellerCarrybackPct}% — 2nd lien)`}
        value={fmt(summary.sellerCarryback)}
      />

      {summary.sellerCarryback > 0 && (
        <>
          <PdfSectionTitle>Seller Note Terms</PdfSectionTitle>
          <PdfRow label="Note Amount" value={fmt(summary.sellerCarryback)} />
          <PdfRow
            label="Interest Rate"
            value={
              summary.sellerCarrybackRatePct > 0
                ? `${summary.sellerCarrybackRatePct}%`
                : "0%"
            }
          />
          <PdfRow
            label="Term"
            value={`${summary.sellerCarrybackTermYears} yr`}
          />
          <PdfRow
            label="Monthly Payment"
            value={fmt(summary.sellerCarrybackMonthly)}
          />
          {summary.sellerCarrybackBalloonYears > 0 && (
            <>
              <PdfRow
                label="Balloon Due"
                value={`Year ${summary.sellerCarrybackBalloonYears}`}
              />
              <PdfRow
                label="Balloon Payment (remaining balance)"
                value={fmt(summary.sellerCarrybackBalloon)}
                bold
              />
            </>
          )}
        </>
      )}

      <PdfSectionTitle>Monthly Expenses</PdfSectionTitle>
      <PdfRow
        label="Monthly Rent"
        value={fmt(summary.monthlyRent)}
        tone="positive"
      />
      {summary.dscrMonthlyPayment > 0 && (
        <PdfRow
          label={`DSCR Payment (${summary.dscrRatePct}%, ${summary.dscrTermYears} yr${
            summary.extraDownPaymentAmt > 0
              ? `, ${fmt(summary.effectiveDscrLoanAmount)} loan`
              : ""
          })`}
          value={fmt(summary.dscrMonthlyPayment)}
        />
      )}
      {summary.sellerCarrybackMonthly > 0 && (
        <PdfRow
          label={`Seller Note Payment (${
            summary.sellerCarrybackRatePct > 0
              ? `${summary.sellerCarrybackRatePct}%`
              : "0%"
          }, ${summary.sellerCarrybackTermYears} yr)`}
          value={fmt(summary.sellerCarrybackMonthly)}
        />
      )}
      {summary.lenderMonthlyPayment > 0 && (
        <PdfRow
          label={`Additional Lender Payment (${summary.lenders.length} lender${
            summary.lenders.length !== 1 ? "s" : ""
          })`}
          value={fmt(summary.lenderMonthlyPayment)}
        />
      )}
      <PdfRow
        label={`Property Management (${PROP_MGMT_PCT}%)`}
        value={fmt(summary.propMgmtFee)}
      />
      {summary.monthlyMiscExpense > 0 && (
        <PdfRow
          label={`Misc. Expenses (Annual ${fmt(summary.annualMiscExpense)} ÷ 12)`}
          value={fmt(summary.monthlyMiscExpense)}
        />
      )}
      {summary.monthlyInsurance > 0 && (
        <PdfRow
          label="Home Insurance (÷ 12 monthly)"
          value={fmt(summary.monthlyInsurance)}
        />
      )}
      {summary.monthlyTaxes > 0 && (
        <PdfRow
          label="Property Taxes (÷ 12 monthly)"
          value={fmt(summary.monthlyTaxes)}
        />
      )}
      {summary.monthlyHomeWarranty > 0 && (
        <PdfRow
          label="Home Warranty"
          value={fmt(summary.monthlyHomeWarranty)}
        />
      )}
      <PdfRow
        label="Total Monthly Expenses"
        value={fmt(summary.totalMonthlyExpenses)}
        bold
      />

      <PdfSectionTitle>Buyer Cash to Close</PdfSectionTitle>
      <PdfRow
        label={`Down Payment (${summary.downPct}%)`}
        value={fmt(summary.downPaymentRequired)}
      />
      {summary.extraDownPaymentAmt > 0 && (
        <PdfRow
          label="Extra Down Payment"
          value={fmt(summary.extraDownPaymentAmt)}
        />
      )}
      {summary.originationFees > 0 && (
        <PdfRow
          label={`Origination Fees (${summary.originationFeesPct}%)`}
          value={fmt(summary.originationFees)}
        />
      )}
      {summary.legalFees > 0 && (
        <PdfRow label="Doc Fees" value={fmt(summary.legalFees)} />
      )}
      {summary.appraisalFees > 0 && (
        <PdfRow label="Appraisal Fees" value={fmt(summary.appraisalFees)} />
      )}
      {summary.underwritingFees > 0 && (
        <PdfRow
          label="Underwriting Fees"
          value={fmt(summary.underwritingFees)}
        />
      )}
      <PdfRow label="Closing Costs" value={fmt(summary.closingCosts)} />
      {summary.agentCommissionAmt > 0 && (
        <PdfRow
          label={`Agent Commission (${summary.agentCommissionPct}%)`}
          value={fmt(summary.agentCommissionAmt)}
        />
      )}
      <PdfRow label="Inspection" value={fmt(summary.inspectionCost)} />
      <PdfRow
        label="Seller Covers (2nd lien)"
        value={fmt(summary.sellerCovers)}
        tone="positive"
      />
      {summary.sellerExcess > 0 && (
        <PdfRow
          label="Seller Excess (reserves / rehab)"
          value={fmt(summary.sellerExcess)}
          tone="positive"
        />
      )}
      {summary.lenderTotal > 0 && (
        <PdfRow
          label={`Additional Lender Contributions (${summary.lenders.length} lender${
            summary.lenders.length !== 1 ? "s" : ""
          })`}
          value={fmt(summary.lenderTotal)}
          tone="positive"
        />
      )}
      <PdfRow
        label="Buyer Cash to Close"
        value={fmt(summary.buyerCashToClose)}
        bold
        tone={summary.buyerCashToClose === 0 ? "positive" : "negative"}
      />

      <p className="mm-pdf-formula">
        Monthly Cash Flow = Rent − DSCR Payment − Seller Note − Prop. Mgmt
        {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
        <br />
        {fmt(summary.monthlyRent)} − {fmt(summary.dscrMonthlyPayment)} −{" "}
        {fmt(summary.sellerCarrybackMonthly)} − {fmt(summary.propMgmtFee)}
        {summary.monthlyMiscExpense > 0
          ? ` − ${fmt(summary.monthlyMiscExpense)}`
          : ""}{" "}
        = {fmt(summary.monthlyCashFlow)}
      </p>
    </DealPdfLayout>
  );
});

export default MorbyMethodPdfTemplate;
