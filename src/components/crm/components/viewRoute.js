// The page shown is kept in the address bar, so a refresh (or the back
// button) lands on the same page: "/" is the dashboard, "/leads/ppl" the
// Leads page on its PPL tab, "/buyers" Buyers, and so on.

export const VIEWS = [
  "dashboard",
  "deal-analyzer",
  "leads",
  "pm-deals",
  "on-market-deals",
  "title-companies",
  "rental-management",
  "buyers",
  "mortgage",
  "invoice-generator",
];

export const LEAD_TABS = [
  "residential",
  "commercial",
  "ppc",
  "ppl",
  "coldcall",
  "county",
];

// "/leads/ppl" → { view: "leads", leadsTab: "ppl" }. Unknown paths are the
// dashboard; an unknown Leads tab is the usual one (null).
export function routeFromPath(pathname) {
  const [view, tab] = String(pathname || "")
    .split("/")
    .filter(Boolean);
  if (!VIEWS.includes(view)) return { view: "dashboard", leadsTab: null };
  return {
    view,
    leadsTab: view === "leads" && LEAD_TABS.includes(tab) ? tab : null,
  };
}

export function pathForRoute(view, leadsTab) {
  if (!view || view === "dashboard") return "/";
  if (view === "leads" && leadsTab) return `/leads/${leadsTab}`;
  return `/${view}`;
}
