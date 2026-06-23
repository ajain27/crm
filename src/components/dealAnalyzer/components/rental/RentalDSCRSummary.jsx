import { AnimatedAmount } from "../../../elements/elements";
import { fmt } from "../../../../utils/utils";
import { SellerCreditCarrybackSummaryRow } from "./SellerCreditCarryback";
import RentalPieChart from "./RentalPieChart";
import { PROP_MGMT_PCT } from "./useDSCRCalculations";

function RentalDSCRSummary({ summary }) {
  return (
    <div className="deal-analyzer-summary">
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
        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1", marginTop: 0 }}
        >
          Income
        </div>
        <div>
          <span>Monthly Rent</span>
          <strong className="deal-analyzer-return-positive">
            <AnimatedAmount value={summary.monthlyRent} format={fmt} />
          </strong>
        </div>

        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1" }}
        >
          Monthly Expenses
        </div>
        {summary.loanMortgage > 0 && (
          <div>
            <span>
              Monthly Mortgage (DSCR {summary.interestRatePct}%,{" "}
              {summary.loanTermYears} yr
              {summary.extraDownPaymentAmt > 0
                ? `, ${fmt(summary.effectiveLoanAmount)} loan`
                : ""}
              )
            </span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.loanMortgage} format={fmt} />
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
        {summary.cashHelocMonthlyPayment > 0 && (
          <div>
            <span>
              Cash-to-Buy HELOC Payment (Interest-Only,{" "}
              {summary.cashHelocRatePct}%)
            </span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount
                value={summary.cashHelocMonthlyPayment}
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

        <div
          className="deal-analyzer-section-label"
          style={{ gridColumn: "1 / -1" }}
        >
          Total Cash Needed to Buy
        </div>
        <div>
          <span>
            Down Payment ({summary.downPct}% of purchase)
            {summary.extraDownPaymentAmt > 0 && (
              <span
                className="deal-analyzer-auto-badge"
                style={{ marginLeft: "0.35rem" }}
              >
                base
              </span>
            )}
          </span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.downPayment} format={fmt} />
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
        <div>
          <span>Closing Costs</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.closingCosts} format={fmt} />
          </strong>
        </div>
        {summary.underwritingFees > 0 && (
          <div>
            <span>Underwriting Fees</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.underwritingFees} format={fmt} />
            </strong>
          </div>
        )}
        {summary.agentCommissionAmt > 0 && (
          <div>
            <span>Agent Commission ({summary.agentCommissionPct}%)</span>
            <strong className="deal-analyzer-return-negative">
              <AnimatedAmount value={summary.agentCommissionAmt} format={fmt} />
            </strong>
          </div>
        )}
        <div>
          <span>Inspection Cost</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.inspectionCost} format={fmt} />
          </strong>
        </div>
        {summary.lenderTotal > 0 && (
          <>
            <div>
              <span>Subtotal Before Lender Contributions</span>
              <strong>
                <AnimatedAmount value={summary.grossCashNeeded} format={fmt} />
              </strong>
            </div>
            <div>
              <span>
                Additional Lender Contributions ({summary.lenders.length} lender
                {summary.lenders.length !== 1 ? "s" : ""})
              </span>
              <strong className="deal-analyzer-return-positive">
                −<AnimatedAmount value={summary.lenderTotal} format={fmt} />
              </strong>
            </div>
          </>
        )}
        <SellerCreditCarrybackSummaryRow
          pct={summary.sellerCarrybackPct}
          amount={summary.sellerCarryback}
          fmt={fmt}
        />
        <div>
          <span>Total Cash Needed to Buy</span>
          <strong className="deal-analyzer-return-negative">
            <AnimatedAmount value={summary.totalFundsNeeded} format={fmt} />
          </strong>
        </div>

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
        {summary.loanMortgage > 0 && (
          <div>
            <span>DSCR</span>
            <strong
              className={
                summary.dscr >= 1
                  ? "deal-analyzer-return-positive"
                  : "deal-analyzer-return-negative"
              }
            >
              {summary.dscr.toFixed(2)}
            </strong>
          </div>
        )}
        <div>
          <span>Cash-on-Cash Return</span>
          <strong
            className={
              summary.cashOnCash >= 0
                ? "deal-analyzer-return-positive"
                : "deal-analyzer-return-negative"
            }
          >
            {summary.cashOnCash.toFixed(1)}%
          </strong>
        </div>
        <div>
          <span>Cap Rate</span>
          <strong
            className={
              summary.capRate >= 0
                ? "deal-analyzer-return-positive"
                : "deal-analyzer-return-negative"
            }
          >
            {summary.capRate.toFixed(1)}%
          </strong>
        </div>
      </div>

      <RentalPieChart summary={summary} />

      <div className="deal-analyzer-calculation" style={{ marginTop: "1rem" }}>
        Monthly Cash Flow = Rent − Prop. Mgmt − Monthly Mortgage
        {summary.cashHelocMonthlyPayment > 0 ? " − Cash HELOC" : ""}
        {summary.monthlyMiscExpense > 0 ? " − Misc." : ""}
        <span>
          {fmt(summary.monthlyRent)} − {fmt(summary.propMgmtFee)}
          {summary.loanMortgage > 0 ? ` − ${fmt(summary.loanMortgage)}` : ""}
          {summary.cashHelocMonthlyPayment > 0
            ? ` − ${fmt(summary.cashHelocMonthlyPayment)}`
            : ""}
          {summary.monthlyMiscExpense > 0
            ? ` − ${fmt(summary.monthlyMiscExpense)}`
            : ""}{" "}
          = {fmt(summary.monthlyCashFlow)}
        </span>
      </div>

      <div
        className="deal-analyzer-calculation"
        style={{ marginTop: "0.75rem" }}
      >
        Annual Cash Flow = Monthly Cash Flow × 12
        <span>
          {fmt(summary.monthlyCashFlow)} × 12 = {fmt(summary.annualCashFlow)}
        </span>
      </div>
    </div>
  );
}

export default RentalDSCRSummary;
