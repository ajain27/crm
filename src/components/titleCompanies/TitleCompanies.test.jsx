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
});
