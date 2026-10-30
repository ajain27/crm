import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailCell } from "./LeadTableCells";

function renderCell(email, onRowClick = vi.fn()) {
  render(
    <table>
      <tbody>
        <tr onClick={onRowClick}>
          <EmailCell email={email} />
        </tr>
      </tbody>
    </table>,
  );
  return onRowClick;
}

describe("EmailCell", () => {
  it("copies the email without opening the row", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const onRowClick = renderCell("ann@x.com");

    fireEvent.click(screen.getByRole("button", { name: "Copy ann@x.com" }));
    expect(writeText).toHaveBeenCalledWith("ann@x.com");
    expect(onRowClick).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Copied" }),
      ).toBeInTheDocument(),
    );
  });

  it("has no copy button without an email", () => {
    renderCell("");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
