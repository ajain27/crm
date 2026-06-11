import { SimpleStat, GaugeStat } from "../elements/elements";
import { ClipboardList, DollarSign } from "lucide-react";
import { currency, monthKey } from "../../utils/utils";

export default function StatsGrid({ deals, filteredDeals, filters }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(now);
  const getClosedMonth = (deal) =>
    deal.closedDate ? monthKey(deal.closedDate) : "";
  const offersThisMonth = filteredDeals.filter(
    (deal) => deal.offerDate && monthKey(deal.offerDate) === currentMonth,
  ).length;
  const acceptedOffers = filteredDeals.filter(
    (deal) => deal.sellerAccepted === "Yes",
  ).length;
  const assignedDeals = filteredDeals.filter(
    (deal) => deal.assigned === "Yes",
  ).length;
  const closedDeals = filteredDeals.filter(
    (deal) => deal.closed === "Yes",
  ).length;
  const activeDeals = filteredDeals.filter(
    (deal) =>
      deal.closed !== "Yes" &&
      !(deal.offerStatus !== "Not Sent" && deal.sellerAccepted === "No"),
  ).length;
  const deadDeals = filteredDeals.filter(
    (deal) => deal.offerStatus !== "Not Sent" && deal.sellerAccepted === "No",
  ).length;

  const closedJvDeals = filteredDeals.filter(
    (deal) => deal.closed === "Yes" && deal.jvDeal === "Yes",
  );
  const closedJvCount = closedJvDeals.length;
  const closedJvSplitTotal = closedJvDeals.reduce(
    (total, deal) => total + Number(deal.jvSplit || 0),
    0,
  );

  const revenueEligibleDeals = deals.filter(
    (deal) =>
      deal.closed === "Yes" &&
      deal.sellerAccepted === "Yes" &&
      deal.assigned === "Yes",
  );

  const currentMonthGrossRevenue = revenueEligibleDeals
    .filter((deal) => getClosedMonth(deal) === currentMonth)
    .reduce(
      (total, deal) =>
        total +
        (Number(deal.assignedPrice || 0) - Number(deal.contractPrice || 0)),
      0,
    );

  const filteredDealsRevenue = filteredDeals
    .filter(
      (deal) =>
        deal.closed === "Yes" &&
        deal.sellerAccepted === "Yes" &&
        deal.assigned === "Yes",
    )
    .reduce(
      (total, deal) =>
        total +
        (Number(deal.assignedPrice || 0) - Number(deal.contractPrice || 0)),
      0,
    );

  const monthNames = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
  };
  let revenueLabel = "Total Revenue";
  if (filters.closedMonth !== "All" && filters.year !== "All") {
    revenueLabel = `${monthNames[filters.closedMonth]} ${filters.year} Revenue`;
  } else if (filters.closedMonth !== "All") {
    revenueLabel = `${monthNames[filters.closedMonth]} Revenue`;
  } else if (filters.year !== "All") {
    revenueLabel = `${filters.year} Revenue`;
  }

  return (
    <section
      className="stats-grid"
      data-reveal-group
      style={{ "--reveal-delay": "60ms" }}
    >
      <SimpleStat
        icon={<ClipboardList size={20} />}
        label="Total Deals"
        subtitle="All time"
        value={deals.length}
        colorTheme="green"
      />
      <GaugeStat
        label="Offers Made"
        subtitle="Current month"
        value={offersThisMonth}
        max={Math.max(10, offersThisMonth * 2)}
        colorTheme="orange"
      />
      <GaugeStat
        label="Active Deals"
        value={activeDeals}
        max={Math.max(10, offersThisMonth * 2)}
        colorTheme="orange"
      />
      <GaugeStat
        label="Rejected Deals"
        subtitle="Offer rejected"
        value={deadDeals}
        max={Math.max(10, deadDeals * 2)}
        colorTheme="red"
      />
      <GaugeStat
        label="Accepted"
        subtitle="Current month"
        value={acceptedOffers}
        max={Math.max(5, acceptedOffers * 2)}
        colorTheme="green"
      />
      <GaugeStat
        label="Assigned"
        subtitle="All time"
        value={assignedDeals}
        max={Math.max(10, deals.length)}
        colorTheme="orange"
      />
      <GaugeStat
        label="Closed"
        subtitle="All time"
        value={closedDeals}
        max={Math.max(10, assignedDeals)}
        colorTheme="green"
      />
      <SimpleStat
        icon={<ClipboardList size={20} />}
        label="JV Deals Closed"
        subtitle="Closed JV deals"
        value={closedJvCount}
        colorTheme="orange"
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label="JV Split Total"
        subtitle="Closed JV deals"
        numericValue={closedJvSplitTotal}
        format={currency}
        colorTheme="orange"
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label={`${currentMonthLabel} Gross Revenue`}
        subtitle="Closed deals this month"
        numericValue={currentMonthGrossRevenue}
        format={currency}
        colorTheme="green"
      />
      <SimpleStat
        icon={<DollarSign size={20} />}
        label={revenueLabel}
        subtitle="Current filters"
        numericValue={filteredDealsRevenue}
        format={currency}
        colorTheme="green"
      />
    </section>
  );
}
