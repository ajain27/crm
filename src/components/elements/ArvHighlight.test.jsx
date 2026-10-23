import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArvHighlight from "./ArvHighlight";

describe("ArvHighlight", () => {
  it("shows the entered ARV big", () => {
    render(<ArvHighlight arv={116226} />);
    expect(screen.getByText("$116,226")).toHaveClass("arv-highlight-value");
    expect(screen.getByText("After repair value")).toBeInTheDocument();
  });

  it("falls back to the comps estimate, with its run date", () => {
    render(<ArvHighlight compsArv={474993} compsDate="10/19/2026" />);
    expect(screen.getByText("$474,993")).toBeInTheDocument();
    expect(
      screen.getByText("Comps estimate · run 10/19/2026"),
    ).toBeInTheDocument();
  });

  it("notes a comps estimate that differs from the entered ARV", () => {
    render(
      <ArvHighlight arv={450000} compsArv={474993} compsDate="10/19/2026" />,
    );
    expect(screen.getByText("$450,000")).toBeInTheDocument();
    expect(
      screen.getByText("Comps estimate $474,993 · run 10/19/2026"),
    ).toBeInTheDocument();
  });

  it("renders nothing without a value", () => {
    const { container } = render(<ArvHighlight arv={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
