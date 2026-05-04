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
});
