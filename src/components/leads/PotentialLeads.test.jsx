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
    vi.restoreAllMocks();
  });

  it("opens the Add Lead form from the Add a lead button", () => {
    render(<PotentialLeads {...baseProps()} />);
    expect(
      screen.queryByPlaceholderText(/123 Main St, Dallas, TX 75201/i),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add a lead" }));
    expect(screen.getByText("Add Residential Lead")).toBeInTheDocument();
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

    const ppcRow = screen.getByText(/Jane PPC/i).closest("tr");
    expect(ppcRow).not.toHaveClass("clickable-row");

    fireEvent.click(screen.getByText(/Jane PPC/i));
    expect(screen.queryByRole("button", { name: /Save Changes/i })).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "Add a lead" }));
    const addressInput = screen.getByPlaceholderText(
      /123 Main St, Dallas, TX 75201/i,
    );
    fireEvent.change(addressInput, { target: { value: "1 Main St" } });
    fireEvent.blur(addressInput);
    expect(
      screen.getByText('"1 Main St" is already in Residential Leads.'),
    ).toBeInTheDocument();
  });

  it("won't add a lead whose address is in another tab or the CRM", () => {
    render(
      <PotentialLeads
        {...baseProps({
          leads: [
            { id: "l1", address: "2 Oak Ave, Dallas, TX", source: "PPL" },
          ],
          deals: [{ id: "d1", address: "3 Elm St", city: "Dallas" }],
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add a lead" }));
    const addressInput = screen.getByPlaceholderText(
      /123 Main St, Dallas, TX 75201/i,
    );
    fireEvent.change(addressInput, {
      target: { value: "2 oak ave., Dallas, TX 75201" },
    });
    fireEvent.blur(addressInput);
    expect(screen.getByText(/is already in PPL Leads\./)).toBeInTheDocument();

    fireEvent.change(addressInput, {
      target: { value: "3 Elm St, Dallas, TX 75201" },
    });
    fireEvent.blur(addressInput);
    expect(screen.getByText(/is already in the CRM\./)).toBeInTheDocument();
  });
  it("adds a commercial lead from the Commercial tab", async () => {
    const saveLead = vi.fn().mockResolvedValue(undefined);
    const setLeads = vi.fn();
    render(<PotentialLeads {...baseProps({ saveLead, setLeads })} />);
    fireEvent.click(screen.getByRole("button", { name: /^Commercial$/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add a lead" }));

    fireEvent.change(
      screen.getByPlaceholderText(/500 Commerce St, Dallas, TX 75201/i),
      { target: { value: "  500 Commerce St  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Lead/i }));

    await waitFor(() => {
      expect(saveLead).toHaveBeenCalledWith(
        expect.objectContaining({
          leadType: "commercial",
          address: "500 Commerce St",
          userId: "u1",
        }),
      );
    });
    expect(setLeads).toHaveBeenCalled();
  });

  it.each([
    ["PPC Leads", "Add PPC Lead", "PPC"],
    ["PPL Leads", "Add PPL Lead", "PPL"],
    ["Cold Calling", "Add Cold Calling Lead", "Cold Call"],
  ])(
    "adds a lead from the %s tab with that source",
    async (tab, heading, source) => {
      const saveLead = vi.fn().mockResolvedValue(undefined);
      const setLeads = vi.fn();
      render(<PotentialLeads {...baseProps({ saveLead, setLeads })} />);
      fireEvent.click(screen.getByRole("button", { name: new RegExp(tab) }));

      // The form only shows once "Add a lead" is clicked.
      expect(screen.queryByText(heading)).toBeNull();
      expect(
        screen.queryByPlaceholderText(/123 Main St, Dallas, TX 75201/i),
      ).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add a lead" }));
      expect(screen.getByText(heading)).toBeInTheDocument();
      // The source is fixed by the tab, so there's no picker.
      expect(screen.queryByText("Select source…")).toBeNull();

      fireEvent.change(
        screen.getByPlaceholderText(/123 Main St, Dallas, TX 75201/i),
        { target: { value: "9 Elm St" } },
      );
      fireEvent.change(document.querySelector('input[name="followUpDate"]'), {
        target: { value: "2099-01-01" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Add Lead/i }));

      await waitFor(() => {
        expect(saveLead).toHaveBeenCalledWith(
          expect.objectContaining({
            leadType: "residential",
            source,
            address: "9 Elm St",
            userId: "u1",
          }),
        );
      });
      expect(setLeads).toHaveBeenCalled();
      // Saving closes the window.
      await waitFor(() => expect(screen.queryByText(heading)).toBeNull());
    },
  );

  it("doesn't offer Add a lead to PPC-only users", () => {
    render(<PotentialLeads {...baseProps({ ppcOnly: true })} />);
    expect(screen.queryByRole("button", { name: "Add a lead" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /PPL Leads/ }));
    expect(screen.queryByRole("button", { name: "Add a lead" })).toBeNull();
  });

  it("saves the reason when a PPC lead is marked bad", async () => {
    const saveLead = vi.fn().mockResolvedValue(undefined);
    const lead = {
      id: "l1",
      source: "Google Ads",
      sellerName: "Jane PPC",
      email: "jane@example.com",
    };
    render(<PotentialLeads {...baseProps({ leads: [lead], saveLead })} />);
    fireEvent.click(screen.getByRole("button", { name: /PPC Leads/i }));

    fireEvent.click(screen.getByTitle(/Mark as bad lead/i));
    fireEvent.change(
      screen.getByPlaceholderText(/Not motivated, wrong price range/i),
      { target: { value: "Unreachable" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm Bad Lead/i }));

    await waitFor(() => {
      expect(saveLead).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "l1",
          ppcQuality: "bad",
          ppcBadReason: "Unreachable",
        }),
      );
    });
    expect(screen.queryByText(/Mark Lead as Bad/i)).toBeNull();
  });

  it("clicking the selected thumb again clears the rating", async () => {
    const saveLead = vi.fn().mockResolvedValue(undefined);
    const lead = {
      id: "l1",
      source: "Google Ads",
      sellerName: "Jane PPC",
      email: "jane@example.com",
      ppcQuality: "bad",
      ppcBadReason: "Unreachable",
    };
    render(<PotentialLeads {...baseProps({ leads: [lead], saveLead })} />);
    fireEvent.click(screen.getByRole("button", { name: /PPC Leads/i }));

    fireEvent.click(screen.getByTitle(/Clear bad rating/i));

    await waitFor(() => {
      expect(saveLead).toHaveBeenCalledWith(
        expect.objectContaining({ id: "l1", ppcQuality: "", ppcBadReason: "" }),
      );
    });
    expect(screen.queryByText(/Mark Lead as Bad/i)).toBeNull();
  });

  it("lists cold calling leads in their own tab, not Residential", () => {
    const leads = [
      { id: "c1", source: "Cold Call", sellerName: "Cal Caller" },
      { id: "r1", source: "Propwire", sellerName: "Rita Res" },
    ];
    render(<PotentialLeads {...baseProps({ leads })} />);
    expect(screen.getByText("Rita Res")).toBeInTheDocument();
    expect(screen.queryByText("Cal Caller")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Cold Calling/ }));
    expect(screen.getByText("Cal Caller")).toBeInTheDocument();
    expect(screen.queryByText("Rita Res")).toBeNull();
  });

  it("imports a cold calling list from a CSV", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const saveLead = vi.fn().mockResolvedValue(undefined);
    render(<PotentialLeads {...baseProps({ saveLead })} />);
    fireEvent.click(screen.getByRole("button", { name: /Cold Calling/ }));

    const csv = [
      "Owner 1 First Name,Owner 1 Last Name,Phone 1,Phone 2,Phone 3,Property Address,Property City,Property State,Property Zip Code",
      "Ann,Lee,(404) 826-3246,404-555-0101,404-555-0102,898 Kings Grant Dr NW,Atlanta,GA,30318",
    ].join("\n");
    fireEvent.change(screen.getByLabelText("Import CSV"), {
      target: { files: [new File([csv], "calls.csv", { type: "text/csv" })] },
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(saveLead).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Ann",
        lastName: "Lee",
        sellerName: "Ann Lee",
        phone: "404-826-3246",
        phone2: "404-555-0101",
        address: "898 Kings Grant Dr NW, Atlanta, GA 30318",
        source: "Cold Call",
        leadType: "residential",
        userId: "u1",
      }),
    );
    expect(window.alert.mock.calls[0][0]).toMatch(/^Imported 1 lead\./);
  });

  it("imports PPL leads from a CSV, filling in ones already there", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const saveLead = vi.fn().mockResolvedValue(undefined);
    const setLeads = vi.fn();
    const leads = [
      { id: "p1", source: "PPL", sellerName: "Pat", phone: "206-555-0100" },
    ];
    render(<PotentialLeads {...baseProps({ leads, saveLead, setLeads })} />);
    fireEvent.click(screen.getByRole("button", { name: /PPL Leads/i }));

    const csv = [
      "Name,Phone,Address",
      "Pat Again,(206) 555-0100,1 Main St",
      "New Seller,512-555-0199,9 Elm St",
    ].join("\n");
    fireEvent.change(screen.getByLabelText("Import CSV"), {
      target: { files: [new File([csv], "leads.csv", { type: "text/csv" })] },
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(saveLead).toHaveBeenCalledTimes(2);
    expect(saveLead).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerName: "New Seller",
        source: "PPL",
        userId: "u1",
      }),
    );
    // Pat is already there: the file fills in the missing address but
    // leaves the saved name alone.
    expect(saveLead).toHaveBeenCalledWith({
      ...leads[0],
      address: "1 Main St",
    });
    expect(setLeads).toHaveBeenCalled();
    expect(window.alert.mock.calls[0][0]).toMatch(
      /Imported 1 lead\.\nFilled in missing details on 1 lead already in your list\./,
    );
  });

  it("says when an import finds no duplicates", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<PotentialLeads {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /Commercial/i }));
    const csv = [
      "Business Name,Phone,Address",
      "Park A,206-555-0100,1 Main St, Dallas, TX",
      "Park B,206-555-0101,2 Oak St, Dallas, TX",
    ].join("\n");
    fireEvent.change(screen.getByLabelText("Import CSV"), {
      target: { files: [new File([csv], "leads.csv", { type: "text/csv" })] },
    });
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(window.alert.mock.calls[0][0]).toMatch(
      /Imported 2 leads\.\nNo duplicates found\./,
    );
  });

  it("doesn't offer CSV import on the PPC tab", () => {
    render(<PotentialLeads {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: /PPC Leads/i }));
    expect(screen.queryByLabelText("Import CSV")).toBeNull();
  });

  it("removes commercial leads that share an address, keeping one", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const saveLead = vi.fn().mockResolvedValue(undefined);
    const deleteLeadById = vi.fn().mockResolvedValue(undefined);
    const setLeads = vi.fn();
    const leads = [
      {
        id: "c1",
        leadType: "commercial",
        name: "Princess RV",
        address: "3000 Clarcona Rd, Apopka, FL",
        phone: "407-375-6065",
        sellerEmail: "a@x.com",
      },
      {
        id: "c2",
        leadType: "commercial",
        name: "Princess RV",
        address: "3000 Clarcona Rd, Apopka, FL 32703",
        phone2: "407-654-5788",
      },
      {
        id: "c3",
        leadType: "commercial",
        name: "Other Park",
        address: "9770 County Rd 769, Arcadia, FL",
      },
    ];
    render(
      <PotentialLeads
        {...baseProps({ leads, saveLead, deleteLeadById, setLeads })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Commercial/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remove duplicates (1)" }),
    );

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(deleteLeadById).toHaveBeenCalledTimes(1);
    expect(deleteLeadById).toHaveBeenCalledWith("c2");
    expect(saveLead).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", phone2: "407-654-5788" }),
    );
    const next = setLeads.mock.calls.at(-1)[0](leads);
    expect(next.map((l) => l.id)).toEqual(["c1", "c3"]);
    expect(window.alert.mock.calls[0][0]).toMatch(
      /Removed 1 duplicate lead\.\nCopied missing details to 1 lead\./,
    );
  });

  it("bulk-deletes selected PPL leads", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteLeadById = vi.fn().mockResolvedValue(undefined);
    const leads = [
      { id: "p1", source: "Leadzolo", sellerName: "Pat PPL" },
      { id: "p2", source: "Leadzolo", sellerName: "Sam PPL" },
    ];
    render(<PotentialLeads {...baseProps({ leads, deleteLeadById })} />);
    fireEvent.click(screen.getByRole("button", { name: /PPL Leads/i }));

    const [selectAll] = screen.getAllByRole("checkbox", { hidden: false });
    fireEvent.click(selectAll);
    fireEvent.click(screen.getByRole("button", { name: /Delete \(2\)/i }));

    await waitFor(() => {
      expect(deleteLeadById).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("button", { name: /Delete \(/i })).toBeNull();
  });

  it("moves a residential lead into the CRM as a deal", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const deleteLeadById = vi.fn().mockResolvedValue(undefined);
    const setActiveView = vi.fn();
    const leads = [
      {
        id: "l1",
        address: "1 Main St, Dallas, TX 75201",
        source: "Propwire",
        sellerName: "Jane",
      },
    ];
    render(
      <PotentialLeads
        {...baseProps({ leads, saveDeal, deleteLeadById, setActiveView })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^CRM$/i }));

    await waitFor(() => {
      expect(setActiveView).toHaveBeenCalledWith("dashboard");
    });
    expect(saveDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "1 Main St",
        city: "Dallas",
        state: "TX",
        zipCode: "75201",
      }),
    );
    expect(deleteLeadById).toHaveBeenCalledWith("l1");
  });

  it("unselects the selected leads on Cancel", () => {
    const leads = [
      { id: "l1", address: "1 Main St, Dallas, TX 75201", sellerName: "Ann" },
      { id: "l2", address: "2 Oak Ave, Dallas, TX 75201", sellerName: "Ben" },
    ];
    render(<PotentialLeads {...baseProps({ leads })} />);
    const rowCheckbox = (name) =>
      screen
        .getByText(name)
        .closest("tr")
        .querySelector("td.buyer-checkbox-cell input");
    fireEvent.click(rowCheckbox("Ann"));
    fireEvent.click(rowCheckbox("Ben"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete (2)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(rowCheckbox("Ann").checked).toBe(false);
    expect(rowCheckbox("Ben").checked).toBe(false);
  });

  it("deletes the selected residential leads together", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteLeadById = vi.fn().mockResolvedValue(undefined);
    const setLeads = vi.fn();
    const leads = [
      { id: "l1", address: "1 Main St, Dallas, TX 75201", sellerName: "Ann" },
      { id: "l2", address: "2 Oak Ave, Dallas, TX 75201", sellerName: "Ben" },
      { id: "l3", address: "3 Elm St, Dallas, TX 75201", sellerName: "Cal" },
    ];
    render(
      <PotentialLeads {...baseProps({ leads, deleteLeadById, setLeads })} />,
    );

    const rowCheckbox = (name) =>
      screen
        .getByText(name)
        .closest("tr")
        .querySelector("td.buyer-checkbox-cell input");
    fireEvent.click(rowCheckbox("Ann"));
    fireEvent.click(rowCheckbox("Cal"));
    fireEvent.click(screen.getByText("Delete (2)"));

    expect(window.confirm).toHaveBeenCalledWith("Delete 2 selected leads?");
    await waitFor(() => expect(deleteLeadById).toHaveBeenCalledTimes(2));
    expect(deleteLeadById.mock.calls.map(([id]) => id).sort()).toEqual([
      "l1",
      "l3",
    ]);
    const update = setLeads.mock.calls.at(-1)[0];
    expect(update(leads).map((l) => l.id)).toEqual(["l2"]);
  });
});
