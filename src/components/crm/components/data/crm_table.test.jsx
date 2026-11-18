import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import Wholesale_data from "./crm_table";

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
  contractFileName: "",
  contractFileData: "",
  contractFileType: "",
  contractVersions: [],
  assignedPrice: 0,
  buyerName: "",
  buyerEmail: "",
  jvDeal: "No",
  jvPartnerName: "",
  jvPartnerEmail: "",
  jvSplit: 0,
  notes: "",
  closed: "No",
  closedDate: "",
  closedInMonth: "",
};

function getRenderedDealIds(container) {
  return Array.from(container.querySelectorAll("tbody tr")).map((row) =>
    row.getAttribute("data-deal-id"),
  );
}

describe("Wholesale_data", () => {
  it("offers to remove deals that share an address", async () => {
    const onRemoveDuplicates = vi.fn().mockResolvedValue(undefined);
    const copy = { ...deal, id: "d-copy", address: "123 main st." };
    const { rerender } = render(
      <Wholesale_data
        filteredDeals={[deal]}
        deals={[deal]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
        onRemoveDuplicates={onRemoveDuplicates}
      />,
    );
    // No duplicates, no button.
    expect(
      screen.queryByRole("button", { name: /Remove duplicates/ }),
    ).not.toBeInTheDocument();

    rerender(
      <Wholesale_data
        filteredDeals={[deal, copy]}
        deals={[deal, copy]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
        onRemoveDuplicates={onRemoveDuplicates}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove duplicates (1)" }),
    );
    await waitFor(() => expect(onRemoveDuplicates).toHaveBeenCalled());
  });

  it("renders only the simplified columns", () => {
    render(
      <Wholesale_data
        filteredDeals={[deal]}
        deals={[deal]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    expect(
      screen.getByText("123 Main St, Austin, TX 78701"),
    ).toBeInTheDocument();
    expect(screen.getByText("$450,000")).toBeInTheDocument();
    expect(screen.getByText("$275,000")).toBeInTheDocument();
    expect(screen.getByText("$45,000")).toBeInTheDocument();
    expect(screen.getByText("Not Sent")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Phone" }),
    ).toBeInTheDocument();
  });

  it("notes a call from the dashboard, above the comps note", async () => {
    const saveDeal = vi.fn(async (d) => d);
    const called = {
      ...deal,
      sellerFirstName: "Charles",
      notes:
        "Call 1 (11/5/2026): wants 250k\n\nComps (11/6/2026):\nARV estimate: $325,000 · Rent estimate: —/mo",
    };
    render(
      <Wholesale_data
        filteredDeals={[called]}
        deals={[called]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={saveDeal}
      />,
    );
    // One call already noted on the deal.
    expect(screen.getAllByText("Called 1×").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole("button", { name: "One more call" })[0],
    );
    expect(
      screen.getByRole("dialog", { name: "Call notes" }),
    ).toHaveTextContent("Call 2");
    fireEvent.change(screen.getByLabelText(/How did the call go/), {
      target: { value: "offered 225k" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save call" }));
    await waitFor(() => expect(saveDeal).toHaveBeenCalled());
    const saved = saveDeal.mock.calls[0][0];
    expect(saved.callCount).toBe(2);
    expect(saved.notes).toMatch(
      /^Call 1 \(11\/5\/2026\): wants 250k\n\nCall 2 \([^)]+\): offered 225k\n\nComps \(11\/6\/2026\):/,
    );
  });

  it("opens the details modal by clicking the address cell", () => {
    render(
      <Wholesale_data
        filteredDeals={[deal]}
        deals={[deal]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("123 Main St, Austin, TX 78701"));

    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("opens the details modal and saves changes via updateDealPatch", async () => {
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

    fireEvent.click(screen.getAllByRole("row")[1]);

    const select = screen.getByDisplayValue("Not Sent");
    fireEvent.change(select, { target: { value: "Offer Sent" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith(
        expect.objectContaining({ offerStatus: "Offer Sent" }),
      );
    });
    expect(persist).toHaveBeenCalled();
  });

  it("makes an active deal inactive, moving it to the Inactive tab", async () => {
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const props = {
      deleteDeal: vi.fn(),
      persist: vi.fn(),
      saveDeal,
    };
    const { rerender, container } = render(
      <Wholesale_data filteredDeals={[deal]} deals={[deal]} {...props} />,
    );
    fireEvent.click(screen.getAllByRole("row")[1]);
    expect(
      screen.queryByRole("button", { name: "Make Active" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Make Inactive" }));
    await waitFor(() =>
      expect(saveDeal).toHaveBeenCalledWith(
        expect.objectContaining({ id: "d1", inactive: true }),
      ),
    );

    const inactive = { ...deal, inactive: true };
    rerender(
      <Wholesale_data
        filteredDeals={[inactive]}
        deals={[inactive]}
        {...props}
      />,
    );
    expect(getRenderedDealIds(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Inactive/ }));
    expect(getRenderedDealIds(container)).toEqual(["d1"]);
    fireEvent.click(screen.getAllByRole("row")[1]);
    expect(
      screen.getByRole("button", { name: "Make Active" }),
    ).toBeInTheDocument();
  });

  it("moves an assigned deal from Active to the In Progress tab", () => {
    const assigned = {
      ...deal,
      id: "d2",
      address: "9 Elm St",
      assigned: "Yes",
    };
    const { container } = render(
      <Wholesale_data
        filteredDeals={[deal, assigned]}
        deals={[deal, assigned]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );
    expect(getRenderedDealIds(container)).toEqual(["d1"]);
    const tab = screen.getByRole("button", { name: /In Progress/ });
    expect(tab).toHaveTextContent("In Progress1");
    fireEvent.click(tab);
    expect(getRenderedDealIds(container)).toEqual(["d2"]);
  });

  it("shows a seller's properties as one row that opens with a tab for each", () => {
    const first = {
      ...deal,
      sellerFirstName: "Nadine",
      sellerLastName: "Rice",
      sellerPhone: "314-652-4076",
    };
    const second = {
      ...first,
      id: "d2",
      address: "420 Peete St",
      city: "Covington",
      state: "TN",
      zipCode: "38019",
    };
    const other = { ...deal, id: "d3", address: "9 Elm St" };
    const { container } = render(
      <Wholesale_data
        filteredDeals={[first, other, second]}
        deals={[first, other, second]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );
    expect(getRenderedDealIds(container)).toEqual(["d1", "d3"]);
    expect(screen.getByRole("button", { name: /Active/ })).toHaveTextContent(
      "Active2",
    );
    const row = container.querySelector('tr[data-deal-id="d1"]');
    expect(row).toHaveTextContent("123 Main St, Austin, TX 78701");
    expect(row).toHaveTextContent("420 Peete St, Covington, TN 38019");
    expect(row).toHaveTextContent("2 properties");

    fireEvent.click(screen.getAllByText("123 Main St, Austin, TX 78701")[0]);
    const tabs = screen.getByRole("tablist", {
      name: "This seller's properties",
    });
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((t) => t.textContent),
    ).toEqual(["123 Main St", "420 Peete St"]);
    fireEvent.click(within(tabs).getByRole("tab", { name: "420 Peete St" }));
    expect(screen.getByPlaceholderText("Street address")).toHaveValue(
      "420 Peete St",
    );
  });

  it("adds a property for the seller as a new tab, saved as a deal", async () => {
    const seller = {
      ...deal,
      sellerFirstName: "Nadine",
      sellerLastName: "Rice",
      sellerPhone: "314-652-4076",
    };
    const saveDeal = vi.fn(async (d) => d);
    const persist = vi.fn();
    render(
      <Wholesale_data
        filteredDeals={[seller]}
        deals={[seller]}
        deleteDeal={vi.fn()}
        persist={persist}
        saveDeal={saveDeal}
        currentUserId="u1"
      />,
    );
    fireEvent.click(screen.getAllByText("123 Main St, Austin, TX 78701")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Add Property" }));

    const tabs = screen.getByRole("tablist", {
      name: "This seller's properties",
    });
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((t) => t.textContent),
    ).toEqual(["123 Main St", "New property"]);
    expect(screen.getByDisplayValue("Nadine")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Street address"), {
      target: { value: "420 Peete St" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => expect(persist).toHaveBeenCalled());
    const saved = saveDeal.mock.calls.at(-1)[0];
    expect(saved).toMatchObject({
      address: "420 Peete St",
      sellerFirstName: "Nadine",
      sellerLastName: "Rice",
      sellerPhone: "314-652-4076",
      userId: "u1",
    });
    expect(saved.isNewProperty).toBeUndefined();
    expect(persist.mock.calls.at(-1)[0]).toHaveLength(2);
  });

  it("deletes a deal from the details modal", () => {
    const deleteDeal = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <Wholesale_data
        filteredDeals={[deal]}
        deals={[deal]}
        deleteDeal={deleteDeal}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("row")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteDeal).toHaveBeenCalledWith("d1");
  });

  it("shows the most recent closed deal first by default", () => {
    const { container } = render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            closed: "Yes",
            closedDate: "2026-04-12",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            closed: "Yes",
            closedDate: "2026-05-01",
          },
          {
            ...deal,
            id: "d3",
            address: "789 Pine St",
            closed: "No",
            closedDate: "",
          },
        ]}
        deals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            closed: "Yes",
            closedDate: "2026-04-12",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            closed: "Yes",
            closedDate: "2026-05-01",
          },
          {
            ...deal,
            id: "d3",
            address: "789 Pine St",
            closed: "No",
            closedDate: "",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const closedTabBtn = screen
      .getAllByRole("button")
      .find(
        (btn) =>
          btn.classList.contains("deal-tab-btn") &&
          btn.textContent.includes("Closed"),
      );
    fireEvent.click(closedTabBtn);

    expect(getRenderedDealIds(container)).toEqual(["d2", "d1"]);
  });

  it("sorts by a price column when the header is clicked", () => {
    const { container } = render(
      <Wholesale_data
        filteredDeals={[
          { ...deal, id: "d1", address: "123 Main St", arv: 450000 },
          { ...deal, id: "d2", address: "456 Oak Ave", arv: 300000 },
        ]}
        deals={[
          { ...deal, id: "d1", address: "123 Main St", arv: 450000 },
          { ...deal, id: "d2", address: "456 Oak Ave", arv: 300000 },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const arvSortButton = screen.getByRole("button", { name: "ARV" });
    fireEvent.click(arvSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d2", "d1"]);

    fireEvent.click(arvSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d1", "d2"]);
  });

  it("shows a view contract action in the modal when a contract file is stored on the deal", async () => {
    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            contractFileName: "purchase-contract.pdf",
            contractFileType: "application/pdf",
            contractFileData: "data:application/pdf;base64,ZmFrZQ==",
            contractVersions: [
              {
                id: "c1",
                name: "purchase-contract.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,ZmFrZQ==",
                uploadedAt: "2026-05-09T10:00:00.000Z",
              },
            ],
          },
        ]}
        deals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            contractFileName: "purchase-contract.pdf",
            contractFileType: "application/pdf",
            contractFileData: "data:application/pdf;base64,ZmFrZQ==",
            contractVersions: [
              {
                id: "c1",
                name: "purchase-contract.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,ZmFrZQ==",
                uploadedAt: "2026-05-09T10:00:00.000Z",
              },
            ],
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
        fetchContractVersion={vi.fn().mockResolvedValue(null)}
        currentUserId="u1"
      />,
    );

    fireEvent.click(screen.getAllByRole("row")[1]);
    fireEvent.click(screen.getByText("purchase-contract.pdf"));

    expect(screen.getByText("Contract for 123 Main St")).toBeInTheDocument();
    expect(document.querySelector(".contract-preview-meta")).toHaveTextContent(
      "purchase-contract.pdf",
    );
    await waitFor(() => {
      expect(
        document.querySelector('iframe[title="purchase-contract.pdf"]'),
      ).toBeInTheDocument();
    });
  });

  it("allows uploading an odt contract from the modal when the offer is sent", async () => {
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const persist = vi.fn();
    class MockFileReader {
      constructor() {
        this.result =
          "data:application/vnd.oasis.opendocument.text;base64,dXBsb2FkZWQ=";
        this.onload = null;
      }

      readAsDataURL() {
        if (typeof this.onload === "function") {
          this.onload();
        }
      }
    }

    vi.stubGlobal("FileReader", MockFileReader);

    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
          },
        ]}
        deals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={persist}
        saveDeal={saveDeal}
        saveContractVersion={vi.fn().mockResolvedValue(undefined)}
        fetchContractVersion={vi.fn().mockResolvedValue(null)}
        deleteContractById={vi.fn().mockResolvedValue(undefined)}
        currentUserId="u1"
      />,
    );

    fireEvent.click(screen.getAllByRole("row")[1]);

    const uploadInput = document.getElementById("contract-upload-modal-d1");
    const contractFile = new File(["contract"], "contract.odt", {
      type: "application/vnd.oasis.opendocument.text",
    });

    fireEvent.change(uploadInput, {
      target: { files: [contractFile] },
    });

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          contractVersions: [
            expect.objectContaining({
              name: "contract.odt",
              type: "application/vnd.oasis.opendocument.text",
            }),
          ],
          contractFileName: "contract.odt",
          contractFileType: "application/vnd.oasis.opendocument.text",
        }),
      );
    });

    expect(persist).toHaveBeenCalled();
  });

  it("allows deleting a stored contract from the modal", async () => {
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const persist = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            contractFileName: "purchase-contract.pdf",
            contractFileType: "application/pdf",
            contractFileData: "data:application/pdf;base64,ZmFrZQ==",
            contractVersions: [
              {
                id: "c1",
                name: "purchase-contract.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,ZmFrZQ==",
                uploadedAt: "2026-05-09T10:00:00.000Z",
              },
            ],
          },
        ]}
        deals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            contractFileName: "purchase-contract.pdf",
            contractFileType: "application/pdf",
            contractFileData: "data:application/pdf;base64,ZmFrZQ==",
            contractVersions: [
              {
                id: "c1",
                name: "purchase-contract.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,ZmFrZQ==",
                uploadedAt: "2026-05-09T10:00:00.000Z",
              },
            ],
          },
        ]}
        deleteDeal={vi.fn()}
        persist={persist}
        saveDeal={saveDeal}
        fetchContractVersion={vi.fn().mockResolvedValue(null)}
        deleteContractById={vi.fn().mockResolvedValue(undefined)}
        currentUserId="u1"
      />,
    );

    fireEvent.click(screen.getAllByRole("row")[1]);
    fireEvent.click(
      screen.getByRole("button", { name: /Delete purchase-contract\.pdf/i }),
    );

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          contractVersions: [],
          contractFileName: "",
          contractFileType: "",
          contractFileData: "",
        }),
      );
    });

    expect(persist).toHaveBeenCalled();
  });
});
