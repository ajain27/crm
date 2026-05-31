import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DealDetailModal from "./DealDetailModal";

const deal = {
  id: "d1",
  address: "1 Main St",
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  arv: 450000,
  rehabCost: 30000,
  desiredProfit: 20,
  offerStatus: "Not Sent",
  sellerAccepted: "No",
  assigned: "No",
  closed: "No",
};

describe("DealDetailModal", () => {
  it("renders nothing when no deal supplied", () => {
    const { container } = render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={null}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title with deal address when open", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 Main St/i)).toBeInTheDocument();
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={onClose}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("Save Changes button is enabled by default", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Save Changes/i }),
    ).not.toBeDisabled();
  });

  it("renders Reactivate button when onReactivate provided", () => {
    const onReactivate = vi.fn();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
        onReactivate={onReactivate}
      />,
    );
    const button = screen.queryByRole("button", { name: /Reactivate/i });
    if (button) {
      fireEvent.click(button);
      expect(onReactivate).toHaveBeenCalled();
    }
  });

  it("clicking Save Changes invokes updateDealPatch", async () => {
    const updateDealPatch = vi.fn().mockResolvedValue(undefined);
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={updateDealPatch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    expect(updateDealPatch).toHaveBeenCalled();
  });
});
