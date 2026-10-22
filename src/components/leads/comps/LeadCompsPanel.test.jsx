import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LeadCompsPanel from "./LeadCompsPanel";

vi.mock("../../../utils/googleMapsLoader", () => ({
  loadGooglePlaces: () => Promise.reject(new Error("no maps in tests")),
}));

// jsdom has no scrolling; the panel scrolls the selected row into view.
Element.prototype.scrollIntoView = vi.fn();

const comps = {
  date: "10/1/2026",
  arv: 400000,
  rent: 2100,
  subject: {
    address: "1 Main St, Austin, TX 78701",
    beds: 3,
    baths: 2,
    sqft: 1500,
    yearBuilt: 1990,
    lat: 30.1,
    lng: -97.7,
  },
  comps: [
    {
      address: "5 Oak St, Austin, TX 78701",
      price: 390000,
      beds: 3,
      baths: 2,
      sqft: 1500,
      yearBuilt: 1988,
      soldDate: "2026-09-30",
      distance: 0.3,
      lat: 30.11,
      lng: -97.71,
    },
  ],
};

describe("LeadCompsPanel", () => {
  it("shows the headline figures and a row per home, subject first", () => {
    render(<LeadCompsPanel comps={comps} lead={{ askingPrice: "$350,000" }} />);
    expect(screen.getByText("$400,000")).toBeInTheDocument();
    expect(screen.getByText("$350,000")).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("1 Main St");
    expect(rows[0]).toHaveTextContent("Subject");
    expect(rows[1]).toHaveTextContent("5 Oak St");
    expect(rows[1]).toHaveTextContent("$390,000");
    expect(rows[1]).toHaveTextContent("Sold on 9/30/26");
    expect(rows[1]).toHaveTextContent("$260");
  });

  it("highlights a comp when its row is clicked, and clears on a second click", () => {
    render(<LeadCompsPanel comps={comps} lead={{}} />);
    const row = screen.getAllByRole("row")[2];
    fireEvent.click(row);
    expect(row).toHaveClass("is-selected");
    fireEvent.click(row);
    expect(row).not.toHaveClass("is-selected");
  });
});
