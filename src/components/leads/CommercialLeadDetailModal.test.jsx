import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommercialLeadDetailModal from "./CommercialLeadDetailModal";

describe("CommercialLeadDetailModal", () => {
  it("links the property to Zillow next to the address", () => {
    render(
      <CommercialLeadDetailModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        lead={{
          id: "c1",
          name: "Plaza",
          address: "500 Commerce St, Dallas, TX 75201",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /Zillow/ })).toHaveAttribute(
      "href",
      "https://www.zillow.com/homes/500-Commerce-St-Dallas-TX-75201_rb/",
    );
  });
});
