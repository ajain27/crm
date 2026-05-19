import {
  getAutoRehabCost,
  getRehabMultiplier,
  parseCurrency,
} from "../../dealAnalyzer/components/fixAndFlip/fixAndFlipConfig";

export const SESSION_STORAGE_KEY = "crmCurrentUser";
export const MAX_PROFILE_IMAGE_SIZE = 600 * 1024;
export const MAX_CONTRACT_FILE_SIZE = 700 * 1024;
export const IDLE_LOGOUT_MS = 30 * 60 * 1000;

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
    address: "",
    city: "",
    zipCode: "",
    state: "",
    propertyType: "Single Family",
    onMarket: "No",
    listedPrice: "",
    agentName: "",
    agentPhone: "",
    listingUrl: "",
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
    notes: "",
    closed: "No",
    closedDate: "",
    closedInMonth: "",
  };
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
