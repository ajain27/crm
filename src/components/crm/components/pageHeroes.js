import {
  BarChart3,
  Building2,
  Calculator,
  Crosshair,
  Home,
  KeyRound,
  Landmark,
  Receipt,
  Store,
  Users,
} from "lucide-react";

// Each page's opening banner (PageHero), by view: the label and icon from
// the menu, a headline typed out one letter at a time (the `accent` part
// highlighted), and what the page is for.
const hero = (icon, eyebrow, [before, accent, after = ""], description) => ({
  icon,
  eyebrow,
  headline: [
    { text: before },
    { text: accent, className: "page-hero-accent" },
    ...(after ? [{ text: after }] : []),
  ],
  description,
});

export const PAGE_HEROES = {
  dashboard: hero(
    Home,
    "Dashboard",
    ["Your deals, ", "at a glance."],
    "Track every deal from offer to close — revenue, your pipeline and what needs attention next.",
  ),
  leads: hero(
    Crosshair,
    "Leads",
    ["Turn leads into ", "closed deals."],
    "Residential, commercial, PPC, PPL and cold calling leads in one place — follow up, run comps and move the best ones into your pipeline.",
  ),
  "deal-analyzer": hero(
    BarChart3,
    "Deal Analyzer",
    ["Run the numbers ", "before you offer."],
    "Comps and ARV, wholesale MAO, rentals, flips, Sub-To, seller finance and more — every way to buy, side by side.",
  ),
  "on-market-deals": hero(
    Store,
    "On Market Deals",
    ["Find your ", "on-market deals", " here."],
    'Homes for sale whose listing reads like an investor deal — "as is", "TLC", "motivated seller" and more. Pick your markets, then find deals.',
  ),
  "pm-deals": hero(
    Landmark,
    "PML Deals",
    ["Keep your ", "private money", " on track."],
    "Track borrower details and loan terms. Late interest accrues automatically, day by day, after the due date.",
  ),
  "title-companies": hero(
    Building2,
    "Title Companies",
    ["Your closing team, ", "state by state."],
    "Manage your title and closing contacts by state, ready for every contract.",
  ),
  "rental-management": hero(
    KeyRound,
    "Rental Management",
    ["Keep your rentals ", "cash-flowing."],
    "Tenants, leases, rent and mortgage for every property you hold.",
  ),
  mortgage: hero(
    Calculator,
    "Mortgage Calculator",
    ["Know your payment ", "before you buy."],
    "Work out monthly payments, carrying costs and financing for any purchase.",
  ),
  buyers: hero(
    Users,
    "Buyers List",
    ["The right buyer ", "for every deal."],
    "Your cash buyers — where they buy, what they buy and how to reach them.",
  ),
  "invoice-generator": hero(
    Receipt,
    "Invoice Generator",
    ["Get paid ", "faster."],
    "Create, send and schedule invoices in a few clicks.",
  ),
};
