import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import CountyRecords, { clearCountyRecordsCache } from "./CountyRecords";
import {
  deleteCountyRecordImportById,
  deleteCountyRecordRows,
  fetchCountyRecordImports,
  updateCountyRecordImport,
  fetchCountyRecordRows,
  saveCountyRecordImport,
} from "../../../firebase/firestoreService";

vi.mock("../../../firebase/firestoreService", () => ({
  fetchCountyRecordImports: vi.fn(),
  fetchCountyRecordRows: vi.fn(),
  saveCountyRecordImport: vi.fn(),
  deleteCountyRecordImportById: vi.fn(),
  deleteCountyRecordRows: vi.fn(),
  updateCountyRecordImport: vi.fn(),
}));

const user = { id: "u1" };

// The records render as a table and, for narrow screens, as cards (CSS
// picks one); row checks look in the table.
const inTable = () => within(screen.getByRole("table"));
const findInTable = async (text) =>
  within(await screen.findByRole("table")).findByText(text);

function uploadCsv(text, name = "shelby.csv") {
  const file = new File([text], name, { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: { files: [file] },
  });
}

describe("CountyRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCountyRecordsCache();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fetchCountyRecordImports.mockResolvedValue([]);
    saveCountyRecordImport.mockResolvedValue(undefined);
    deleteCountyRecordImportById.mockResolvedValue(undefined);
    deleteCountyRecordRows.mockResolvedValue(undefined);
    updateCountyRecordImport.mockResolvedValue(undefined);
  });

  it("imports a CSV, saves it, and shows the file's own columns", async () => {
    render(<CountyRecords currentUser={user} />);
    expect(
      await screen.findByText("No county records yet."),
    ).toBeInTheDocument();

    uploadCsv("Owner Name,Parcel ID,Assessed Value\nJane Doe,123-45,$90,000\n");
    // Named before it's saved; the file name is the starting point.
    const nameInput = await screen.findByLabelText("List name");
    expect(nameInput).toHaveValue("shelby");
    expect(saveCountyRecordImport).not.toHaveBeenCalled();
    fireEvent.change(nameInput, { target: { value: "2026 Delinquent" } });
    fireEvent.click(screen.getByText("Save list"));

    // "$90,000" isn't quoted, so it splits — padded under an extra column.
    expect(await screen.findByText("Owner Name")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /2026 Delinquent/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Parcel ID")).toBeInTheDocument();
    expect(inTable().getByText("Jane Doe")).toBeInTheDocument();

    const [summary, chunks] = saveCountyRecordImport.mock.calls[0];
    expect(summary).toMatchObject({
      userId: "u1",
      name: "2026 Delinquent",
      fileName: "shelby.csv",
      rowCount: 1,
    });
    expect(summary.columns.slice(0, 3)).toEqual([
      "Owner Name",
      "Parcel ID",
      "Assessed Value",
    ]);
    expect(JSON.parse(chunks[0])[0][0]).toBe("Jane Doe");
    expect(fetchCountyRecordRows).not.toHaveBeenCalled();
  });

  it("loads a saved import, searches all columns and pages 25 at a time", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "county.csv",
        columns: ["Owner", "City"],
        rowCount: 30,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => [
        `Owner ${String(i).padStart(2, "0")}`,
        i === 29 ? "Memphis" : "Austin",
      ]),
    );
    render(<CountyRecords currentUser={user} />);

    expect(await findInTable("Owner 00")).toBeInTheDocument();
    expect(fetchCountyRecordRows).toHaveBeenCalledWith("i1");
    expect(screen.queryByText("Owner 25")).toBeNull();
    expect(screen.getByText("Showing 1–25 of 30")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search all columns…"), {
      target: { value: "memphis" },
    });
    expect(inTable().getByText("Owner 29")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
  });

  it("rejects a file with no records", async () => {
    render(<CountyRecords currentUser={user} />);
    await screen.findByText("No county records yet.");
    uploadCsv("Owner,City\n");
    expect(await screen.findByText(/No records found/)).toBeInTheDocument();
    expect(saveCountyRecordImport).not.toHaveBeenCalled();
  });

  it("deletes the selected import", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "county.csv",
        columns: ["Owner"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([["Jane"]]);
    render(<CountyRecords currentUser={user} />);
    await findInTable("Jane");
    fireEvent.click(screen.getByText("Delete list"));
    await waitFor(() =>
      expect(deleteCountyRecordImportById).toHaveBeenCalledWith("i1"),
    );
    expect(
      await screen.findByText("No county records yet."),
    ).toBeInTheDocument();
  });

  it("links phone numbers in phone columns", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "county.csv",
        columns: ["Owner", "Owner Phone", "Parcel ID"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Jane", "(206) 822-8019 / 425-555-0100", "2068228019"],
    ]);
    render(<CountyRecords currentUser={user} />);

    expect(await findInTable("(206) 822-8019")).toHaveAttribute(
      "href",
      "tel:2068228019",
    );
    expect(inTable().getByText("425-555-0100")).toHaveAttribute(
      "href",
      "tel:4255550100",
    );
    // A number-shaped value outside a phone column stays plain text.
    expect(inTable().getByText("2068228019").tagName).toBe("TD");
  });

  it("opens a record with all its data and adds it to the CRM", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "lawrence.csv",
        columns: [
          "Owner Name",
          "Situs Address",
          "Situs City",
          "Situs Zip",
          "Acres",
        ],
        rowCount: 2,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Jane Doe", "164 Auburn St", "Russellville", "35654", "0.5"],
      ["Bob Roe", "9 Elm St", "Austin", "78701", "1.2"],
    ]);
    const saveDeal = vi.fn().mockResolvedValue(undefined);
    const setDeals = vi.fn();
    render(
      <CountyRecords
        currentUser={user}
        deals={[{ address: "9 Elm St", city: "Austin" }]}
        saveDeal={saveDeal}
        setDeals={setDeals}
      />,
    );

    // The record already in the CRM is flagged in the table.
    const bobRow = (await findInTable("Bob Roe")).closest("tr");
    expect(bobRow).toHaveTextContent("In CRM");

    fireEvent.click(inTable().getByText("Jane Doe"));
    expect(
      screen.getByRole("heading", {
        name: "164 Auburn St, Russellville, 35654",
      }),
    ).toBeInTheDocument();
    const fields = document.querySelector(".county-record-fields");
    expect(fields).toHaveTextContent("Acres0.5");
    expect(fields).toHaveTextContent("Owner NameJane Doe");

    fireEvent.click(screen.getByText("Add to CRM"));
    await waitFor(() => expect(saveDeal).toHaveBeenCalled());
    expect(saveDeal.mock.calls[0][0]).toMatchObject({
      userId: "u1",
      address: "164 Auburn St",
      city: "Russellville",
      sellerFirstName: "Jane",
      sellerLastName: "Doe",
      source: "County Records",
    });
    expect(setDeals).toHaveBeenCalled();
    expect(await screen.findByText("Added to CRM")).toBeInTheDocument();
  });

  it("won't add a record that's already in the CRM", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name", "Property Address"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Bob", "9 Elm St, Austin, TX 78701"],
    ]);
    render(
      <CountyRecords
        currentUser={user}
        deals={[{ address: "9 Elm St", city: "Austin" }]}
        saveDeal={vi.fn()}
        setDeals={vi.fn()}
      />,
    );
    fireEvent.click(await findInTable("Bob"));
    expect(screen.getByText("Already in CRM").closest("button")).toBeDisabled();
  });

  it("filters by state, county and city (property columns, not mailing)", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner", "Mailing City", "Situs City", "County", "State"],
        rowCount: 3,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Ann", "Nashville", "Memphis", "Shelby", "TN"],
      ["Ben", "Memphis", "Bartlett", "Shelby", "TN"],
      ["Cal", "Austin", "Austin", "Travis", "TX"],
    ]);
    render(<CountyRecords currentUser={user} />);
    await findInTable("Ann");

    const city = screen.getByLabelText("Filter by city");
    expect([...city.options].map((o) => o.value)).toEqual([
      "",
      "Austin",
      "Bartlett",
      "Memphis",
    ]);

    fireEvent.change(screen.getByLabelText("Filter by state"), {
      target: { value: "TX" },
    });
    expect(inTable().getByText("Cal")).toBeInTheDocument();
    expect(screen.queryByText("Ann")).toBeNull();
    fireEvent.change(screen.getByLabelText("Filter by state"), {
      target: { value: "" },
    });

    fireEvent.change(screen.getByLabelText("Filter by county"), {
      target: { value: "Shelby" },
    });
    expect(inTable().getByText("Ann")).toBeInTheDocument();
    expect(inTable().getByText("Ben")).toBeInTheDocument();
    expect(screen.queryByText("Cal")).toBeNull();

    fireEvent.change(city, { target: { value: "Memphis" } });
    expect(inTable().getByText("Ann")).toBeInTheDocument();
    expect(screen.queryByText("Ben")).toBeNull();

    fireEvent.click(screen.getByText("Clear"));
    expect(inTable().getByText("Cal")).toBeInTheDocument();
  });

  it("also lists records as cards (owner, address, phone) for narrow screens", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name", "Situs Address", "Situs City", "Phone 1"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Gordon Brandhagen", "2619 156TH ST SW", "Lynnwood", "206-795-9395"],
    ]);
    render(<CountyRecords currentUser={user} />);
    await findInTable("Gordon Brandhagen");

    const card = document.querySelector(".county-record-card");
    expect(card).toHaveTextContent("Gordon Brandhagen");
    expect(card).toHaveTextContent("2619 156TH ST SW, Lynnwood");
    expect(within(card).getByText("206-795-9395")).toHaveAttribute(
      "href",
      "tel:2067959395",
    );
    fireEvent.click(card);
    expect(document.querySelector(".county-record-fields")).toHaveTextContent(
      "Phone 1206-795-9395",
    );
  });

  it("shows a loader, not the empty state, until data arrives", async () => {
    let resolveImports;
    fetchCountyRecordImports.mockReturnValue(
      new Promise((resolve) => (resolveImports = resolve)),
    );
    let resolveRows;
    fetchCountyRecordRows.mockReturnValue(
      new Promise((resolve) => (resolveRows = resolve)),
    );
    render(<CountyRecords currentUser={user} />);

    expect(screen.getByText("Loading county records…")).toBeInTheDocument();
    expect(screen.queryByText("No county records yet.")).toBeNull();

    resolveImports([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    // Still loading: the import is known but its rows aren't here yet.
    await waitFor(() =>
      expect(screen.getByText(/1 record · 1 column/)).toBeInTheDocument(),
    );
    expect(screen.getByText("Loading county records…")).toBeInTheDocument();

    resolveRows([["Jane"]]);
    expect(await findInTable("Jane")).toBeInTheDocument();
    expect(screen.queryByText("Loading county records…")).toBeNull();
  });

  it("renders straight from the cache when the tab is reopened", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([["Jane"]]);
    const { unmount } = render(<CountyRecords currentUser={user} />);
    await findInTable("Jane");
    unmount();

    fetchCountyRecordImports.mockReturnValue(new Promise(() => {}));
    render(<CountyRecords currentUser={user} />);
    expect(inTable().getByText("Jane")).toBeInTheDocument();
    expect(screen.queryByText("Loading county records…")).toBeNull();
    expect(fetchCountyRecordRows).toHaveBeenCalledTimes(1);
  });

  describe("deleting single records", () => {
    const threeRecords = {
      id: "i1",
      fileName: "c.csv",
      columns: ["Owner Name", "Situs Address"],
      rowCount: 2,
      deletedRows: [1],
      importedAt: "2026-10-06T00:00:00Z",
    };

    beforeEach(() => {
      fetchCountyRecordImports.mockResolvedValue([threeRecords]);
      fetchCountyRecordRows.mockResolvedValue([
        ["Ann", "1 Main St"],
        ["Ben", "2 Oak Ave"],
        ["Cal", "3 Elm St"],
      ]);
    });

    it("hides records already deleted", async () => {
      render(<CountyRecords currentUser={user} />);
      await findInTable("Ann");
      expect(screen.queryByText("Ben")).toBeNull();
      expect(screen.getByText(/2 records · 2 columns/)).toBeInTheDocument();
    });

    it("deletes a record from its row, keeping its position in the file", async () => {
      render(<CountyRecords currentUser={user} />);
      const calRow = (await findInTable("Cal")).closest("tr");
      fireEvent.click(within(calRow).getByLabelText("Delete record"));

      expect(window.confirm).toHaveBeenCalledWith(
        "Delete this record (Cal, 3 Elm St)?",
      );
      await waitFor(() =>
        expect(deleteCountyRecordRows).toHaveBeenCalledWith("i1", [2]),
      );
      await waitFor(() => expect(screen.queryByText("Cal")).toBeNull());
      expect(inTable().getByText("Ann")).toBeInTheDocument();
      expect(screen.getByText(/1 record · 2 columns/)).toBeInTheDocument();
    });

    it("deletes the open record from its window", async () => {
      render(<CountyRecords currentUser={user} />);
      fireEvent.click(await findInTable("Ann"));
      fireEvent.click(screen.getByText("Delete record"));
      await waitFor(() =>
        expect(deleteCountyRecordRows).toHaveBeenCalledWith("i1", [0]),
      );
      await waitFor(() =>
        expect(document.querySelector(".county-record-fields")).toBeNull(),
      );
      expect(screen.queryByText("Ann")).toBeNull();
    });

    it("keeps the record if the delete isn't confirmed", async () => {
      window.confirm.mockReturnValue(false);
      render(<CountyRecords currentUser={user} />);
      const annRow = (await findInTable("Ann")).closest("tr");
      fireEvent.click(within(annRow).getByLabelText("Delete record"));
      expect(deleteCountyRecordRows).not.toHaveBeenCalled();
      expect(inTable().getByText("Ann")).toBeInTheDocument();
    });
  });

  it("shows the amount due column in red, in the table and the record", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name", "Amount Due", "Assessed Value"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([["Ann", "$4,210.55", "$300,000"]]);
    render(<CountyRecords currentUser={user} />);

    expect(await findInTable("$4,210.55")).toHaveClass("county-amount-due");
    expect(inTable().getByText("Amount Due").closest("th")).toHaveClass(
      "county-amount-due",
    );
    expect(inTable().getByText("$300,000")).not.toHaveClass(
      "county-amount-due",
    );

    fireEvent.click(inTable().getByText("Ann"));
    const fields = document.querySelector(".county-record-fields");
    expect(within(fields).getByText("Amount Due")).toHaveClass(
      "county-amount-due",
    );
    expect(within(fields).getByText("$4,210.55")).toHaveClass(
      "county-amount-due",
    );
  });

  it("deletes several selected records together", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name"],
        rowCount: 3,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([["Ann"], ["Ben"], ["Cal"]]);
    render(<CountyRecords currentUser={user} />);

    const select = async (name) =>
      fireEvent.click(
        within((await findInTable(name)).closest("tr")).getByLabelText(
          "Select record",
        ),
      );
    await select("Ann");
    await select("Cal");
    fireEvent.click(screen.getByText("Delete (2)"));

    expect(window.confirm).toHaveBeenCalledWith("Delete 2 selected records?");
    await waitFor(() =>
      expect(deleteCountyRecordRows).toHaveBeenCalledWith("i1", [0, 2]),
    );
    await waitFor(() => expect(screen.queryByText("Ann")).toBeNull());
    expect(screen.queryByText("Cal")).toBeNull();
    expect(inTable().getByText("Ben")).toBeInTheDocument();
    expect(screen.getByText(/1 record · 1 column/)).toBeInTheDocument();
    expect(screen.queryByText(/Delete \(\d+\)/)).toBeNull();
  });

  it("selects every record on the page from the header checkbox", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name"],
        rowCount: 2,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([["Ann"], ["Ben"]]);
    render(<CountyRecords currentUser={user} />);
    await findInTable("Ann");
    fireEvent.click(screen.getByLabelText("Select all on this page"));
    expect(screen.getByText("Delete (2)")).toBeInTheDocument();
  });

  describe("lists as tabs", () => {
    const list = (id, name, importedAt, extra = {}) => ({
      id,
      name,
      fileName: `${id}.csv`,
      columns: ["Owner Name"],
      rowCount: 1,
      importedAt,
      ...extra,
    });

    it("shows each list as a tab, oldest first, opening the newest", async () => {
      fetchCountyRecordImports.mockResolvedValue([
        list("b", "2026", "2026-02-01T00:00:00Z"),
        list("a", "2025", "2025-02-01T00:00:00Z"),
      ]);
      fetchCountyRecordRows.mockImplementation(async (id) =>
        id === "a" ? [["From 2025"]] : [["From 2026"]],
      );
      render(<CountyRecords currentUser={user} />);

      expect(await findInTable("From 2026")).toBeInTheDocument();
      const tabs = screen.getAllByRole("tab");
      expect(tabs.map((t) => t.textContent)).toEqual(["20251", "20261"]);
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");

      fireEvent.click(tabs[0]);
      expect(await findInTable("From 2025")).toBeInTheDocument();
      expect(screen.getByText(/^a\.csv · 1 record/)).toBeInTheDocument();
    });

    it("names older imports after their file", async () => {
      fetchCountyRecordImports.mockResolvedValue([
        list("a", undefined, "2025-02-01T00:00:00Z", {
          fileName: "Snohomish_2025.csv",
        }),
      ]);
      fetchCountyRecordRows.mockResolvedValue([["Ann"]]);
      render(<CountyRecords currentUser={user} />);
      expect(
        await screen.findByRole("tab", { name: /Snohomish_2025/ }),
      ).toBeInTheDocument();
    });

    it("renames the current list", async () => {
      fetchCountyRecordImports.mockResolvedValue([
        list("a", "2025", "2025-02-01T00:00:00Z"),
        list("b", "2026", "2026-02-01T00:00:00Z"),
      ]);
      fetchCountyRecordRows.mockResolvedValue([["Ann"]]);
      render(<CountyRecords currentUser={user} />);
      await findInTable("Ann");

      fireEvent.click(screen.getByLabelText("Rename 2026"));
      const input = screen.getByLabelText("List name");
      expect(input).toHaveValue("2026");
      fireEvent.change(input, { target: { value: "2025" } });
      expect(
        screen.getByText("You already have a list with this name."),
      ).toBeInTheDocument();
      expect(screen.getByText("Rename")).toBeDisabled();

      fireEvent.change(input, { target: { value: "  2026  Delinquent " } });
      fireEvent.click(screen.getByText("Rename"));
      await waitFor(() =>
        expect(updateCountyRecordImport).toHaveBeenCalledWith("b", {
          name: "2026 Delinquent",
        }),
      );
      expect(
        await screen.findByRole("tab", { name: /2026 Delinquent/ }),
      ).toBeInTheDocument();
    });

    it("doesn't save a file if naming is cancelled", async () => {
      render(<CountyRecords currentUser={user} />);
      await screen.findByText("No county records yet.");
      uploadCsv("Owner\nAnn\n");
      await screen.findByLabelText("List name");
      fireEvent.click(screen.getByText("Cancel"));
      expect(saveCountyRecordImport).not.toHaveBeenCalled();
      expect(screen.queryByRole("tab")).toBeNull();
    });

    it("hides a tab without deleting the list, and shows it again", async () => {
      fetchCountyRecordImports.mockResolvedValue([
        list("a", "2025", "2025-02-01T00:00:00Z"),
        list("b", "2026", "2026-02-01T00:00:00Z"),
      ]);
      fetchCountyRecordRows.mockImplementation(async (id) =>
        id === "a" ? [["From 2025"]] : [["From 2026"]],
      );
      render(<CountyRecords currentUser={user} />);
      await findInTable("From 2026");

      fireEvent.click(screen.getByLabelText("Hide 2026"));
      await waitFor(() =>
        expect(updateCountyRecordImport).toHaveBeenCalledWith("b", {
          hidden: true,
        }),
      );
      expect(deleteCountyRecordImportById).not.toHaveBeenCalled();
      // The open tab was hidden, so the newest remaining one opens.
      expect(await findInTable("From 2025")).toBeInTheDocument();
      expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
        "20251",
      ]);

      const restore = screen.getByLabelText("Show a hidden list");
      expect(restore).toHaveTextContent("Hidden lists (1)");
      fireEvent.change(restore, { target: { value: "b" } });
      await waitFor(() =>
        expect(updateCountyRecordImport).toHaveBeenCalledWith("b", {
          hidden: false,
        }),
      );
      expect(await findInTable("From 2026")).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(2);
      expect(screen.queryByLabelText("Show a hidden list")).toBeNull();
    });

    it("opens the newest visible list and explains when all are hidden", async () => {
      fetchCountyRecordImports.mockResolvedValue([
        list("a", "2025", "2025-02-01T00:00:00Z"),
        list("b", "2026", "2026-02-01T00:00:00Z", { hidden: true }),
      ]);
      fetchCountyRecordRows.mockResolvedValue([["From 2025"]]);
      render(<CountyRecords currentUser={user} />);
      expect(await findInTable("From 2025")).toBeInTheDocument();
      expect(fetchCountyRecordRows).toHaveBeenCalledWith("a");

      fireEvent.click(screen.getByLabelText("Hide 2025"));
      expect(
        await screen.findByText("All your lists are hidden."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("tab")).toBeNull();
      expect(screen.getByLabelText("Show a hidden list")).toHaveTextContent(
        "Hidden lists (2)",
      );
    });
  });

  it("sorts by the amount due column, ascending then descending then off", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name", "Amount Due"],
        rowCount: 4,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Ann", "$980.00"],
      ["Ben", ""],
      ["Cal", "$4,210.55"],
      ["Dee", "$12.50"],
    ]);
    render(<CountyRecords currentUser={user} />);
    await findInTable("Ann");

    const owners = () =>
      [...document.querySelectorAll(".county-records-table tbody tr")].map(
        (tr) => tr.querySelectorAll("td")[2].textContent.replace("In CRM", ""),
      );
    const header = screen.getByRole("button", { name: /^Amount Due/ });
    expect(owners()).toEqual(["Ann", "Ben", "Cal", "Dee"]);

    fireEvent.click(header);
    expect(owners()).toEqual(["Dee", "Ann", "Cal", "Ben"]);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(header);
    expect(owners()).toEqual(["Cal", "Ann", "Dee", "Ben"]);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(header);
    expect(owners()).toEqual(["Ann", "Ben", "Cal", "Dee"]);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "none");
  });

  it("links the open record's property to Zillow", async () => {
    fetchCountyRecordImports.mockResolvedValue([
      {
        id: "i1",
        fileName: "c.csv",
        columns: ["Owner Name", "Situs Address", "Situs City", "Situs State"],
        rowCount: 1,
        importedAt: "2026-10-06T00:00:00Z",
      },
    ]);
    fetchCountyRecordRows.mockResolvedValue([
      ["Ann", "2619 156TH ST SW", "Lynnwood", "WA"],
    ]);
    render(<CountyRecords currentUser={user} />);
    fireEvent.click(await findInTable("Ann"));
    expect(screen.getByRole("link", { name: /Zillow/ })).toHaveAttribute(
      "href",
      "https://www.zillow.com/homes/2619-156TH-ST-SW-Lynnwood-WA_rb/",
    );
  });
});
