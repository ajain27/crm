import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import CompsNoteView from "./CompsNoteView";

describe("CompsNoteView", () => {
  it("shows each call's note in bold, other notes as written", () => {
    const { container } = render(
      <CompsNoteView
        notes={
          "Seller Name: Teremy\n\nCall 1 (11/6/2026): wants an offer\n\nCall 2 (11/6/2026): offered 600k"
        }
      />,
    );
    expect(
      [...container.querySelectorAll("strong")].map((el) => el.textContent),
    ).toEqual([
      "Call 1 (11/6/2026): wants an offer",
      "Call 2 (11/6/2026): offered 600k",
    ]);
    expect(container.textContent).toContain("Seller Name: Teremy");
  });
});
