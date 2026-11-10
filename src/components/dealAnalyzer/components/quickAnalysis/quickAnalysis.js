import { parseCurrency, parsePercent } from "../../../../utils/utils";
import {
  getAutoRehabCost,
  getRehabMultiplier,
} from "../fixAndFlip/fixAndFlipConfig";
import {
  DEFAULT_BUYERS_PROFIT_PCT,
  getWholesaleRehabDetails,
} from "../../../crm/components/crmConfig";

// The wholesale fee assumed when a deal or lead doesn't name one.
export const DEFAULT_WHOLESALE_FEE = 10000;

// Novation: the 10% of ARV held back for selling the house on the market.
export const NOVATION_RESERVE = [
  { key: "agentCommission", label: "Agent commissions", pct: 6 },
  { key: "buffer", label: "Buffer", pct: 3 },
  { key: "closingCosts", label: "Closing costs", pct: 1 },
];

// "…, Houston, TX 77091" → "TX".
function stateFromAddress(address) {
  return (
    String(address || "")
      .match(/,\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/)?.[1]
      ?.toUpperCase() || ""
  );
}

// The Analyze window's starting answers for a CRM deal or a lead: the
// numbers it already has, else the usual defaults. `repairCost` is "" until
// the deal has a repair figure — the window asks for one.
export function analysisDefaults(item = {}) {
  const sqft =
    parseCurrency(item.squareFootage) || item.compsResult?.property?.sqft || 0;
  const rehab = getWholesaleRehabDetails(item);
  const fee = parseCurrency(item.desiredProfit);
  const buyersProfit = parsePercent(item.buyersProfit);
  return {
    arv: parseCurrency(item.arv),
    rehabType: item.rehabType || "",
    repairCost:
      item.rehabType && rehab.rehabCostReady ? rehab.totalRehabCost : "",
    wholesaleFee: fee > 0 ? fee : DEFAULT_WHOLESALE_FEE,
    buyersProfitPct:
      buyersProfit > 0 && buyersProfit < 100
        ? buyersProfit
        : DEFAULT_BUYERS_PROFIT_PCT,
    askingPrice: parseCurrency(item.askingPrice),
    sqft,
    state:
      String(item.state || "")
        .trim()
        .toUpperCase() || stateFromAddress(item.address),
  };
}

// The repair estimate for the work picked, from the property's size and
// state (null when it can't be estimated, e.g. a house over 5,500 sq ft).
export function estimateRepairs(rehabType, sqft, state) {
  const auto = getAutoRehabCost(rehabType, sqft);
  return auto ? Math.round(auto.cost * getRehabMultiplier(state)) : null;
}

// Wholesale: the buyer's price leaves them their profit after repairs, and
// the offer to the seller leaves the wholesale fee on top.
export function wholesaleNumbers({
  arv,
  repairs,
  wholesaleFee,
  buyersProfitPct,
}) {
  const buyersProfit = arv * (buyersProfitPct / 100);
  const mao = arv - buyersProfit - repairs - wholesaleFee;
  return {
    arv,
    buyersProfit,
    repairs,
    wholesaleFee,
    mao,
    buyerPrice: mao + wholesaleFee,
  };
}

// Novation: the house sells on the market at ARV, less the 10% reserve,
// repairs and the fee — as the Deal Analyzer's Novation tab works it.
export function novationNumbers({ arv, repairs, wholesaleFee }) {
  const reserve = Object.fromEntries(
    NOVATION_RESERVE.map(({ key, pct }) => [key, arv * (pct / 100)]),
  );
  return {
    arv,
    ...reserve,
    repairs,
    wholesaleFee,
    offer: arv * 0.9 - repairs - wholesaleFee,
  };
}
