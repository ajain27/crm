import { useColumnResize } from "../../hooks/useColumnResize";

// A <table> whose columns can be resized by dragging the right edge of a
// header cell (double-click the edge to reset). Widths are remembered in
// this browser under `resizeKey`, one per table. In the mobile card
// layout (acc-card) the set widths are ignored.
export default function ResizableTable({
  resizeKey,
  className = "",
  children,
  ...props
}) {
  const tableRef = useColumnResize(resizeKey);
  return (
    <table
      ref={tableRef}
      className={`${className} is-col-resizable`.trim()}
      {...props}
    >
      {children}
    </table>
  );
}
