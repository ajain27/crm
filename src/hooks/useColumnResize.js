import { useLayoutEffect, useRef } from "react";

const MIN_WIDTH = 40;
const HANDLE_CLASS = "col-resize-handle";

// Widths are kept per table and per column count (a table can show more
// or fewer columns, e.g. the read-only PPC view), in this browser only.
const storageId = (key, count) => `columnWidths:${key}:${count}`;

function readWidths(key, count) {
  try {
    const widths = JSON.parse(localStorage.getItem(storageId(key, count)));
    return Array.isArray(widths) && widths.length === count ? widths : null;
  } catch {
    return null;
  }
}

function writeWidths(key, widths) {
  try {
    if (widths) {
      localStorage.setItem(
        storageId(key, widths.length),
        JSON.stringify(widths),
      );
    }
  } catch {
    // Storage can be unavailable (private mode); widths just won't persist.
  }
}

function clearWidths(key, count) {
  try {
    localStorage.removeItem(storageId(key, count));
  } catch {
    // Nothing saved to clear.
  }
}

const headerCells = (table) => [
  ...table.querySelectorAll(":scope > thead > tr > th"),
];

// Fixed layout makes each column exactly its set width; the table is as
// wide as its columns, so widening one scrolls instead of squeezing others.
function applyWidths(table, widths) {
  headerCells(table).forEach((th, i) => {
    th.style.width = `${widths[i]}px`;
  });
  table.style.tableLayout = "fixed";
  table.style.width = `${widths.reduce((sum, w) => sum + w, 0)}px`;
  table.style.minWidth = "0";
}

function resetWidths(table) {
  headerCells(table).forEach((th) => {
    th.style.width = "";
  });
  table.style.tableLayout = "";
  table.style.width = "";
  table.style.minWidth = "";
}

// Drag the right edge of a column header to resize that column;
// double-click the edge to go back to automatic widths. Attach the
// returned ref to the <table>. Handles are added to the header cells
// directly, so the table's own markup doesn't change.
export function useColumnResize(storageKey) {
  const tableRef = useRef(null);

  // Runs after every render: the header can re-render with different
  // columns, and new cells need handles and their saved widths.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || !storageKey) return;
    const cells = headerCells(table);

    cells.forEach((th) => {
      if (th.querySelector(`:scope > .${HANDLE_CLASS}`)) return;
      const handle = document.createElement("span");
      handle.className = HANDLE_CLASS;
      handle.title = "Drag to resize · double-click to reset";
      handle.setAttribute("aria-hidden", "true");
      // Keep header clicks (sorting, select all) from firing.
      handle.addEventListener("click", (e) => e.stopPropagation());
      handle.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        clearWidths(storageKey, headerCells(table).length);
        resetWidths(table);
      });
      handle.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const all = headerCells(table);
        const index = all.indexOf(th);
        const widths = all.map((cell) => cell.getBoundingClientRect().width);
        const startX = e.clientX;
        const startWidth = widths[index];
        handle.setPointerCapture?.(e.pointerId);
        table.classList.add("is-col-resizing");

        const onMove = (move) => {
          widths[index] = Math.max(
            MIN_WIDTH,
            Math.round(startWidth + move.clientX - startX),
          );
          applyWidths(table, widths);
        };
        const onUp = () => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          handle.removeEventListener("pointercancel", onUp);
          table.classList.remove("is-col-resizing");
          writeWidths(storageKey, widths.map(Math.round));
        };
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", onUp);
      });
      th.appendChild(handle);
    });

    const saved = readWidths(storageKey, cells.length);
    if (saved) applyWidths(table, saved);
    // No widths saved for this set of columns: drop any left from another.
    else if (!table.classList.contains("is-col-resizing")) resetWidths(table);
  });

  return tableRef;
}
