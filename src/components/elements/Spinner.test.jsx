import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Spinner from "./Spinner";

describe("Spinner", () => {
  it("announces itself as loading, by its label when it has one", () => {
    const { rerender } = render(<Spinner />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    rerender(<Spinner label="Searching Zillow…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Searching Zillow…");
  });

  it("sizes the ring by preset or pixels", () => {
    const { container, rerender } = render(<Spinner size="lg" />);
    const ring = () => container.querySelector(".spinner-ring");
    expect(ring()).toHaveStyle({ width: "40px", height: "40px" });
    rerender(<Spinner size={64} />);
    expect(ring()).toHaveStyle({ width: "64px", borderWidth: "6px" });
  });

  it("stays out of screen readers when decorative", () => {
    render(<Spinner decorative />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
