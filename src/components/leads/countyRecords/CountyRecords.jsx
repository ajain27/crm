import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Trash2, Upload } from "lucide-react";
import Pagination from "../../pagination/Pagination";
import { LeadSearchInput } from "../components/LeadListPanel";
import {
  deleteCountyRecordImportById,
  fetchCountyRecordImports,
  fetchCountyRecordRows,
  saveCountyRecordImport,
} from "../../../firebase/firestoreService";
import { chunkRows, parseCsv, toCountyRecords } from "./countyRecordsCsv";

const PAGE_SIZE = 25;
const MAX_FILE_MB = 30;

const PHONE_COLUMN = /phone|cell|mobile|\btel\b|telephone|fax/i;
const PHONE_NUMBER = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

// Phone cells as tap-to-call links. Every number in the cell is linked
// (some exports put two in one cell); other text stays as is.
function PhoneCellContent({ value }) {
  const parts = [];
  let last = 0;
  for (const match of value.matchAll(PHONE_NUMBER)) {
    if (match.index > last) parts.push(value.slice(last, match.index));
    parts.push(
      <a
        key={match.index}
        href={`tel:${match[0].replace(/[^\d+]/g, "")}`}
        className="leads-contact-link"
      >
        {match[0]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (parts.length === 0) return value;
  if (last < value.length) parts.push(value.slice(last));
  return parts;
}

// FileReader rather than file.text(), which older Safari lacks.
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function newestFirst(a, b) {
  return String(b.importedAt).localeCompare(String(a.importedAt));
}

function formatImportedAt(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

// County Records tab: import a county's CSV export and browse it with the
// file's own columns. Each import is saved to the user's account; pick one
// from the list to view it, search across every column, or delete it.
export default function CountyRecords({ currentUser }) {
  const [imports, setImports] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [rowsById, setRowsById] = useState({});
  const [loadingRows, setLoadingRows] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchCountyRecordImports(currentUser.id)
      .then((list) => {
        const sorted = [...list].sort(newestFirst);
        setImports(sorted);
        setSelectedId((current) => current || sorted[0]?.id || "");
      })
      .catch(() => setError("Couldn't load your county record imports."));
  }, [currentUser?.id]);

  // Rows are loaded on demand per import and kept, so switching back is
  // instant.
  useEffect(() => {
    if (!selectedId || rowsById[selectedId]) return;
    setLoadingRows(true);
    fetchCountyRecordRows(selectedId)
      .then((rows) => setRowsById((prev) => ({ ...prev, [selectedId]: rows })))
      .catch(() => setError("Couldn't load these records."))
      .finally(() => setLoadingRows(false));
  }, [selectedId, rowsById]);

  function selectImport(id) {
    setSelectedId(id);
    setSearch("");
    setPage(1);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setError("");

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(
        `That file is over ${MAX_FILE_MB}MB. Split it and import the parts.`,
      );
      return;
    }

    setImporting(true);
    try {
      const { columns, rows } = toCountyRecords(
        parseCsv(await readFileText(file)),
      );
      if (columns.length === 0 || rows.length === 0) {
        setError(
          "No records found. The first row should be the column headers.",
        );
        return;
      }
      const summary = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        fileName: file.name,
        columns,
        rowCount: rows.length,
        importedAt: new Date().toISOString(),
      };
      await saveCountyRecordImport(summary, chunkRows(rows));
      setImports((prev) => [summary, ...prev]);
      setRowsById((prev) => ({ ...prev, [summary.id]: rows }));
      selectImport(summary.id);
    } catch (err) {
      console.error("County records import failed", err);
      setError("Import failed. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete() {
    const current = imports.find((i) => i.id === selectedId);
    if (!current) return;
    if (
      !window.confirm(
        `Delete "${current.fileName}" and its ${current.rowCount.toLocaleString()} records?`,
      )
    )
      return;
    try {
      await deleteCountyRecordImportById(current.id);
      const remaining = imports.filter((i) => i.id !== current.id);
      setImports(remaining);
      setRowsById(({ [current.id]: _removed, ...rest }) => rest);
      selectImport(remaining[0]?.id || "");
    } catch {
      setError("Couldn't delete this import. Check your connection.");
    }
  }

  const selected = imports.find((i) => i.id === selectedId);
  const phoneColumns = (selected?.columns || []).map((c) =>
    PHONE_COLUMN.test(c),
  );
  const allRows = rowsById[selectedId] || [];
  const query = search.trim().toLowerCase();
  const filtered = query
    ? allRows.filter((row) =>
        row.some((cell) => cell.toLowerCase().includes(query)),
      )
    : allRows;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "80ms" }}
    >
      <div className="panel-header leads-list-header">
        <div>
          <h2>County Records</h2>
          <p>
            {selected
              ? `${selected.rowCount.toLocaleString()} records · ${selected.columns.length} columns`
              : "Import a county's CSV export to browse it here."}
          </p>
        </div>
        <div className="leads-filters">
          {imports.length > 0 && (
            <select
              className="leads-filter-select county-import-select"
              value={selectedId}
              onChange={(e) => selectImport(e.target.value)}
              aria-label="Imported file"
            >
              {imports.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.fileName} — {formatImportedAt(i.importedAt)}
                </option>
              ))}
            </select>
          )}
          {selected && (
            <LeadSearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search all columns…"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={handleFile}
            hidden
            aria-label="CSV file"
          />
          <button
            type="button"
            className="leads-export-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={13} />
            {importing ? "Importing…" : "Import CSV"}
          </button>
          {selected && (
            <button
              type="button"
              className="leads-bulk-delete-btn"
              onClick={handleDelete}
              disabled={importing}
            >
              <Trash2 size={13} />
              Delete
            </button>
          )}
        </div>
      </div>

      {error && <p className="county-records-error">{error}</p>}

      {!selected ? (
        <div className="leads-empty county-records-empty">
          <FileSpreadsheet size={28} />
          <p>No county records yet.</p>
          <span>
            Click Import CSV and choose a file exported from the county. The
            first row should hold the column names.
          </span>
        </div>
      ) : loadingRows && allRows.length === 0 ? (
        <div className="leads-empty">
          <p>Loading records…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="leads-empty">
          <p>No records match your search.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap county-records-table-wrap">
            <table className="compact-table county-records-table">
              <thead>
                <tr>
                  {selected.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, rowIndex) => (
                  <tr key={pageStart + rowIndex}>
                    {row.map((cell, i) => (
                      <td key={selected.columns[i]} title={cell}>
                        {!cell ? (
                          "—"
                        ) : phoneColumns[i] ? (
                          <PhoneCellContent value={cell} />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setPage}
          >
            <span className="pagination-summary">
              Showing {(pageStart + 1).toLocaleString()}–
              {(pageStart + pageRows.length).toLocaleString()} of{" "}
              {filtered.length.toLocaleString()}
            </span>
          </Pagination>
        </>
      )}
    </section>
  );
}
