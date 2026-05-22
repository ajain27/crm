import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Wholesale_data from "./Wholesale_data";

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
  it("calls saveDeal when offer status changes", async () => {
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

    const select = screen.getByDisplayValue("Not Sent");
    fireEvent.change(select, { target: { value: "Offer Sent" } });

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith({
        ...deal,
        offerStatus: "Offer Sent",
      });
    });
    expect(persist).toHaveBeenCalled();
  });

  it("shows a disabled closed date for closed deals", () => {
    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            closed: "Yes",
            closedDate: "2026-04-30",
          },
        ]}
        deals={[
          {
            ...deal,
            closed: "Yes",
            closedDate: "2026-04-30",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const closedDateInput = screen.getByDisplayValue("2026-04-30");
    expect(closedDateInput).toBeDisabled();
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

    expect(getRenderedDealIds(container)).toEqual(["d2", "d1", "d3"]);
  });

  it("saves the entered closed date when a deal is marked closed", async () => {
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const persist = vi.fn();
    vi.spyOn(window, "prompt").mockReturnValue("2026-04-12");

    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Yes",
            assigned: "Yes",
          },
        ]}
        deals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Yes",
            assigned: "Yes",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={persist}
        saveDeal={saveDeal}
      />,
    );

    const closedSelect = screen
      .getAllByRole("combobox")
      .filter((select) => select.className.includes("badge no"))
      .at(-1);
    expect(closedSelect).toBeDefined();
    fireEvent.change(closedSelect, { target: { value: "Yes" } });

    await Promise.resolve();
    await Promise.resolve();

    expect(saveDeal).toHaveBeenCalledWith({
      ...deal,
      offerStatus: "Offer Sent",
      sellerAccepted: "Yes",
      assigned: "Yes",
      jvDeal: "No",
      jvPartnerName: "",
      jvPartnerEmail: "",
      jvSplit: 0,
      closed: "Yes",
      closedDate: "2026-04-12",
      closedInMonth: "04",
    });
    expect(persist).toHaveBeenCalled();
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

  it("sorts by a date column when the header is clicked", () => {
    const { container } = render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            offerDate: "2026-04-15",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            offerDate: "2026-03-10",
          },
        ]}
        deals={[
          {
            ...deal,
            id: "d1",
            address: "123 Main St",
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            offerDate: "2026-04-15",
          },
          {
            ...deal,
            id: "d2",
            address: "456 Oak Ave",
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            offerDate: "2026-03-10",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
      />,
    );

    const offerDateSortButton = screen.getByRole("button", {
      name: "Offer Date",
    });
    fireEvent.click(offerDateSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d2", "d1"]);

    fireEvent.click(offerDateSortButton);
    expect(getRenderedDealIds(container)).toEqual(["d1", "d2"]);
  });

  it("shows a view contract action when a contract file is stored on the deal", async () => {
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

  it("lists the most recent uploaded contract first in the preview modal", () => {
    render(
      <Wholesale_data
        filteredDeals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            contractVersions: [
              {
                id: "older",
                name: "extension-1.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,b2xkZXI=",
                uploadedAt: "2026-05-08T10:00:00.000Z",
              },
              {
                id: "latest",
                name: "extension-2.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,bGF0ZXN0",
                uploadedAt: "2026-05-09T10:00:00.000Z",
              },
            ],
            contractFileName: "extension-2.pdf",
            contractFileType: "application/pdf",
            contractFileData: "data:application/pdf;base64,bGF0ZXN0",
          },
        ]}
        deals={[
          {
            ...deal,
            offerStatus: "Offer Sent",
            sellerAccepted: "Waiting",
            contractVersions: [
              {
                id: "older",
                name: "extension-1.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,b2xkZXI=",
                uploadedAt: "2026-05-08T10:00:00.000Z",
              },
              {
                id: "latest",
                name: "extension-2.pdf",
                type: "application/pdf",
                data: "data:application/pdf;base64,bGF0ZXN0",
                uploadedAt: "2026-05-09T10:00:00.000Z",
              },
            ],
            contractFileName: "extension-2.pdf",
            contractFileType: "application/pdf",
            contractFileData: "data:application/pdf;base64,bGF0ZXN0",
          },
        ]}
        deleteDeal={vi.fn()}
        persist={vi.fn()}
        saveDeal={vi.fn()}
        fetchContractVersion={vi.fn().mockResolvedValue(null)}
        currentUserId="u1"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /View contract for 123 Main St/i }),
    );

    const versionButtons = Array.from(
      document.querySelectorAll(".contract-version-select"),
    );

    expect(versionButtons[0]).toHaveTextContent("extension-2.pdf");
    expect(versionButtons[1]).toHaveTextContent("extension-1.pdf");
  });

  it("allows uploading an odt contract from the table when the offer is sent", async () => {
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

    const uploadInput = document.getElementById("contract-upload-d1");
    const contractFile = new File(["contract"], "contract.odt", {
      type: "application/vnd.oasis.opendocument.text",
    });

    fireEvent.change(uploadInput, {
      target: { files: [contractFile] },
    });

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith({
        ...deal,
        offerStatus: "Offer Sent",
        sellerAccepted: "Waiting",
        contractVersions: [
          expect.objectContaining({
            name: "contract.odt",
            type: "application/vnd.oasis.opendocument.text",
          }),
        ],
        contractFileName: "contract.odt",
        contractFileType: "application/vnd.oasis.opendocument.text",
        contractFileData: "",
      });
    });

    expect(persist).toHaveBeenCalled();
  });

  it("allows deleting a stored contract from the table", async () => {
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

    fireEvent.click(
      screen.getByRole("button", { name: /View contract for 123 Main St/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Delete purchase-contract\.pdf/i }),
    );

    await waitFor(() => {
      expect(saveDeal).toHaveBeenCalledWith({
        ...deal,
        offerStatus: "Offer Sent",
        sellerAccepted: "Waiting",
        contractVersions: [],
        contractFileName: "",
        contractFileType: "",
        contractFileData: "",
      });
    });

    expect(persist).toHaveBeenCalled();
  });
});
