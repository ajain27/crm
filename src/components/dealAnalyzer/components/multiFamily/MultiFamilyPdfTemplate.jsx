import { forwardRef } from "react";
import { fmt } from "../fixAndFlip/fixAndFlipConfig";
import DealPdfLayout, {
  PdfRow,
  PdfSectionTitle,
} from "../pdfExport/DealPdfLayout";

const CLOSING_COSTS_PCT = 2;
const AGENT_COMMISSION_PCT = 3;

const MultiFamilyPdfTemplate = forwardRef(function MultiFamilyPdfTemplate(
  { summary },
  ref,
) {
  if (!summary) return null;

  return (
    <DealPdfLayout
      ref={ref}
      tagline="Multi-Family Deal Summary"
      verdictLabel="Monthly Cash Flow"
      verdictValue={fmt(summary.monthlyCashFlow)}
      verdictPositive={summary.monthlyCashFlow >= 0}
    >
      <PdfSectionTitle>Monthly</PdfSectionTitle>
      <PdfRow
        label={`Gross Rent (${summary.numUnits} units)`}
        value={fmt(summary.grossMonthlyRent)}
      />
      <PdfRow label="Other Income" value={fmt(summary.otherIncome)} />
      <PdfRow label="Gross Income" value={fmt(summary.grossMonthlyIncome)} />
      <PdfRow
        label={`Vacancy Loss (${summary.vacancyPct}%)`}
        value={fmt(summary.vacancyLoss)}
        tone="negative"
      />
      <PdfRow
        label="Effective Gross Income"
        value={fmt(summary.effectiveGrossIncome)}
      />
      <PdfRow
        label={`Operating Expenses (${summary.expenseRatioPct}% of EGI)`}
        value={fmt(summary.totalMonthlyExpenses)}
        tone="negative"
      />
      <PdfRow
        label="NOI"
        value={fmt(summary.monthlyNOI)}
        tone={summary.monthlyNOI >= 0 ? "positive" : "negative"}
      />
      <PdfRow label="Mortgage (P&I)" value={fmt(summary.monthlyMortgage)} />
      <PdfRow
        label="Cash Flow"
        value={fmt(summary.monthlyCashFlow)}
        bold
        tone={summary.monthlyCashFlow >= 0 ? "positive" : "negative"}
      />

      <PdfSectionTitle>Annual</PdfSectionTitle>
      <PdfRow
        label="NOI"
        value={fmt(summary.annualNOI)}
        tone={summary.annualNOI >= 0 ? "positive" : "negative"}
      />
      <PdfRow
        label="Cash Flow"
        value={fmt(summary.annualCashFlow)}
        tone={summary.annualCashFlow >= 0 ? "positive" : "negative"}
      />

      <PdfSectionTitle>Acquisition &amp; Returns</PdfSectionTitle>
      <PdfRow label="Purchase Price" value={fmt(summary.purchasePrice)} />
      <PdfRow label="Price Per Unit" value={fmt(summary.pricePerUnit)} />
      <PdfRow
        label={`Down Payment (${summary.downPaymentPct}%)`}
        value={fmt(summary.downPaymentAmount)}
      />
      <PdfRow
        label={`Closing Costs (${CLOSING_COSTS_PCT}% of price)`}
        value={fmt(summary.closingCosts)}
      />
      <PdfRow
        label={`Agent Commission (${AGENT_COMMISSION_PCT}% of price)`}
        value={fmt(summary.agentCommission)}
      />
      <PdfRow label="Loan Amount" value={fmt(summary.loanAmount)} />
      <PdfRow
        label="Total Cash Invested"
        value={fmt(summary.totalCashInvested)}
        bold
      />
      <PdfRow
        label="Cap Rate"
        value={`${summary.capRate.toFixed(2)}%`}
        tone={summary.capRate >= 5 ? "positive" : "negative"}
      />
      <PdfRow
        label="Cash on Cash Return"
        value={
          summary.cocReturn !== null ? `${summary.cocReturn.toFixed(2)}%` : "--"
        }
        tone={
          summary.cocReturn !== null && summary.cocReturn >= 8
            ? "positive"
            : "negative"
        }
      />
      {summary.grm !== null && (
        <PdfRow
          label="Gross Rent Multiplier"
          value={`${summary.grm.toFixed(2)}x`}
        />
      )}

      <p className="mm-pdf-formula">
        Cash on Cash Return = Annual Cash Flow ÷ Total Cash Invested
        <br />
        {fmt(summary.annualCashFlow)} ÷ {fmt(summary.totalCashInvested)} ={" "}
        {summary.cocReturn !== null ? `${summary.cocReturn.toFixed(2)}%` : "--"}
      </p>

      <div
        className={`mm-pdf-verdict ${summary.isDeal ? "mm-pdf-verdict-positive" : "mm-pdf-verdict-negative"}`}
        style={{ marginTop: "14px" }}
      >
        <span>Final Verdict</span>
        <strong>{summary.isDeal ? "Deal" : "No Deal"}</strong>
      </div>
    </DealPdfLayout>
  );
});

export default MultiFamilyPdfTemplate;
