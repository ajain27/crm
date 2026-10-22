import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("CommercialLeadDetailModal map", () => {
  it("shows the saved address on a map with a Google Maps link", () => {
    render(
      <CommercialLeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{
          id: "c1",
          name: "Starlight Hills",
          address: "1 Hill Rd, Kerrville, TX",
        }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open in Google Maps" }),
    ).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=1%20Hill%20Rd%2C%20Kerrville%2C%20TX",
    );
  });

  it("asks for an address when there isn't one", () => {
    render(
      <CommercialLeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{ id: "c2", name: "No address yet" }}
        onSave={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Add an address to see the property on the map."),
    ).toBeInTheDocument();
  });
});

describe("CommercialLeadDetailModal seller name", () => {
  it("splits an older combined name and saves first + last joined", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <CommercialLeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{ id: "c3", name: "Park", sellerName: "Ann Bell" }}
        onSave={onSave}
      />,
    );
    expect(screen.getByDisplayValue("Ann")).toBeInTheDocument();
    const last = screen.getByDisplayValue("Bell");
    fireEvent.change(last, { target: { value: "Bellamy" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      firstName: "Ann",
      lastName: "Bellamy",
      sellerName: "Ann Bellamy",
    });
  });
});

describe("CommercialLeadDetailModal imported details", () => {
  it("shows Phone 2 and the file's extra columns", () => {
    render(
      <CommercialLeadDetailModal
        isOpen
        onClose={vi.fn()}
        lead={{
          id: "c4",
          name: "Princess RV Resort",
          phone: "407-375-6065",
          phone2: "407-654-5788",
          extraFields: { Sites: "120", Brochure: "https://x.example/b.pdf" },
        }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("407-654-5788")).toBeInTheDocument();
    expect(screen.getByText("More details")).toBeInTheDocument();
    expect(screen.getByText("Sites")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://x.example/b.pdf" }),
    ).toBeInTheDocument();
  });
});
