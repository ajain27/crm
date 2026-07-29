import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ leads: [] }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("shows paid-source leads in the PPC tab", () => {
    const leads = [
      {
        id: "l1",
        address: "1 Main St, Dallas, TX 75201",
        source: "Google Ads",
        sellerName: "Jane PPC",
        email: "jane@example.com",
        phone: "555-1212",
      },
    ];
    render(<PotentialLeads {...baseProps({ leads })} />);
    fireEvent.click(screen.getByRole("button", { name: /PPC Leads/i }));
    expect(screen.getByText(/Jane PPC/i)).toBeInTheDocument();
  });

  it("locks PPC-only users to PPC leads without the CRM action", () => {
    const leads = [
      {
        id: "l1",
        address: "1 Main St, Dallas, TX 75201",
        source: "Google Ads",
        sellerName: "Jane PPC",
        email: "jane@example.com",
        phone: "555-1212",
      },
    ];

    render(<PotentialLeads {...baseProps({ leads, ppcOnly: true })} />);

    expect(screen.getByText(/Jane PPC/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Residential$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Commercial$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^CRM$/i })).toBeNull();
    expect(screen.queryByTitle(/Delete lead/i)).toBeNull();
    expect(screen.queryByText(/Quality/i)).toBeNull();
    expect(screen.queryByTitle(/Mark as good lead/i)).toBeNull();
  });

  it("collapses duplicate PPC leads for PPC-only users", () => {
    const duplicateLead = {
      wpLeadId: 777,
      address: "777 Main St, Dallas, TX 75201",
      source: "Website",
      ppcSource: true,
      sellerName: "Duplicate PPC",
      email: "duplicate@example.com",
      phone: "555-7777",
    };
    const leads = [
      { ...duplicateLead, id: "old-random-id" },
      { ...duplicateLead, id: "wp-lead-777" },
    ];

    render(<PotentialLeads {...baseProps({ leads, ppcOnly: true })} />);

    expect(screen.getAllByText(/Duplicate PPC/i)).toHaveLength(1);
    expect(screen.getAllByText(/1.*of 1 lead/i).length).toBeGreaterThan(0);
  });

  it("imports same-contact WordPress leads when their WordPress IDs differ", async () => {
    const saveLead = vi.fn().mockResolvedValue(undefined);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leads: [
          {
            id: "local-1",
            wpLeadId: 101,
            ppcSource: true,
            source: "Website",
            sellerName: "kausar miah",
            email: "kausarstore7@gmail.com",
            phone: "3474503572",
            address: "Baridhara, Dhaka, Bangladesh, 1212, texas, TX 78805",
          },
          {
            id: "local-2",
            wpLeadId: 102,
            ppcSource: true,
            source: "Website",
            sellerName: "kausar miah",
            email: "kausarstore7@gmail.com",
            phone: "3474503572",
            address: "Baridhara, Dhaka, Bangladesh, 1212, texas, TX 78805",
          },
        ],
      }),
    });

    render(<PotentialLeads {...baseProps({ saveLead })} />);

    await waitFor(() => {
      expect(saveLead).toHaveBeenCalledTimes(2);
    });
  });

  it("uses stable Firestore IDs for WordPress imports", async () => {
    const saveLead = vi.fn().mockResolvedValue(undefined);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leads: [
          {
            id: "random-from-api",
            wpLeadId: 901,
            ppcSource: true,
            source: "Website",
            sellerName: "Stable Lead",
            email: "stable@example.com",
            phone: "5551212",
            address: "901 Main St",
          },
        ],
      }),
    });

    render(<PotentialLeads {...baseProps({ saveLead })} />);

    await waitFor(() => {
      expect(saveLead).toHaveBeenCalledWith(
        expect.objectContaining({ id: "wp-lead-901", wpLeadId: 901 }),
      );
    });
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
