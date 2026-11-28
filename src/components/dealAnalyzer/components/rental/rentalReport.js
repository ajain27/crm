import { fmt } from "../fixAndFlip/fixAndFlipConfig";

const positive = (n) => (n > 0 ? n : null);
const tone = (n) => (n >= 0 ? "positive" : "negative");

// The Generate Report props (see TabReport) for a rental run with cash or
// with a HELOC: the same rows the tab's summary shows, in its sections.
export function rentalReportProps(summary, { heloc = false, propMgmtPct }) {
  const money = (label, value, extra = {}) => ({
    label,
    value: value == null ? null : fmt(value),
    ...extra,
  });
  return {
    filename: heloc ? "rental-heloc-report" : "rental-cash-report",
    tagline: heloc
      ? "Rental Summary — HELOC"
      : "Rental Summary — Cash Purchase",
    verdict: {
      label: "Monthly Cash Flow",
      value: fmt(summary.monthlyCashFlow),
      positive: summary.monthlyCashFlow >= 0,
    },
    sections: [
      {
        title: "Income",
        rows: [
          money("Monthly Rent", summary.monthlyRent, { tone: "positive" }),
        ],
      },
      {
        title: "Monthly Expenses",
        rows: [
          heloc &&
            money(
              `HELOC Payment (${summary.helocInterestRatePct}%, ${summary.helocTermYears} yr)`,
              positive(summary.helocPayment),
              { tone: "negative" },
            ),
          money(`Property Management (${propMgmtPct}%)`, summary.propMgmtFee, {
            tone: "negative",
          }),
          money("Home Insurance", positive(summary.monthlyInsurance), {
            tone: "negative",
          }),
          money("Property Taxes", positive(summary.monthlyTaxes), {
            tone: "negative",
          }),
          money(
            `Misc. Expenses (Annual ${fmt(summary.annualMiscExpense)} ÷ 12)`,
            positive(summary.monthlyMiscExpense),
            { tone: "negative" },
          ),
          money("Home Warranty", positive(summary.monthlyHomeWarranty), {
            tone: "negative",
          }),
          money("HOA Dues", positive(summary.monthlyHoa), { tone: "negative" }),
          money("Total Monthly Expenses", summary.totalMonthlyExpenses, {
            tone: "negative",
            bold: true,
          }),
        ],
      },
      {
        title: heloc ? "Cash Needed to Close" : "One-Time Costs",
        rows: [
          money("Purchase Price", summary.purchasePrice),
          money("Closing Costs", summary.closingCosts),
          money(
            `Agent Commission (${summary.agentCommissionPct}%)`,
            positive(summary.agentCommissionAmt),
          ),
          money("Inspection Cost", summary.inspectionCost),
          {
            label: `Seller Credit / Carryback (${summary.sellerCarrybackPct}%)`,
            value:
              summary.sellerCarryback > 0
                ? `−${fmt(summary.sellerCarryback)}`
                : null,
            tone: "positive",
          },
          money(
            heloc ? "Total Cash Needed to Close" : "Total Funds Needed",
            summary.totalFundsNeeded,
            { bold: true, tone: "negative" },
          ),
        ],
      },
      {
        title: "Returns",
        rows: [
          money("Monthly Cash Flow", summary.monthlyCashFlow, {
            tone: tone(summary.monthlyCashFlow),
          }),
          money("Annual Cash Flow", summary.annualCashFlow, {
            tone: tone(summary.annualCashFlow),
            bold: true,
          }),
          heloc &&
            summary.helocPayment > 0 && {
              label: "DSCR",
              value: Number(summary.dscr || 0).toFixed(2),
              tone: summary.dscr >= 1 ? "positive" : "negative",
            },
          {
            label: "Cash-on-Cash Return",
            value: `${summary.cashOnCash.toFixed(1)}%`,
            tone: tone(summary.cashOnCash),
          },
          {
            label: "Cap Rate",
            value: `${summary.capRate.toFixed(1)}%`,
            tone: tone(summary.capRate),
          },
        ],
      },
    ],
    formula: {
      text: "Monthly Cash Flow = Rent − Total Monthly Expenses; Annual Cash Flow = Monthly Cash Flow × 12",
      calc: `${fmt(summary.monthlyRent)} − ${fmt(summary.totalMonthlyExpenses)} = ${fmt(summary.monthlyCashFlow)}; × 12 = ${fmt(summary.annualCashFlow)}`,
    },
  };
}
