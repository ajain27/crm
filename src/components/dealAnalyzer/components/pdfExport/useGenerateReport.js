import { useRef, useState } from "react";
import { exportElementToPdf } from "../../../../utils/pdfExport";

// Shared "Generate Report" behavior for every deal-analyzer PDF report:
// hands back a ref to attach to the hidden print template, an `exporting`
// flag, and the click handler. The print template must only be mounted
// while `exporting` is true (`{exporting && <XPdfTemplate .../>}`) rather
// than unconditionally — otherwise its off-screen copy of every summary
// value sits in the DOM at all times and collides with `getByText` lookups
// against the visible summary in tests (and any other exact-text query).
export function useGenerateReport(filenamePrefix) {
  const printRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  async function handleGenerateReport() {
    setExporting(true);
    // Let React commit the now-mounted print template before reading its
    // ref — state updates from an event handler aren't flushed to the DOM
    // synchronously.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      await exportElementToPdf(printRef.current, filenamePrefix);
    } finally {
      setExporting(false);
    }
  }

  return { printRef, exporting, handleGenerateReport };
}
