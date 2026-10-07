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
  fetchCountyRecordRows,
  saveCountyRecordImport,
} from "../../../firebase/firestoreService";

vi.mock("../../../firebase/firestoreService", () => ({
  fetchCountyRecordImports: vi.fn(),
  fetchCountyRecordRows: vi.fn(),
  saveCountyRecordImport: vi.fn(),
  deleteCountyRecordImportById: vi.fn(),
  deleteCountyRecordRows: vi.fn(),
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
  });

  it("imports a CSV, saves it, and shows the file's own columns", async () => {
    render(<CountyRecords currentUser={user} />);
    expect(
      await screen.findByText("No county records yet."),
    ).toBeInTheDocument();

    uploadCsv("Owner Name,Parcel ID,Assessed Value\nJane Doe,123-45,$90,000\n");
    // "$90,000" isn't quoted, so it splits — padded under an extra column.
    expect(await screen.findByText("Owner Name")).toBeInTheDocument();
    expect(screen.getByText("Parcel ID")).toBeInTheDocument();
    expect(inTable().getByText("Jane Doe")).toBeInTheDocument();

    const [summary, chunks] = saveCountyRecordImport.mock.calls[0];
    expect(summary).toMatchObject({
      userId: "u1",
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
    fireEvent.click(screen.getByText("Delete file"));
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
      expect(screen.getByText("1 record · 1 column")).toBeInTheDocument(),
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
      expect(screen.getByText("2 records · 2 columns")).toBeInTheDocument();
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
      expect(screen.getByText("1 record · 2 columns")).toBeInTheDocument();
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
});
