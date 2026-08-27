import { useRef, useState } from "react";
import {
  renderElementToPdfAssets,
  downloadPdfBlob,
} from "../../../../utils/pdfExport";

// Shared "Generate Report" behavior for every deal-analyzer PDF report:
// hands back a ref to attach to the hidden print template, an `exporting`
// flag, and the click handler. The print template must only be mounted
// while `exporting` is true (`{exporting && <XPdfTemplate .../>}`) rather
// than unconditionally — otherwise its off-screen copy of every summary
// value sits in the DOM at all times and collides with `getByText` lookups
// against the visible summary in tests (and any other exact-text query).
//
// Generating the report renders it once, then opens a preview modal
// showing the rendered image (not the PDF itself — embedding the PDF
// would hand the preview to the browser's native PDF viewer chrome);
// `downloadReport` saves the actual PDF blob from there.
export function useGenerateReport(filenamePrefix) {
  const printRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const pdfBlobRef = useRef(null);

  async function handleGenerateReport() {
    setExporting(true);
    // Let React commit the now-mounted print template before reading its
    // ref — state updates from an event handler aren't flushed to the DOM
    // synchronously.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const assets = await renderElementToPdfAssets(printRef.current);
      if (assets) {
        pdfBlobRef.current = assets.blob;
        setPreviewImage(assets.imgDataUrl);
      }
    } finally {
      setExporting(false);
    }
  }

  function closePreview() {
    setPreviewImage(null);
    pdfBlobRef.current = null;
  }

  function downloadReport() {
    if (pdfBlobRef.current) {
      downloadPdfBlob(pdfBlobRef.current, filenamePrefix);
    }
  }

  return {
    printRef,
    exporting,
    handleGenerateReport,
    previewImage,
    closePreview,
    downloadReport,
  };
}
