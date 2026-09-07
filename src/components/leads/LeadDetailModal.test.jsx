import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeadDetailModal from "./LeadDetailModal";

const lead = {
  id: "l1",
  address: "1 Main St",
  source: "Cold Call",
  ownerName: "Jane",
  ownerPhone: "555-1212",
};

describe("LeadDetailModal", () => {
  it("renders nothing without a lead", () => {
    const { container } = render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={null}
        onSave={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the lead address as title", () => {
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={lead}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
  });

  it("calls onSave then onClose when Save Changes clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={onClose}
        lead={lead}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={onClose}
        lead={lead}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("address can be edited", () => {
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={lead}
        onSave={vi.fn()}
      />,
    );
    const input = screen.getByDisplayValue("1 Main St");
    fireEvent.change(input, { target: { value: "2 Oak Ave" } });
    expect(input).toHaveValue("2 Oak Ave");
  });

  it("shows editable email and phone fields for a PPC lead", () => {
    const ppcLead = { ...lead, email: "seller@example.com", phone: "555-9876" };
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={ppcLead}
        onSave={vi.fn()}
        isPpc={true}
      />,
    );
    const emailInput = screen.getByDisplayValue("seller@example.com");
    const phoneInput = screen.getByDisplayValue("555-9876");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    expect(emailInput).toHaveValue("new@example.com");
    fireEvent.change(phoneInput, { target: { value: "5551234567" } });
    expect(phoneInput).toHaveValue("555-123-4567");
  });

  it("locks Source to PPL and shows editable email/phone for a PPL lead", () => {
    const pplLead = {
      ...lead,
      source: "Leadzolo",
      email: "seller@example.com",
      phone: "555-9876",
    };
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={pplLead}
        onSave={vi.fn()}
        isPpl={true}
      />,
    );
    expect(screen.getByDisplayValue("PPL")).toBeDisabled();
    expect(screen.getByDisplayValue("seller@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("555-9876")).toBeInTheDocument();
  });
});
