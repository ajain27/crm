import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DealRow from "./DealRow";

const deal = {
  id: "d1",
  address: "1 Main St",
  city: "Austin",
  zipCode: "78701",
  state: "TX",
  propertyType: "Single Family",
  arv: 450000,
  rehabCost: 30000,
  mao: 275000,
  offerStatus: "Not Sent",
  sellerAccepted: "No",
  assigned: "No",
  closed: "No",
};

function renderRow(overrides = {}) {
  return render(
    <table>
      <tbody>
        <DealRow
          deal={deal}
          index={0}
          onRowDetailClick={vi.fn()}
          {...overrides}
        />
      </tbody>
    </table>,
  );
}

describe("DealRow", () => {
  it("renders the combined address with city, state, and zip", () => {
    renderRow();
    expect(screen.getByText("1 Main St, Austin, TX 78701")).toBeInTheDocument();
  });

  it("renders ARV, MAO, and Rehab values", () => {
    renderRow();
    expect(screen.getByText("$450,000")).toBeInTheDocument();
    expect(screen.getByText("$275,000")).toBeInTheDocument();
    expect(screen.getByText("$30,000")).toBeInTheDocument();
  });

  it("renders the offer status badge", () => {
    renderRow();
    expect(screen.getByText("Not Sent")).toBeInTheDocument();
  });

  it("clicking the Details button calls onRowDetailClick", () => {
    const onRowDetailClick = vi.fn();
    renderRow({ onRowDetailClick });
    fireEvent.click(screen.getByRole("link", { name: "Details" }));
    expect(onRowDetailClick).toHaveBeenCalledWith(deal);
  });

  it("clicking the row body calls onRowDetailClick", () => {
    const onRowDetailClick = vi.fn();
    renderRow({ onRowDetailClick });
    fireEvent.click(screen.getByText("Not Sent"));
    expect(onRowDetailClick).toHaveBeenCalledWith(deal);
  });

  it("clicking the address heading opens the modal", () => {
    const onRowDetailClick = vi.fn();
    renderRow({ onRowDetailClick });
    fireEvent.click(screen.getByText("1 Main St, Austin, TX 78701"));
    expect(onRowDetailClick).toHaveBeenCalled();
  });

  it("marks the row closed when deal is closed", () => {
    const { container } = renderRow({ deal: { ...deal, closed: "Yes" } });
    expect(container.querySelector('[data-status="closed"]')).toBeTruthy();
  });

  it("marks the row rejected when offer sent but seller said no", () => {
    const { container } = renderRow({
      deal: { ...deal, offerStatus: "Offer Sent", sellerAccepted: "No" },
    });
    expect(container.querySelector('[data-status="rejected"]')).toBeTruthy();
  });

  it("marks the row withdrawn when offer withdrawn", () => {
    const { container } = renderRow({
      deal: { ...deal, offerStatus: "Offer Withdrawn" },
    });
    expect(container.querySelector('[data-status="withdrawn"]')).toBeTruthy();
  });
});
