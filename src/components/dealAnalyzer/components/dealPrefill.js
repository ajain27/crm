import { fmtCurrencyInput, parseCurrency } from "../../../utils/utils";
import { getWholesaleRehabDetails } from "../../crm/components/crmConfig";

// "$450,000" from a deal's 450000 or "$450,000"; "" when there's none.
function money(value) {
  const n = parseCurrency(value);
  return n > 0 ? fmtCurrencyInput(String(n)) : "";
}

function digits(value) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

// The Deal Analyzer's inputs filled in from a CRM deal, by tab id, so a
// deal's numbers can be checked from its window. The deal's desired
// profit is the wholesale fee; the purchase price is the contract price,
// else the MAO.
export function prefillFromDeal(deal, address = "") {
  const rehab = {
    rehabType: deal.rehabType || "",
    squareFootage: digits(deal.squareFootage),
    rehabCost: money(deal.rehabCost),
    additionalRehabCost: money(deal.additionalRehabCost),
  };
  const state = String(deal.state || "")
    .trim()
    .toUpperCase();
  const arv = money(deal.arv);
  const wholesaleFee = money(deal.desiredProfit);
  const buyersProfit = String(deal.buyersProfit || "").replace(/[^0-9.]/g, "");
  return {
    wholesale: {
      propertyAddress: address,
      state,
      arv,
      ...rehab,
      wholesaleFee,
      buyersProfit: `${buyersProfit || 30}%`,
    },
    novation: {
      arv,
      repairs: money(getWholesaleRehabDetails(deal).totalRehabCost),
      wholesaleFee,
    },
    "fix-flip": {
      state,
      arv,
      purchasePrice: money(deal.contractPrice) || money(deal.mao),
      ...rehab,
    },
  };
}
