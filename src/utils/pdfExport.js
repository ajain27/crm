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
  // jsPDF's `orientation` doesn't just label the page — when it conflicts
  // with the given `format` dimensions, jsPDF silently swaps them to
  // enforce it. A short report (content wider than it is tall, e.g. a
  // report with few line items) produces `imgH < pageW`, and forcing
  // "portrait" then swaps width/height under the hood — but the image
  // below is still drawn at the original (unswapped) size, so it overflows
  // past the now-narrower page's right edge and gets clipped by whatever
  // opens the PDF. Only the actual PDF hits this (this preview image
  // doesn't go through jsPDF's page math), and only short reports trigger
  // it — matching exactly what was seen: fine on-screen, broken only in
  // the downloaded file, only for the shorter seller-copy report.
  const orientation = imgH >= pageW ? "portrait" : "landscape";
  const pdf = new jsPDF({
    orientation,
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
