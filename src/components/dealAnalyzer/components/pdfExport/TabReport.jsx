import { forwardRef } from "react";
import DealPdfLayout, { PdfRow, PdfSectionTitle } from "./DealPdfLayout";
import GenerateReportButton from "./GenerateReportButton";
import PdfReportPreviewModal from "./PdfReportPreviewModal";
import { useGenerateReport } from "./useGenerateReport";

// A tab's report as data, so any deal-analyzer tab gets the same PDF as the
// hand-built ones (Wholesale, DSCR…) without a template of its own:
//
//   verdict:  { label, value, positive }   — the headline banner
//   sections: [{ title, rows: [{ label, value, tone, bold }] }]
//             (rows with no value, and sections with no rows, are left out)
//   formula:  { text, calc }                — how the headline was worked out
//   note:     a closing line (e.g. the final verdict's reason)
const TabReportPdf = forwardRef(function TabReportPdf(
  { tagline, verdict, sections, formula, note },
  ref,
) {
  return (
    <DealPdfLayout
      ref={ref}
      tagline={tagline}
      verdictLabel={verdict?.label}
      verdictValue={verdict?.value}
      verdictPositive={verdict?.positive}
    >
      {visibleSections(sections).map((section) => (
        <div key={section.title}>
          <PdfSectionTitle>{section.title}</PdfSectionTitle>
          {section.rows.map((row) => (
            <PdfRow key={row.label} {...row} />
          ))}
        </div>
      ))}
      {formula && (
        <p className="mm-pdf-formula">
          {formula.text}
          {formula.calc && (
            <>
              <br />
              {formula.calc}
            </>
          )}
        </p>
      )}
      {note && <p className="mm-pdf-formula">{note}</p>}
    </DealPdfLayout>
  );
});

export function visibleSections(sections = []) {
  return sections
    .map((s) => ({
      ...s,
      rows: (s.rows || []).filter(
        (r) => r && r.value !== null && r.value !== undefined && r.value !== "",
      ),
    }))
    .filter((s) => s.rows.length > 0);
}

// The Generate Report button, the off-screen report it renders, and the
// preview it opens — everything a tab needs, from its results as data.
export default function TabReport({
  filename,
  tagline,
  verdict,
  sections,
  formula,
  note,
  label,
}) {
  const {
    printRef,
    exporting,
    handleGenerateReport,
    previewImage,
    closePreview,
    downloadReport,
  } = useGenerateReport(filename);

  return (
    <>
      <GenerateReportButton
        onClick={handleGenerateReport}
        exporting={exporting}
        label={label}
      />
      {exporting && (
        <TabReportPdf
          ref={printRef}
          tagline={tagline}
          verdict={verdict}
          sections={sections}
          formula={formula}
          note={note}
        />
      )}
      <PdfReportPreviewModal
        previewImage={previewImage}
        onClose={closePreview}
        onDownload={downloadReport}
      />
    </>
  );
}
