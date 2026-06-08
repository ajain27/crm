import { Trash2, Loader2 } from "lucide-react";
import Modal from "../../../../modal/Modal";

function ContractPreviewModal({
  isOpen,
  onClose,
  selectedContractDeal,
  contractVersions,
  selectedContractVersion,
  setSelectedContractVersionId,
  isFetchingContract,
  selectedContractData,
  isImageContract,
  isPdfContract,
  handleDeleteContractVersion,
}) {
  const contractPreviewTitle = selectedContractDeal?.address
    ? `Contract for ${selectedContractDeal.address}`
    : "Contract Preview";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contractPreviewTitle}
      className="contract-preview-dialog"
    >
      <div className="contract-preview-modal">
        {contractVersions.length > 0 ? (
          <div className="contract-preview-sidebar">
            <div className="contract-version-list">
              {contractVersions.map((version) => (
                <div
                  key={version.id}
                  className={`contract-version-item ${
                    selectedContractVersion?.id === version.id ? "active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="contract-version-select"
                    onClick={() => setSelectedContractVersionId(version.id)}
                  >
                    <div className="contract-version-copy">
                      <strong>{version.name}</strong>
                      <span>
                        {version.uploadedAt
                          ? new Date(version.uploadedAt).toLocaleString()
                          : "Uploaded contract"}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn contract-version-delete"
                    onClick={() =>
                      handleDeleteContractVersion(
                        selectedContractDeal,
                        version.id,
                      )
                    }
                    aria-label={`Delete ${version.name}`}
                    title={`Delete ${version.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="contract-preview-content">
          {selectedContractVersion?.name ? (
            <div className="contract-preview-meta">
              {selectedContractVersion.name}
            </div>
          ) : null}

          {isFetchingContract ? (
            <div className="contract-preview-fallback">
              <Loader2 size={20} className="spin" /> Loading contract…
            </div>
          ) : selectedContractData ? (
            isImageContract ? (
              <img
                src={selectedContractData}
                alt={selectedContractVersion.name || "Contract preview"}
                className="contract-preview-image"
              />
            ) : isPdfContract ? (
              <iframe
                title={selectedContractVersion.name || "Contract preview"}
                src={selectedContractData}
                className="contract-preview-frame"
              />
            ) : (
              <object
                data={selectedContractData}
                type={
                  selectedContractVersion.type || "application/octet-stream"
                }
                className="contract-preview-frame"
              >
                <div className="contract-preview-fallback">
                  Preview is limited for this file type.
                </div>
              </object>
            )
          ) : (
            <div className="contract-preview-fallback">
              {contractVersions.length > 0
                ? "Contract data could not be loaded. Delete this version and re-upload the file."
                : "No contract file has been uploaded for this deal."}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ContractPreviewModal;
