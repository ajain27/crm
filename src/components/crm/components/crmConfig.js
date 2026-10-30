import {
  getAutoRehabCost,
  getRehabMultiplier,
  parseCurrency,
} from "../../dealAnalyzer/components/fixAndFlip/fixAndFlipConfig";

export const SESSION_STORAGE_KEY = "crmCurrentUser";
export const MAX_PROFILE_IMAGE_SIZE = 600 * 1024;
export const IDLE_LOGOUT_MS = 30 * 60 * 1000;

export const DEAL_TYPES = ["Wholesale", "Potential Rental"];

export const ASSIGNED_PRICE_ERROR =
  "Assigned price must be more than the contract price.";

// An assignment has to sell the contract for more than it's under
// contract for. Only checked once both prices are filled in.
export function isAssignedPriceTooLow(contractPrice, assignedPrice) {
  return (
    contractPrice > 0 && assignedPrice > 0 && assignedPrice <= contractPrice
  );
}

export const months = [
  "All",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

export function createDefaultFilters() {
  return {
    state: "All",
    propertyType: "All",
    offerAccepted: "All",
    offerStatus: "All",
    assigned: "All",
    search: "",
    closed: "All",
    offerMonth: "All",
    closedMonth: "All",
    year: "All",
  };
}

export function createEmptyDealForm() {
  return {
    dealType: "Wholesale",
    address: "",
    city: "",
    zipCode: "",
    state: "",
    propertyType: "Single Family",
    onMarket: "No",
    listedPrice: "",
    agentName: "",
    agentPhone: "",
    sellerFirstName: "",
    sellerLastName: "",
    sellerPhone: "",
    sellerPhones: [],
    sellerEmail: "",
    askingPrice: "",
    occupant: "",
    sellingUrgency: "",
    sellerMotivation: "",
    followUpDate: "",
    listingUrl: "",
    rent: "",
    occupied: "No",
    arv: "",
    rehabType: "",
    squareFootage: "",
    rehabCost: "",
    additionalRehabCost: "",
    desiredProfit: "",
    mao: "",
    offerStatus: "Not Sent",
    offerDate: "",
    contractVersions: [],
    contractFileName: "",
    contractFileData: "",
    contractFileType: "",
    sellerAccepted: "No",
    contractPrice: "",
    assigned: "No",
    assignedPrice: "",
    buyerName: "",
    buyerEmail: "",
    jvDeal: "No",
    jvPartnerName: "",
    jvPartnerEmail: "",
    jvSplit: "",
    source: "",
    notes: "",
    closed: "No",
    closedDate: "",
    closedInMonth: "",
  };
}

// A deal is inactive when it was made inactive by hand, or its offer was
// rejected or withdrawn. Inactive deals show in the dashboard's Inactive tab.
export function isDealRejected(deal) {
  return (
    (deal.offerStatus || "Not Sent") === "Offer Sent" &&
    (deal.sellerAccepted || "No") === "No"
  );
}

export function isDealWithdrawn(deal) {
  return (deal.offerStatus || "Not Sent") === "Offer Withdrawn";
}

export function isDealInactive(deal) {
  return (
    deal.inactive === true || isDealRejected(deal) || isDealWithdrawn(deal)
  );
}

export function createContractVersion({
  name,
  type,
  data,
  uploadedAt = new Date().toISOString(),
}) {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    data,
    uploadedAt,
  };
}

export function getContractVersions(deal) {
  const versions = Array.isArray(deal?.contractVersions)
    ? deal.contractVersions
        .filter((version) => version?.id)
        .map((version, index) => ({
          id: version.id || `contract-version-${index}`,
          name: version.name || deal?.contractFileName || "Contract",
          type:
            version.type ||
            deal?.contractFileType ||
            "application/octet-stream",
          data: version.data || "",
          uploadedAt: version.uploadedAt || "",
        }))
    : [];

  if (versions.length > 0) {
    return [...versions].sort((a, b) =>
      String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")),
    );
  }

  if (deal?.contractFileData) {
    return [
      {
        id: `legacy-${deal.id || "contract"}`,
        name: deal.contractFileName || "Contract",
        type: deal.contractFileType || "application/octet-stream",
        data: deal.contractFileData,
        uploadedAt: deal.offerDate || "",
      },
    ];
  }

  return [];
}

export function createProfileForm(user = null) {
  return {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    profileImage: user?.profileImage || "",
  };
}

export function getWholesaleRehabDetails(form) {
  const sqft = parseInt(form?.squareFootage || "0", 10) || 0;
  const rehabMultiplier = getRehabMultiplier(form?.state);
  const autoRehabResult = getAutoRehabCost(form?.rehabType, sqft);
  const autoRehabCost =
    autoRehabResult !== null
      ? Math.round(autoRehabResult.cost * rehabMultiplier)
      : null;
  const manualRehabCost = parseCurrency(form?.rehabCost);
  const additionalRehabCost = parseCurrency(form?.additionalRehabCost);
  const baseRehabCost =
    autoRehabCost !== null ? autoRehabCost : manualRehabCost;
  const totalRehabCost =
    form?.rehabType === "no-rehab" ? 0 : baseRehabCost + additionalRehabCost;
  const rehabCostReady =
    form?.rehabType === "no-rehab" ||
    autoRehabCost !== null ||
    Boolean(form?.rehabCost?.trim());

  return {
    sqft,
    autoRehabCost,
    autoRehabEstimated: autoRehabResult?.estimated ?? false,
    isManualRehab: sqft > 5500 || !form?.rehabType,
    manualRehabCost,
    additionalRehabCost,
    baseRehabCost,
    totalRehabCost,
    rehabCostReady,
  };
}

export function getSuggestedWholesaleMao(form) {
  const arv = parseCurrency(form?.arv);
  const desiredProfit = parseCurrency(form?.desiredProfit);
  const { totalRehabCost } = getWholesaleRehabDetails(form);
  const suggestedMao = arv * 0.7 - totalRehabCost - desiredProfit;

  return Math.round(suggestedMao);
}
