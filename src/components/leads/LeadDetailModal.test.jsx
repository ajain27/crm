import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeadDetailModal from "./LeadDetailModal";
import { requestComps } from "../crm/components/data/comps/compsNote";
import { requestPropertyHistory } from "../../services/propertyHistoryService";

vi.mock("../../services/propertyHistoryService", () => ({
  requestPropertyHistory: vi.fn(),
}));

const HISTORY = {
  timeline: [
    {
      date: "2022-09-16",
      kind: "sold",
      event: "Sold",
      price: 116000,
      sources: ["Redfin", "Realtor.com"],
    },
    {
      date: "2022-04-29",
      kind: "listed",
      event: "Listed for sale",
      price: 145000,
      sources: ["Redfin"],
    },
  ],
  sales: [{ date: "2022-09-16", price: 116000, heldYears: null, change: null }],
  taxes: [{ year: 2025, tax: 5273, assessedValue: 57610 }],
};

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

  it("asks for an ARV on seller leads (not PPC) and saves it formatted", async () => {
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
        isPpc
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

  it("runs comps on a PPC lead without offering Use ARV", async () => {
    requestComps.mockResolvedValue({
      property: { sqft: 1400 },
      arvEstimate: 160000,
      topComps: [],
      listingUrls: {},
      sourceErrors: {},
    });
    const onSave = vi.fn(async () => {});
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={lead}
        onSave={onSave}
        isPpc={true}
      />,
    );

    fireEvent.click(screen.getByText("Run comps"));
    expect(
      await screen.findByText(/Added to the lead's notes/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Use ARV")).toBeNull();
    fireEvent.click(screen.getByText("Close"));

    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].notes).toMatch(/^Comps \(/);
  });

  it("offers Run comps and a Comps tab on residential leads", () => {
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={lead}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Run comps")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Comps/ })).toBeInTheDocument();
  });

  it("doesn't offer Run comps on potential rentals", () => {
    render(
      <LeadDetailModal
        isOpen={true}
        onClose={vi.fn()}
        lead={{ ...lead, dealType: "Potential Rental" }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText("Run comps")).toBeNull();
  });
});

describe("LeadDetailModal comps tab", () => {
  it("keeps the comps result on save and opens on the Comps tab", async () => {
    requestComps.mockResolvedValue({
      address: "1 Main St",
      location: { lat: 30.1, lng: -97.7 },
      arvEstimate: 300000,
      rentEstimate: 1800,
      property: { beds: 3, baths: 2, sqft: 1200, yearBuilt: 1980 },
      topComps: [
        {
          address: "5 Oak St",
          price: 290000,
          beds: 3,
          baths: 2,
          sqft: 1150,
          lat: 30.11,
          lng: -97.71,
        },
      ],
    });
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{ ...lead, source: "PPL" }}
        isPpl
        onSave={onSave}
      />,
    );
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByText("Run comps"));
    await screen.findByText(/Added to the lead's notes/);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("tab", { name: /Comps/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByText("5 Oak St").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].compsResult).toMatchObject({
      location: { lat: 30.1, lng: -97.7 },
      topComps: [{ address: "5 Oak St", lat: 30.11 }],
    });
  });
});

describe("LeadDetailModal dollar fields", () => {
  it("formats the asking price as it's typed, and old plain values too", () => {
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{ ...lead, source: "PPL", askingPrice: "100000" }}
        isPpl
        onSave={vi.fn()}
      />,
    );
    const asking = screen.getByDisplayValue("$100,000");
    fireEvent.change(asking, { target: { value: "$100,0005" } });
    expect(asking).toHaveValue("$1,000,005");
  });
});

describe("LeadDetailModal PPC seller name", () => {
  it("edits the seller's first and last name and saves them joined", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{ id: "p1", address: "1 Main St", sellerName: "Jo Smith" }}
        isPpc
        onSave={onSave}
      />,
    );
    expect(screen.getByText("Seller First Name")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Jo"), {
      target: { value: "Joanne" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      firstName: "Joanne",
      lastName: "Smith",
      sellerName: "Joanne Smith",
    });
  });

  it("shows the history from the lead's comps run in the Price and Property History tabs", () => {
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{
          ...lead,
          compsResult: {
            address: lead.address,
            topComps: [],
            history: HISTORY,
          },
        }}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Price History" }));
    expect(screen.getByText("Listed for sale")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Property History" }));
    expect(screen.getByText("Sales (1)")).toBeInTheDocument();
    expect(screen.getByText("$5,273")).toBeInTheDocument();
  });

  it("looks up the history as soon as a lead without one opens, and saves it to the lead", async () => {
    requestPropertyHistory.mockResolvedValue({
      address: lead.address,
      ...HISTORY,
    });
    const onHistoryLoaded = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={lead}
        onSave={vi.fn()}
        onHistoryLoaded={onHistoryLoaded}
      />,
    );
    expect(requestPropertyHistory).toHaveBeenCalledWith("1 Main St");
    await waitFor(() =>
      expect(onHistoryLoaded).toHaveBeenCalledWith(
        "l1",
        expect.objectContaining({
          timeline: HISTORY.timeline,
          taxes: HISTORY.taxes,
        }),
      ),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Price History" }));
    expect(screen.getByText("Listed for sale")).toBeInTheDocument();
  });

  it("doesn't look up a history the lead already has", () => {
    requestPropertyHistory.mockClear();
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{
          ...lead,
          propertyHistory: { ...HISTORY, fetchedAt: "2026-10-01T00:00:00Z" },
        }}
        onSave={vi.fn()}
      />,
    );
    expect(requestPropertyHistory).not.toHaveBeenCalled();
  });

  it("has the history tabs on a rental, without a Comps tab", () => {
    render(
      <LeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{ ...lead, dealType: "Potential Rental" }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByRole("tab", { name: /Comps/ })).toBeNull();
    expect(
      screen.getByRole("tab", { name: "Price History" }),
    ).toBeInTheDocument();
  });
});
