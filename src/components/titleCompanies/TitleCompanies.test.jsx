import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TitleCompanies from "./TitleCompanies";

beforeEach(() => {
  vi.spyOn(global, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const baseProps = (overrides = {}) => ({
  currentUser: { id: "u1" },
  fetchTitleCompanies: vi.fn().mockResolvedValue([]),
  saveTitleCompany: vi.fn().mockResolvedValue(undefined),
  deleteTitleCompanyById: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("TitleCompanies", () => {
  it("renders the add form", async () => {
    render(<TitleCompanies {...baseProps()} />);
    const inputs =
      await screen.findAllByPlaceholderText(/First American Title/i);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("loads existing companies from the fetch prop", async () => {
    const fetchTitleCompanies = vi.fn().mockResolvedValue([
      {
        id: "c1",
        name: "Acme Title",
        phone: "555-1212",
        state: "TX",
        emails: ["a@e.com"],
      },
    ]);
    render(<TitleCompanies {...baseProps({ fetchTitleCompanies })} />);
    await waitFor(() => expect(fetchTitleCompanies).toHaveBeenCalledWith("u1"));
    expect(await screen.findByText("Acme Title")).toBeInTheDocument();
  });

  it("typing a duplicate name surfaces a warning on blur", async () => {
    const fetchTitleCompanies = vi.fn().mockResolvedValue([
      {
        id: "c1",
        name: "Acme Title",
        phone: "555-1212",
        state: "TX",
        emails: [],
      },
    ]);
    render(<TitleCompanies {...baseProps({ fetchTitleCompanies })} />);
    await screen.findAllByText("Acme Title");
    const nameInputs = screen.getAllByPlaceholderText(/First American Title/i);
    const nameInput = nameInputs[0];
    fireEvent.change(nameInput, { target: { value: "Acme Title" } });
    fireEvent.blur(nameInput);
    expect(
      await screen.findByText(/already in your list/i),
    ).toBeInTheDocument();
  });

  it("shows contact and notes columns and filters by search", async () => {
    const fetchTitleCompanies = vi.fn().mockResolvedValue([
      {
        id: "c1",
        name: "Acme Title",
        contact: "Jane Closer",
        phone: "555-1212",
        state: "TX",
        emails: ["jane@acme.com"],
        notes: "Great at double closes",
      },
      {
        id: "c2",
        name: "Beta Escrow",
        contact: "Bob Escrow",
        phone: "555-3434",
        state: "OH",
        emails: [],
        notes: "",
      },
    ]);
    render(<TitleCompanies {...baseProps({ fetchTitleCompanies })} />);
    expect(await screen.findByText("Jane Closer")).toBeInTheDocument();
    expect(screen.getByText("Great at double closes")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText(/Company, contact, email, notes/i),
      { target: { value: "double close" } },
    );
    expect(screen.getByText("Acme Title")).toBeInTheDocument();
    expect(screen.queryByText("Beta Escrow")).toBeNull();
    expect(screen.getByText("1 of 2 companies")).toBeInTheDocument();
  });

  it("allows the same company name in a different state", async () => {
    const fetchTitleCompanies = vi
      .fn()
      .mockResolvedValue([
        { id: "c1", name: "Red Door Title", state: "ME", emails: [] },
      ]);
    render(<TitleCompanies {...baseProps({ fetchTitleCompanies })} />);
    await screen.findByText("Red Door Title");
    const [nameInput] = screen.getAllByPlaceholderText(/First American Title/i);
    fireEvent.change(nameInput, { target: { value: "Red Door Title" } });
    const [stateSelect] = screen.getAllByDisplayValue("Select State...");
    fireEvent.change(stateSelect, { target: { value: "NH" } });
    fireEvent.blur(nameInput);
    expect(screen.queryByText(/already in your list/i)).toBeNull();

    fireEvent.change(stateSelect, { target: { value: "ME" } });
    expect(
      await screen.findByText(/already in your list/i),
    ).toBeInTheDocument();
  });

  it("imports the directory entries the user doesn't have yet", async () => {
    const { TITLE_COMPANY_DIRECTORY } = await import("./titleCompanyDirectory");
    const existing = TITLE_COMPANY_DIRECTORY[0];
    const fetchTitleCompanies = vi
      .fn()
      .mockResolvedValue([{ ...existing, id: "c1" }]);
    const saveTitleCompany = vi.fn().mockResolvedValue(undefined);
    render(
      <TitleCompanies
        {...baseProps({ fetchTitleCompanies, saveTitleCompany })}
      />,
    );
    const total = TITLE_COMPANY_DIRECTORY.length;
    fireEvent.click(await screen.findByText(`Import Directory (${total - 1})`));
    await waitFor(() =>
      expect(saveTitleCompany).toHaveBeenCalledTimes(total - 1),
    );
    expect(saveTitleCompany.mock.calls[0][0]).toMatchObject({
      userId: "u1",
      name: TITLE_COMPANY_DIRECTORY[1].name,
      contact: TITLE_COMPANY_DIRECTORY[1].contact,
      notes: TITLE_COMPANY_DIRECTORY[1].notes,
    });
    await waitFor(() =>
      expect(screen.queryByText(/Import Directory/)).toBeNull(),
    );
    expect(screen.getByText(`${total} companies`)).toBeInTheDocument();
  });

  it("shows 10 companies per page", async () => {
    const fetchTitleCompanies = vi.fn().mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        id: `c${i}`,
        name: `Company ${String(i).padStart(2, "0")}`,
        state: "TX",
        emails: [],
      })),
    );
    render(<TitleCompanies {...baseProps({ fetchTitleCompanies })} />);
    expect(await screen.findByText("Company 00")).toBeInTheDocument();
    expect(screen.getByText("Company 09")).toBeInTheDocument();
    expect(screen.queryByText("Company 10")).toBeNull();
    expect(screen.getByText("Showing 1–10 of 12")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Next/));
    expect(screen.getByText("Company 11")).toBeInTheDocument();
    expect(screen.queryByText("Company 00")).toBeNull();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText(/Company, contact, email, notes/i),
      { target: { value: "Company 0" } },
    );
    expect(screen.getByText("Company 00")).toBeInTheDocument();
    expect(screen.queryByText("Page 2 of 2")).toBeNull();
  });
});
