import ResizableTable from "./ResizableTable";

// A table that turns into accordion cards on smaller screens: each row
// becomes a card headed by its AccordionHeaderCell, which opens to show the
// row's other cells (each labelled by its `data-label`). See
// src/styles/accordionCard.css.
//
// Cards replace the table below 900px of table width, or below 1300px with
// `wide` (for tables with many columns, e.g. leads and CRM deals). Columns
// can be resized by dragging, remembered under `resizeKey`. `footer` (e.g.
// pagination) goes under the table, inside its wrapper.
export default function AccordionTable({
  resizeKey,
  wide = false,
  className = "",
  wrapClassName = "",
  wrapStyle,
  footer,
  children,
}) {
  const wrapClasses = [
    "table-wrap",
    wrapClassName,
    "acc-card-container",
    wide && "acc-card-container--wide",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={wrapClasses} style={wrapStyle}>
      <ResizableTable
        resizeKey={resizeKey}
        className={`${className} acc-card`.trim()}
      >
        {children}
      </ResizableTable>
      {footer}
    </div>
  );
}
