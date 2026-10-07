import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CountyRecords from "./CountyRecords";
import {
  deleteCountyRecordImportById,
  fetchCountyRecordImports,
  fetchCountyRecordRows,
  saveCountyRecordImport,
} from "../../../firebase/firestoreService";

vi.mock("../../../firebase/firestoreService", () => ({
  fetchCountyRecordImports: vi.fn(),
  fetchCountyRecordRows: vi.fn(),
  saveCountyRecordImport: vi.fn(),
  deleteCountyRecordImportById: vi.fn(),
}));

const user = { id: "u1" };

function uploadCsv(text, name = "shelby.csv") {
  const file = new File([text], name, { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: { files: [file] },
  });
}

describe("CountyRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fetchCountyRecordImports.mockResolvedValue([]);
    saveCountyRecordImport.mockResolvedValue(undefined);
    deleteCountyRecordImportById.mockResolvedValue(undefined);
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
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();

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

    expect(await screen.findByText("Owner 00")).toBeInTheDocument();
    expect(fetchCountyRecordRows).toHaveBeenCalledWith("i1");
    expect(screen.queryByText("Owner 25")).toBeNull();
    expect(screen.getByText("Showing 1–25 of 30")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search all columns…"), {
      target: { value: "memphis" },
    });
    expect(screen.getByText("Owner 29")).toBeInTheDocument();
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
    await screen.findByText("Jane");
    fireEvent.click(screen.getByText("Delete"));
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

    expect(await screen.findByText("(206) 822-8019")).toHaveAttribute(
      "href",
      "tel:2068228019",
    );
    expect(screen.getByText("425-555-0100")).toHaveAttribute(
      "href",
      "tel:4255550100",
    );
    // A number-shaped value outside a phone column stays plain text.
    expect(screen.getByText("2068228019").tagName).toBe("TD");
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
    const bobRow = (await screen.findByText("Bob Roe")).closest("tr");
    expect(bobRow).toHaveTextContent("In CRM");

    fireEvent.click(screen.getByText("Jane Doe"));
    expect(
      screen.getByText("164 Auburn St, Russellville, 35654"),
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
    fireEvent.click(await screen.findByText("Bob"));
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
    await screen.findByText("Ann");

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
    expect(screen.getByText("Cal")).toBeInTheDocument();
    expect(screen.queryByText("Ann")).toBeNull();
    fireEvent.change(screen.getByLabelText("Filter by state"), {
      target: { value: "" },
    });

    fireEvent.change(screen.getByLabelText("Filter by county"), {
      target: { value: "Shelby" },
    });
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.queryByText("Cal")).toBeNull();

    fireEvent.change(city, { target: { value: "Memphis" } });
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.queryByText("Ben")).toBeNull();

    fireEvent.click(screen.getByText("Clear"));
    expect(screen.getByText("Cal")).toBeInTheDocument();
  });
});
