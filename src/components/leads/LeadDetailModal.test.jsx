import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeadDetailModal from "./LeadDetailModal";
import { requestComps } from "../crm/components/data/comps/compsNote";

vi.mock("../crm/components/data/comps/compsNote", async (importOriginal) => ({
  ...(await importOriginal()),
  requestComps: vi.fn(),
}));

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

  it("asks for an ARV on PPL leads only and saves it formatted", async () => {
    const onSave = vi.fn(async () => {});
    const { unmount } = render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={{ ...lead, source: "PPL" }}
        onSave={onSave}
        isPpl={true}
      />,
    );
    const arvInput = screen
      .getByText("ARV")
      .closest(".ldm-field")
      .querySelector("input");
    fireEvent.change(arvInput, { target: { value: "135000" } });
    expect(arvInput).toHaveValue("$135,000");
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].arv).toBe("$135,000");
    unmount();

    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={lead}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText("ARV")).toBeNull();
  });

  it("runs comps on a PPL lead and keeps the note and ARV on save", async () => {
    requestComps.mockResolvedValue({
      property: { beds: 3, baths: 2, sqft: 1400 },
      arvEstimate: 160000,
      topComps: [
        {
          address: "9 Oak St",
          price: 154000,
          sqft: 1400,
          soldDate: "2026-08-01",
          source: "Zillow",
        },
      ],
      listingUrls: {},
      sourceErrors: {},
    });
    const onSave = vi.fn(async () => {});
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={{ ...lead, notes: "Called seller." }}
        onSave={onSave}
        isPpl={true}
      />,
    );

    fireEvent.click(screen.getByText("Run comps"));
    expect(requestComps).toHaveBeenCalledWith("1 Main St");
    expect(
      await screen.findByText(/Added to the lead's notes/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Use ARV"));
    fireEvent.click(screen.getByText("Close"));

    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0][0];
    expect(saved.arv).toBe("$160,000");
    expect(saved.notes).toMatch(/^Called seller\.\n\nComps \(/);
    expect(saved.notes).toContain("9 Oak St");
  });

  it("only offers Run comps on PPL leads", () => {
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={lead}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText("Run comps")).toBeNull();
  });
});
