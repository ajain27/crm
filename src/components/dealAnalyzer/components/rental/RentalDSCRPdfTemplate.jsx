import { forwardRef } from "react";
import { fmt } from "../../../../utils/utils";
import { PROP_MGMT_PCT } from "./useDSCRCalculations";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";

const RentalDSCRPdfTemplate = forwardRef(function RentalDSCRPdfTemplate(
  { summary },
  ref,
) {
  if (!summary) return null;

  return (
    <DealPdfLayout
      ref={ref}
      tagline="DSCR Rental Deal Summary"
      verdictLabel="Monthly Cash Flow"
      verdictValue={fmt(summary.monthlyCashFlow)}
      verdictPositive={summary.monthlyCashFlow >= 0}
    >
      <PdfSectionTitle>Income</PdfSectionTitle>
      <PdfRow
        label="Monthly Rent"
        value={fmt(summary.monthlyRent)}
        tone="positive"
      />

      <PdfSectionTitle>Monthly Expenses</PdfSectionTitle>
      {summary.loanMortgage > 0 && (
        <PdfRow
          label={`Monthly Mortgage (DSCR ${summary.interestRatePct}%, ${summary.loanTermYears} yr${
            summary.extraDownPaymentAmt > 0
              ? `, ${fmt(summary.effectiveLoanAmount)} loan`
              : ""
          })`}
          value={fmt(summary.loanMortgage)}
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
      {summary.cashHelocMonthlyPayment > 0 && (
        <PdfRow
          label={`Cash-to-Buy HELOC Payment (Interest-Only, ${summary.cashHelocRatePct}%)`}
          value={fmt(summary.cashHelocMonthlyPayment)}
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

      <PdfSectionTitle>Total Cash Needed to Buy</PdfSectionTitle>
      <PdfRow
        label={`Down Payment (${summary.downPct}% of purchase)`}
        value={fmt(summary.downPayment)}
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
      <PdfRow label="Closing Costs" value={fmt(summary.closingCosts)} />
      {summary.underwritingFees > 0 && (
        <PdfRow
          label="Underwriting Fees"
          value={fmt(summary.underwritingFees)}
        />
      )}
      {summary.agentCommissionAmt > 0 && (
        <PdfRow
          label={`Agent Commission (${summary.agentCommissionPct}%)`}
          value={fmt(summary.agentCommissionAmt)}
        />
      )}
      {summary.rateBuyDownAmt > 0 && (
        <PdfRow
          label={`Rate Buy Down (${summary.rateBuyDownPct}% of loan)`}
          value={fmt(summary.rateBuyDownAmt)}
        />
      )}
      <PdfRow label="Inspection Cost" value={fmt(summary.inspectionCost)} />
      {summary.lenderTotal > 0 && (
        <>
          <PdfRow
            label="Subtotal Before Lender Contributions"
            value={fmt(summary.grossCashNeeded)}
          />
          <PdfRow
            label={`Additional Lender Contributions (${summary.lenders.length} lender${
              summary.lenders.length !== 1 ? "s" : ""
            })`}
            value={`−${fmt(summary.lenderTotal)}`}
            tone="positive"
          />
        </>
      )}
      <PdfRow
        label="Total Cash Needed to Buy"
        value={fmt(summary.totalFundsNeeded)}
        bold
      />

      <PdfSectionTitle>Returns</PdfSectionTitle>
      <PdfRow
        label="Monthly Cash Flow"
        value={fmt(summary.monthlyCashFlow)}
        tone={summary.monthlyCashFlow >= 0 ? "positive" : "negative"}
      />
      <PdfRow
        label="Annual Cash Flow"
        value={fmt(summary.annualCashFlow)}
        tone={summary.annualCashFlow >= 0 ? "positive" : "negative"}
      />
      {summary.loanMortgage > 0 && (
        <PdfRow
          label="DSCR"
          value={summary.dscr.toFixed(2)}
          tone={summary.dscr >= 1 ? "positive" : "negative"}
        />
      )}
      <PdfRow
        label="Cash-on-Cash Return"
        value={`${summary.cashOnCash.toFixed(1)}%`}
        tone={summary.cashOnCash >= 0 ? "positive" : "negative"}
      />
      <PdfRow
        label="Cap Rate"
        value={`${summary.capRate.toFixed(1)}%`}
        tone={summary.capRate >= 0 ? "positive" : "negative"}
      />

      <p className="mm-pdf-formula">
        Monthly Cash Flow = Rent − Prop. Mgmt − Monthly Mortgage
        {summary.cashHelocMonthlyPayment > 0 ? " − Cash HELOC" : ""}
        {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
        <br />
        {fmt(summary.monthlyRent)} − {fmt(summary.propMgmtFee)}
        {summary.loanMortgage > 0 ? ` − ${fmt(summary.loanMortgage)}` : ""}
        {summary.cashHelocMonthlyPayment > 0
          ? ` − ${fmt(summary.cashHelocMonthlyPayment)}`
          : ""}
        {summary.monthlyMiscExpense > 0
          ? ` − ${fmt(summary.monthlyMiscExpense)}`
          : ""}{" "}
        = {fmt(summary.monthlyCashFlow)}
      </p>
    </DealPdfLayout>
  );
});

export default RentalDSCRPdfTemplate;
