import { Download } from "lucide-react";
import Modal from "../../../modal/Modal";

export default function PdfReportPreviewModal({
  previewImage,
  onClose,
  onDownload,
}) {
  return (
    <Modal
      isOpen={!!previewImage}
      onClose={onClose}
      title="Report"
      className="pdf-report-preview-dialog"
      headerActions={
        <button
          type="button"
          className="modal-header-icon-btn"
          onClick={onDownload}
          aria-label="Download report"
          title="Download report"
        >
          <Download size={20} />
        </button>
      }
    >
      {previewImage && (
        <div className="pdf-report-preview-body">
          <img
            src={previewImage}
            alt="Report preview"
            className="pdf-report-preview-image"
          />
        </div>
      )}
    </Modal>
  );
}
