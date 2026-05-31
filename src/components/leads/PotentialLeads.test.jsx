import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PotentialLeads from "./PotentialLeads";

const baseProps = (overrides = {}) => ({
  currentUser: { id: "u1" },
  leads: [],
  setLeads: vi.fn(),
  saveLead: vi.fn().mockResolvedValue(undefined),
  deleteLeadById: vi.fn().mockResolvedValue(undefined),
  saveLeadFile: vi.fn().mockResolvedValue(undefined),
  fetchLeadFile: vi.fn().mockResolvedValue(null),
  deleteLeadFileById: vi.fn().mockResolvedValue(undefined),
  saveDeal: vi.fn().mockResolvedValue(undefined),
  setDeals: vi.fn(),
  setActiveView: vi.fn(),
  ...overrides,
});

describe("PotentialLeads", () => {
  it("renders the Add Lead form", () => {
    render(<PotentialLeads {...baseProps()} />);
    expect(
      screen.getByPlaceholderText(/123 Main St, Dallas, TX 75201/i),
    ).toBeInTheDocument();
  });

  it("shows empty state when no leads exist", () => {
    render(<PotentialLeads {...baseProps()} />);
    expect(screen.getByText(/No leads yet/i)).toBeInTheDocument();
  });

  it("renders a lead row when leads are provided", () => {
    const leads = [
      {
        id: "l1",
        address: "1 Main St, Dallas, TX 75201",
        source: "MLS / Zillow",
        sellerName: "Jane",
        phone: "555-1212",
      },
    ];
    render(<PotentialLeads {...baseProps({ leads })} />);
    expect(screen.getByText(/1 Main St/i)).toBeInTheDocument();
  });

  it("shows a duplicate-address warning on address blur", () => {
    const leads = [
      {
        id: "l1",
        address: "1 Main St",
      },
    ];
    render(<PotentialLeads {...baseProps({ leads })} />);
    const addressInput = screen.getByPlaceholderText(
      /123 Main St, Dallas, TX 75201/i,
    );
    fireEvent.change(addressInput, { target: { value: "1 Main St" } });
    fireEvent.blur(addressInput);
    expect(screen.getByText(/already in your lead list/i)).toBeInTheDocument();
  });
});
