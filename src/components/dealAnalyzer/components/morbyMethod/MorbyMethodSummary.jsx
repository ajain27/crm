import { AnimatedAmount } from "../../../elements/elements";
import { fmt } from "../../../../utils/utils";
import { PROP_MGMT_PCT } from "./morbyMethodConfig";
import MorbyMethodPdfTemplate from "./MorbyMethodPdfTemplate";
import { useGenerateReport } from "../pdfExport/useGenerateReport";
import GenerateReportButton from "../pdfExport/GenerateReportButton";

export default function MorbyMethodSummary({ summary }) {
  const { printRef, exporting, handleGenerateReport } = useGenerateReport(
    "morby-method-report",
  );

  if (!summary) return null;

  return (
    <div className="deal-analyzer-summary">
      <h3>Deal Summary</h3>

      {/* Cash Flow verdict */}
      <div
        className={`deal-analyzer-final-verdict ${summary.monthlyCashFlow >= 0 ? "deal-analyzer-verdict-positive" : "deal-analyzer-verdict-negative"}`}
      >
        <span>Monthly Cash Flow</span>
        <strong>
          <AnimatedAmount value={summary.monthlyCashFlow} format={fmt} />
        </strong>
      </div>

      <div
        className="deal-analyzer-summary-grid"
        style={{ marginTop: "1.25rem" }}
      >
        {/* Capital Stack */}
        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1", marginTop: 0 }}
        >
          Capital Stack
        </div>
        <div>
          <span>Purchase Price</span>
          <strong>
            <AnimatedAmount value={summary.purchasePrice} format={fmt} />
          </strong>
        </div>
        <div>
          <span>DSCR Loan ({100 - summary.downPct}% LTV — 1st lien)</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.dscrLoanAmount} format={fmt} />
          </strong>
        </div>
        <div>
          <span>
            Seller Carryback ({summary.sellerCarrybackPct}% — 2nd lien)
          </span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.sellerCarryback} format={fmt} />
          </strong>
        </div>

        {/* Monthly Expenses */}
        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1" }}
        >
          Monthly Expenses
        </div>
        <div>
          <span>Monthly Rent</span>
          <strong className="deal-analyzer-return-positive">
            <AnimatedAmount value={summary.monthlyRent} format={fmt} />
          </strong>
        </div>
        {summary.dscrMonthlyPayment > 0 && (
          <div>
            <span>
              DSCR Payment ({summary.dscrRatePct}%, {summary.dscrTermYears} yr
              {summary.extraDownPaymentAmt > 0
                ? `, ${fmt(summary.effectiveDscrLoanAmount)} loan`
                : ""}
              )
            </span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.dscrMonthlyPayment} format={fmt} />
            </strong>
          </div>
        )}
        {summary.sellerCarrybackMonthly > 0 && (
          <div>
            <span>
              Seller Note Payment (
              {summary.sellerCarrybackRatePct > 0
                ? `${summary.sellerCarrybackRatePct}%`
                : "0%"}
              , {summary.sellerCarrybackTermYears} yr)
            </span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount
                value={summary.sellerCarrybackMonthly}
                format={fmt}
              />
            </strong>
          </div>
        )}
        {summary.lenderMonthlyPayment > 0 && (
          <div>
            <span>
              Additional Lender Payment ({summary.lenders.length} lender
              {summary.lenders.length !== 1 ? "s" : ""})
            </span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount
                value={summary.lenderMonthlyPayment}
                format={fmt}
              />
            </strong>
          </div>
        )}
        <div>
          <span>Property Management ({PROP_MGMT_PCT}%)</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.propMgmtFee} format={fmt} />
          </strong>
        </div>
        {summary.monthlyMiscExpense > 0 && (
          <div>
            <span>
              Misc. Expenses (Annual {fmt(summary.annualMiscExpense)} ÷ 12)
            </span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.monthlyMiscExpense} format={fmt} />
            </strong>
          </div>
        )}
        {summary.monthlyInsurance > 0 && (
          <div>
            <span>Home Insurance (÷ 12 monthly)</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.monthlyInsurance} format={fmt} />
            </strong>
          </div>
        )}
        {summary.monthlyTaxes > 0 && (
          <div>
            <span>Property Taxes (÷ 12 monthly)</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.monthlyTaxes} format={fmt} />
            </strong>
          </div>
        )}
        {summary.monthlyHomeWarranty > 0 && (
          <div>
            <span>Home Warranty</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount
                value={summary.monthlyHomeWarranty}
                format={fmt}
              />
            </strong>
          </div>
        )}
        <div>
          <span>Total Monthly Expenses</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.totalMonthlyExpenses} format={fmt} />
          </strong>
        </div>

        {/* Buyer Cash to Close */}
        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1" }}
        >
          Buyer Cash to Close
        </div>
        <div>
          <span>Down Payment ({summary.downPct}%)</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.downPaymentRequired} format={fmt} />
          </strong>
        </div>
        {summary.extraDownPaymentAmt > 0 && (
          <div>
            <span>Extra Down Payment</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount
                value={summary.extraDownPaymentAmt}
                format={fmt}
              />
            </strong>
          </div>
        )}
        {summary.originationFees > 0 && (
          <div>
            <span>Origination Fees ({summary.originationFeesPct}%)</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.originationFees} format={fmt} />
            </strong>
          </div>
        )}
        {summary.legalFees > 0 && (
          <div>
            <span>Doc Fees</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.legalFees} format={fmt} />
            </strong>
          </div>
        )}
        {summary.appraisalFees > 0 && (
          <div>
            <span>Appraisal Fees</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.appraisalFees} format={fmt} />
            </strong>
          </div>
        )}
        {summary.underwritingFees > 0 && (
          <div>
            <span>Underwriting Fees</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.underwritingFees} format={fmt} />
            </strong>
          </div>
        )}
        <div>
          <span>Closing Costs</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.closingCosts} format={fmt} />
          </strong>
        </div>
        {summary.agentCommissionAmt > 0 && (
          <div>
            <span>Agent Commission ({summary.agentCommissionPct}%)</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.agentCommissionAmt} format={fmt} />
            </strong>
          </div>
        )}
        <div>
          <span>Inspection</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.inspectionCost} format={fmt} />
          </strong>
        </div>
        <div>
          <span>Total Needed at Close</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.totalUpfrontNeeded} format={fmt} />
          </strong>
        </div>
        <div>
          <span>Seller Covers (2nd lien)</span>
          <strong className="deal-analyzer-return-positive">
            <AnimatedAmount value={summary.sellerCovers} format={fmt} />
          </strong>
        </div>
        {summary.sellerExcess > 0 && (
          <div>
            <span>Seller Excess (reserves / rehab)</span>
            <strong className="deal-analyzer-return-positive">
              <AnimatedAmount value={summary.sellerExcess} format={fmt} />
            </strong>
          </div>
        )}
        {summary.lenderTotal > 0 && (
          <div>
            <span>
              Additional Lender Contributions ({summary.lenders.length} lender
              {summary.lenders.length !== 1 ? "s" : ""})
            </span>
            <strong className="deal-analyzer-return-positive">
              <AnimatedAmount value={summary.lenderTotal} format={fmt} />
            </strong>
          </div>
        )}
        <div>
          <span>
            <strong>Buyer Cash to Close</strong>
          </span>
          <strong
            className={
              summary.buyerCashToClose === 0
                ? "deal-analyzer-return-positive"
                : "deal-analyzer-return-negative"
            }
          >
            <AnimatedAmount value={summary.buyerCashToClose} format={fmt} />
          </strong>
        </div>

        {/* Returns */}
        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1" }}
        >
          Returns
        </div>
        <div>
          <span>Monthly Cash Flow</span>
          <strong
            className={
              summary.monthlyCashFlow >= 0
                ? "deal-analyzer-return-positive"
                : "deal-analyzer-return-negative"
            }
          >
            <AnimatedAmount value={summary.monthlyCashFlow} format={fmt} />
          </strong>
        </div>
        <div>
          <span>Annual Cash Flow</span>
          <strong
            className={
              summary.annualCashFlow >= 0
                ? "deal-analyzer-return-positive"
                : "deal-analyzer-return-negative"
            }
          >
            <AnimatedAmount value={summary.annualCashFlow} format={fmt} />
          </strong>
        </div>
        {summary.dscrMonthlyPayment > 0 && (
          <div>
            <span>DSCR (NOI ÷ 1st lien payment)</span>
            <strong
              className={
                summary.dscr >= 1.25
                  ? "deal-analyzer-return-positive"
                  : "deal-analyzer-return-negative"
              }
            >
              {summary.dscr.toFixed(2)}
            </strong>
          </div>
        )}
        {summary.cashOnCash !== null && (
          <div>
            <span>Cash-on-Cash Return</span>
            <strong
              className={
                summary.cashOnCash >= 8
                  ? "deal-analyzer-return-positive"
                  : "deal-analyzer-return-negative"
              }
            >
              {summary.cashOnCash.toFixed(1)}%
            </strong>
          </div>
        )}
        {summary.buyerCashToClose === 0 && (
          <div>
            <span>Cash-on-Cash Return</span>
            <strong className="deal-analyzer-return-positive">
              ∞ (zero cash in)
            </strong>
          </div>
        )}
        <div>
          <span>Cap Rate</span>
          <strong
            className={
              summary.capRate >= 5
                ? "deal-analyzer-return-positive"
                : "deal-analyzer-return-negative"
            }
          >
            {summary.capRate.toFixed(1)}%
          </strong>
        </div>
      </div>

      <div className="deal-analyzer-calculation" style={{ marginTop: "1rem" }}>
        Monthly Cash Flow = Rent − DSCR Payment − Seller Note − Prop. Mgmt
        {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
        <span>
          {fmt(summary.monthlyRent)} − {fmt(summary.dscrMonthlyPayment)} −{" "}
          {fmt(summary.sellerCarrybackMonthly)} − {fmt(summary.propMgmtFee)}
          {summary.monthlyMiscExpense > 0
            ? ` − ${fmt(summary.monthlyMiscExpense)}`
            : ""}{" "}
          = {fmt(summary.monthlyCashFlow)}
        </span>
      </div>

      <GenerateReportButton
        onClick={handleGenerateReport}
        exporting={exporting}
      />

      {exporting && <MorbyMethodPdfTemplate ref={printRef} summary={summary} />}
    </div>
  );
}
