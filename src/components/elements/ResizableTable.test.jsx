import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResizableTable from "./ResizableTable";

function Table() {
  return (
    <ResizableTable resizeKey="test-table" className="compact-table">
      <thead>
        <tr>
          <th>Address</th>
          <th>Seller</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1 Main St</td>
          <td>Ann</td>
        </tr>
      </tbody>
    </ResizableTable>
  );
}

describe("ResizableTable", () => {
  beforeEach(() => localStorage.clear());

  it("adds a resize handle to every header and keeps its classes", () => {
    const { container } = render(<Table />);
    const table = container.querySelector("table");
    expect(table).toHaveClass("compact-table", "is-col-resizable");
    expect(table.querySelectorAll("th > .col-resize-handle")).toHaveLength(2);
  });

  it("remembers a dragged width for the same table", () => {
    const { unmount } = render(<Table />);
    const handle = screen
      .getByRole("columnheader", { name: "Address" })
      .querySelector(".col-resize-handle");
    // jsdom has no PointerEvent; a MouseEvent carries the position.
    const pointer = (type, clientX) =>
      fireEvent(handle, new MouseEvent(type, { bubbles: true, clientX }));
    pointer("pointerdown", 0);
    pointer("pointermove", 260);
    pointer("pointerup", 260);
    unmount();

    render(<Table />);
    expect(
      screen.getByRole("columnheader", { name: "Address" }).style.width,
    ).toBe("260px");
  });
});
