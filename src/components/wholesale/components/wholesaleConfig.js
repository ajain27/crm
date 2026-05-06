export const SESSION_STORAGE_KEY = "crmCurrentUser";
export const MAX_PROFILE_IMAGE_SIZE = 600 * 1024;
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
    arv: "",
    rehabCost: "",
    desiredProfit: "",
    mao: "",
    offerStatus: "Not Sent",
    offerDate: "",
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

export function createProfileForm(user = null) {
  return {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    profileImage: user?.profileImage || "",
  };
}
