import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DealDetailModal from "./DealDetailModal";
import { renderElementToPdfAssets } from "../../../../../utils/pdfExport";
import { requestComps } from "../comps/compsNote";

vi.mock("../comps/compsNote", async (importOriginal) => ({
  ...(await importOriginal()),
  requestComps: vi.fn(),
}));

vi.mock("../../../../../utils/pdfExport", () => ({
  renderElementToPdfAssets: vi.fn(async () => ({
    blob: new Blob(),
    imgDataUrl: "data:image/jpeg;base64,",
  })),
  downloadPdfBlob: vi.fn(),
}));

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

  it("moves the deal to the Leads tab picked, marking the one it came from", async () => {
    const moveDealToLeads = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={onClose}
        deal={{ ...deal, fromLead: { id: "l1", source: "PPL" } }}
        updateDealPatch={vi.fn()}
        moveDealToLeads={moveDealToLeads}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Move to Leads/ }));
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Residential Leads",
      "Commercial Leads",
      "PPC Leads",
      "PPL LeadsCame from",
      "Cold Calling",
    ]);

    fireEvent.click(screen.getByRole("menuitem", { name: "Cold Calling" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(moveDealToLeads).toHaveBeenCalledWith(
      expect.objectContaining({ id: deal.id }),
      "coldcall",
    );
  });

  it("won't save an address already in the CRM or Leads", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const updateDealPatch = vi.fn();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={updateDealPatch}
        existingDeals={[
          deal,
          { id: "d2", address: "9 Oak St", city: "Austin" },
        ]}
        existingLeads={[]}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Street address"), {
      target: { value: "9 oak st." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    expect(alertSpy).toHaveBeenCalledWith(
      '"9 oak st., Austin, TX 78701" is already in the CRM.',
    );
    expect(updateDealPatch).not.toHaveBeenCalled();
    alertSpy.mockRestore();
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

  it("renders the complete address (street, city, state, zip) in the title", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByText("1 Main St, Austin, TX 78701")).toBeInTheDocument();
  });

  it("shows editable City, State, and Zip Code fields", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    const cityInput = screen.getByDisplayValue("Austin");
    const zipInput = screen.getByDisplayValue("78701");
    fireEvent.change(cityInput, { target: { value: "Round Rock" } });
    expect(cityInput).toHaveValue("Round Rock");
    fireEvent.change(zipInput, { target: { value: "78664" } });
    expect(zipInput).toHaveValue("78664");
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

  it("Save Changes is disabled until something in the form changes", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    const save = screen.getByRole("button", { name: /Save Changes/i });
    expect(save).toBeDisabled();

    const address = screen.getByDisplayValue("1 Main St");
    fireEvent.change(address, { target: { value: "2 Main St" } });
    expect(save).not.toBeDisabled();

    // Changing it back leaves nothing to save.
    fireEvent.change(address, { target: { value: "1 Main St" } });
    expect(save).toBeDisabled();

    // A blank extra phone isn't saved, so it isn't a change either.
    fireEvent.click(screen.getByRole("button", { name: /Add phone/i }));
    expect(save).toBeDisabled();
    const phones = screen.getAllByPlaceholderText("555-000-0000");
    fireEvent.change(phones[phones.length - 1], {
      target: { value: "5125550100" },
    });
    expect(save).not.toBeDisabled();
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

  it("has a Make Inactive button when the deal can be made inactive", () => {
    const onMakeInactive = vi.fn();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
        onMakeInactive={onMakeInactive}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Make Inactive" }));
    expect(onMakeInactive).toHaveBeenCalled();
  });

  it("shows a lead's seller details, from its notes on older deals", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          source: "PPL",
          notes: [
            "Source: PPL",
            "Email: info@example.com",
            "Asking Price: $120,000",
            "Living in Property: Vacant",
            "Selling Urgency: ASAP",
            "Seller Motivation: Financial Hardship",
          ].join("\n"),
        }}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("info@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$120,000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Vacant")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ASAP")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Financial Hardship")).toBeInTheDocument();
    expect(screen.getByDisplayValue("PPL")).toBeInTheDocument();
    // Filled in from the lead, so nothing to save yet.
    expect(
      screen.getByRole("button", { name: /Save Changes/i }),
    ).toBeDisabled();
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
    fireEvent.change(screen.getByDisplayValue("1 Main St"), {
      target: { value: "2 Main St" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    expect(updateDealPatch).toHaveBeenCalled();
  });

  it("generates an offer from the form with the seller name and a $100 EMD", async () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          sellerFirstName: "Jane",
          sellerLastName: "Doe",
          contractPrice: 210000,
        }}
        updateDealPatch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Generate Offer"));
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    const text = renderElementToPdfAssets.mock.calls.at(-1)[0].textContent;
    expect(text).toContain("Jane Doe");
    expect(text).toContain("1 Main St, Austin, TX 78701");
    expect(text).toContain("$210,000");
    expect(text).toContain("Earnest Money Deposit (EMD): $100");
    expect(text).toContain("fourteen (14) calendar days");
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(text).toContain(`Effective Date:${today}`);
    expect(text).toContain("Jane DoePrinted Name");
    // Effective Date, plus the seller's and buyer's signature dates.
    expect(text.split(today)).toHaveLength(4);
    expect(text).toContain("You Win Estates, and/or assigns");
    expect(text).toContain("SUCCESSORS, ASSIGNMENT & NOVATION");
    expect(text).toContain("8. LIENS, TAXES & ENCUMBRANCES");
    expect(text).toContain("paid in full at closing from Seller's proceeds");
    expect(text).toContain("9. OFFER EXPIRATION & ACCEPTANCE");
    expect(await screen.findByAltText("Report preview")).toBeInTheDocument();
  });

  it("generates a no-assignment offer with the chosen EMD and inspection period", async () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...deal, contractPrice: 210000 }}
        updateDealPatch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Generate Offer"));
    fireEvent.click(screen.getByLabelText(/No assignment/));
    fireEvent.change(screen.getByLabelText("Earnest Money Deposit"), {
      target: { value: "$1,500" },
    });
    fireEvent.change(screen.getByLabelText("Inspection Period"), {
      target: { value: "21" },
    });
    renderElementToPdfAssets.mockClear();
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    const text = renderElementToPdfAssets.mock.calls[0][0].textContent;
    expect(text).toContain("Earnest Money Deposit (EMD): $1,500");
    expect(text).toContain("twenty-one (21) calendar days");
    expect(text).toContain("Effective Date:");
    expect(text).not.toContain("and/or assigns");
    expect(text).not.toContain("SUCCESSORS, ASSIGNMENT & NOVATION");
    expect(text).toContain("6. ENTIRE AGREEMENT");
    expect(text).toContain("7. LIENS, TAXES & ENCUMBRANCES");
    expect(text).toContain("8. OFFER EXPIRATION & ACCEPTANCE");
  });

  it("won't generate an offer without an EMD or inspection period", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Generate Offer"));
    fireEvent.change(screen.getByLabelText("Inspection Period"), {
      target: { value: "" },
    });
    expect(screen.getByText("Generate")).toBeDisabled();
    expect(
      screen.getByText(/Enter between 1 and 365 days/),
    ).toBeInTheDocument();
  });

  it("fills the seller name from the notes for older deals", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...deal, notes: "Source: PPL\nSeller: Pat Isom\nPhone: 1" }}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("First name")).toHaveValue("Pat");
    expect(screen.getByPlaceholderText("Last name")).toHaveValue("Isom");
  });

  it("asks for the seller name when the deal has none and keeps it on the deal", async () => {
    const updateDealPatch = vi.fn(async () => {});
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={updateDealPatch}
      />,
    );
    fireEvent.click(screen.getByText("Generate Offer"));
    expect(screen.getByLabelText("Seller Name")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Seller Name"), {
      target: { value: "  Sam  Q Seller " },
    });
    renderElementToPdfAssets.mockClear();
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    const text = renderElementToPdfAssets.mock.calls[0][0].textContent;
    expect(text).toContain("Seller Name(s):Sam Q Seller");
    expect(text).toContain("Sam Q SellerPrinted Name");
    expect(screen.getByPlaceholderText("First name")).toHaveValue("Sam");
    expect(screen.getByPlaceholderText("Last name")).toHaveValue("Q Seller");
  });

  it("links the property to Zillow next to the address, using unsaved edits", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: /Zillow/ });
    expect(link).toHaveAttribute(
      "href",
      "https://www.zillow.com/homes/1-Main-St-Austin-TX-78701_rb/",
    );
    fireEvent.change(screen.getByPlaceholderText("Street address"), {
      target: { value: "9 Elm St" },
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.zillow.com/homes/9-Elm-St-Austin-TX-78701_rb/",
    );
  });

  it("runs comps, saves the note to the deal and keeps unsaved edits", async () => {
    requestComps.mockResolvedValue({
      property: { beds: 3, baths: 2, sqft: 1400, yearBuilt: 1978 },
      arvEstimate: 160000,
      rentEstimate: 1250,
      topComps: [
        {
          address: "9 Oak St",
          price: 154000,
          beds: 3,
          baths: 2,
          sqft: 1400,
          soldDate: "2026-08-01",
          url: "https://www.zillow.com/homedetails/9",
          source: "Zillow",
          reason: "Same size",
        },
      ],
      summary: "Based on recent sales.",
      listingUrls: {},
      sourceErrors: {},
    });
    const updateDealPatch = vi.fn(async () => {});
    const baseDeal = { ...deal, notes: "Called seller." };
    const { rerender } = render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={baseDeal}
        updateDealPatch={updateDealPatch}
      />,
    );
    // An unsaved edit made before running comps.
    fireEvent.change(screen.getByPlaceholderText("Street address"), {
      target: { value: "2 Main St" },
    });

    fireEvent.click(screen.getByText("Run comps"));
    expect(requestComps).toHaveBeenCalledWith("2 Main St, Austin, TX 78701");
    // In the comps window, and in the deal's notes once saved.
    expect((await screen.findAllByText("9 Oak St")).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Saved to the deal's notes/),
    ).toBeInTheDocument();

    const [, patch] = updateDealPatch.mock.calls[0];
    expect(patch.notes).toMatch(/^Called seller\.\n\nComps \(/);
    expect(patch.notes).toContain("9 Oak St — $154,000");

    // The result is saved too, for the Comps tab, which now shows.
    expect(patch.compsResult.topComps[0].address).toBe("9 Oak St");
    expect(screen.getByRole("tab", { name: /Comps/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // The parent passes the saved deal back; the unsaved address stays.
    rerender(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...baseDeal, ...patch }}
        updateDealPatch={updateDealPatch}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Details" }));
    expect(screen.getByPlaceholderText("Street address")).toHaveValue(
      "2 Main St",
    );

    fireEvent.click(screen.getByText("Use ARV & Sq Ft"));
    fireEvent.click(screen.getByText("Close"));
    expect(screen.getByDisplayValue("$160,000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1400")).toBeInTheDocument();

    // The notes show laid out, with the comp, until "Edit notes".
    expect(screen.getByText("9 Oak St")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Add notes about this deal…"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Edit notes"));
    expect(
      screen.getByPlaceholderText("Add notes about this deal…"),
    ).toHaveValue(patch.notes);
    fireEvent.click(screen.getByText("Show formatted"));
    expect(screen.getByText("9 Oak St")).toBeInTheDocument();
  });

  it("opens on the Comps tab with the comps of the lead it came from", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          fromLead: {
            compsResult: {
              runAt: "2026-10-27T12:00:00.000Z",
              address: "1 Main St, Austin, TX 78701",
              arvEstimate: 277000,
              topComps: [{ address: "799 Kings Grant Dr NW", price: 239000 }],
            },
          },
        }}
        updateDealPatch={vi.fn()}
      />,
    );
    for (const name of ["Details", "Price History", "Property History"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("tab", { name: /Comps/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByText("799 Kings Grant Dr NW").length).toBeGreaterThan(
      0,
    );
    // Nothing to save just for opening it.
    expect(
      screen.getByRole("button", { name: /Save Changes/i }),
    ).toBeDisabled();
  });

  it("shows the error when comps can't run", async () => {
    requestComps.mockRejectedValue(
      new Error("Comps aren't set up yet: missing SERPER_API_KEY."),
    );
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Run comps"));
    expect(
      await screen.findByText(/missing SERPER_API_KEY/),
    ).toBeInTheDocument();
  });

  it("keeps unsaved edits when only the deal's photos change, and doesn't save a stale photo list", async () => {
    const photoStore = {
      save: vi.fn(),
      fetch: vi.fn(async (dealId, id) => ({ id, data: "data:x" })),
      remove: vi.fn(),
    };
    const updateDealPatch = vi.fn(async () => {});
    const { rerender } = render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={updateDealPatch}
        photoStore={photoStore}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Street address"), {
      target: { value: "2 Main St" },
    });

    // A photo was added and the parent passes the updated deal back.
    const withPhoto = { ...deal, photos: [{ id: "p1", uploadedAt: "x" }] };
    rerender(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={withPhoto}
        updateDealPatch={updateDealPatch}
        photoStore={photoStore}
      />,
    );
    expect(screen.getByPlaceholderText("Street address")).toHaveValue(
      "2 Main St",
    );
    expect(await screen.findByAltText("Photo 1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() => expect(updateDealPatch).toHaveBeenCalled());
    const [, patch] = updateDealPatch.mock.calls[0];
    expect(patch.address).toBe("2 Main St");
    expect(patch).not.toHaveProperty("photos");
  });

  it("only offers a JV agreement on JV deals", () => {
    const { rerender } = render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.queryByText("Create JV agreement")).not.toBeInTheDocument();
    rerender(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...deal, jvDeal: "Yes" }}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByText("Create JV agreement")).toBeInTheDocument();
  });

  it("creates a JV agreement splitting the assignment fee with the partner", async () => {
    renderElementToPdfAssets.mockClear();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          jvDeal: "Yes",
          jvPartnerName: "Acme Wholesale LLC",
          jvSplit: 5000,
          contractPrice: 200000,
          assigned: "Yes",
          assignedPrice: 220000,
        }}
        updateDealPatch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Create JV agreement"));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    const text = renderElementToPdfAssets.mock.calls.at(-1)[0].textContent;
    expect(text).toContain("JOINT VENTURE AGREEMENT");
    expect(text).toContain("Party B Name(s):Acme Wholesale LLC");
    expect(text).toContain("Property Address:1 Main St, Austin, TX 78701");
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(text).toContain(`Effective Date:${today}`);
    expect(text).not.toContain("Escrow / File No.");
    // Section 3 instructs the Title / Escrow Company "named above"; the
    // deal doesn't name one, so it's left to fill in.
    expect(text).toContain("Title / Escrow Company:");
    // Party A's and Party B's signature dates.
    expect(text.split(`${today}Date`)).toHaveLength(3);
    expect(text).toContain("Party AYou Win Estates LLC$15,000");
    expect(text).toContain("Party BAcme Wholesale LLC$5,000");
    expect(text).toContain("Total JV Proceeds$20,000");
    expect(await screen.findByAltText("Report preview")).toBeInTheDocument();
  });

  it("only offers an assignment once the deal is assigned", () => {
    const { rerender } = render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.queryByText("Create assignment")).not.toBeInTheDocument();
    rerender(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...deal, assigned: "Yes" }}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByText("Create assignment")).toBeInTheDocument();
  });

  it("creates an assignment of contract to the buyer typed in the form", async () => {
    renderElementToPdfAssets.mockClear();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          assigned: "Yes",
          assignedPrice: 220000,
          buyerName: "Old Buyer",
          offerDate: "2026-09-05",
        }}
        updateDealPatch={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Buyer name"), {
      target: { value: "Pat Buyer LLC" },
    });
    fireEvent.click(screen.getByText("Create assignment"));
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    const text = renderElementToPdfAssets.mock.calls.at(-1)[0].textContent;
    expect(text).toContain("ASSIGNMENT OF CONTRACT");
    expect(text).toContain("Assignor Name:You Win Estates LLC");
    expect(text).toContain("Assignee Name(s):Pat Buyer LLC");
    expect(text).toContain("Property Address:1 Main St, Austin, TX 78701");
    expect(text).toContain("Assignment Price: $220,000");
    expect(text).toContain("Assignee Deposit: $22,000");
    expect(text).toContain("with Seller, dated September 5, 2026,");
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    // The assignor's and assignee's signature dates.
    expect(text.split(`${today}Date`)).toHaveLength(3);
    expect(text).toContain("Pat Buyer LLCPrinted Name / Company");
    expect(text).not.toContain("Old Buyer");
    // No inspection period unless asked for.
    expect(text).not.toContain("INSPECTION PERIOD");
    expect(text).toContain("5. CLOSING");
    expect(text).toContain("has had the opportunity to inspect the");
    expect(await screen.findByAltText("Report preview")).toBeInTheDocument();
  });

  it("only shows the contract price once the offer is sent", () => {
    const { rerender } = render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={deal}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.queryByText("Contract Price")).not.toBeInTheDocument();
    rerender(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...deal, offerStatus: "Offer Sent", sellerAccepted: "Yes" }}
        updateDealPatch={vi.fn()}
      />,
    );
    expect(screen.getByText("Contract Price")).toBeInTheDocument();
  });

  it("won't save an assigned price below the contract price", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const updateDealPatch = vi.fn();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          offerStatus: "Offer Sent",
          sellerAccepted: "Yes",
          contractPrice: 200000,
          assigned: "Yes",
          assignedPrice: 190000,
        }}
        updateDealPatch={updateDealPatch}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("$190,000"), {
      target: { value: "195000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(alertSpy).toHaveBeenCalledWith(
      "Assigned price must be more than the contract price.",
    );
    expect(updateDealPatch).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("flags an assigned price that isn't above the contract price while typing", () => {
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          offerStatus: "Offer Sent",
          sellerAccepted: "Yes",
          contractPrice: 300000,
          assigned: "Yes",
          assignedPrice: 320000,
        }}
        updateDealPatch={vi.fn()}
      />,
    );
    const error = "Assigned price must be more than the contract price.";
    expect(screen.queryByText(error)).not.toBeInTheDocument();

    const input = screen.getByDisplayValue("$320,000");
    fireEvent.change(input, { target: { value: "300000" } });
    expect(screen.getByText(error)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "250000" } });
    expect(screen.getByText(error)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "300001" } });
    expect(screen.queryByText(error)).not.toBeInTheDocument();
  });

  it("adds a seven-day inspection period to the assignment when switched on", async () => {
    renderElementToPdfAssets.mockClear();
    render(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{
          ...deal,
          assigned: "Yes",
          assignedPrice: 220000,
          buyerName: "Pat Buyer LLC",
        }}
        updateDealPatch={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Create assignment"));
    fireEvent.click(
      screen.getByRole("switch", { name: "Buyer needs an inspection period" }),
    );
    fireEvent.click(screen.getByText("Generate"));

    await waitFor(() => expect(renderElementToPdfAssets).toHaveBeenCalled());
    const text = renderElementToPdfAssets.mock.calls.at(-1)[0].textContent;
    expect(text).toContain("5. INSPECTION PERIOD");
    expect(text).toContain("seven (7) calendar days from the Effective");
    expect(text).toContain("6. CLOSING");
    expect(text).toContain("7. REPRESENTATIONS & CONDITION OF PROPERTY");
    expect(text).toContain("under Section 5 (Inspection Period)");
    expect(text).not.toContain("has had the opportunity to inspect");
    expect(text).toContain("8. DEFAULT & REMEDIES");
    expect(text).toContain("9. ENTIRE AGREEMENT");
  });
});
