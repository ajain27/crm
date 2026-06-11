import { useMemo } from "react";

export function useFeedbackData(deals, leads, googleEvents) {
  return useMemo(() => {
    const followUps = [];

    leads.forEach((lead) => {
      if (lead.followUpDate) {
        followUps.push({
          id: `lead-${lead.id}`,
          type: "lead",
          date: lead.followUpDate,
          title: lead.address,
          source: "Leads",
        });
      }
    });

    deals.forEach((deal) => {
      if (deal.closedDate) {
        followUps.push({
          id: `deal-${deal.id}`,
          type: "deal",
          date: deal.closedDate,
          title: deal.address,
          source: "Deals",
        });
      }
    });

    googleEvents.forEach((event) => {
      followUps.push(event);
    });

    return followUps;
  }, [deals, leads, googleEvents]);
}
