import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContractPreviewModal from "./ContractPreviewModal";

const versions = [
  {
    id: "v1",
    name: "contract.pdf",
    type: "application/pdf",
    uploadedAt: "2026-01-01T00:00:00Z",
  },
];

describe("ContractPreviewModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ContractPreviewModal
        isOpen={false}
        onClose={vi.fn()}
        selectedContractDeal={null}
        contractVersions={[]}
        selectedContractVersion={null}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title with deal address", () => {
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "1 Main" }}
        contractVersions={versions}
        selectedContractVersion={versions[0]}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(screen.getByText(/Contract for 1 Main/i)).toBeInTheDocument();
  });

  it("renders the version list", () => {
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "1 Main" }}
        contractVersions={versions}
        selectedContractVersion={versions[0]}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(screen.getAllByText("contract.pdf").length).toBeGreaterThan(0);
  });

  it("clicking a version invokes setSelectedContractVersionId", () => {
    const setSelectedContractVersionId = vi.fn();
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "X" }}
        contractVersions={versions}
        selectedContractVersion={versions[0]}
        setSelectedContractVersionId={setSelectedContractVersionId}
        isFetchingContract={false}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector(".contract-version-select"));
    expect(setSelectedContractVersionId).toHaveBeenCalledWith("v1");
  });

  it("clicking delete invokes handleDeleteContractVersion", () => {
    const handleDeleteContractVersion = vi.fn();
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ id: "d1", address: "X" }}
        contractVersions={versions}
        selectedContractVersion={versions[0]}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={handleDeleteContractVersion}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Delete contract.pdf/i));
    expect(handleDeleteContractVersion).toHaveBeenCalledWith(
      { id: "d1", address: "X" },
      "v1",
    );
  });

  it("shows 'Loading contract…' while fetching", () => {
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "X" }}
        contractVersions={versions}
        selectedContractVersion={versions[0]}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={true}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(screen.getByText(/Loading contract/i)).toBeInTheDocument();
  });

  it("renders PDF iframe when data + isPdfContract", () => {
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "X" }}
        contractVersions={versions}
        selectedContractVersion={versions[0]}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData="data:application/pdf;base64,XYZ"
        isImageContract={false}
        isPdfContract={true}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(document.querySelector("iframe")).not.toBeNull();
  });

  it("renders image when data + isImageContract", () => {
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "X" }}
        contractVersions={[{ ...versions[0], type: "image/png" }]}
        selectedContractVersion={{ ...versions[0], type: "image/png" }}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData="data:image/png;base64,XYZ"
        isImageContract={true}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows empty-state fallback when no versions and no data", () => {
    render(
      <ContractPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        selectedContractDeal={{ address: "X" }}
        contractVersions={[]}
        selectedContractVersion={null}
        setSelectedContractVersionId={vi.fn()}
        isFetchingContract={false}
        selectedContractData=""
        isImageContract={false}
        isPdfContract={false}
        handleDeleteContractVersion={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/No contract file has been uploaded/i),
    ).toBeInTheDocument();
  });
});
