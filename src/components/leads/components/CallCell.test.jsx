import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CallCell, PhoneCell } from "./LeadTableCells";

function renderCell(count, onChange = vi.fn(), onRowClick = vi.fn()) {
  render(
    <table>
      <tbody>
        <tr onClick={onRowClick}>
          <CallCell count={count} onChange={onChange} />
        </tr>
      </tbody>
    </table>,
  );
  return { onChange, onRowClick };
}

describe("CallCell", () => {
  it("marks a lead that hasn't been called as called once", () => {
    const { onChange, onRowClick } = renderCell(undefined);
    fireEvent.click(screen.getByRole("button", { name: /Not called/ }));
    expect(onChange).toHaveBeenCalledWith(1);
    // The row (which opens the lead) doesn't get the click.
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("counts calls up and down, back to not called", () => {
    const { onChange } = renderCell(2);
    expect(screen.getByText("Called 2×")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "One more call" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "One call fewer" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});

describe("PhoneCell", () => {
  it("opens Messages with the text already written", () => {
    render(
      <table>
        <tbody>
          <tr>
            <PhoneCell phone="716-665-1501" textBody="Hi Ann, cash offer?" />
          </tr>
        </tbody>
      </table>,
    );
    expect(
      screen.getByRole("link", { name: "Text 716-665-1501" }),
    ).toHaveAttribute(
      "href",
      `sms:+17166651501?&body=${encodeURIComponent("Hi Ann, cash offer?")}`,
    );
  });
});
