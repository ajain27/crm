import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Renders `element` to a JPEG and drops it into a single-page PDF sized to
// match the content (A4 width, variable height) so the report never gets
// cut off or split across pages, however long it gets.
export async function exportElementToPdf(element, filenamePrefix) {
  if (!element) return;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pageW = 595.28;
  const imgH = pageW * (canvas.height / canvas.width);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [pageW, imgH],
  });
  pdf.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
  const dateStr = new Date().toISOString().slice(0, 10);
  pdf.save(`${filenamePrefix}-${dateStr}.pdf`);
}
