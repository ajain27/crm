const seedDeals = [
  {
    id: crypto.randomUUID(),
    address: "123 Main St",
    city: "Austin",
    zipCode: "78701",
    state: "TX",
    arv: 450000,
    rehabCost: 45000,
    mao: 275000,
    offerStatus: "Not Sent",
    offerDate: "",
    sellerAccepted: "No",
    assigned: "No",
    notes: "New lead. Needs comp review.",
    closed: "No",
  },
];

const STORAGE_KEY = "wholesale-real-estate-crm-v2";
const BUYERS_STORAGE_KEY = "wholesale-buyers-crm-v1";

function normalizeDeal(deal) {
  return {
    ...deal,
    zipCode: deal.zipCode || deal.county || "",
  };
}

function getSavedDeals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).map(normalizeDeal) : seedDeals;
  } catch {
    return seedDeals;
  }
}

function getSavedBuyers() {
  try {
    const saved = localStorage.getItem(BUYERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function currency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function monthKey(dateString) {
  return dateString ? dateString.slice(0, 7) : "";
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// annualRateDecimal: e.g. 0.065 for 6.5%
function calculateMonthlyPayment(
  loanPrincipal,
  annualRateDecimal,
  totalPayments,
) {
  if (loanPrincipal <= 0 || totalPayments <= 0) return 0;
  const r = annualRateDecimal / 12;
  if (r <= 0) return loanPrincipal / totalPayments;
  const factor = (1 + r) ** totalPayments;
  return loanPrincipal * ((r * factor) / (factor - 1));
}

function findDuplicateByAddress(items, address) {
  const normalized = address.trim().toLowerCase();
  return normalized
    ? (items.find((item) => item.address.trim().toLowerCase() === normalized) ??
        null)
    : null;
}

function parseCurrency(value) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePercent(value) {
  const n = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmt(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtCurrencyInput(value) {
  const numeric = String(value || "").replace(/[^0-9]/g, "");
  return numeric ? "$" + parseInt(numeric, 10).toLocaleString("en-US") : "";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

export {
  normalizeDeal,
  getSavedDeals,
  getSavedBuyers,
  BUYERS_STORAGE_KEY,
  currency,
  monthKey,
  formatPhone,
  calculateMonthlyPayment,
  parseCurrency,
  parsePercent,
  fmt,
  fmtCurrencyInput,
  formatDate,
  findDuplicateByAddress,
};
