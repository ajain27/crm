import { Download } from "lucide-react";
import Modal from "../../../modal/Modal";
import ModalActions, { ActionButton } from "../../../elements/ModalActions";

// The rendered report to look over before saving it: `onDownload` saves
// the PDF. With `scroll`, the report shows at full width and scrolls
// (for long reports) instead of being shrunk to fit.
export default function PdfReportPreviewModal({
  previewImage,
  onClose,
  onDownload,
  title = "Report",
  scroll = false,
}) {
  return (
    <Modal
      isOpen={!!previewImage}
      onClose={onClose}
      title={title}
      className={`pdf-report-preview-dialog${scroll ? " pdf-report-preview-dialog--scroll" : ""}`}
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
      actions={
        <ModalActions
          end={
            <>
              <ActionButton label="Close" onClick={onClose} />
              <ActionButton
                icon={Download}
                tone="primary"
                label="Download PDF"
                onClick={onDownload}
              />
            </>
          }
        />
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
