import { useState, useMemo } from "react";
import { createDefaultFilters } from "../wholesaleConfig";

export function useDealsFilter({ deals }) {
  const [filters, setFilters] = useState(createDefaultFilters);

  const states = useMemo(
    () => [
      "All",
      ...new Set(deals.map((d) => d.state).filter(Boolean).sort()),
    ],
    [deals],
  );

  const propertyTypes = useMemo(
    () => [
      "All",
      ...new Set(deals.map((d) => d.propertyType).filter(Boolean).sort()),
    ],
    [deals],
  );

  const years = useMemo(
    () => [
      "All",
      ...new Set(
        deals
          .map((d) => (d.offerDate ? d.offerDate.substring(0, 4) : null))
          .filter(Boolean)
          .sort(),
      ),
    ],
    [deals],
  );

  const filteredDeals = useMemo(() => {
    const query = filters.search.toLowerCase();
    return deals.filter((deal) => {
      const matchesState =
        filters.state === "All" || deal.state === filters.state;
      const matchesPropertyType =
        filters.propertyType === "All" ||
        deal.propertyType === filters.propertyType;
      const matchesAccepted =
        filters.offerAccepted === "All" ||
        deal.sellerAccepted === filters.offerAccepted;
      const matchesAssigned =
        filters.assigned === "All" || deal.assigned === filters.assigned;
      const matchesClosed =
        filters.closed === "All" || deal.closed === filters.closed;
      const matchesSearch =
        !query ||
        (() => {
          const searchText = [
            deal.address,
            deal.city,
            deal.zipCode,
            deal.state,
            deal.offerStatus,
            deal.notes,
            deal.closed,
            deal.arv ? "$" + deal.arv.toLocaleString("en-US") : "",
            deal.rehabCost ? "$" + deal.rehabCost.toLocaleString("en-US") : "",
            deal.mao ? "$" + deal.mao.toLocaleString("en-US") : "",
            deal.contractPrice
              ? "$" + deal.contractPrice.toLocaleString("en-US")
              : "",
            deal.assignedPrice
              ? "$" + deal.assignedPrice.toLocaleString("en-US")
              : "",
          ]
            .join(" ")
            .toLowerCase()
            .replace(/,/g, "");
          const searchTerms = query
            .split(/\s+/)
            .filter(Boolean)
            .map((term) => term.replace(/,/g, ""));
          return searchTerms.every((term) => searchText.includes(term));
        })();

      const dealYear = deal.offerDate ? deal.offerDate.substring(0, 4) : "";
      const matchesYear = filters.year === "All" || dealYear === filters.year;

      const dealOfferMonth = deal.offerDate
        ? deal.offerDate.substring(5, 7)
        : "";
      const matchesOfferMonth =
        filters.offerMonth === "All" || dealOfferMonth === filters.offerMonth;

      const dealClosedMonth = deal.closedDate
        ? deal.closedDate.substring(5, 7)
        : deal.closedInMonth || "";
      const matchesClosedMonth =
        filters.closedMonth === "All" ||
        dealClosedMonth === filters.closedMonth;

      return (
        matchesState &&
        matchesPropertyType &&
        matchesAccepted &&
        matchesAssigned &&
        matchesSearch &&
        matchesClosed &&
        matchesYear &&
        matchesOfferMonth &&
        matchesClosedMonth
      );
    });
  }, [deals, filters]);

  return { filters, setFilters, states, propertyTypes, years, filteredDeals };
}
