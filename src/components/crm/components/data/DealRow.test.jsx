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

  it("shows the seller's full name", () => {
    renderRow({
      deal: { ...deal, sellerFirstName: "Jane", sellerLastName: "Doe" },
    });
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("heads its small-screen card with the seller's name over the address", () => {
    const { container } = renderRow({
      deal: { ...deal, sellerFirstName: "Jane", sellerLastName: "Doe" },
    });
    const summary = container.querySelector(".acc-card-summary");
    expect(summary.querySelector(".acc-card-summary-title")).toHaveTextContent(
      "Jane Doe",
    );
    expect(
      summary.querySelector(".acc-card-summary-subtitle"),
    ).toHaveTextContent("1 Main St, Austin, TX 78701");
  });

  it("opens its card to a lead's details: email, phones, address and notes", () => {
    const { container } = renderRow({
      deal: {
        ...deal,
        sellerPhone: "512-555-0100",
        sellerPhones: ["512-555-0101"],
        notes: "Seller owes 53k.",
        // An older deal: the email is only on the lead it came from.
        fromLead: { email: "jane@example.com" },
      },
    });
    const cardOnly = [...container.querySelectorAll(".acc-col-card-only")];
    expect(cardOnly.map((td) => td.dataset.label)).toEqual([
      "Email",
      "Address",
      "Notes",
    ]);
    expect(cardOnly[0]).toHaveTextContent("jane@example.com");
    expect(cardOnly[1]).toHaveTextContent("1 Main St, Austin, TX 78701");
    expect(cardOnly[2]).toHaveTextContent("Seller owes 53k.");
    // Every number, in the table and the card.
    expect(screen.getByText("512-555-0100")).toBeInTheDocument();
    expect(screen.getByText("512-555-0101")).toBeInTheDocument();
  });

  it("renders the offer status badge", () => {
    renderRow();
    expect(screen.getByText("Not Sent")).toBeInTheDocument();
  });

  it("shows the seller phone as a tel: link that doesn't open the modal", () => {
    const onRowDetailClick = vi.fn();
    renderRow({
      deal: {
        ...deal,
        sellerPhone: "512-555-0100",
        agentPhone: "512-555-0199",
      },
      onRowDetailClick,
    });
    const link = screen.getByRole("link", { name: "512-555-0100" });
    expect(link).toHaveAttribute("href", "tel:512-555-0100");
    fireEvent.click(link);
    expect(onRowDetailClick).not.toHaveBeenCalled();
  });

  it("falls back to the agent phone when there is no seller phone", () => {
    renderRow({ deal: { ...deal, agentPhone: "512-555-0199" } });
    expect(screen.getByRole("link", { name: "512-555-0199" })).toHaveAttribute(
      "href",
      "tel:512-555-0199",
    );
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
