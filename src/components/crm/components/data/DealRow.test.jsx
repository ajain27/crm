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
  contractVersions: [],
};

function renderRow(overrides = {}) {
  return render(
    <table>
      <tbody>
        <DealRow
          deal={deal}
          index={0}
          today="2026-05-30"
          updateDeal={vi.fn()}
          deleteDeal={vi.fn()}
          openContract={vi.fn()}
          handleContractUpload={vi.fn()}
          uploadingDealId={null}
          onRowDetailClick={vi.fn()}
          isSelected={false}
          onToggleSelect={vi.fn()}
          editingBuyerId={null}
          editingBuyerField={null}
          editBuyerValue=""
          setEditBuyerValue={vi.fn()}
          startEditingBuyer={vi.fn()}
          cancelBuyerEdit={vi.fn()}
          saveBuyerEdit={vi.fn()}
          {...overrides}
        />
      </tbody>
    </table>,
  );
}

describe("DealRow", () => {
  it("renders core deal fields", () => {
    renderRow();
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
    expect(screen.getByText("Austin")).toBeInTheDocument();
    expect(screen.getByText("78701")).toBeInTheDocument();
    expect(screen.getByText("TX")).toBeInTheDocument();
    expect(screen.getByText("Single Family")).toBeInTheDocument();
  });

  it("checkbox reflects isSelected and toggles on change", () => {
    const onToggleSelect = vi.fn();
    renderRow({ onToggleSelect, isSelected: true });
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith("d1");
  });

  it("delete button calls deleteDeal", () => {
    const deleteDeal = vi.fn();
    renderRow({ deleteDeal });
    fireEvent.click(screen.getByTitle("Delete"));
    expect(deleteDeal).toHaveBeenCalledWith("d1");
  });

  it("clicking the row body calls onRowDetailClick", () => {
    const onRowDetailClick = vi.fn();
    renderRow({ onRowDetailClick });
    fireEvent.click(screen.getByText("Austin"));
    expect(onRowDetailClick).toHaveBeenCalledWith(deal);
  });

  it("clicking the address heading toggles the accordion instead of opening the modal", () => {
    const onRowDetailClick = vi.fn();
    renderRow({ onRowDetailClick });
    fireEvent.click(screen.getByText("1 Main St"));
    expect(onRowDetailClick).not.toHaveBeenCalled();
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
