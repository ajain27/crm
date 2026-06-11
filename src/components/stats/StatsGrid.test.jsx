import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import StatsGrid from "./StatsGrid";

describe("StatsGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows current month and filtered revenue", () => {
    const deals = [
      {
        id: "1",
        offerDate: "2026-04-10",
        sellerAccepted: "Yes",
        assigned: "Yes",
        closed: "Yes",
        closedDate: "2026-04-12",
        contractPrice: 100000,
        assignedPrice: 115000,
      },
      {
        id: "2",
        offerDate: "2026-03-15",
        sellerAccepted: "Yes",
        assigned: "Yes",
        closed: "Yes",
        closedDate: "2026-03-08",
        contractPrice: 90000,
        assignedPrice: 110000,
      },
      {
        id: "3",
        offerDate: "2026-04-20",
        sellerAccepted: "No",
        assigned: "No",
        closed: "No",
        closedInMonth: "",
        contractPrice: 0,
        assignedPrice: 0,
      },
    ];

    render(
      <StatsGrid
        deals={deals}
        filteredDeals={[deals[0]]}
        filters={{ closedMonth: "All", year: "All" }}
      />,
    );

    const aprilRevenueCard = screen
      .getByText("Apr Gross Revenue")
      .closest(".stat-card");
    const filteredRevenueCard = screen
      .getByText("Total Revenue")
      .closest(".stat-card");

    expect(aprilRevenueCard).not.toBeNull();
    expect(filteredRevenueCard).not.toBeNull();

    expect(within(aprilRevenueCard).getByText("$15,000")).toBeInTheDocument();
    expect(
      within(filteredRevenueCard).getByText("$15,000"),
    ).toBeInTheDocument();
  });
});
