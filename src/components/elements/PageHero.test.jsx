import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Home } from "lucide-react";
import PageHero from "./PageHero";

describe("PageHero", () => {
  it("shows the label, the headline (whole, for screen readers), the description and its buttons", () => {
    render(
      <PageHero
        icon={Home}
        eyebrow="Dashboard"
        headline={[
          { text: "Your deals, " },
          { text: "at a glance.", className: "page-hero-accent" },
        ]}
        description="Track every deal."
      >
        <button type="button">Import</button>
      </PageHero>,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your deals, at a glance.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Track every deal.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
  });
});
