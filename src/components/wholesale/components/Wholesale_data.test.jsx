import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Wholesale_data from "./Wholesale_data";

const deal = {
  id: "d1",
  address: "123 Main St",
  city: "Austin",
  zipCode: "78701",
  state: "TX",
  propertyType: "Single Family",
  onMarket: "No",
  listedPrice: 0,
  arv: 450000,
  rehabCost: 45000,
  mao: 275000,
  offerStatus: "Not Sent",
  offerDate: "",
  sellerAccepted: "No",
  assigned: "No",
  contractPrice: 0,
  assignedPrice: 0,
  buyerName: "",
  buyerEmail: "",
  notes: "",
  closed: "No",
  closedDate: "",
  closedInMonth: "",
};

function getRenderedDealIds(container) {
  return Array.from(container.querySelectorAll("tbody tr")).map((row) =>
    row.getAttribute("data-deal-id"),
  );
}

describe("Wholesale_data", () => {
  it("calls saveDeal when offer status changes", async () => {
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const persist = vi.fn();

    render(
      <Wholesale_data
        filteredDeals={[deal]}
        deals={[deal]}
        deleteDeal={vi.fn()}
        persist={persist}
        saveDeal={saveDeal}
      />,
    );

    const select = screen.getByDisplayValue("Not Sent");
    fireEvent.change(select, { target: { value: "Offer Sent" } });

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith({
        ...deal,
        offerStatus: "Offer Sent",
      });
    });
    expect(persist).toHaveBeenCalled();
  });

  it("shows a disabled closed date for closed deals", () => {
    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            closed: "Yes",
            closedDate: "2026-04-30",
          },
        ]}
        deals={[
          {
            ...deal,
            closed: "Yes",
            closedDate: "2026-04-30",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const closedDateInput = screen.getByDisplayValue("2026-04-30");
    expect(closedDateInput).toBeDisabled();
  });

  it("shows the most recent closed deal first by default", () => {
    const { container } = render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            closed: "Yes",
            closedDate: "2026-04-12",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            closed: "Yes",
            closedDate: "2026-05-01",
          },
          {
            ...deal,
            id: "d3",
            address: "789 Pine St",
            closed: "No",
            closedDate: "",
          },
        ]}
        deals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            closed: "Yes",
            closedDate: "2026-04-12",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            closed: "Yes",
            closedDate: "2026-05-01",
          },
          {
            ...deal,
            id: "d3",
            address: "789 Pine St",
            closed: "No",
            closedDate: "",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    expect(getRenderedDealIds(container)).toEqual(["d2", "d1", "d3"]);
  });

  it("saves the entered closed date when a deal is marked closed", async () => {
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const persist = vi.fn();
    vi.spyOn(window, "prompt").mockReturnValue("2026-04-12");

    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Yes",
            assigned: "Yes",
          },
        ]}
        deals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Yes",
            assigned: "Yes",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={persist}
        saveDeal={saveDeal}
      />,
    );

    const closedSelect = screen.getAllByRole("combobox").find((select) =>
      select.className.includes("badge no"),
    );
    expect(closedSelect).toBeDefined();
    fireEvent.change(closedSelect, { target: { value: "Yes" } });

    await Promise.resolve();
    await Promise.resolve();

    expect(saveDeal).toHaveBeenCalledWith({
      ...deal,
      offerStatus: "Offer Sent",
      sellerAccepted: "Yes",
      assigned: "Yes",
      closed: "Yes",
      closedDate: "2026-04-12",
      closedInMonth: "04",
    });
    expect(persist).toHaveBeenCalled();
  });

  it("sorts by a price column when the header is clicked", () => {
    const { container } = render(
      <Wholesale_data
        filteredDeals={[
          { ...deal, id: "d1", address: "123 Main St", arv: 450000 },
          { ...deal, id: "d2", address: "456 Oak Ave", arv: 300000 },
        ]}
        deals={[
          { ...deal, id: "d1", address: "123 Main St", arv: 450000 },
          { ...deal, id: "d2", address: "456 Oak Ave", arv: 300000 },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const arvSortButton = screen.getByRole("button", { name: "ARV" });
    fireEvent.click(arvSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d2", "d1"]);

    fireEvent.click(arvSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d1", "d2"]);
  });

  it("sorts by a date column when the header is clicked", () => {
    const { container } = render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            offerStatus: "Offer Sent",
            offerDate: "2026-04-15",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            offerStatus: "Offer Sent",
            offerDate: "2026-03-10",
          },
        ]}
        deals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            offerStatus: "Offer Sent",
            offerDate: "2026-04-15",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            offerStatus: "Offer Sent",
            offerDate: "2026-03-10",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const offerDateSortButton = screen.getByRole("button", {
      name: "Offer Date",
    });
    fireEvent.click(offerDateSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d2", "d1"]);

    fireEvent.click(offerDateSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d1", "d2"]);
  });
});
