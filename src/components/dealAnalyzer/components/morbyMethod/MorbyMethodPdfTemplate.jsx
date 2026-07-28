import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { fmt } from "../../../../utils/utils";
import { PROP_MGMT_PCT } from "./morbyMethodConfig";

function Row({ label, value, tone, bold }) {
  return (
    <div className={`mm-pdf-row${bold ? " mm-pdf-row-total" : ""}`}>
      <span className="mm-pdf-row-label">{label}</span>
      <span className={`mm-pdf-row-value${tone ? ` mm-pdf-${tone}` : ""}`}>
        {value}
      </span>
    </div>
  );
}

const MorbyMethodPdfTemplate = forwardRef(function MorbyMethodPdfTemplate(
  { summary },
  ref,
) {
  if (!summary || typeof document === "undefined") return null;

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
          <p className="mm-pdf-tagline">Morby Method Deal Summary</p>
        </div>
        <div className="mm-pdf-meta">
          <p className="mm-pdf-meta-label">Generated</p>
          <p className="mm-pdf-meta-value">{generatedOn}</p>
        </div>
      </div>
      <div className="mm-pdf-rule" />

      <div className="mm-pdf-body">
        <div
          className={`mm-pdf-verdict ${summary.monthlyCashFlow >= 0 ? "mm-pdf-verdict-positive" : "mm-pdf-verdict-negative"}`}
        >
          <span>Monthly Cash Flow</span>
          <strong>{fmt(summary.monthlyCashFlow)}</strong>
        </div>

        <p className="mm-pdf-section-title">Capital Stack</p>
        <Row label="Purchase Price" value={fmt(summary.purchasePrice)} />
        <Row
          label={`DSCR Loan (${100 - summary.downPct}% LTV — 1st lien)`}
          value={fmt(summary.dscrLoanAmount)}
        />
        <Row
          label={`Seller Carryback (${summary.sellerCarrybackPct}% — 2nd lien)`}
          value={fmt(summary.sellerCarryback)}
        />

        {summary.sellerCarryback > 0 && (
          <>
            <p className="mm-pdf-section-title">Seller Note Terms</p>
            <Row label="Note Amount" value={fmt(summary.sellerCarryback)} />
            <Row
              label="Interest Rate"
              value={
                summary.sellerCarrybackRatePct > 0
                  ? `${summary.sellerCarrybackRatePct}%`
                  : "0%"
              }
            />
            <Row
              label="Term"
              value={`${summary.sellerCarrybackTermYears} yr`}
            />
            <Row
              label="Monthly Payment"
              value={fmt(summary.sellerCarrybackMonthly)}
            />
            {summary.sellerCarrybackBalloonYears > 0 && (
              <>
                <Row
                  label="Balloon Due"
                  value={`Year ${summary.sellerCarrybackBalloonYears}`}
                />
                <Row
                  label="Balloon Payment (remaining balance)"
                  value={fmt(summary.sellerCarrybackBalloon)}
                  bold
                />
              </>
            )}
          </>
        )}

        <p className="mm-pdf-section-title">Monthly Expenses</p>
        <Row
          label="Monthly Rent"
          value={fmt(summary.monthlyRent)}
          tone="positive"
        />
        {summary.dscrMonthlyPayment > 0 && (
          <Row
            label={`DSCR Payment (${summary.dscrRatePct}%, ${summary.dscrTermYears} yr${
              summary.extraDownPaymentAmt > 0
                ? `, ${fmt(summary.effectiveDscrLoanAmount)} loan`
                : ""
            })`}
            value={fmt(summary.dscrMonthlyPayment)}
          />
        )}
        {summary.sellerCarrybackMonthly > 0 && (
          <Row
            label={`Seller Note Payment (${
              summary.sellerCarrybackRatePct > 0
                ? `${summary.sellerCarrybackRatePct}%`
                : "0%"
            }, ${summary.sellerCarrybackTermYears} yr)`}
            value={fmt(summary.sellerCarrybackMonthly)}
          />
        )}
        {summary.lenderMonthlyPayment > 0 && (
          <Row
            label={`Additional Lender Payment (${summary.lenders.length} lender${
              summary.lenders.length !== 1 ? "s" : ""
            })`}
            value={fmt(summary.lenderMonthlyPayment)}
          />
        )}
        <Row
          label={`Property Management (${PROP_MGMT_PCT}%)`}
          value={fmt(summary.propMgmtFee)}
        />
        {summary.monthlyMiscExpense > 0 && (
          <Row
            label={`Misc. Expenses (Annual ${fmt(summary.annualMiscExpense)} ÷ 12)`}
            value={fmt(summary.monthlyMiscExpense)}
          />
        )}
        {summary.monthlyInsurance > 0 && (
          <Row
            label="Home Insurance (÷ 12 monthly)"
            value={fmt(summary.monthlyInsurance)}
          />
        )}
        {summary.monthlyTaxes > 0 && (
          <Row
            label="Property Taxes (÷ 12 monthly)"
            value={fmt(summary.monthlyTaxes)}
          />
        )}
        {summary.monthlyHomeWarranty > 0 && (
          <Row label="Home Warranty" value={fmt(summary.monthlyHomeWarranty)} />
        )}
        <Row
          label="Total Monthly Expenses"
          value={fmt(summary.totalMonthlyExpenses)}
          bold
        />

        <p className="mm-pdf-section-title">Buyer Cash to Close</p>
        <Row
          label={`Down Payment (${summary.downPct}%)`}
          value={fmt(summary.downPaymentRequired)}
        />
        {summary.extraDownPaymentAmt > 0 && (
          <Row
            label="Extra Down Payment"
            value={fmt(summary.extraDownPaymentAmt)}
          />
        )}
        {summary.originationFees > 0 && (
          <Row
            label={`Origination Fees (${summary.originationFeesPct}%)`}
            value={fmt(summary.originationFees)}
          />
        )}
        {summary.legalFees > 0 && (
          <Row label="Doc Fees" value={fmt(summary.legalFees)} />
        )}
        {summary.appraisalFees > 0 && (
          <Row label="Appraisal Fees" value={fmt(summary.appraisalFees)} />
        )}
        {summary.underwritingFees > 0 && (
          <Row
            label="Underwriting Fees"
            value={fmt(summary.underwritingFees)}
          />
        )}
        <Row label="Closing Costs" value={fmt(summary.closingCosts)} />
        {summary.agentCommissionAmt > 0 && (
          <Row
            label={`Agent Commission (${summary.agentCommissionPct}%)`}
            value={fmt(summary.agentCommissionAmt)}
          />
        )}
        <Row label="Inspection" value={fmt(summary.inspectionCost)} />
        <Row
          label="Seller Covers (2nd lien)"
          value={fmt(summary.sellerCovers)}
          tone="positive"
        />
        {summary.sellerExcess > 0 && (
          <Row
            label="Seller Excess (reserves / rehab)"
            value={fmt(summary.sellerExcess)}
            tone="positive"
          />
        )}
        {summary.lenderTotal > 0 && (
          <Row
            label={`Additional Lender Contributions (${summary.lenders.length} lender${
              summary.lenders.length !== 1 ? "s" : ""
            })`}
            value={fmt(summary.lenderTotal)}
            tone="positive"
          />
        )}
        <Row
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
      </div>

      <div className="mm-pdf-footer">
        You Win Estates — This summary is an estimate for planning purposes only
        and does not constitute financial or legal advice.
      </div>
    </div>,
    document.body,
  );
});

export default MorbyMethodPdfTemplate;
