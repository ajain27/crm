import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Renders `element` to a JPEG and drops it into a single-page PDF sized to
// match the content (A4 width, variable height) so the report never gets
// cut off or split across pages, however long it gets. Returns both the
// PDF Blob (for download) and the source image data URL (for an in-app
// preview) instead of saving directly — an <iframe>/<embed> of the PDF
// itself would hand rendering to the browser's native PDF viewer chrome
// (toolbar, thumbnails, its own print/download icons), which we don't
// want inside our own preview modal.
export async function renderElementToPdfAssets(element) {
  if (!element) return null;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const pageW = 595.28;
  const imgH = pageW * (canvas.height / canvas.width);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [pageW, imgH],
  });
  pdf.addImage(imgDataUrl, "JPEG", 0, 0, pageW, imgH);
  return { blob: pdf.output("blob"), imgDataUrl };
}

export function pdfFilename(filenamePrefix) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${filenamePrefix}-${dateStr}.pdf`;
}

// Triggers a browser download of an already-rendered PDF blob.
export function downloadPdfBlob(blob, filenamePrefix) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFilename(filenamePrefix);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
