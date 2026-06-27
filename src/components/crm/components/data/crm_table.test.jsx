import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("link", { name: "Details" })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("link", { name: "Details" }));

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

    fireEvent.click(screen.getByRole("link", { name: "Details" }));
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

    fireEvent.click(screen.getByRole("link", { name: "Details" }));
    fireEvent.click(
      screen.getByRole("button", { name: /View contract for 123 Main St/i }),
    );

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

    fireEvent.click(screen.getByRole("link", { name: "Details" }));

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

    fireEvent.click(screen.getByRole("link", { name: "Details" }));
    fireEvent.click(
      screen.getByRole("button", { name: /View contract for 123 Main St/i }),
    );
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
