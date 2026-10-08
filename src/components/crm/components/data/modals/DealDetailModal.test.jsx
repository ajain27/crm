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
    expect(text).toContain("7. OFFER EXPIRATION & ACCEPTANCE");
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
    expect(await screen.findByText("9 Oak St")).toBeInTheDocument();
    expect(
      await screen.findByText(/Saved to the deal's notes/),
    ).toBeInTheDocument();

    const [, patch] = updateDealPatch.mock.calls[0];
    expect(patch.notes).toMatch(/^Called seller\.\n\nComps \(/);
    expect(patch.notes).toContain("9 Oak St — $154,000");

    // The parent passes the saved deal back; the unsaved address stays.
    rerender(
      <DealDetailModal
        isOpen={true}
        onClose={vi.fn()}
        deal={{ ...baseDeal, notes: patch.notes }}
        updateDealPatch={updateDealPatch}
      />,
    );
    expect(screen.getByPlaceholderText("Street address")).toHaveValue(
      "2 Main St",
    );

    fireEvent.click(screen.getByText("Use ARV & Sq Ft"));
    fireEvent.click(screen.getByText("Close"));
    expect(screen.getByDisplayValue("$160,000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1400")).toBeInTheDocument();
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
});
